from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.models import Notificacao


@csrf_exempt
@require_http_methods(['GET'])
def listar(request):
    user = request.user_data
    qs = Notificacao.objects.filter(usuario_id=user['id'], dispensada=False).order_by('-criado_em', '-id')
    itens = []
    for n in qs:
        itens.append({
            'id': n.id,
            'tipo': n.tipo,
            'titulo': n.titulo,
            'texto': n.texto,
            'acao': n.acao,
            'lida': n.lida,
            'criado_em': n.criado_em.isoformat() if n.criado_em else None,
        })
    return JsonResponse({'itens': itens, 'nao_lidas': sum(1 for i in itens if not i['lida'])})


@csrf_exempt
@require_http_methods(['POST'])
def marcar_lidas(request):
    user = request.user_data
    Notificacao.objects.filter(usuario_id=user['id'], lida=False, dispensada=False).update(lida=True)
    return JsonResponse({'nao_lidas': 0})


@csrf_exempt
@require_http_methods(['POST'])
def dispensar(request, pk):
    user = request.user_data
    try:
        pk_int = int(pk)
    except (TypeError, ValueError):
        return JsonResponse({'message': 'Notificação não encontrada.'}, status=404)

    updated = Notificacao.objects.filter(id=pk_int, usuario_id=user['id'], dispensada=False).update(dispensada=True, lida=True)
    if not updated:
        return JsonResponse({'message': 'Notificação não encontrada.'}, status=404)
    return JsonResponse({'message': 'Notificação dispensada.'})
