import os
import re
import datetime
import bcrypt
import jwt
import requests
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from api.models import Usuario
from api.permissions import permissoes_do_cargo
from api.email_recuperacao import normalizar, validar_email_recuperacao


def _jwt_secret():
    return os.environ.get('JWT_SECRET', '')


def _verify_recaptcha(token):
    secret = os.environ.get('RECAPTCHA_SECRET', '')
    if not secret:
        return True
    try:
        resp = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            params={'secret': secret, 'response': token},
            timeout=5,
        )
        return resp.json().get('success', False)
    except Exception:
        return False


def _normalizar_cpf_cnpj(valor):
    return re.sub(r'\D', '', str(valor or ''))


@csrf_exempt
@require_http_methods(['POST'])
def register(request):
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    nome = str(body.get('nome', '')).strip()
    nome_empresa = str(body.get('nome_empresa', '')).strip()
    cpf_cnpj = str(body.get('cpf_cnpj', '')).strip()
    email = str(body.get('email', '')).strip().lower()
    senha = str(body.get('senha', ''))
    email_recuperacao = body.get('email_recuperacao', '')
    email_recuperacao_confirmacao = body.get('email_recuperacao_confirmacao', '')
    recaptcha_token = body.get('recaptchaToken', '')

    recaptcha_enabled = bool(os.environ.get('RECAPTCHA_SECRET'))
    if not nome or not nome_empresa or not cpf_cnpj or not email or not senha:
        return JsonResponse({'message': 'Preencha todos os campos.'}, status=400)
    if recaptcha_enabled and not recaptcha_token:
        return JsonResponse({'message': 'Preencha todos os campos.'}, status=400)

    if normalizar(email_recuperacao) != normalizar(email_recuperacao_confirmacao):
        return JsonResponse({'message': 'Os e-mails de recuperação não coincidem.', 'field': 'email_recuperacao_confirmacao'}, status=400)

    recuperacao = validar_email_recuperacao(email_recuperacao, email)
    if not recuperacao['ok']:
        resp = {'message': recuperacao['message'], 'field': 'email_recuperacao'}
        if 'sugestao' in recuperacao:
            resp['sugestao'] = recuperacao['sugestao']
        return JsonResponse(resp, status=400)

    if recaptcha_enabled and not _verify_recaptcha(recaptcha_token):
        return JsonResponse({'message': 'Verificação de CAPTCHA falhou.'}, status=400)

    if Usuario.objects.filter(email=email).exists():
        return JsonResponse({'message': 'Este e-mail já está cadastrado.', 'field': 'email'}, status=409)

    cpf_digits = _normalizar_cpf_cnpj(cpf_cnpj)
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute(
            "SELECT id FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = %s",
            [cpf_digits],
        )
        if cur.fetchone():
            return JsonResponse({'message': 'Este CPF/CNPJ já está cadastrado.', 'field': 'cpf_cnpj'}, status=409)

    senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt(rounds=12)).decode()

    from django.db import connection as conn
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO usuarios (nome, nome_empresa, cpf_cnpj, email, senha_hash, email_recuperacao, role, ativo, tenant_id)
               VALUES (%s, %s, %s, %s, %s, %s, 'admin', true, NULL)
               RETURNING id""",
            [nome, nome_empresa, cpf_cnpj, email, senha_hash, recuperacao['email']],
        )
        new_id = cur.fetchone()[0]
        # tenant_id = próprio id (conta principal)
        cur.execute('UPDATE usuarios SET tenant_id = %s WHERE id = %s', [new_id, new_id])

    return JsonResponse({'message': 'Conta criada com sucesso!'}, status=201)


@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    identifier = str(body.get('identifier', '')).strip()
    senha = str(body.get('senha', ''))

    if not identifier or not senha:
        return JsonResponse({'message': 'Preencha todos os campos.'}, status=400)

    # Detectar tipo: e-mail, CPF (11 dígitos) ou CNPJ (14 dígitos)
    digitos = re.sub(r'\D', '', identifier)
    user = None
    if '@' in identifier:
        user = Usuario.objects.filter(email=identifier.lower()).first()
    elif len(digitos) in (11, 14):
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                "SELECT id FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = %s",
                [digitos],
            )
            row = cur.fetchone()
            if row:
                user = Usuario.objects.get(id=row[0])
    else:
        user = Usuario.objects.filter(nome_empresa__iexact=identifier).first()

    if not user:
        return JsonResponse({'message': 'Usuário ou senha inválidos.'}, status=401)

    if not bcrypt.checkpw(senha.encode(), user.senha_hash.encode()):
        return JsonResponse({'message': 'Usuário ou senha inválidos.'}, status=401)

    if not user.ativo:
        return JsonResponse({'message': 'Conta desativada. Entre em contato com o administrador.'}, status=403)

    role = user.role or 'admin'
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
    token = jwt.encode(
        {'id': user.id, 'nome': user.nome, 'email': user.email, 'role': role, 'tenant_id': user.tenant_id, 'exp': exp},
        _jwt_secret(),
        algorithm='HS256',
    )

    return JsonResponse({
        'token': token,
        'nome': user.nome,
        'role': role,
        'id': user.id,
        'avatar_url': user.avatar_url,
        'permissoes': permissoes_do_cargo(role),
    })
