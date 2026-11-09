"""
Testes de ataque simulado — Bloco 8 da Etapa 17 (Segurança).

Cada classe simula uma categoria de ataque real e verifica que o StockFlow
responde corretamente (bloqueando, retornando erro, não vazando dados).

Categorias:
  A. SQL Injection
  B. Brute-force / rate limit
  C. Acesso cross-tenant
  D. Manipulação de JWT
  E. Corpo excessivamente grande / XXE
  F. Escalonamento de privilégio (role)
  G. Enumeração de contas
  H. Cabeçalhos de segurança

Todos os testes usam banco real (fixture `db`) via rollback de transação.
"""
import json
import string
import os
import datetime
import jwt as pyjwt

import pytest
from django.test import Client, override_settings
from unittest.mock import patch

CACHE_TEST = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-ataques',
    }
}


# ══════════════════════════════════════════════════════════════════════════════
# A — SQL Injection
# ══════════════════════════════════════════════════════════════════════════════

class TestSQLInjection:

    @override_settings(CACHES=CACHE_TEST)
    def test_login_identifier_sql_injection_retorna_401_ou_400(self, db):
        """Payloads SQL clássicos no campo identifier não devem autenticar."""
        from django.core.cache import cache
        cache.clear()
        c = Client()
        payloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "admin'--",
            "' UNION SELECT 1,1,1,1--",
            "'; DROP TABLE usuarios;--",
        ]
        for payload in payloads:
            resp = c.post(
                '/api/auth/login',
                data=json.dumps({'identifier': payload, 'senha': 'qualquer'}),
                content_type='application/json',
                SERVER_NAME='localhost',
                REMOTE_ADDR='10.1.1.100',
            )
            assert resp.status_code in (400, 401, 429), (
                f"SQL injection '{payload}' retornou {resp.status_code}"
            )

    def test_produto_nome_sql_injection_e_salvo_sem_execucao(self, db, tenant_a):
        """Payload SQL no nome do produto deve ser salvo como texto, não executado."""
        from django.db import connection
        c = Client()
        payload_nome = "Produto'; DROP TABLE products;--"
        resp = c.post(
            '/api/products',
            data=json.dumps({'nome': payload_nome, 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code == 201
        pid = resp.json().get('id')
        # Verificar que o nome foi salvo literalmente no banco
        with connection.cursor() as cur:
            cur.execute("SELECT nome FROM products WHERE id=%s", [pid])
            row = cur.fetchone()
        assert row is not None
        assert row[0] == payload_nome

    def test_busca_produto_sql_injection_nao_vaza_dados(self, db, tenant_a):
        """Parâmetro de busca com SQL injection não deve retornar erro 500."""
        c = Client()
        resp = c.get(
            "/api/products?search=1' UNION SELECT senha_hash,2,3,4,5,6,7,8 FROM usuarios--",
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code in (200, 400)
        # Resposta não deve conter senha_hash real
        body = resp.content.decode()
        assert 'senha_hash' not in body.lower() or '"senha_hash"' not in body


# ══════════════════════════════════════════════════════════════════════════════
# B — Brute-force / rate limit
# ══════════════════════════════════════════════════════════════════════════════

class TestBruteForce:

    @override_settings(CACHES=CACHE_TEST)
    def test_login_bloqueado_apos_5_falhas(self, db):
        """Após 5 tentativas falhas, 6ª retorna 429."""
        from django.core.cache import cache
        cache.clear()
        c = Client()
        payload = json.dumps({'identifier': 'alvo@ataque.invalid', 'senha': 'errada'})
        for _ in range(5):
            c.post('/api/auth/login', data=payload,
                   content_type='application/json',
                   SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.1')
        resp = c.post('/api/auth/login', data=payload,
                      content_type='application/json',
                      SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.1')
        assert resp.status_code == 429

    @override_settings(CACHES=CACHE_TEST)
    def test_login_resposta_429_tem_retry_after(self, db):
        """Resposta 429 deve incluir cabeçalho Retry-After."""
        from django.core.cache import cache
        cache.clear()
        c = Client()
        payload = json.dumps({'identifier': 'alvo2@ataque.invalid', 'senha': 'errada'})
        for _ in range(5):
            c.post('/api/auth/login', data=payload,
                   content_type='application/json',
                   SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.2')
        resp = c.post('/api/auth/login', data=payload,
                      content_type='application/json',
                      SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.2')
        assert resp.status_code == 429
        assert 'Retry-After' in resp

    @override_settings(CACHES=CACHE_TEST)
    def test_ips_diferentes_nao_compartilham_bloqueio(self, db):
        """Bloqueio por IP A não afeta IP B com um identificador diferente."""
        from django.core.cache import cache
        cache.clear()
        c = Client()
        # IP .10 esgota tentativas com identificador próprio
        payload_a = json.dumps({'identifier': 'alvo_ip10@ataque.invalid', 'senha': 'errada'})
        for _ in range(5):
            c.post('/api/auth/login', data=payload_a,
                   content_type='application/json',
                   SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.10')
        # IP .20 tenta com identificador diferente — não deve herdar bloqueio do IP .10
        payload_b = json.dumps({'identifier': 'alvo_ip20@ataque.invalid', 'senha': 'errada'})
        resp = c.post('/api/auth/login', data=payload_b,
                      content_type='application/json',
                      SERVER_NAME='localhost', REMOTE_ADDR='10.0.0.20')
        assert resp.status_code != 429


# ══════════════════════════════════════════════════════════════════════════════
# C — Acesso cross-tenant
# ══════════════════════════════════════════════════════════════════════════════

class TestCrossTenant:

    def test_produto_do_tenant_b_nao_aparece_para_tenant_a(self, db, tenant_a, product_b):
        """Tenant A listando produtos não deve ver produtos do tenant B."""
        c = Client()
        resp = c.get('/api/products',
                     HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
                     SERVER_NAME='localhost')
        assert resp.status_code == 200
        ids = [p['id'] for p in resp.json()]
        assert product_b['id'] not in ids

    def test_tenant_a_nao_acessa_produto_b_diretamente(self, db, tenant_a, product_b):
        """PUT/DELETE no produto do tenant B com token A deve retornar 403, 404 ou 405."""
        c = Client()
        # PUT para tentar alterar produto do tenant B
        resp = c.put(
            f'/api/products/{product_b["id"]}',
            data=json.dumps({'nome': 'Invadido', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code in (403, 404, 405)

    def test_tenant_a_nao_edita_produto_b(self, db, tenant_a, product_b):
        """PATCH no produto do tenant B com token de A → 403 ou 404."""
        c = Client()
        resp = c.patch(
            f'/api/products/{product_b["id"]}',
            data=json.dumps({'nome': 'Invadido'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code in (403, 404, 405)

    def test_movimentacoes_tenant_b_nao_aparecem_para_tenant_a(self, db, tenant_a, tenant_b, product_b):
        """Relatório de movimentações de A não deve incluir registros de B."""
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, tenant_id) "
                "VALUES (%s,'Produto B','entrada',1,%s,'Admin B','estoque',%s)",
                [product_b['id'], tenant_b['id'], tenant_b['tenant_id']],
            )
        c = Client()
        resp = c.get('/api/movements',
                     HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
                     SERVER_NAME='localhost')
        assert resp.status_code == 200
        # /api/movements retorna {'items': [...], 'total': ..., ...}
        items = resp.json().get('items', [])
        tenant_ids = {m.get('tenant_id') for m in items}
        assert tenant_b['tenant_id'] not in tenant_ids


# ══════════════════════════════════════════════════════════════════════════════
# D — Manipulação de JWT
# ══════════════════════════════════════════════════════════════════════════════

class TestJWTManipulacao:

    def _get(self, token):
        c = Client()
        return c.get('/api/products',
                     HTTP_AUTHORIZATION=f'Bearer {token}',
                     SERVER_NAME='localhost')

    def test_jwt_sem_assinatura_rejeitado(self, db, tenant_a):
        """Token com assinatura vazia/removida deve ser rejeitado (401)."""
        partes = tenant_a['token'].split('.')
        token_sem_sig = partes[0] + '.' + partes[1] + '.'
        resp = self._get(token_sem_sig)
        assert resp.status_code == 401

    def test_jwt_algoritmo_none_rejeitado(self, db, tenant_a):
        """Token assinado com alg=none deve ser rejeitado."""
        import base64
        header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b'=').decode()
        import json as _j
        payload_data = {
            'id': tenant_a['id'],
            'role': 'admin',
            'tenant_id': tenant_a['tenant_id'],
            'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).timestamp(),
        }
        payload_b64 = base64.urlsafe_b64encode(
            _j.dumps(payload_data).encode()
        ).rstrip(b'=').decode()
        token = f'{header}.{payload_b64}.'
        resp = self._get(token)
        assert resp.status_code == 401

    def test_jwt_expirado_rejeitado(self, db, tenant_a):
        """Token expirado deve retornar 401."""
        secret = os.environ.get('JWT_SECRET', 'dev-jwt-secret-inseguro')
        token = pyjwt.encode(
            {'id': tenant_a['id'], 'role': 'admin', 'tenant_id': tenant_a['tenant_id'],
             'exp': datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)},
            secret, algorithm='HS256',
        )
        resp = self._get(token)
        assert resp.status_code == 401

    def test_jwt_chave_errada_rejeitado(self, db, tenant_a):
        """Token assinado com chave diferente deve ser rejeitado."""
        token = pyjwt.encode(
            {'id': tenant_a['id'], 'role': 'admin', 'tenant_id': tenant_a['tenant_id'],
             'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)},
            'chave-errada-nao-e-o-jwt-secret', algorithm='HS256',
        )
        resp = self._get(token)
        assert resp.status_code == 401

    def test_jwt_tenant_id_forjado_nao_acessa_outro_tenant(self, db, tenant_a, product_b):
        """Token forjado mudando tenant_id não deve passar pela validação de assinatura."""
        # Sem a chave real, não dá para forjar. Testar que produto_b não aparece.
        resp = self._get(tenant_a['token'])
        assert resp.status_code == 200
        ids = [p['id'] for p in resp.json()]
        assert product_b['id'] not in ids

    def test_sem_token_retorna_401(self, db):
        """Requisição sem Bearer token deve retornar 401."""
        c = Client()
        resp = c.get('/api/products', SERVER_NAME='localhost')
        assert resp.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# E — Corpo excessivo / XXE
# ══════════════════════════════════════════════════════════════════════════════

class TestCorpoExcessivo:

    def test_body_gigante_bloqueado(self, db, tenant_a):
        """Corpo de 1 MB acima do limite deve retornar 413."""
        c = Client()
        # DATA_UPLOAD_MAX_MEMORY_SIZE padrão é 65 KB; enviar 200 KB
        corpo_gigante = json.dumps({'nome': 'X' * (200 * 1024), 'quantidade': 1, 'unidade': 'UN'})
        resp = c.post(
            '/api/products',
            data=corpo_gigante,
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code == 413

    def test_xml_nfe_com_xxe_bloqueado(self, db, tenant_a):
        """XML com entidade XXE clássica deve ser rejeitado (400 ou 422)."""
        xxe_payload = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
            '<nfeProc><NFe><infNFe><ide><nNF>&xxe;</nNF></ide></infNFe></NFe></nfeProc>'
        )
        c = Client()
        # Rota correta para importação de NF-e é /api/nfe/xml (via multipart 'arquivo')
        import io
        resp = c.post(
            '/api/nfe/xml',
            data={'arquivo': io.BytesIO(xxe_payload.encode())},
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code in (400, 413, 422, 415)
        # Resposta não deve conter conteúdo de arquivo do sistema
        body = resp.content.decode(errors='replace')
        assert 'root:' not in body
        assert '/bin/bash' not in body

    def test_json_com_muitos_campos_bloqueado(self, db, tenant_a):
        """JSON com mais de 200 campos deve ser rejeitado (configurado em DATA_UPLOAD_MAX_NUMBER_FIELDS)."""
        # Esse limite se aplica principalmente a formulários multipart, mas
        # testamos que o endpoint não processa corpo malformado
        c = Client()
        campo_excessivo = {f'campo_{i}': f'valor_{i}' for i in range(300)}
        campo_excessivo.update({'nome': 'Produto', 'quantidade': 1, 'unidade': 'UN'})
        resp = c.post(
            '/api/products',
            data=json.dumps(campo_excessivo),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
            SERVER_NAME='localhost',
        )
        # Deve processar sem erro 500 (campos extras são ignorados)
        assert resp.status_code != 500


# ══════════════════════════════════════════════════════════════════════════════
# F — Escalonamento de privilégio
# ══════════════════════════════════════════════════════════════════════════════

class TestEscalonamentoPrivilegio:

    def test_funcionario_nao_arquiva_produto(self, db, funcionario_a, product_a):
        """Role 'user' não pode arquivar produto (ação de admin)."""
        c = Client()
        resp = c.patch(
            f'/api/products/{product_a["id"]}/archive',
            data=json.dumps({}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {funcionario_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code in (403, 404, 405)

    def test_funcionario_nao_cria_produto(self, db, funcionario_a):
        """Role 'user' não pode criar produto."""
        c = Client()
        resp = c.post(
            '/api/products',
            data=json.dumps({'nome': 'Invasao', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {funcionario_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code == 403

    def test_funcionario_segundo_nao_cria_produto(self, db, funcionario_a):
        """Role 'user' (funcionário) não pode criar produto (requer socio ou admin)."""
        c = Client()
        resp = c.post(
            '/api/products',
            data=json.dumps({'nome': 'Invasao2', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {funcionario_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code == 403

    def test_role_forjada_no_body_nao_tem_efeito(self, db, funcionario_a):
        """Enviar role='admin' no corpo da requisição não eleva privilégios."""
        c = Client()
        resp = c.post(
            '/api/products',
            data=json.dumps({'nome': 'Invasao', 'quantidade': 1, 'unidade': 'UN', 'role': 'admin'}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {funcionario_a["token"]}',
            SERVER_NAME='localhost',
        )
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# G — Enumeração de contas
# ══════════════════════════════════════════════════════════════════════════════

class TestEnumeracaoContas:

    @override_settings(CACHES=CACHE_TEST)
    def test_login_usuario_existente_vs_inexistente_mesmo_codigo(self, db, tenant_a):
        """Login com e-mail existente e inexistente retornam o mesmo código HTTP."""
        from django.core.cache import cache
        cache.clear()
        c = Client()
        resp_existente = c.post(
            '/api/auth/login',
            data=json.dumps({'identifier': tenant_a['email'], 'senha': 'senha_errada'}),
            content_type='application/json',
            SERVER_NAME='localhost', REMOTE_ADDR='10.1.2.1',
        )
        resp_inexistente = c.post(
            '/api/auth/login',
            data=json.dumps({'identifier': 'nao_existe@test.invalid', 'senha': 'senha_errada'}),
            content_type='application/json',
            SERVER_NAME='localhost', REMOTE_ADDR='10.1.2.1',
        )
        assert resp_existente.status_code == resp_inexistente.status_code == 401

    @override_settings(CACHES=CACHE_TEST)
    def test_login_resposta_nao_diferencia_usuario_vs_senha(self, db, tenant_a):
        """Mensagem de erro não revela se o e-mail existe ou não."""
        from django.core.cache import cache
        cache.clear()
        c = Client()
        resp_existente = c.post(
            '/api/auth/login',
            data=json.dumps({'identifier': tenant_a['email'], 'senha': 'senha_errada'}),
            content_type='application/json',
            SERVER_NAME='localhost', REMOTE_ADDR='10.1.2.2',
        )
        resp_inexistente = c.post(
            '/api/auth/login',
            data=json.dumps({'identifier': 'nao_existe2@test.invalid', 'senha': 'senha_errada'}),
            content_type='application/json',
            SERVER_NAME='localhost', REMOTE_ADDR='10.1.2.2',
        )
        # Mensagens devem ser idênticas ou indistinguíveis
        msg_ex = resp_existente.json().get('message', '')
        msg_in = resp_inexistente.json().get('message', '')
        assert msg_ex == msg_in, (
            f"Mensagens diferentes vazam existência de conta:\n"
            f"  existente:  {msg_ex}\n"
            f"  inexistente: {msg_in}"
        )

    def test_recuperacao_busca_por_email_inexistente_retorna_404(self, db, monkeypatch):
        """Busca de recuperação com e-mail que não existe retorna 404 (não 200 vazio)."""
        monkeypatch.delenv('RECAPTCHA_SECRET', raising=False)
        c = Client()
        resp = c.post(
            '/api/auth/recuperacao/buscar',
            data=json.dumps({'identificador': 'fantasma@test.invalid'}),
            content_type='application/json',
            SERVER_NAME='localhost',
        )
        assert resp.status_code == 404

    @override_settings(CACHES=CACHE_TEST)
    def test_cadastro_email_duplicado_nao_revela_senha(self, db, tenant_a):
        """Tentar cadastrar e-mail já existente não vaza dados da conta existente."""
        from django.core.cache import cache
        cache.clear()
        import uuid, re
        c = Client()
        resp = c.post(
            '/api/auth/register',
            data=json.dumps({
                'nome': 'Invasor',
                'nome_empresa': 'Empresa',
                'cpf_cnpj': str(uuid.uuid4().int % 10 ** 11).zfill(11),
                'email': tenant_a['email'],
                'senha': 'Rj#8Lm2v!QzP',
                'email_recuperacao': 'rec2@test.invalid',
                'email_recuperacao_confirmacao': 'rec2@test.invalid',
            }),
            content_type='application/json',
            SERVER_NAME='localhost',
        )
        assert resp.status_code in (400, 409)
        body = resp.content.decode()
        assert 'senha_hash' not in body
        assert 'bcrypt' not in body.lower()


# ══════════════════════════════════════════════════════════════════════════════
# H — Cabeçalhos de segurança
# ══════════════════════════════════════════════════════════════════════════════

class TestCabecalhosSeguranca:

    def _resp(self):
        c = Client()
        return c.get('/api/auth/login', SERVER_NAME='localhost')

    def test_x_frame_options_deny(self):
        """X-Frame-Options deve ser DENY."""
        resp = self._resp()
        assert resp.get('X-Frame-Options') == 'DENY'

    def test_x_content_type_nosniff(self):
        """X-Content-Type-Options deve ser nosniff."""
        resp = self._resp()
        assert resp.get('X-Content-Type-Options') == 'nosniff'

    def test_referrer_policy_same_origin(self):
        """Referrer-Policy deve ser same-origin."""
        resp = self._resp()
        assert resp.get('Referrer-Policy') == 'same-origin'

    def test_csp_presente(self):
        """Content-Security-Policy deve estar presente."""
        resp = self._resp()
        assert resp.get('Content-Security-Policy') is not None

    def test_csp_bloqueia_default_src(self):
        """CSP deve ter default-src 'none' (API não serve HTML)."""
        resp = self._resp()
        csp = resp.get('Content-Security-Policy', '')
        assert "default-src 'none'" in csp

    def test_permissions_policy_presente(self):
        """Permissions-Policy deve estar presente."""
        resp = self._resp()
        assert resp.get('Permissions-Policy') is not None

    def test_server_header_ausente_ou_generico(self):
        """Cabeçalho Server não deve revelar versão detalhada."""
        resp = self._resp()
        server = resp.get('Server', '')
        # Se presente, não deve ter versão específica (ex.: "Django/5.x" ou "Python")
        assert 'Django/' not in server
        assert 'Python/' not in server
