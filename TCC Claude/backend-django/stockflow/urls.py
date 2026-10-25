from django.urls import path, include
from django.http import JsonResponse


def handler404(request, exception=None):
    return JsonResponse({'message': 'Rota não encontrada.'}, status=404)


def handler500(request):
    return JsonResponse({'message': 'Erro interno no servidor.'}, status=500)


urlpatterns = [
    path('api/', include('api.urls')),
]

handler404 = handler404
handler500 = handler500
