"""
Testes para GlobalRateLimitMiddleware (api/middleware.py).

Padrão de isolamento: mesma estratégia de test_rate_limit.py —
  @override_settings(CACHES=CACHE_TEST) + cache.clear() por teste.
Cada teste usa um REMOTE_ADDR único para evitar interferência de contadores
que ficam no cache entre testes (já que LocMemCache persiste na sessão).
"""
import pytest
from django.core.cache import cache
from django.test import Client, override_settings

CACHE_TEST = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-global-rl',
    }
}

LIMITE_2 = dict(
    CACHES=CACHE_TEST,
    GLOBAL_RATE_LIMIT_MAX=2,
    GLOBAL_RATE_LIMIT_JANELA_SEGUNDOS=60,
    GLOBAL_RATE_LIMIT_BLOQUEIO_SEGUNDOS=60,
)

_IP_SEQ = iter(range(1, 255))


def _ip():
    """IP único por chamada para isolar contadores entre testes."""
    n = next(_IP_SEQ)
    return f'10.1.0.{n}'


def _post(c, ip):
    return c.post(
        '/api/auth/login',
        data='{"identifier":"a","senha":"b"}',
        content_type='application/json',
        REMOTE_ADDR=ip,
        SERVER_NAME='localhost',
    )


# ── Comportamento básico ───────────────────────────────────────────────────────

@override_settings(**LIMITE_2)
def test_requisicoes_dentro_do_limite_passam(db):
    cache.clear()
    ip = _ip()
    c = Client()
    r1 = _post(c, ip)
    r2 = _post(c, ip)
    assert r1.status_code != 429
    assert r2.status_code != 429


@override_settings(**LIMITE_2)
def test_excesso_retorna_429(db):
    cache.clear()
    ip = _ip()
    c = Client()
    _post(c, ip)   # 1
    _post(c, ip)   # 2 — atinge limite
    resp = _post(c, ip)   # 3 — deve ser bloqueado
    assert resp.status_code == 429


@override_settings(**LIMITE_2)
def test_429_corpo_json_correto(db):
    cache.clear()
    ip = _ip()
    c = Client()
    _post(c, ip)
    _post(c, ip)
    resp = _post(c, ip)
    assert resp.status_code == 429
    data = resp.json()
    assert 'retry_after' in data
    assert data['retry_after'] > 0
    assert 'message' in data


@override_settings(**LIMITE_2)
def test_429_tem_cabecalho_retry_after(db):
    cache.clear()
    ip = _ip()
    c = Client()
    _post(c, ip)
    _post(c, ip)
    resp = _post(c, ip)
    assert resp.status_code == 429
    assert 'Retry-After' in resp


# ── Isenções ──────────────────────────────────────────────────────────────────

@override_settings(**LIMITE_2)
def test_options_nao_conta_no_limite(db):
    """CORS preflight (OPTIONS) não deve incrementar o contador."""
    cache.clear()
    ip = _ip()
    c = Client()
    _post(c, ip)   # 1
    _post(c, ip)   # 2 — atinge limite
    # OPTIONS não deve ser bloqueado
    resp = c.options('/api/auth/login', REMOTE_ADDR=ip, SERVER_NAME='localhost')
    assert resp.status_code != 429


@override_settings(**LIMITE_2)
def test_rota_fora_de_api_nao_e_contada(db):
    """Rotas fora de /api/ não devem ser contadas nem bloqueadas."""
    cache.clear()
    ip = _ip()
    c = Client()
    _post(c, ip)   # 1
    _post(c, ip)   # 2 — atinge limite
    # Rota fora de /api/ deve passar (retorna 404 do Django, não 429)
    resp = c.get('/nao-existe/', REMOTE_ADDR=ip, SERVER_NAME='localhost')
    assert resp.status_code != 429


@override_settings(
    CACHES=CACHE_TEST,
    GLOBAL_RATE_LIMIT_MAX=0,
    GLOBAL_RATE_LIMIT_JANELA_SEGUNDOS=60,
    GLOBAL_RATE_LIMIT_BLOQUEIO_SEGUNDOS=60,
)
def test_max_zero_desabilita_o_limite(db):
    """GLOBAL_RATE_LIMIT_MAX=0 desabilita o middleware.

    Com LIMITE_2 ativo, a 3ª requisição seria 429. Com max=0, o middleware
    é pulado e as 3 requisições passam (mantendo-se abaixo do limite de login).
    """
    cache.clear()
    ip = _ip()
    c = Client()
    for _ in range(3):
        resp = _post(c, ip)
        assert resp.status_code != 429


# ── Isolamento entre IPs ───────────────────────────────────────────────────────

@override_settings(**LIMITE_2)
def test_ips_diferentes_sao_independentes(db):
    """O bloqueio de um IP não afeta outros IPs."""
    cache.clear()
    ip1, ip2 = _ip(), _ip()
    c = Client()
    # ip1 esgota o limite
    _post(c, ip1)
    _post(c, ip1)
    _post(c, ip1)   # ip1 está bloqueado
    # ip2 ainda está dentro do limite
    resp = _post(c, ip2)
    assert resp.status_code != 429
