import logging
import os

import defusedxml
import defusedxml.ElementTree as ET
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.db import connection

from api.decorators import exige_permissao
from api.limites import ip_do_cliente, segundos_bloqueado, registrar_falha


_nfe_logger = logging.getLogger('api.nfe')
_BOMS = (b'\xef\xbb\xbf', b'\xff\xfe', b'\xfe\xff')
_TIPOS_ACEITOS = frozenset({'application/xml', 'text/xml', 'application/octet-stream'})


def _log_rejeicao(request, status, motivo):
    user_data = getattr(request, 'user_data', {}) or {}
    _nfe_logger.warning(
        'NFe rejeição status=%d motivo=%s ip=%s user_id=%s tenant_id=%s',
        status, motivo,
        ip_do_cliente(request),
        user_data.get('id', '?'),
        user_data.get('tenant_id', '?'),
    )


def _validar_nome(nome):
    nome = os.path.basename(nome or '')
    if not nome or '\x00' in nome:
        return False
    stem, ext = os.path.splitext(nome)
    if ext.lower() != '.xml':
        return False
    _, inner = os.path.splitext(stem)
    return not inner


def _ct_ok(ct_raw):
    ct = (ct_raw or '').split(';')[0].strip().lower()
    return not ct or ct in _TIPOS_ACEITOS


def _parece_xml(data: bytes) -> bool:
    for bom in _BOMS:
        if data.startswith(bom):
            data = data[len(bom):]
            break
    return data.lstrip()[:1] == b'<'


def _check_rate_limit(request):
    user_id = request.user_data['id']
    ip = ip_do_cliente(request)
    chave_user = f'nfe:user:{user_id}'
    chave_ip = f'nfe:ip:{ip}'
    bloq = max(segundos_bloqueado(chave_user), segundos_bloqueado(chave_ip))
    if bloq > 0:
        return bloq
    max_req = getattr(settings, 'NFE_MAX_IMPORTACOES', 20)
    janela = getattr(settings, 'NFE_JANELA_SEGUNDOS', 600)
    bloqueio = getattr(settings, 'NFE_BLOQUEIO_SEGUNDOS', 600)
    registrar_falha(chave_user, janela, max_req, bloqueio, 'nfe')
    registrar_falha(chave_ip, janela, max_req, bloqueio, 'nfe')
    return 0


def _strip_ns(tag):
    return tag.split('}', 1)[1] if '}' in tag else tag


def _find(elem, *tags):
    """Busca recursiva ignorando namespace."""
    for child in elem:
        if _strip_ns(child.tag) in tags:
            return child
        found = _find(child, *tags)
        if found is not None:
            return found
    return None


def _findall(elem, tag):
    return [c for c in elem if _strip_ns(c.tag) == tag]


def _text(elem, tag):
    child = _find(elem, tag)
    return child.text if child is not None else None


@csrf_exempt
@require_http_methods(['POST'])
@exige_permissao('produto:importar-nfe')
def parse_nfe(request):
    # ── 1. Rate limit ──────────────────────────────────────────────────────────
    retry = _check_rate_limit(request)
    if retry > 0:
        _log_rejeicao(request, 429, 'rate_limit')
        resp = JsonResponse(
            {'message': 'Muitas tentativas. Tente novamente mais tarde.', 'retry_after': retry},
            status=429,
        )
        resp['Retry-After'] = str(retry)
        return resp

    max_size = getattr(settings, 'NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024)

    # ── 2–5. Validação em camadas ──────────────────────────────────────────────
    if request.FILES.get('arquivo'):
        f = request.FILES['arquivo']

        # 2. Tamanho (sem ler o conteúdo)
        if f.size > max_size:
            _log_rejeicao(request, 413, 'tamanho')
            return JsonResponse(
                {'message': f'Arquivo muito grande. Máximo: {max_size // 1024} KB.', 'limite_bytes': max_size},
                status=413,
            )

        # 3. Extensão e nome
        if not _validar_nome(f.name or ''):
            _log_rejeicao(request, 415, 'extensao')
            return JsonResponse({'message': 'Envie um arquivo no formato .xml.'}, status=415)

        # 4. Content-Type da parte do arquivo
        if not _ct_ok(f.content_type):
            _log_rejeicao(request, 415, 'content_type')
            return JsonResponse({'message': 'Envie um arquivo no formato .xml.'}, status=415)

        # 5. Leitura do conteúdo
        xml_bytes = f.read()

    else:
        # Corpo raw: verificar Content-Length antes de ler
        cl_raw = request.META.get('CONTENT_LENGTH', '')
        try:
            cl = int(cl_raw)
            if cl < 0:
                raise ValueError
        except (ValueError, TypeError):
            cl = None

        if cl is not None and cl > max_size:
            _log_rejeicao(request, 413, 'tamanho')
            return JsonResponse(
                {'message': f'Arquivo muito grande. Máximo: {max_size // 1024} KB.', 'limite_bytes': max_size},
                status=413,
            )

        # 4. Content-Type do corpo
        if not _ct_ok(request.content_type):
            _log_rejeicao(request, 415, 'content_type')
            return JsonResponse({'message': 'Envie um arquivo no formato .xml.'}, status=415)

        # 5. Leitura (fallback de tamanho para requisições sem Content-Length)
        xml_bytes = request.body
        if len(xml_bytes) > max_size:
            _log_rejeicao(request, 413, 'tamanho')
            return JsonResponse(
                {'message': f'Arquivo muito grande. Máximo: {max_size // 1024} KB.', 'limite_bytes': max_size},
                status=413,
            )

    if not xml_bytes:
        return JsonResponse({'message': 'Nenhum XML enviado.'}, status=400)

    # ── 6. Content sniff ───────────────────────────────────────────────────────
    if not _parece_xml(xml_bytes):
        _log_rejeicao(request, 415, 'conteudo')
        return JsonResponse({'message': 'Envie um arquivo no formato .xml.'}, status=415)

    # ── 7. Parse seguro ────────────────────────────────────────────────────────
    try:
        root = ET.fromstring(xml_bytes)
    except (ET.ParseError, defusedxml.DefusedXmlException):
        _log_rejeicao(request, 400, 'xml_invalido')
        return JsonResponse({'message': 'O arquivo não é um XML válido.'}, status=400)

    inf_nfe = _find(root, 'infNFe')
    if inf_nfe is None:
        return JsonResponse({'message': 'Formato de NF-e não reconhecido.'}, status=422)

    # ── 8. Limite estrutural ───────────────────────────────────────────────────
    max_itens = getattr(settings, 'NFE_MAX_ITENS', 500)
    dets = _findall(inf_nfe, 'det')
    if not dets:
        return JsonResponse({'message': 'Formato de NF-e não reconhecido.'}, status=422)
    if len(dets) > max_itens:
        _log_rejeicao(request, 422, 'itens_excedidos')
        return JsonResponse(
            {'message': f'NF-e contém muitos itens. Máximo permitido: {max_itens}.'},
            status=422,
        )

    # ── 9. Lógica existente ────────────────────────────────────────────────────
    # Extrai chave de 44 dígitos: elemento <chNFe> ou atributo Id="NFe{44}"
    chave = _text(inf_nfe, 'chNFe')
    if not chave:
        id_attr = inf_nfe.get('Id', '')
        if id_attr.startswith('NFe') and len(id_attr) == 47:
            chave = id_attr[3:]
        elif len(id_attr) == 44 and id_attr.isdigit():
            chave = id_attr

    # Bloqueia reimportação da mesma NF-e
    if chave:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM movements WHERE tenant_id = %s AND detalhes->>'nfe_chave' = %s LIMIT 1",
                [request.user_data['tenant_id'], chave],
            )
            if cur.fetchone():
                return JsonResponse({'message': 'Esta NF-e já foi importada anteriormente.'}, status=409)

    produtos = []
    for det in dets:
        prod = _find(det, 'prod')
        if prod is None:
            continue
        nome = _text(prod, 'xProd') or 'Produto sem nome'
        qty_str = _text(prod, 'qCom') or _text(prod, 'qTrib') or '0'
        uni = (_text(prod, 'uCom') or _text(prod, 'uTrib') or 'UN').strip()
        peso_str = _text(prod, 'pesoL')
        try:
            qty = float(qty_str)
        except ValueError:
            qty = 0.0
        if qty <= 0:
            continue
        peso = None
        if peso_str:
            try:
                peso = float(peso_str)
            except ValueError:
                peso = None
        produtos.append({'nome': nome, 'quantidade': qty, 'unidade': uni, 'peso_kg': peso})

    if not produtos:
        return JsonResponse({'message': 'Nenhum produto encontrado no XML.'}, status=422)

    return JsonResponse({'produtos': produtos, 'chNFe': chave})
