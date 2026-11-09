"""
Testes do registro de eventos de segurança e do aviso por e-mail.

Todos os testes mockam o banco (cursor) e o Resend para não fazer I/O real.
A lógica testada: quais eventos são emitidos, quais campos são populados,
que falhas não derrubam a requisição, e que o e-mail é enviado/não enviado.
"""
import json
import pytest
from unittest.mock import MagicMock, patch, call
from django.test import Client, override_settings

from api.eventos import registrar, _mascarar_email


# ══════════════════════════════════════════════════════════════════════════════
# Utilitários
# ══════════════════════════════════════════════════════════════════════════════

class FakeReq:
    def __init__(self, ip='1.2.3.4', ua='TestAgent/1.0'):
        self.META = {'REMOTE_ADDR': ip, 'HTTP_USER_AGENT': ua}


# ══════════════════════════════════════════════════════════════════════════════
# Testes de _mascarar_email
# ══════════════════════════════════════════════════════════════════════════════

class TestMascararEmail:

    def test_mascara_email_normal(self):
        assert _mascarar_email('lucas@gmail.com') == 'l***@gmail.com'

    def test_mascara_email_sem_arroba(self):
        assert _mascarar_email('semArroba') == '***'

    def test_mascara_email_vazio(self):
        assert _mascarar_email('') == '***'

    def test_mascara_email_none(self):
        assert _mascarar_email(None) == '***'

    def test_preserva_dominio(self):
        result = _mascarar_email('admin@empresa.com.br')
        assert result.endswith('@empresa.com.br')


# ══════════════════════════════════════════════════════════════════════════════
# Testes de registrar() — sem banco real
# ══════════════════════════════════════════════════════════════════════════════

class TestRegistrar:

    def test_registra_tipo_e_ip(self):
        req = FakeReq(ip='5.5.5.5')
        with patch('api.eventos._inserir') as mock_ins:
            registrar('login_falho', req)
        mock_ins.assert_called_once()
        tipo, tenant_id, usuario_id, ip, ua, detalhes_json = mock_ins.call_args[0]
        assert tipo == 'login_falho'
        assert ip == '5.5.5.5'

    def test_registra_detalhes_sem_dados_sensiveis(self):
        """Verifica que detalhes são serializados com e-mail mascarado."""
        req = FakeReq()
        detalhes = {'motivo': 'senha_errada', 'email_mascarado': 'l***@gmail.com'}
        with patch('api.eventos._inserir') as mock_ins:
            registrar('login_falho', req, detalhes=detalhes)
        _, _, _, _, _, detalhes_json = mock_ins.call_args[0]
        parsed = json.loads(detalhes_json)
        assert parsed.get('email_mascarado') == 'l***@gmail.com'

    def test_registra_sem_request_sem_ip(self):
        with patch('api.eventos._inserir') as mock_ins:
            registrar('cadastro', request=None, tenant_id=42)
        tipo, tenant_id, usuario_id, ip, ua, detalhes_json = mock_ins.call_args[0]
        assert tenant_id == 42
        assert ip is None

    def test_falha_no_banco_nao_levanta_excecao(self):
        req = FakeReq()
        with patch('api.eventos._inserir', side_effect=Exception('DB down')):
            registrar('login_falho', req)  # não deve levantar

    def test_ua_truncado_a_300_chars(self):
        ua_longo = 'A' * 500
        req = FakeReq(ua=ua_longo)
        with patch('api.eventos._inserir') as mock_ins:
            registrar('login_falho', req)
        _, _, _, _, ua, _ = mock_ins.call_args[0]
        assert len(ua) == 300


# ══════════════════════════════════════════════════════════════════════════════
# Testes de aviso_senha_alterada
# ══════════════════════════════════════════════════════════════════════════════

class TestAvisoSenhaAlterada:

    def test_envia_email_quando_resend_ok(self, monkeypatch):
        monkeypatch.setenv('RESEND_API_KEY', 're_test_key')
        from api.email_seguranca import aviso_senha_alterada
        with patch('api.email_seguranca.requests') as mock_req:
            mock_req.post.return_value.status_code = 200
            aviso_senha_alterada('rec@hotmail.com')
        mock_req.post.assert_called_once()
        _, kwargs = mock_req.post.call_args
        assert 'Se não foi você' in kwargs['json']['text']
        assert kwargs['json']['to'] == ['rec@hotmail.com']

    def test_falha_no_envio_nao_levanta_excecao(self, monkeypatch):
        monkeypatch.setenv('RESEND_API_KEY', 're_test_key')
        from api.email_seguranca import aviso_senha_alterada
        with patch('api.email_seguranca.requests') as mock_req:
            mock_req.post.side_effect = Exception('timeout')
            # Não deve levantar
            aviso_senha_alterada('rec@hotmail.com')

    def test_sem_resend_api_key_nao_levanta_excecao(self, monkeypatch):
        monkeypatch.delenv('RESEND_API_KEY', raising=False)
        from api.email_seguranca import aviso_senha_alterada
        aviso_senha_alterada('rec@hotmail.com')  # não deve levantar


# ══════════════════════════════════════════════════════════════════════════════
# Testes de integração — login e redefinição (mocked banco e Resend)
# ══════════════════════════════════════════════════════════════════════════════

CACHE_TEST = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-eventos',
    }
}


@override_settings(CACHES=CACHE_TEST)
def test_login_falho_chama_registrar(db, monkeypatch):
    """Login com credenciais inválidas → registrar('login_falho') é chamado."""
    from django.core.cache import cache
    cache.clear()
    with patch('api.eventos.registrar') as mock_ev:
        c = Client()
        c.post('/api/auth/login',
               data='{"identifier":"nao@existe.com","senha":"errada"}',
               content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.1.1.1')
    tipos = [call.args[0] for call in mock_ev.call_args_list]
    assert 'login_falho' in tipos


@override_settings(CACHES=CACHE_TEST)
def test_login_bloqueado_chama_registrar(db, monkeypatch):
    """Após 5 tentativas, o 6º login → registrar('login_bloqueado') é chamado."""
    from django.core.cache import cache
    cache.clear()
    with patch('api.eventos.registrar') as mock_ev:
        c = Client()
        payload = '{"identifier":"blq@test.invalid","senha":"errada"}'
        for _ in range(5):
            c.post('/api/auth/login', data=payload, content_type='application/json',
                   SERVER_NAME='localhost', REMOTE_ADDR='10.1.1.2')
        mock_ev.reset_mock()
        c.post('/api/auth/login', data=payload, content_type='application/json',
               SERVER_NAME='localhost', REMOTE_ADDR='10.1.1.2')
    tipos = [call.args[0] for call in mock_ev.call_args_list]
    assert 'login_bloqueado' in tipos


def test_redefinir_senha_envia_email_e_registra_evento(db, tenant_a):
    """redefinir_senha bem-sucedido → evento + e-mail de aviso."""
    import datetime
    import jwt as pyjwt, os, bcrypt as _bcrypt
    from django.db import connection

    secret = os.environ.get('JWT_SECRET', '')
    reset = os.environ.get('JWT_RESET_SECRET', '') or f'{secret}-reset'

    fake_hash = 'b' * 64
    imp = fake_hash[:16]
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
    with connection.cursor() as cur:
        cur.execute(
            "UPDATE usuarios SET reset_code_hash=%s, reset_code_expires_at=%s, reset_code_tentativas=0 WHERE id=%s",
            [fake_hash, expires, tenant_a['id']],
        )

    reset_token = pyjwt.encode(
        {'id': tenant_a['id'], 'escopo': 'recuperacao-redefinir', 'imp': imp,
         'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=600)},
        reset, algorithm='HS256',
    )

    with patch('api.eventos.registrar') as mock_ev, \
         patch('api.email_seguranca.requests') as mock_req:
        mock_req.post.return_value.status_code = 200
        c = Client()
        resp = c.post(
            '/api/auth/recuperacao/redefinir-senha',
            data='{"reset_token":"' + reset_token + '","nova_senha":"Rj#8Lm2v!QzP"}',
            content_type='application/json',
            SERVER_NAME='localhost',
        )

    assert resp.status_code == 200
    tipos = [call.args[0] for call in mock_ev.call_args_list]
    assert 'recuperacao_concluida' in tipos
    mock_req.post.assert_called_once()


def test_redefinir_senha_falha_email_nao_bloqueia(db, tenant_a):
    """Se o Resend falhar, redefinir_senha ainda retorna 200."""
    import datetime
    import jwt as pyjwt, os
    from django.db import connection

    secret = os.environ.get('JWT_SECRET', '')
    reset = os.environ.get('JWT_RESET_SECRET', '') or f'{secret}-reset'

    fake_hash = 'c' * 64
    imp = fake_hash[:16]
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
    with connection.cursor() as cur:
        cur.execute(
            "UPDATE usuarios SET reset_code_hash=%s, reset_code_expires_at=%s, reset_code_tentativas=0 WHERE id=%s",
            [fake_hash, expires, tenant_a['id']],
        )

    reset_token = pyjwt.encode(
        {'id': tenant_a['id'], 'escopo': 'recuperacao-redefinir', 'imp': imp,
         'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=600)},
        reset, algorithm='HS256',
    )

    with patch('api.eventos.registrar'), \
         patch('api.email_seguranca.requests') as mock_req:
        mock_req.post.side_effect = Exception('Resend offline')
        c = Client()
        resp = c.post(
            '/api/auth/recuperacao/redefinir-senha',
            data='{"reset_token":"' + reset_token + '","nova_senha":"Rj#8Lm2v!QzP2"}',
            content_type='application/json',
            SERVER_NAME='localhost',
        )

    assert resp.status_code == 200
