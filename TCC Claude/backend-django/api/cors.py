import re
from django.conf import settings


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.META.get('HTTP_ORIGIN', '')
        allowed = self._is_allowed(origin)

        if request.method == 'OPTIONS':
            from django.http import HttpResponse
            response = HttpResponse()
            if allowed:
                self._add_headers(response, origin)
            response['Content-Length'] = '0'
            return response

        response = self.get_response(request)
        if allowed:
            self._add_headers(response, origin)
        return response

    def _is_allowed(self, origin):
        if not origin:
            return True
        explicit = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        if origin in explicit:
            return True
        pattern = getattr(settings, 'CORS_ALLOWED_ORIGINS_REGEX', None)
        if pattern and re.match(pattern, origin):
            return True
        return False

    def _add_headers(self, response, origin):
        response['Access-Control-Allow-Origin'] = origin or '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        response.setdefault('Vary', 'Origin')
