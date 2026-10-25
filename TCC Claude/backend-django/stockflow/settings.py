import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Carrega .env se existir (dev e testes); sem erro se python-dotenv não estiver instalado
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-only-key-change-in-production')
DEBUG = os.environ.get('DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'api',
]

# Middleware: CORS primeiro, depois o nosso JWT auth
MIDDLEWARE = [
    'api.cors.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
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
NFE_MAX_SIZE_BYTES = int(os.environ.get('NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024))  # 2 MB

# ── Limiar estoque baixo (igual ao frontend LOW_STOCK_THRESHOLD) ──────────────
LOW_STOCK_THRESHOLD = 3
