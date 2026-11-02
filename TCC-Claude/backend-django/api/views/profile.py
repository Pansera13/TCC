import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.models import Usuario
from api.email_recuperacao import normalizar, validar_email_recuperacao
from api.permissions import permissoes_do_cargo


@csrf_exempt
def profile(request):
    if request.method == 'GET':
        return _get_profile(request)
    elif request.method == 'PUT':
        return _update_profile(request)
    return JsonResponse({'message': 'Método não permitido.'}, status=405)


def _get_profile(request):
    user = request.user_data
    try:
        u = Usuario.objects.get(id=user['id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Conta não encontrada.'}, status=404)
    return JsonResponse({
        'id': u.id,
        'nome': u.nome,
        'email': u.email,
        'role': u.role,
        'tenant_id': u.tenant_id,
        'avatar_url': u.avatar_url,
        'email_recuperacao': u.email_recuperacao,
        'permissoes': permissoes_do_cargo(u.role),
    })


def _update_profile(request):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    try:
        u = Usuario.objects.get(id=user['id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Conta não encontrada.'}, status=404)

    if 'nome' in body:
        nome = str(body['nome']).strip()
        if nome:
            u.nome = nome
    if 'avatar_url' in body:
        u.avatar_url = body['avatar_url']

    u.save()
    return JsonResponse({'message': 'Perfil atualizado com sucesso.'})


@csrf_exempt
@require_http_methods(['PUT'])
def update_email_recuperacao(request):
    user = request.user_data
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'message': 'JSON inválido.'}, status=400)

    try:
        u = Usuario.objects.get(id=user['id'])
    except Usuario.DoesNotExist:
        return JsonResponse({'message': 'Conta não encontrada.'}, status=404)

    email_rec = body.get('email_recuperacao', '')
    email_rec_confirm = body.get('email_recuperacao_confirmacao', '')

    if normalizar(email_rec) != normalizar(email_rec_confirm):
        return JsonResponse({'message': 'Os e-mails de recuperação não coincidem.', 'field': 'email_recuperacao_confirmacao'}, status=400)

    resultado = validar_email_recuperacao(email_rec, u.email)
    if not resultado['ok']:
        resp = {'message': resultado['message'], 'field': 'email_recuperacao'}
        if 'sugestao' in resultado:
            resp['sugestao'] = resultado['sugestao']
        return JsonResponse(resp, status=400)

    u.email_recuperacao = resultado['email']
    u.save()
    return JsonResponse({'message': 'E-mail de recuperação atualizado com sucesso.'})
