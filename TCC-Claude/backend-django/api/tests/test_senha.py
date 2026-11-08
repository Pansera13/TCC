"""
Testes para a política de senha (api/senha.py) e seus pontos de entrada:
  - register (POST /api/auth/register)
  - create_user (POST /api/users)
  - redefinir_senha (POST /api/auth/recuperacao/redefinir-senha)
"""
import json
import uuid
import os
import datetime

import bcrypt
import jwt as pyjwt
import pytest
from django.test import Client
from django.db import connection

from api.senha import validar_senha, SENHA_MIN


# ── helpers locais ─────────────────────────────────────────────────────────────

def _cpf():
    return str(uuid.uuid4().int % 10 ** 11).zfill(11)


def _email():
    return f'pw_{uuid.uuid4().hex[:8]}@test-stockflow.invalid'


def _reset_secret():
    secret = os.environ.get('JWT_SECRET', '')
    reset = os.environ.get('JWT_RESET_SECRET', '')
    return reset or f'{secret}-reset'


# ── fixture: tenant com estado de reset válido ─────────────────────────────────

@pytest.fixture
def tenant_com_reset(db, tenant_a):
    """Adiciona estado de reset válido ao tenant_a para testar redefinir_senha."""
    fake_hash = 'a' * 64  # qualquer string não-nula de comprimento adequado
    imp = fake_hash[:16]
    expires = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)

    with connection.cursor() as cur:
        cur.execute(
            "UPDATE usuarios SET reset_code_hash=%s, reset_code_expires_at=%s, reset_code_tentativas=0 WHERE id=%s",
            [fake_hash, expires, tenant_a['id']],
        )

    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=600)
    reset_token = pyjwt.encode(
        {'id': tenant_a['id'], 'escopo': 'recuperacao-redefinir', 'imp': imp, 'exp': exp},
        _reset_secret(),
        algorithm='HS256',
    )
    return {**tenant_a, 'reset_token': reset_token}


# ══════════════════════════════════════════════════════════════════════════════
# Testes unitários de validar_senha (sem banco de dados)
# ══════════════════════════════════════════════════════════════════════════════

class TestValidarSenha:

    def test_senha_valida_sem_contexto(self):
        assert validar_senha('Rj#8Lm2v!') is None

    def test_senha_valida_com_contexto(self):
        assert validar_senha('XkTr$9zQ!', email='lucas@test.com', nome='Lucas Pansera') is None

    def test_senha_curta_rejeitada(self):
        assert validar_senha('Ab1!') is not None

    def test_exatamente_min_chars_aceita(self):
        # 'XkTr$9zQ' tem exatamente SENHA_MIN caracteres e não é senha comum
        assert validar_senha('XkTr$9zQ') is None

    def test_abaixo_do_min_rejeitada(self):
        senha_curta = 'A' * (SENHA_MIN - 1)
        assert validar_senha(senha_curta) is not None

    def test_senha_vazia_rejeitada(self):
        assert validar_senha('') is not None

    def test_senha_comum_rejeitada(self):
        assert validar_senha('password123') is not None

    def test_senha_comum_maiuscula_rejeitada(self):
        # a verificação deve ser case-insensitive
        assert validar_senha('PASSWORD123') is not None

    def test_senha_comum_mista_rejeitada(self):
        assert validar_senha('Password123') is not None

    def test_senha_comum_pt_rejeitada(self):
        assert validar_senha('senha123') is not None

    def test_similar_ao_local_do_email_rejeitada(self):
        assert validar_senha('joaosilva99', email='joaosilva@empresa.com') is not None

    def test_similar_ao_nome_rejeitada(self):
        # senha contém 'marcelo' que é parte do nome
        assert validar_senha('marcelo99abc', nome='Marcelo Santos') is not None

    def test_local_part_curto_nao_bloqueia(self):
        # local part com 2 chars — não deve bloquear por similaridade
        assert validar_senha('XkTr$9zQ!', email='ab@test.com') is None

    def test_parte_nome_curta_nao_bloqueia(self):
        # partes do nome com 2 chars — não deve bloquear por similaridade
        assert validar_senha('XkTr$9zQ!', nome='Li Bo') is None

    def test_email_sem_arroba_nao_quebra(self):
        # email malformado não deve levantar exceção
        assert validar_senha('XkTr$9zQ!', email='sem-arroba') is None

    def test_mensagem_comprimento_contem_minimo(self):
        err = validar_senha('1234')
        assert str(SENHA_MIN) in err

    def test_mensagem_comum(self):
        err = validar_senha('12345678')
        assert 'comum' in err.lower()

    def test_mensagem_similar_email(self):
        err = validar_senha('lucasXYZ123', email='lucas@test.com')
        assert 'e-mail' in err.lower()

    def test_mensagem_similar_nome(self):
        err = validar_senha('carlosXYZ', nome='Carlos Souza')
        assert 'nome' in err.lower()

    def test_nome_sem_partes_longas_nao_bloqueia(self):
        # todos os tokens do nome têm < 3 chars
        assert validar_senha('XkTr$9zQ!', nome='Li Bo Al') is None

    def test_senha_que_e_substrings_do_local(self):
        # senha está contida no local — também deve bloquear (senha_lower in t)
        assert validar_senha('john', email='johndoe@test.com') is not None

    def test_email_e_nome_vazios_nao_dispara_similaridade(self):
        assert validar_senha('Rj#8Lm2v!', email='', nome='') is None


# ══════════════════════════════════════════════════════════════════════════════
# Integração: POST /api/auth/register
# ══════════════════════════════════════════════════════════════════════════════

class TestPoliticaSenhaRegister:
    URL = '/api/auth/register'

    def _corpo(self, senha):
        email = _email()
        return {
            'nome': 'Usuario Teste',
            'nome_empresa': 'Empresa Teste',
            'cpf_cnpj': _cpf(),
            'email': email,
            'senha': senha,
            'email_recuperacao': 'rec@example.invalid',
            'email_recuperacao_confirmacao': 'rec@example.invalid',
            # Token fake: passa o check de presença; retornamos em validar_senha antes da verificação real
            'recaptchaToken': 'fake-token-para-teste',
        }

    def test_senha_comum_retorna_400_com_field(self, db):
        c = Client()
        resp = c.post(self.URL, data=json.dumps(self._corpo('password123')), content_type='application/json')
        assert resp.status_code == 400
        assert resp.json().get('field') == 'senha'

    def test_senha_curta_retorna_400(self, db):
        c = Client()
        resp = c.post(self.URL, data=json.dumps(self._corpo('abc123')), content_type='application/json')
        assert resp.status_code == 400
        assert resp.json().get('field') == 'senha'

    def test_senha_similar_ao_email_retorna_400(self, db):
        corpo = self._corpo('dummy')
        local = corpo['email'].split('@')[0]  # pw_<hex8>
        corpo['senha'] = local + '99extra'  # pw_<hex8>99extra ≥ 8 chars e contém local
        c = Client()
        resp = c.post(self.URL, data=json.dumps(corpo), content_type='application/json')
        assert resp.status_code == 400
        assert resp.json().get('field') == 'senha'


# ══════════════════════════════════════════════════════════════════════════════
# Integração: POST /api/auth/recuperacao/redefinir-senha
# ══════════════════════════════════════════════════════════════════════════════

class TestPoliticaSenhaRedefinir:
    URL = '/api/auth/recuperacao/redefinir-senha'

    def _post(self, reset_token, nova_senha):
        c = Client()
        return c.post(
            self.URL,
            data=json.dumps({'reset_token': reset_token, 'nova_senha': nova_senha}),
            content_type='application/json',
        )

    def test_senha_comum_retorna_400_com_field(self, tenant_com_reset):
        resp = self._post(tenant_com_reset['reset_token'], 'password123')
        assert resp.status_code == 400
        assert resp.json().get('field') == 'nova_senha'

    def test_senha_curta_retorna_400(self, tenant_com_reset):
        resp = self._post(tenant_com_reset['reset_token'], 'abc')
        assert resp.status_code == 400
        assert resp.json().get('field') == 'nova_senha'

    def test_senha_similar_ao_email_retorna_400(self, tenant_com_reset):
        local = tenant_com_reset['email'].split('@')[0]  # pw_<hex8>
        senha = local + '99extra'  # garante >= 8 chars e contém local
        resp = self._post(tenant_com_reset['reset_token'], senha)
        assert resp.status_code == 400
        assert resp.json().get('field') == 'nova_senha'

    def test_senha_forte_retorna_200(self, tenant_com_reset):
        resp = self._post(tenant_com_reset['reset_token'], 'Rj#8Lm2v!QzP')
        assert resp.status_code == 200
