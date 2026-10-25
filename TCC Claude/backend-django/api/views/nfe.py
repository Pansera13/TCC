import defusedxml.ElementTree as ET
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.db import connection

from api.decorators import exige_permissao


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
    max_size = getattr(settings, 'NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024)
    xml_bytes = None

    if request.FILES.get('arquivo'):
        f = request.FILES['arquivo']
        if f.size > max_size:
            return JsonResponse({'message': f'Arquivo muito grande. Máximo: {max_size // 1024} KB.'}, status=400)
        xml_bytes = f.read()
    else:
        if len(request.body) > max_size:
            return JsonResponse({'message': f'Payload muito grande. Máximo: {max_size // 1024} KB.'}, status=400)
        xml_bytes = request.body

    if not xml_bytes:
        return JsonResponse({'message': 'Nenhum XML enviado.'}, status=400)

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return JsonResponse({'message': 'O arquivo não é um XML válido.'}, status=400)

    inf_nfe = _find(root, 'infNFe')
    if inf_nfe is None:
        return JsonResponse({'message': 'Formato de NF-e não reconhecido.'}, status=422)

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

    dets = _findall(inf_nfe, 'det')
    if not dets:
        return JsonResponse({'message': 'Formato de NF-e não reconhecido.'}, status=422)

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
