"""
Testes dos cabeçalhos HTTP de segurança do backend StockFlow.

Verifica X-Content-Type-Options, Referrer-Policy, X-Frame-Options, CSP,
Permissions-Policy, HSTS, SSL redirect e ALLOWED_HOSTS em modo produção.
"""
import pytest
from django.test import Client, override_settings


@pytest.fixture
def c():
    return Client()


# ──────────────────────────────────────────────────────────────────────────────
# 5.1 — Cabeçalhos básicos em múltiplos status codes
# ──────────────────────────────────────────────────────────────────────────────

BASIC_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
}


def _assert_basic_headers(response):
    for header, value in BASIC_HEADERS.items():
        assert response.get(header) == value, (
            f'Esperado {header}: {value}, obtido: {response.get(header)!r}'
        )


def test_cabecalhos_basicos_em_401(c):
    # /api/produtos/ sem token → JWTAuthMiddleware retorna 401 sem consultar o banco
    resp = c.get('/api/produtos/', SERVER_NAME='localhost')
    assert resp.status_code == 401
    _assert_basic_headers(resp)


def test_cabecalhos_basicos_em_404(c):
    # Fora de /api/ → passa pelo JWTAuthMiddleware direto ao roteador, que retorna 404
    resp = c.get('/rota-inexistente', SERVER_NAME='localhost')
    assert resp.status_code == 404
    _assert_basic_headers(resp)


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-sec-headers',
    }
})
def test_cabecalhos_basicos_em_429(db, c):
    from django.core.cache import cache
    cache.clear()
    payload = '{"identifier":"sec@test.invalid","senha":"errada"}'
    for _ in range(5):
        c.post('/api/auth/login', data=payload, content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.99.0.1')
    resp = c.post('/api/auth/login', data=payload, content_type='application/json',
                  SERVER_NAME='localhost', REMOTE_ADDR='10.99.0.1')
    assert resp.status_code == 429
    _assert_basic_headers(resp)


# ──────────────────────────────────────────────────────────────────────────────
# 5.2 — Content-Security-Policy
# ──────────────────────────────────────────────────────────────────────────────

def test_csp_presente_em_resposta_json(c):
    # /api/produtos/ sem token → 401 sem consultar banco; CSP deve estar presente
    resp = c.get('/api/produtos/', SERVER_NAME='localhost')
    csp = resp.get('Content-Security-Policy', '')
    assert csp, 'Content-Security-Policy ausente'
    assert "default-src 'none'" in csp, f'CSP inesperado: {csp}'
    assert "frame-ancestors 'none'" in csp, f'frame-ancestors ausente em: {csp}'


def test_csp_presente_em_404(c):
    resp = c.get('/rota-inexistente', SERVER_NAME='localhost')
    csp = resp.get('Content-Security-Policy', '')
    assert csp, 'Content-Security-Policy ausente em 404'
    assert "default-src 'none'" in csp


# ──────────────────────────────────────────────────────────────────────────────
# 5.3 — Permissions-Policy
# ──────────────────────────────────────────────────────────────────────────────

def test_permissions_policy_presente(c):
    resp = c.get('/api/produtos/', SERVER_NAME='localhost')
    pp = resp.get('Permissions-Policy', '')
    assert pp, 'Permissions-Policy ausente'
    assert 'camera=()' in pp
    assert 'microphone=()' in pp
    assert 'geolocation=()' in pp


# ──────────────────────────────────────────────────────────────────────────────
# 5.4 — Comportamento de produção: HSTS e SSL redirect
# ──────────────────────────────────────────────────────────────────────────────

PROD_SETTINGS = dict(
    DEBUG=False,
    SECURE_SSL_REDIRECT=True,
    SECURE_HSTS_SECONDS=300,
    SECURE_HSTS_INCLUDE_SUBDOMAINS=True,
    SECURE_HSTS_PRELOAD=False,
    ALLOWED_HOSTS=['testserver', 'localhost'],
)


@override_settings(**PROD_SETTINGS)
def test_http_redireciona_para_https_em_producao(c):
    resp = c.get('/api/produtos/', SERVER_NAME='testserver')
    assert resp.status_code == 301
    assert resp['Location'].startswith('https://')


@override_settings(**PROD_SETTINGS)
def test_hsts_presente_em_requisicao_https(c):
    resp = c.get(
        '/api/produtos/',
        SERVER_NAME='testserver',
        **{'wsgi.url_scheme': 'https'},
    )
    sts = resp.get('Strict-Transport-Security', '')
    assert sts, 'Strict-Transport-Security ausente em HTTPS'
    assert 'max-age=300' in sts
    assert 'includeSubDomains' in sts


def test_sem_hsts_em_desenvolvimento(c):
    resp = c.get('/api/produtos/', SERVER_NAME='localhost')
    assert resp.get('Strict-Transport-Security') is None, 'HSTS não deve estar presente em DEBUG=True'


def test_sem_redirect_ssl_em_desenvolvimento(c):
    resp = c.get('/api/produtos/', SERVER_NAME='localhost')
    assert resp.status_code != 301, 'SSL redirect não deve ocorrer em DEBUG=True'


# ──────────────────────────────────────────────────────────────────────────────
# 5.5 — ALLOWED_HOSTS: host inválido → 400
# ──────────────────────────────────────────────────────────────────────────────

@override_settings(DEBUG=False, ALLOWED_HOSTS=['allowed.example.com'])
def test_host_nao_permitido_retorna_400(c):
    resp = c.get('/api/produtos/', SERVER_NAME='bad.example.com')
    assert resp.status_code == 400


@override_settings(DEBUG=False, ALLOWED_HOSTS=['allowed.example.com'])
def test_host_permitido_aceito(c):
    resp = c.get('/api/produtos/', SERVER_NAME='allowed.example.com',
                 **{'wsgi.url_scheme': 'https'})
    assert resp.status_code != 400
