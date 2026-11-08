import logging
import os
import jwt
from django.core.exceptions import RequestDataTooBig, TooManyFieldsSent
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


class PermissionsPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        return response


_mw_logger = logging.getLogger('api.middleware')


class GlobalRateLimitMiddleware:
    """
    Rate limit global por IP em todas as rotas /api/ (exceto OPTIONS).
    Conta toda requisição — não só falhas — como proteção de fundo contra scanning.
    Configurável via GLOBAL_RATE_LIMIT_MAX, GLOBAL_RATE_LIMIT_JANELA_SEGUNDOS,
    GLOBAL_RATE_LIMIT_BLOQUEIO_SEGUNDOS em settings.py (lidos de variáveis de ambiente).
    Desabilitado quando GLOBAL_RATE_LIMIT_MAX <= 0.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings as s
        path = request.path_info
        if request.method == 'OPTIONS' or not path.startswith('/api/'):
            return self.get_response(request)

        max_req = getattr(s, 'GLOBAL_RATE_LIMIT_MAX', 1000)
        if max_req <= 0:
            return self.get_response(request)

        janela_s = getattr(s, 'GLOBAL_RATE_LIMIT_JANELA_SEGUNDOS', 60)
        bloqueio_s = getattr(s, 'GLOBAL_RATE_LIMIT_BLOQUEIO_SEGUNDOS', 60)

        from api.limites import ip_do_cliente, segundos_bloqueado, registrar_falha
        ip = ip_do_cliente(request)
        chave = f'global:ip:{ip}'

        espera = segundos_bloqueado(chave)
        if espera > 0:
            _mw_logger.warning(
                '429 global rate limit | ip=%s path=%s retry_after=%d', ip, path, espera
            )
            resp = JsonResponse(
                {'message': 'Muitas tentativas. Tente novamente mais tarde.', 'retry_after': espera},
                status=429,
            )
            resp['Retry-After'] = str(espera)
            return resp

        registrar_falha(chave, janela_s, max_req, bloqueio_s, 'global-ratelimit')
        return self.get_response(request)


class RequestSizeLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _get_limit(self, path):
        from django.conf import settings
        nfe_limit = getattr(settings, 'NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024)
        default_limit = getattr(settings, 'DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024)
        route_limits = {'/api/nfe/xml': nfe_limit}
        return route_limits.get(path.rstrip('/'), default_limit)

    def __call__(self, request):
        path = request.path_info
        limit = self._get_limit(path)
        cl_raw = request.META.get('CONTENT_LENGTH', '')
        try:
            cl = int(cl_raw)
            if cl < 0:
                raise ValueError
        except (ValueError, TypeError):
            cl = None
        if cl is not None and cl > limit:
            _mw_logger.warning(
                '413 Content-Length %d > %d | ip=%s path=%s',
                cl, limit, request.META.get('REMOTE_ADDR', '?'), path,
            )
            return JsonResponse(
                {'message': 'Requisição muito grande.', 'limite_bytes': limit},
                status=413,
            )
        return self.get_response(request)

    def process_exception(self, request, exception):
        from django.conf import settings
        if isinstance(exception, (RequestDataTooBig, TooManyFieldsSent)):
            limit = getattr(settings, 'DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024)
            _mw_logger.warning(
                '413 RequestDataTooBig | ip=%s path=%s',
                request.META.get('REMOTE_ADDR', '?'), request.path_info,
            )
            return JsonResponse(
                {'message': 'Requisição muito grande.', 'limite_bytes': limit},
                status=413,
            )
        return None
