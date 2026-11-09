"""
Testes de cobertura — Etapa 19.

Foco: paths não cobertos nos views críticos (recuperacao, products, movements).
Baseline (08/11): recuperacao 40%, products 58%, movements 66%.
Meta: cada view ≥ 70%.
"""
import datetime
import hashlib
import hmac
import json
import os

import pytest
import jwt as pyjwt
from django.db import connection
from django.test import Client, override_settings
from unittest.mock import patch

CACHE_ISOLADO = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cobertura',
    }
}


# ── helpers de token (espelham recuperacao._segredo/_assinar/_hash_codigo) ──────

def _reset_secret():
    secret = os.environ.get('JWT_SECRET', 'dev-jwt-secret-inseguro')
    reset = os.environ.get('JWT_RESET_SECRET', '')
    return reset or f'{secret}-reset'


def _busca_token(user_id):
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
    return pyjwt.encode(
        {'id': user_id, 'escopo': 'recuperacao-busca', 'exp': exp},
        _reset_secret(),
        algorithm='HS256',
    )


def _hash_codigo(user_id, codigo):
    return hmac.new(
        _reset_secret().encode(),
        f'{user_id}:{codigo}'.encode(),
        hashlib.sha256,
    ).hexdigest()


def _reset_token(user_id, imp):
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
    return pyjwt.encode(
        {'id': user_id, 'escopo': 'recuperacao-redefinir', 'imp': imp, 'exp': exp},
        _reset_secret(),
        algorithm='HS256',
    )


# ══════════════════════════════════════════════════════════════════════════════
# Recuperação — buscar
# ══════════════════════════════════════════════════════════════════════════════

class TestRecuperacaoBuscar:
    URL = '/api/auth/recuperacao/buscar'

    def _post(self, body):
        # RECAPTCHA_SECRET='' desativa a verificação reCAPTCHA no view
        with patch.dict(os.environ, {'RECAPTCHA_SECRET': ''}):
            return Client().post(self.URL, data=json.dumps(body), content_type='application/json')

    def test_buscar_por_cpf_retorna_token(self, db, tenant_a):
        """buscar por CPF (11 dígitos) deve encontrar a conta e retornar busca_token."""
        import re as _re
        with connection.cursor() as cur:
            cur.execute('SELECT cpf_cnpj FROM usuarios WHERE id=%s', [tenant_a['id']])
            cpf = _re.sub(r'\D', '', cur.fetchone()[0])
        resp = self._post({'identificador': cpf})
        assert resp.status_code == 200
        assert 'busca_token' in resp.json()

    def test_buscar_conta_desativada_retorna_403(self, db, tenant_a):
        """Conta ativo=False → 403 conta_desativada."""
        with connection.cursor() as cur:
            cur.execute('UPDATE usuarios SET ativo=false WHERE id=%s', [tenant_a['id']])
        resp = self._post({'identificador': tenant_a['email']})
        assert resp.status_code == 403
        assert resp.json()['codigo'] == 'conta_desativada'

    def test_buscar_sem_email_recuperacao_retorna_422(self, db, tenant_a):
        """Conta sem email_recuperacao → 422 sem_email."""
        with connection.cursor() as cur:
            cur.execute('UPDATE usuarios SET email_recuperacao=NULL WHERE id=%s', [tenant_a['id']])
        resp = self._post({'identificador': tenant_a['email']})
        assert resp.status_code == 422
        assert resp.json()['codigo'] == 'sem_email'

    def test_buscar_identificador_vazio_retorna_400(self, db):
        resp = self._post({'identificador': ''})
        assert resp.status_code == 400

    def test_buscar_nao_encontrado_retorna_404(self, db):
        resp = self._post({'identificador': 'ninguem@test-stockflow.invalid'})
        assert resp.status_code == 404
        assert resp.json()['codigo'] == 'nao_encontrada'


# ══════════════════════════════════════════════════════════════════════════════
# Recuperação — enviar_codigo
# ══════════════════════════════════════════════════════════════════════════════

class TestRecuperacaoEnviarCodigo:
    URL = '/api/auth/recuperacao/enviar-codigo'

    @override_settings(CACHES=CACHE_ISOLADO)
    @patch('api.views.recuperacao._enviar_email_codigo')
    def test_enviar_codigo_ok_seta_hash(self, mock_send, db, tenant_a):
        """Envio válido deve chamar Resend, setar reset_code_hash e retornar 200."""
        from django.core.cache import cache
        cache.clear()
        token = _busca_token(tenant_a['id'])
        with patch.dict(os.environ, {'RESEND_API_KEY': 'fake-key'}):
            resp = Client().post(self.URL, data=json.dumps({'busca_token': token}),
                                 content_type='application/json')
        assert resp.status_code == 200
        assert mock_send.called
        with connection.cursor() as cur:
            cur.execute('SELECT reset_code_hash FROM usuarios WHERE id=%s', [tenant_a['id']])
            assert cur.fetchone()[0] is not None

    @override_settings(CACHES=CACHE_ISOLADO)
    def test_enviar_codigo_sem_resend_key_retorna_503(self, db, tenant_a):
        """Sem RESEND_API_KEY enviar_codigo deve retornar 503."""
        from django.core.cache import cache
        cache.clear()
        token = _busca_token(tenant_a['id'])
        with patch.dict(os.environ, {'RESEND_API_KEY': ''}):
            resp = Client().post(self.URL, data=json.dumps({'busca_token': token}),
                                 content_type='application/json')
        assert resp.status_code == 503

    @override_settings(CACHES=CACHE_ISOLADO)
    @patch('api.views.recuperacao._enviar_email_codigo')
    def test_enviar_codigo_reenvio_imediato_retorna_429(self, mock_send, db, tenant_a):
        """Segundo envio antes do intervalo de 60 s deve retornar 429."""
        from django.core.cache import cache
        cache.clear()
        token = _busca_token(tenant_a['id'])
        with patch.dict(os.environ, {'RESEND_API_KEY': 'fake-key'}):
            Client().post(self.URL, data=json.dumps({'busca_token': token}),
                          content_type='application/json')
            resp = Client().post(self.URL, data=json.dumps({'busca_token': token}),
                                 content_type='application/json')
        assert resp.status_code == 429

    def test_enviar_codigo_token_invalido_retorna_400(self, db):
        resp = Client().post(self.URL, data=json.dumps({'busca_token': 'invalido'}),
                             content_type='application/json')
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Recuperação — verificar_codigo
# ══════════════════════════════════════════════════════════════════════════════

class TestRecuperacaoVerificarCodigo:
    URL = '/api/auth/recuperacao/verificar-codigo'

    def _setup_code(self, user_id, codigo, expired=False):
        h = _hash_codigo(user_id, codigo)
        delta = -1 if expired else 15
        exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=delta)
        with connection.cursor() as cur:
            cur.execute(
                'UPDATE usuarios SET reset_code_hash=%s, reset_code_expires_at=%s, reset_code_tentativas=0 WHERE id=%s',
                [h, exp, user_id],
            )
        return h

    def test_codigo_correto_retorna_reset_token(self, db, tenant_a):
        """Código vigente e correto deve retornar reset_token."""
        codigo = '123456'
        self._setup_code(tenant_a['id'], codigo)
        resp = Client().post(
            self.URL,
            data=json.dumps({'busca_token': _busca_token(tenant_a['id']), 'codigo': codigo}),
            content_type='application/json',
        )
        assert resp.status_code == 200
        assert 'reset_token' in resp.json()

    def test_codigo_expirado_retorna_400(self, db, tenant_a):
        """Código expirado deve retornar 400."""
        self._setup_code(tenant_a['id'], '999999', expired=True)
        resp = Client().post(
            self.URL,
            data=json.dumps({'busca_token': _busca_token(tenant_a['id']), 'codigo': '999999'}),
            content_type='application/json',
        )
        assert resp.status_code == 400

    def test_codigo_errado_registra_tentativa(self, db, tenant_a):
        """Código errado deve retornar 400 com tentativas_restantes < 5."""
        self._setup_code(tenant_a['id'], '111111')
        resp = Client().post(
            self.URL,
            data=json.dumps({'busca_token': _busca_token(tenant_a['id']), 'codigo': '000000'}),
            content_type='application/json',
        )
        assert resp.status_code == 400
        assert resp.json().get('tentativas_restantes', -1) < 5

    def test_esgota_tentativas_zera_codigo(self, db, tenant_a):
        """Após MAX_TENTATIVAS erros o código deve ser invalidado (tentativas_restantes=0)."""
        self._setup_code(tenant_a['id'], '111111')
        resp = None
        for _ in range(5):
            resp = Client().post(
                self.URL,
                data=json.dumps({'busca_token': _busca_token(tenant_a['id']), 'codigo': '000000'}),
                content_type='application/json',
            )
        assert resp.status_code == 400
        assert resp.json().get('tentativas_restantes') == 0


# ══════════════════════════════════════════════════════════════════════════════
# Recuperação — redefinir_senha
# ══════════════════════════════════════════════════════════════════════════════

class TestRecuperacaoRedefinirSenha:
    URL = '/api/auth/recuperacao/redefinir-senha'

    def _setup_code(self, user_id, codigo):
        h = _hash_codigo(user_id, codigo)
        exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
        with connection.cursor() as cur:
            cur.execute(
                'UPDATE usuarios SET reset_code_hash=%s, reset_code_expires_at=%s, reset_code_tentativas=0 WHERE id=%s',
                [h, exp, user_id],
            )
        return h

    @patch('api.views.recuperacao.aviso_senha_alterada')
    def test_redefinir_senha_ok(self, mock_aviso, db, tenant_a):
        """reset_token válido + senha forte → 200 e senha alterada."""
        h = self._setup_code(tenant_a['id'], '654321')
        reset_tok = _reset_token(tenant_a['id'], h[:16])
        resp = Client().post(
            self.URL,
            data=json.dumps({'reset_token': reset_tok, 'nova_senha': 'NovaSenha@123'}),
            content_type='application/json',
        )
        assert resp.status_code == 200
        assert 'Senha alterada' in resp.json()['message']

    def test_redefinir_token_invalido_retorna_400(self, db):
        resp = Client().post(
            self.URL,
            data=json.dumps({'reset_token': 'invalido', 'nova_senha': 'NovaSenha@123'}),
            content_type='application/json',
        )
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Products — product_detail (PUT / DELETE)
# ══════════════════════════════════════════════════════════════════════════════

class TestProductDetail:

    def test_put_atualiza_produto(self, db, tenant_a, product_a):
        resp = Client().put(
            f'/api/products/{product_a["id"]}',
            data=json.dumps({'nome': 'Nome Novo', 'quantidade': 5, 'unidade': 'KG'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 200

    def test_put_produto_inexistente_retorna_404(self, db, tenant_a):
        resp = Client().put(
            '/api/products/999999',
            data=json.dumps({'nome': 'X', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 404

    def test_put_sem_nome_retorna_400(self, db, tenant_a, product_a):
        resp = Client().put(
            f'/api/products/{product_a["id"]}',
            data=json.dumps({'nome': '', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 400

    def test_delete_remove_produto(self, db, tenant_a, product_a):
        resp = Client().delete(
            f'/api/products/{product_a["id"]}',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 200

    def test_delete_produto_inexistente_retorna_404(self, db, tenant_a):
        resp = Client().delete(
            '/api/products/999999',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# Products — withdraw
# ══════════════════════════════════════════════════════════════════════════════

class TestProductWithdraw:

    def test_withdraw_ok_diminui_estoque(self, db, tenant_a, product_a):
        """Retirada válida deve diminuir o estoque e retornar 200."""
        resp = Client().post(
            f'/api/products/{product_a["id"]}/withdraw',
            data=json.dumps({'quantidade': 3}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 200
        with connection.cursor() as cur:
            cur.execute('SELECT quantidade FROM products WHERE id=%s', [product_a['id']])
            assert float(cur.fetchone()[0]) == 7.0

    def test_withdraw_estoque_insuficiente_retorna_400(self, db, tenant_a, product_a):
        """Retirada maior que estoque disponível deve retornar 400."""
        resp = Client().post(
            f'/api/products/{product_a["id"]}/withdraw',
            data=json.dumps({'quantidade': 999}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 400
        assert 'Estoque insuficiente' in resp.json()['message']

    def test_withdraw_nunca_deixa_estoque_negativo(self, db, tenant_a, product_a):
        """Estoque nunca pode ficar negativo após uma tentativa de retirada além do saldo."""
        Client().post(
            f'/api/products/{product_a["id"]}/withdraw',
            data=json.dumps({'quantidade': 11}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        with connection.cursor() as cur:
            cur.execute('SELECT quantidade FROM products WHERE id=%s', [product_a['id']])
            qty = float(cur.fetchone()[0])
        assert qty >= 0, f'Estoque ficou negativo: {qty}'

    def test_withdraw_produto_arquivado_retorna_409(self, db, tenant_a, product_a):
        with connection.cursor() as cur:
            cur.execute('UPDATE products SET arquivado=true WHERE id=%s', [product_a['id']])
        resp = Client().post(
            f'/api/products/{product_a["id"]}/withdraw',
            data=json.dumps({'quantidade': 1}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 409


# ══════════════════════════════════════════════════════════════════════════════
# Products — entry
# ══════════════════════════════════════════════════════════════════════════════

class TestProductEntry:

    def test_entry_aumenta_estoque(self, db, tenant_a, product_a):
        resp = Client().post(
            f'/api/products/{product_a["id"]}/entry',
            data=json.dumps({'quantidade': 5}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 200
        with connection.cursor() as cur:
            cur.execute('SELECT quantidade FROM products WHERE id=%s', [product_a['id']])
            assert float(cur.fetchone()[0]) == 15.0

    def test_entry_produto_arquivado_retorna_409(self, db, tenant_a, product_a):
        with connection.cursor() as cur:
            cur.execute('UPDATE products SET arquivado=true WHERE id=%s', [product_a['id']])
        resp = Client().post(
            f'/api/products/{product_a["id"]}/entry',
            data=json.dumps({'quantidade': 5}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 409


# ══════════════════════════════════════════════════════════════════════════════
# Products — archive / restore
# ══════════════════════════════════════════════════════════════════════════════

class TestProductArchiveRestore:

    def test_archive_ok(self, db, tenant_a, product_a):
        resp = Client().post(
            f'/api/products/{product_a["id"]}/archive',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 200

    def test_archive_ja_arquivado_retorna_409(self, db, tenant_a, product_a):
        with connection.cursor() as cur:
            cur.execute('UPDATE products SET arquivado=true WHERE id=%s', [product_a['id']])
        resp = Client().post(
            f'/api/products/{product_a["id"]}/archive',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 409

    def test_restore_ok(self, db, tenant_a, product_a):
        with connection.cursor() as cur:
            cur.execute('UPDATE products SET arquivado=true WHERE id=%s', [product_a['id']])
        resp = Client().post(
            f'/api/products/{product_a["id"]}/restore',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 200

    def test_restore_nao_arquivado_retorna_409(self, db, tenant_a, product_a):
        resp = Client().post(
            f'/api/products/{product_a["id"]}/restore',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        assert resp.status_code == 409


# ══════════════════════════════════════════════════════════════════════════════
# Movements — list_movements
# ══════════════════════════════════════════════════════════════════════════════

class TestListMovements:

    def test_tipo_invalido_retorna_400(self, db, tenant_a):
        resp = Client().get('/api/movements?tipo=invalido',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 400

    def test_data_inicial_invalida_retorna_400(self, db, tenant_a):
        resp = Client().get('/api/movements?from=nao-e-data',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 400

    def test_data_final_invalida_retorna_400(self, db, tenant_a):
        resp = Client().get('/api/movements?to=nao-e-data',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 400

    def test_data_inicial_maior_que_final_retorna_400(self, db, tenant_a):
        resp = Client().get('/api/movements?from=2026-01-10&to=2026-01-01',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 400

    def test_filtro_q_por_nome_produto(self, db, tenant_a):
        resp = Client().get('/api/movements?q=produto',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 200
        assert 'items' in resp.json()

    def test_filtro_tipo_valido_retorna_200(self, db, tenant_a):
        resp = Client().get('/api/movements?tipo=entrada',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 200

    def test_paginacao_pagina_zero_retorna_400(self, db, tenant_a):
        resp = Client().get('/api/movements?page=0',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 400

    def test_funcionario_ve_apenas_proprios_movimentos(self, db, tenant_a, funcionario_a, product_a):
        """role=user não pode ver movimentos de outros usuários do mesmo tenant."""
        # Admin cria uma movimentação
        Client().post(
            f'/api/products/{product_a["id"]}/withdraw',
            data=json.dumps({'quantidade': 1}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        )
        # Funcionário lista — não deve ver o movimento do admin
        resp = Client().get('/api/movements',
                            HTTP_AUTHORIZATION=f'Bearer {funcionario_a["token"]}')
        assert resp.status_code == 200
        for item in resp.json()['items']:
            assert item['user_id'] == funcionario_a['id'], (
                f'Funcionário viu movimento de outro usuário (user_id={item["user_id"]})'
            )


# ══════════════════════════════════════════════════════════════════════════════
# Movements — list_movement_users
# ══════════════════════════════════════════════════════════════════════════════

class TestListMovementUsers:

    def test_retorna_lista_json(self, db, tenant_a):
        resp = Client().get('/api/movements/users',
                            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}')
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
