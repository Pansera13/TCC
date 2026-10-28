import os
import re
from pathlib import Path
from django.utils.csp import CSP

BASE_DIR = Path(__file__).resolve().parent.parent

# Carrega .env se existir (dev e testes); sem erro se python-dotenv não estiver instalado
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-only-key-change-in-production')
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'
_allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = (
    [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]
    if _allowed_hosts_env
    else ['localhost', '127.0.0.1']
)

# ── Cabeçalhos de segurança — sempre ativos (dev e produção) ─────────────────
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'

# CSP para API JSON: bloqueia tudo por padrão (API não serve HTML)
SECURE_CSP = {
    'default-src': [CSP.NONE],
    'frame-ancestors': [CSP.NONE],
}

# ── Configurações de produção — somente quando DEBUG=False ────────────────────
# HSTS, SSL redirect e cookies seguros nunca ficam ativos em desenvolvimento.
# Subida gradual recomendada: 300s → 3600s → 86400s → 31536000s (1 ano).
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 300))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = False   # não ativar sem registro deliberado no preload-list
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # TRUSTED_PROXY: ativar somente com proxy reverso confiável na frente do servidor.
    # Sem proxy, X-Forwarded-Proto pode ser forjado por qualquer cliente.
    if os.environ.get('TRUSTED_PROXY', '').lower() == 'true':
        SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'api',
]

# Middleware: Security primeiro, depois CSP, CORS, JWT e Permissions-Policy
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csp.ContentSecurityPolicyMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.cors.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'api.middleware.PermissionsPolicyMiddleware',
    'api.middleware.JWTAuthMiddleware',
]

ROOT_URLCONF = 'stockflow.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': False,
        'OPTIONS': {'context_processors': []},
    },
]

WSGI_APPLICATION = 'stockflow.wsgi.application'

# ── Banco de dados ────────────────────────────────────────────────────────────
_db_url = os.environ.get('DATABASE_URL', '')
if _db_url:
    import urllib.parse as _up
    _p = _up.urlparse(_db_url)
    _db_name = _p.path.lstrip('/')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': _db_name,
            'USER': _p.username,
            'PASSWORD': _p.password,
            'HOST': _p.hostname,
            'PORT': _p.port or 5432,
            'OPTIONS': {'sslmode': 'require'},
            'CONN_MAX_AGE': 0,
            # Aponta o banco de testes para o mesmo DB (nenhuma tabela gerenciada é criada/destruída)
            'TEST': {'NAME': _db_name},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'postgres'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {'sslmode': os.environ.get('DB_SSLMODE', 'prefer')},
            'CONN_MAX_AGE': 0,
        }
    }

# ── DRF — sem autenticação global (feita pelo nosso middleware) ───────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'UNAUTHENTICATED_USER': None,
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# Padrão: localhost + redes RFC 1918 (igual ao backend Node)
_RFC1918 = r'^https?://(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$'

_origins_env = os.environ.get('ALLOWED_ORIGINS', '')
if _origins_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(',') if o.strip()]
    CORS_ALLOWED_ORIGINS_REGEX = None
else:
    CORS_ALLOWED_ORIGINS = []
    CORS_ALLOWED_ORIGINS_REGEX = _RFC1918

# ── Rate limit ────────────────────────────────────────────────────────────────
RATELIMIT_USE_CACHE = 'default'
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# ── Internacionalização ───────────────────────────────────────────────────────
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = False
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Upload NF-e ───────────────────────────────────────────────────────────────
NFE_MAX_SIZE_BYTES = int(os.environ.get('NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024))
NFE_MAX_ITENS = int(os.environ.get('NFE_MAX_ITENS', 500))
NFE_MAX_IMPORTACOES = int(os.environ.get('NFE_MAX_IMPORTACOES', 20))
NFE_JANELA_SEGUNDOS = int(os.environ.get('NFE_JANELA_SEGUNDOS', 600))
NFE_BLOQUEIO_SEGUNDOS = int(os.environ.get('NFE_BLOQUEIO_SEGUNDOS', 600))

# ── Limiar estoque baixo (igual ao frontend LOW_STOCK_THRESHOLD) ──────────────
LOW_STOCK_THRESHOLD = 3

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simples': {
            'format': '{levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simples',
        },
    },
    'loggers': {
        'api.limites': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'api.nfe': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
