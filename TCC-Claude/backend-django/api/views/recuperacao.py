import os
import re
import hmac
import hashlib
import secrets
import datetime
import bcrypt
import jwt
import requests as _req
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from api.models import Usuario
from api.limites import ip_do_cliente, segundos_bloqueado, registrar_falha

VALIDADE_CODIGO_S = 15 * 60
INTERVALO_REENVIO_S = 60
MAX_TENTATIVAS = 5
HORA_S = 3600


def _segredo():
    secret = os.environ.get('JWT_SECRET', '')
    reset = os.environ.get('JWT_RESET_SECRET', '')
    return reset or f'{secret}-reset'


def _assinar(payload, expires_seconds=600):
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expires_seconds)
    return jwt.encode({**payload, 'exp': exp}, _segredo(), algorithm='HS256')


def _ler_token(token_str, escopo):
    try:
        dados = jwt.decode(str(token_str or ''), _segredo(), algorithms=['HS256'])
        return dados if dados.get('escopo') == escopo else None
    except jwt.PyJWTError:
        return None


def _hash_codigo(user_id, codigo):
    return hmac.new(_segredo().encode(), f'{user_id}:{codigo}'.encode(), hashlib.sha256).hexdigest()


def _impressao(hash_str):
    return str(hash_str)[:16]


def _igual(a, b):
    return hmac.compare_digest(str(a), str(b))


def _mascarar_nome(nome):
    return f'{str(nome or "").strip()[:2]}***'


def _mascarar_email(email):
    local, dominio = str(email).split('@', 1)
    return f'{local[:1]}***@{dominio}'


def _sem_saida(conta):
    if conta.tenant_id != conta.id:
        return 403, {'codigo': 'conta_equipe', 'message': 'Esta conta é de equipe. Peça ao administrador da sua empresa para redefinir a sua senha.'}
    if not conta.ativo:
        return 403, {'codigo': 'conta_desativada', 'message': 'Esta conta está desativada. Fale com o administrador.'}
    if not conta.email_recuperacao:
        return 422, {'codigo': 'sem_email', 'message': 'Esta conta não tem e-mail de recuperação cadastrado. Procure o suporte.'}
    return None, None


def _verify_recaptcha(token):
    secret = os.environ.get('RECAPTCHA_SECRET', '')
    if not secret:
        return True
    try:
        r = _req.post('https://www.google.com/recaptcha/api/siteverify',
                      params={'secret': secret, 'response': token}, timeout=5)
        return r.json().get('success', False)
    except Exception:
        return False


def _ip_de(request):
    return ip_do_cliente(request)


def _enviar_email_codigo(email_para, codigo):
    api_key = os.environ.get('RESEND_API_KEY', '')
    email_from = os.environ.get('EMAIL_FROM', 'StockFlow <onboarding@resend.dev>')
    if not api_key:
        raise ValueError('RESEND_API_KEY não configurada')
    r = _req.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={
            'from': email_from,
            'to': [email_para],
            'subject': 'Código de recuperação de senha — StockFlow',
            'text': f'Seu código de recuperação é: {codigo}\nEle é válido por 15 minutos.',
        },
        timeout=10,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f'Resend retornou HTTP {r.status_code}')


@csrf_exempt
@require_http_methods(['POST'])
def buscar(request):
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    identificador = str(body.get('identificador', '')).strip()
    if not identificador:
        return JsonResponse({'message': 'Informe o e-mail de login ou o CPF/CNPJ.'}, status=400)

    if os.environ.get('RECAPTCHA_SECRET') and not _verify_recaptcha(body.get('recaptchaToken', '')):
        return JsonResponse({'message': 'Verificação de CAPTCHA falhou.'}, status=400)

    digitos = re.sub(r'\D', '', identificador)
    conta = None
    if '@' in identificador:
        conta = Usuario.objects.filter(email=identificador.lower()).first()
    elif len(digitos) in (11, 14):
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                "SELECT id FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = %s",
                [digitos],
            )
            row = cur.fetchone()
            if row:
                conta = Usuario.objects.get(id=row[0])

    if not conta:
        return JsonResponse({'codigo': 'nao_encontrada', 'message': 'Conta não encontrada.'}, status=404)

    status_code, bloqueio = _sem_saida(conta)
    if bloqueio:
        return JsonResponse(bloqueio, status=status_code)

    busca_token = _assinar({'id': conta.id, 'escopo': 'recuperacao-busca'}, expires_seconds=600)
    return JsonResponse({
        'busca_token': busca_token,
        'nome_mascarado': _mascarar_nome(conta.nome),
        'email_mascarado': _mascarar_email(conta.email_recuperacao),
    })


@csrf_exempt
@require_http_methods(['POST'])
def enviar_codigo(request):
    import json
    from django.db import connection as conn
    from django.utils import timezone as tz
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    dados = _ler_token(body.get('busca_token'), 'recuperacao-busca')
    if not dados:
        return JsonResponse({'message': 'A busca expirou. Comece de novo.'}, status=400)

    try:
        conta = Usuario.objects.get(id=dados['id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'codigo': 'nao_encontrada', 'message': 'Conta não encontrada.'}, status=404)

    status_code, bloqueio = _sem_saida(conta)
    if bloqueio:
        return JsonResponse(bloqueio, status=status_code)

    # Intervalo de 60s entre envios
    if conta.reset_code_expires_at:
        ultimo_envio = conta.reset_code_expires_at.timestamp() - VALIDADE_CODIGO_S
        espera = int(ultimo_envio + INTERVALO_REENVIO_S - datetime.datetime.now(datetime.timezone.utc).timestamp())
        if espera > 0:
            resp = JsonResponse({'message': f'Aguarde {espera} segundos para reenviar o código.', 'retry_after': espera}, status=429)
            resp['Retry-After'] = str(espera)
            return resp

    ip = _ip_de(request)
    chave_conta = f'recuperacao:conta:{conta.id}'
    chave_ip_rec = f'recuperacao:ip:{ip}'
    espera_conta = segundos_bloqueado(chave_conta)
    espera_ip = segundos_bloqueado(chave_ip_rec)
    if espera_conta > 0 or espera_ip > 0:
        espera = max(espera_conta, espera_ip)
        resp = JsonResponse({'message': 'Muitos códigos solicitados. Tente novamente mais tarde.', 'retry_after': espera}, status=429)
        resp['Retry-After'] = str(espera)
        return resp

    if not os.environ.get('RESEND_API_KEY'):
        return JsonResponse({'message': 'O envio de e-mail não está disponível no momento.'}, status=503)

    codigo = str(secrets.randbelow(1_000_000)).zfill(6)
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=VALIDADE_CODIGO_S)

    conta.reset_code_hash = _hash_codigo(conta.id, codigo)
    conta.reset_code_expires_at = expires
    conta.reset_code_tentativas = 0
    conta.save()

    try:
        _enviar_email_codigo(conta.email_recuperacao, codigo)
    except Exception as e:
        conta.reset_code_hash = None
        conta.reset_code_expires_at = None
        conta.reset_code_tentativas = 0
        conta.save()
        return JsonResponse({'message': 'Não foi possível enviar o e-mail agora. Tente novamente.'}, status=502)

    registrar_falha(chave_conta, HORA_S, 3, HORA_S, 'recuperacao-conta')
    registrar_falha(chave_ip_rec, HORA_S, 10, HORA_S, 'recuperacao-ip')
    return JsonResponse({'message': 'Código enviado.', 'reenvio_em': INTERVALO_REENVIO_S})


@csrf_exempt
@require_http_methods(['POST'])
def verificar_codigo(request):
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    dados = _ler_token(body.get('busca_token'), 'recuperacao-busca')
    if not dados:
        return JsonResponse({'message': 'A busca expirou. Comece de novo.'}, status=400)

    try:
        conta = Usuario.objects.get(id=dados['id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Código inválido ou expirado.'}, status=400)

    if _sem_saida(conta)[1]:
        return JsonResponse({'message': 'Código inválido ou expirado.'}, status=400)

    codigo = str(body.get('codigo', '')).strip()
    agora = datetime.datetime.now(datetime.timezone.utc)
    vigente = (
        conta.reset_code_hash and
        conta.reset_code_expires_at and
        conta.reset_code_expires_at.replace(tzinfo=datetime.timezone.utc) > agora
    )
    if not vigente:
        return JsonResponse({'message': 'Código inválido ou expirado.', 'tentativas_restantes': 0}, status=400)

    if not re.match(r'^\d{6}$', codigo) or not _igual(_hash_codigo(conta.id, codigo), conta.reset_code_hash):
        conta.reset_code_tentativas = (conta.reset_code_tentativas or 0) + 1
        conta.save()
        restantes = max(0, MAX_TENTATIVAS - conta.reset_code_tentativas)
        if restantes == 0:
            conta.reset_code_hash = None
            conta.reset_code_expires_at = None
            conta.reset_code_tentativas = 0
            conta.save()
        return JsonResponse({'message': 'Código inválido ou expirado.', 'tentativas_restantes': restantes}, status=400)

    reset_token = _assinar({
        'id': conta.id,
        'escopo': 'recuperacao-redefinir',
        'imp': _impressao(conta.reset_code_hash),
    }, expires_seconds=600)
    return JsonResponse({'reset_token': reset_token})


@csrf_exempt
@require_http_methods(['POST'])
def redefinir_senha(request):
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    dados = _ler_token(body.get('reset_token'), 'recuperacao-redefinir')
    if not dados:
        return JsonResponse({'message': 'Link expirado ou já usado. Comece de novo.'}, status=400)

    nova = str(body.get('nova_senha', ''))
    if len(nova) < 8:
        return JsonResponse({'message': 'Mínimo 8 caracteres.', 'field': 'nova_senha'}, status=400)

    try:
        conta = Usuario.objects.get(id=dados['id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Link expirado ou já usado. Comece de novo.'}, status=400)

    agora = datetime.datetime.now(datetime.timezone.utc)
    vigente = (
        conta.reset_code_hash and
        conta.reset_code_expires_at and
        conta.reset_code_expires_at.replace(tzinfo=datetime.timezone.utc) > agora
    )
    if _sem_saida(conta)[1] or not vigente or _impressao(conta.reset_code_hash) != dados.get('imp'):
        return JsonResponse({'message': 'Link expirado ou já usado. Comece de novo.'}, status=400)

    conta.senha_hash = bcrypt.hashpw(nova.encode(), bcrypt.gensalt(rounds=12)).decode()
    conta.reset_code_hash = None
    conta.reset_code_expires_at = None
    conta.reset_code_tentativas = 0
    conta.save()
    return JsonResponse({'message': 'Senha alterada com sucesso!'})
