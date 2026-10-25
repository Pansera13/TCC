import os
import jwt
from django.http import JsonResponse
from .models import Usuario

# Rotas que não exigem autenticação
PUBLIC_PATHS = {
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/recuperacao/buscar',
    '/api/auth/recuperacao/enviar-codigo',
    '/api/auth/recuperacao/verificar-codigo',
    '/api/auth/recuperacao/redefinir-senha',
}


class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info.rstrip('/')
        if request.method == 'OPTIONS' or path in PUBLIC_PATHS or not path.startswith('/api/'):
            return self.get_response(request)

        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return JsonResponse({'message': 'Não autorizado'}, status=401)

        token = header[7:]
        secret = os.environ.get('JWT_SECRET', '')

        try:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return JsonResponse({'message': 'Sua sessão expirou. Entre novamente.'}, status=401)
        except jwt.PyJWTError:
            return JsonResponse({'message': 'Não autorizado'}, status=401)

        # Relê do banco a cada requisição — cargo, ativo e tenant_id sempre frescos
        try:
            conta = Usuario.objects.values('nome', 'role', 'ativo', 'tenant_id').get(id=payload['id'])
        except Usuario.DoesNotExist:
            return JsonResponse({'message': 'Conta não encontrada. Entre novamente.'}, status=401)
        except Exception:
            return JsonResponse({'message': 'Não foi possível validar o acesso agora. Tente novamente.'}, status=503)

        if not conta['ativo']:
            return JsonResponse({'message': 'Sua conta foi desativada. Entre em contato com o administrador.'}, status=401)

        request.user_data = {
            'id': payload['id'],
            'nome': conta['nome'],
            'role': conta['role'],
            'tenant_id': conta['tenant_id'],
        }
        return self.get_response(request)
