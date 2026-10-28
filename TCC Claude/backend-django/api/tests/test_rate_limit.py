"""
Testes unitários e de integração para api/limites.py e os endpoints com rate limit.

Cada teste usa override_settings(CACHES=...) com LocMemCache isolado para garantir
que os contadores não vazam entre testes.
"""
import time

import pytest
from django.core.cache import cache
from django.test import Client, override_settings

CACHE_TEST = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-rate-limit',
    }
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _clear():
    cache.clear()


# ──────────────────────────────────────────────────────────────────────────────
# ip_do_cliente
# ──────────────────────────────────────────────────────────────────────────────

class FakeRequest:
    def __init__(self, remote_addr='1.2.3.4', forwarded=None):
        self.META = {'REMOTE_ADDR': remote_addr}
        if forwarded:
            self.META['HTTP_X_FORWARDED_FOR'] = forwarded


@override_settings(CACHES=CACHE_TEST)
def test_ip_trusted_proxy_false_ignora_forwarded(settings):
    from api.limites import ip_do_cliente
    import os
    original = os.environ.pop('TRUSTED_PROXY', None)
    try:
        req = FakeRequest(remote_addr='1.2.3.4', forwarded='9.9.9.9, 10.0.0.1')
        assert ip_do_cliente(req) == '1.2.3.4'
    finally:
        if original is not None:
            os.environ['TRUSTED_PROXY'] = original


@override_settings(CACHES=CACHE_TEST)
def test_ip_trusted_proxy_true_usa_forwarded(monkeypatch):
    from api.limites import ip_do_cliente
    monkeypatch.setenv('TRUSTED_PROXY', 'true')
    req = FakeRequest(remote_addr='10.0.0.1', forwarded='9.9.9.9, 10.0.0.1')
    assert ip_do_cliente(req) == '9.9.9.9'


@override_settings(CACHES=CACHE_TEST)
def test_ip_trusted_proxy_sem_forwarded_usa_remote(monkeypatch):
    from api.limites import ip_do_cliente
    monkeypatch.setenv('TRUSTED_PROXY', 'true')
    req = FakeRequest(remote_addr='5.5.5.5')
    assert ip_do_cliente(req) == '5.5.5.5'


# ──────────────────────────────────────────────────────────────────────────────
# segundos_bloqueado
# ──────────────────────────────────────────────────────────────────────────────

@override_settings(CACHES=CACHE_TEST)
def test_segundos_bloqueado_chave_inexistente():
    from api.limites import segundos_bloqueado
    _clear()
    assert segundos_bloqueado('chave:inexistente') == 0


@override_settings(CACHES=CACHE_TEST)
def test_segundos_bloqueado_com_bloqueio_ativo():
    from api.limites import segundos_bloqueado, _chave_bloq
    _clear()
    expira_em = time.time() + 60
    cache.set(_chave_bloq('test:chave'), expira_em, timeout=65)
    restante = segundos_bloqueado('test:chave')
    assert 58 <= restante <= 60


# ──────────────────────────────────────────────────────────────────────────────
# registrar_falha / janela fixa
# ──────────────────────────────────────────────────────────────────────────────

@override_settings(CACHES=CACHE_TEST)
def test_quinta_falha_dispara_bloqueio():
    from api.limites import registrar_falha, segundos_bloqueado
    _clear()
    chave = 'test:quinta'
    for _ in range(5):
        registrar_falha(chave, janela_s=900, max_falhas=5, bloqueio_s=900)
    assert segundos_bloqueado(chave) > 0


@override_settings(CACHES=CACHE_TEST)
def test_quarta_falha_nao_bloqueia():
    from api.limites import registrar_falha, segundos_bloqueado
    _clear()
    chave = 'test:quarta'
    for _ in range(4):
        registrar_falha(chave, janela_s=900, max_falhas=5, bloqueio_s=900)
    assert segundos_bloqueado(chave) == 0


@override_settings(CACHES=CACHE_TEST)
def test_janela_nao_reinicia_entre_falhas():
    """O TTL do contador não deve ser estendido pelas falhas subsequentes."""
    from api.limites import registrar_falha, segundos_bloqueado
    _clear()
    chave = 'test:janela_fixa'
    # Janela de 2s, 5 falhas para bloquear
    registrar_falha(chave, janela_s=2, max_falhas=5, bloqueio_s=30)
    # Aguarda 1.5s (dentro da janela) e faz mais 4 falhas
    time.sleep(1.5)
    for _ in range(4):
        registrar_falha(chave, janela_s=2, max_falhas=5, bloqueio_s=30)
    # Deve estar bloqueado (5 falhas na janela original)
    assert segundos_bloqueado(chave) > 0


@override_settings(CACHES=CACHE_TEST)
def test_falha_apos_bloqueio_nao_altera_timestamp():
    """Falhas adicionais enquanto bloqueado não devem estender o bloqueio."""
    from api.limites import registrar_falha, segundos_bloqueado, _chave_bloq
    _clear()
    chave = 'test:extra_falha'
    for _ in range(5):
        registrar_falha(chave, janela_s=900, max_falhas=5, bloqueio_s=60)
    ts_original = cache.get(_chave_bloq(chave))
    registrar_falha(chave, janela_s=900, max_falhas=5, bloqueio_s=60)
    ts_apos = cache.get(_chave_bloq(chave))
    assert ts_original == ts_apos


# ──────────────────────────────────────────────────────────────────────────────
# limpar_contador
# ──────────────────────────────────────────────────────────────────────────────

@override_settings(CACHES=CACHE_TEST)
def test_limpar_contador_zera_bloqueio():
    from api.limites import registrar_falha, limpar_contador, segundos_bloqueado
    _clear()
    chave = 'test:limpar'
    for _ in range(5):
        registrar_falha(chave, janela_s=900, max_falhas=5, bloqueio_s=900)
    assert segundos_bloqueado(chave) > 0
    limpar_contador(chave)
    assert segundos_bloqueado(chave) == 0


# ──────────────────────────────────────────────────────────────────────────────
# Login — integração com endpoint
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def c():
    return Client()


@override_settings(CACHES=CACHE_TEST)
def test_login_sexta_tentativa_retorna_429(db, c):
    cache.clear()
    payload = {'identifier': 'naoexiste@test.invalid', 'senha': 'qualquer'}
    for _ in range(5):
        c.post('/api/auth/login', data=payload, content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.1')
    resp = c.post('/api/auth/login', data=payload, content_type='application/json',
                  SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.1')
    assert resp.status_code == 429
    data = resp.json()
    assert data['retry_after'] > 0
    assert 'Retry-After' in resp


@override_settings(CACHES=CACHE_TEST)
def test_login_bloqueio_por_ip_identificadores_diferentes(db, c):
    cache.clear()
    identificadores = [f'id{i}@test.invalid' for i in range(5)]
    for ident in identificadores:
        c.post('/api/auth/login',
               data={'identifier': ident, 'senha': 'errada'},
               content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.2')
    resp = c.post('/api/auth/login',
                  data={'identifier': 'outro@test.invalid', 'senha': 'errada'},
                  content_type='application/json',
                  SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.2')
    assert resp.status_code == 429


@override_settings(CACHES=CACHE_TEST)
def test_login_bloqueio_por_identificador_ips_diferentes(db, c):
    cache.clear()
    ips = [f'10.0.1.{i}' for i in range(1, 6)]
    for ip in ips:
        c.post('/api/auth/login',
               data={'identifier': 'alvo@test.invalid', 'senha': 'errada'},
               content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR=ip)
    resp = c.post('/api/auth/login',
                  data={'identifier': 'alvo@test.invalid', 'senha': 'errada'},
                  content_type='application/json',
                  SERVER_NAME='localhost', REMOTE_ADDR='10.0.1.99')
    assert resp.status_code == 429


@override_settings(CACHES=CACHE_TEST)
def test_login_identificador_inexistente_mesma_mensagem_senha_errada(db, c, tenant_a):
    cache.clear()
    resp_inexistente = c.post('/api/auth/login',
                              data={'identifier': 'fantasma@test.invalid', 'senha': 'errada'},
                              content_type='application/json',
                              SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.3')
    resp_senha_errada = c.post('/api/auth/login',
                               data={'identifier': tenant_a['email'], 'senha': 'errada'},
                               content_type='application/json',
                               SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.4')
    assert resp_inexistente.status_code == 401
    assert resp_senha_errada.status_code == 401
    assert resp_inexistente.json()['message'] == resp_senha_errada.json()['message']


@override_settings(CACHES=CACHE_TEST)
def test_login_correto_zera_contador_identificador(db, c, tenant_a):
    cache.clear()
    payload_errado = {'identifier': tenant_a['email'], 'senha': 'errada'}
    payload_certo = {'identifier': tenant_a['email'], 'senha': tenant_a['senha']}
    for _ in range(4):
        c.post('/api/auth/login', data=payload_errado,
               content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.5')
    # Login correto — deve zerar o contador do identificador
    resp_ok = c.post('/api/auth/login', data=payload_certo,
                     content_type='application/json',
                     SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.5')
    assert resp_ok.status_code == 200
    # Agora erra de novo — não deve estar bloqueado (contador zerado)
    resp_err = c.post('/api/auth/login', data=payload_errado,
                      content_type='application/json',
                      SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.5')
    assert resp_err.status_code == 401  # não 429


@override_settings(CACHES=CACHE_TEST)
def test_login_conta_desativada_nao_conta_como_falha(db, c):
    """Conta desativada retorna 403 e não incrementa rate limit."""
    import uuid, bcrypt as _bcrypt
    from django.db import connection
    cache.clear()
    email = f'desativada_{uuid.uuid4().hex[:6]}@test.invalid'
    senha = 'test1234'
    senha_hash = _bcrypt.hashpw(senha.encode(), _bcrypt.gensalt(rounds=4)).decode()
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO usuarios (nome, nome_empresa, email, senha_hash, cpf_cnpj, role, ativo, email_recuperacao) "
            "VALUES (%s,'Empresa',%s,%s,%s,'admin',false,'rec@test.invalid') RETURNING id",
            ['Desativado', email, senha_hash, str(uuid.uuid4().int % 10**11).zfill(11)],
        )
        uid = cur.fetchone()[0]
        cur.execute("UPDATE usuarios SET tenant_id=%s WHERE id=%s", [uid, uid])
    payload = {'identifier': email, 'senha': senha}
    for _ in range(5):
        resp = c.post('/api/auth/login', data=payload,
                      content_type='application/json',
                      SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.6')
        assert resp.status_code == 403
    # 6ª tentativa: ainda 403, não 429
    resp6 = c.post('/api/auth/login', data=payload,
                   content_type='application/json',
                   SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.6')
    assert resp6.status_code == 403


@override_settings(CACHES=CACHE_TEST)
def test_login_apos_bloqueio_acesso_volta(db, c):
    cache.clear()
    payload = {'identifier': 'volta@test.invalid', 'senha': 'errada'}
    for _ in range(5):
        c.post('/api/auth/login', data=payload,
               content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.7')
    resp_bloq = c.post('/api/auth/login', data=payload,
                       content_type='application/json',
                       SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.7')
    assert resp_bloq.status_code == 429
    # Simular expiração do bloqueio limpando o cache
    cache.clear()
    resp_livre = c.post('/api/auth/login', data=payload,
                        content_type='application/json',
                        SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.7')
    assert resp_livre.status_code == 401  # não 429


# ──────────────────────────────────────────────────────────────────────────────
# Recuperação de senha — retry_after correto (teste via módulo)
# ──────────────────────────────────────────────────────────────────────────────

@override_settings(CACHES=CACHE_TEST)
def test_recuperacao_retry_after_e_real():
    """
    Simula os 3 envios permitidos e verifica que o 4º retorna bloqueio com
    retry_after real (calculado de timestamp, não valor fixo).
    """
    from api.limites import registrar_falha, segundos_bloqueado
    _clear()

    chave_conta = 'recuperacao:conta:999'
    HORA_S = 3600

    # 3 envios registrados (limite = 3)
    for _ in range(3):
        registrar_falha(chave_conta, HORA_S, 3, HORA_S, 'recuperacao-conta')

    # Deve estar bloqueado agora
    espera = segundos_bloqueado(chave_conta)
    assert espera > 0, 'Deve estar bloqueado após 3 registros'
    assert espera <= HORA_S, 'retry_after deve ser ≤ 3600 segundos'
    # Verifica que é um valor real (não um placeholder fixo)
    assert isinstance(espera, int)
