import json
import re
import bcrypt
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.models import Usuario
from api.permissions import cargo_valido, pode_criar_cargo, pode_alterar_conta
from api.decorators import exige_permissao


@csrf_exempt
def users_list_create(request):
    if request.method == 'GET':
        return _list_users(request)
    elif request.method == 'POST':
        return _create_user(request)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)


@exige_permissao('equipe:ver')
def _list_users(request):
    user = request.user_data
    qs = Usuario.objects.filter(tenant_id=user['tenant_id']).order_by('criado_em').values(
        'id', 'nome', 'nome_empresa', 'email', 'role', 'ativo', 'criado_em'
    )
    rows = []
    for r in qs:
        r = dict(r)
        if r.get('criado_em') and hasattr(r['criado_em'], 'isoformat'):
            r['criado_em'] = r['criado_em'].isoformat()
        rows.append(r)
    return JsonResponse(rows, safe=False)


@exige_permissao('usuario:criar-funcionario')
def _create_user(request):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    nome = str(body.get('nome', '')).strip()
    cpf_cnpj = str(body.get('cpf_cnpj', '')).strip()
    email = str(body.get('email', '')).strip().lower()
    senha = str(body.get('senha', ''))
    role_req = body.get('role', 'user')

    if not nome or not cpf_cnpj or not email or not senha:
        return JsonResponse({'message': 'Preencha todos os campos obrigatórios.'}, status=400)

    cargo_novo = role_req if cargo_valido(role_req) else 'user'
    if not pode_criar_cargo(user['role'], cargo_novo):
        return JsonResponse({'message': 'Você não tem permissão para criar uma conta com esse cargo.'}, status=403)

    if Usuario.objects.filter(email=email).exists():
        return JsonResponse({'message': 'Este e-mail já está cadastrado.'}, status=409)

    cpf_digits = re.sub(r'\D', '', cpf_cnpj)
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute(
            "SELECT id FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = %s",
            [cpf_digits],
        )
        if cur.fetchone():
            return JsonResponse({'message': 'Este CPF já está cadastrado.'}, status=409)

    senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt(rounds=12)).decode()

    novo = Usuario.objects.create(
        nome=nome,
        nome_empresa=nome,  # contas de equipe herdam nome como nome_empresa (comportamento do Node)
        cpf_cnpj=cpf_cnpj,
        email=email,
        senha_hash=senha_hash,
        role=cargo_novo,
        tenant_id=user['tenant_id'],
    )
    return JsonResponse({'id': novo.id, 'message': 'Usuário criado com sucesso.'}, status=201)


@csrf_exempt
def update_user_role(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'message': 'Método não permitido.'}, status=405)

    user = request.user_data
    if not user or not __import__('api.permissions', fromlist=['can']).can(user['role'], 'usuario:alterar-cargo'):
        return JsonResponse({'message': 'Você não tem permissão para esta ação.'}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    uid = int(pk)
    role = body.get('role', '')
    if not cargo_valido(role):
        return JsonResponse({'message': 'Cargo inválido.'}, status=400)
    if uid == user['id']:
        return JsonResponse({'message': 'Você não pode alterar o próprio cargo.'}, status=403)

    try:
        alvo = Usuario.objects.get(id=uid, tenant_id=user['tenant_id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Usuário não encontrado.'}, status=404)

    if not pode_alterar_conta(user['role'], alvo.role):
        return JsonResponse({'message': 'Você não tem permissão para alterar esse usuário.'}, status=403)

    alvo.role = role
    alvo.save()
    return JsonResponse({'message': 'Cargo atualizado com sucesso.'})


@csrf_exempt
def toggle_user_status(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'message': 'Método não permitido.'}, status=405)

    user = request.user_data
    if not user or not __import__('api.permissions', fromlist=['can']).can(user['role'], 'usuario:status-funcionario'):
        return JsonResponse({'message': 'Você não tem permissão para esta ação.'}, status=403)

    uid = int(pk)
    if uid == user['id']:
        return JsonResponse({'message': 'Você não pode alterar o status da própria conta.'}, status=403)

    try:
        alvo = Usuario.objects.get(id=uid, tenant_id=user['tenant_id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Usuário não encontrado.'}, status=404)

    if not pode_alterar_conta(user['role'], alvo.role):
        return JsonResponse({'message': 'Você não tem permissão para alterar esse usuário.'}, status=403)

    alvo.ativo = not alvo.ativo
    alvo.save()
    return JsonResponse({'message': 'Conta ativada.' if alvo.ativo else 'Conta desativada.', 'ativo': alvo.ativo})


@csrf_exempt
def delete_user(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'message': 'Método não permitido.'}, status=405)

    user = request.user_data
    if not user or not __import__('api.permissions', fromlist=['can']).can(user['role'], 'usuario:excluir'):
        return JsonResponse({'message': 'Você não tem permissão para esta ação.'}, status=403)

    uid = int(pk)
    if uid == user['id']:
        return JsonResponse({'message': 'Você não pode remover a própria conta.'}, status=403)

    try:
        alvo = Usuario.objects.get(id=uid, tenant_id=user['tenant_id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Usuário não encontrado.'}, status=404)

    if not pode_alterar_conta(user['role'], alvo.role):
        return JsonResponse({'message': 'Você não tem permissão para remover esse usuário.'}, status=403)

    alvo.delete()
    return JsonResponse({'message': 'Usuário removido com sucesso.'})
