from functools import wraps
from django.http import JsonResponse
from .permissions import can


def exige_permissao(permissao):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, 'user_data', None)
            if not user or not can(user.get('role', ''), permissao):
                return JsonResponse({'message': 'Você não tem permissão para esta ação.'}, status=403)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
