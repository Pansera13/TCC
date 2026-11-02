"""Testes de integração para o endpoint POST /api/products/lote."""
import json
import pytest
from django.db import connection
from django.test import Client

AUTH_HEADER = 'HTTP_AUTHORIZATION'


def _auth(token):
    return {AUTH_HEADER: f'Bearer {token}'}


def _post_lote(c, itens, token=None):
    headers = _auth(token) if token else {}
    return c.post(
        '/api/products/lote',
        data=json.dumps({'itens': itens}),
        content_type='application/json',
        **headers,
    )


def _item(nome='Produto X', quantidade=5, unidade='UN', nfe_chave=None, **extra):
    d = {'nome': nome, 'quantidade': quantidade, 'unidade': unidade}
    if nfe_chave is not None:
        d['nfe_chave'] = nfe_chave
    d.update(extra)
    return d


# ── permissão ─────────────────────────────────────────────────────────────────

class TestBatchPermissao:
    @pytest.mark.django_db
    def test_sem_token_retorna_401(self, c):
        resp = _post_lote(c, [_item()])
        assert resp.status_code == 401

    @pytest.mark.django_db
    def test_user_sem_produto_cadastrar_retorna_403(self, c, funcionario_a):
        resp = _post_lote(c, [_item()], token=funcionario_a['token'])
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_admin_pode_importar(self, c, tenant_a):
        resp = _post_lote(c, [_item()], token=tenant_a['token'])
        assert resp.status_code == 201


# ── validação de entrada ───────────────────────────────────────────────────────

class TestBatchValidacao:
    @pytest.mark.django_db
    def test_lista_vazia_retorna_400(self, c, tenant_a):
        resp = _post_lote(c, [], token=tenant_a['token'])
        assert resp.status_code == 400
        assert 'message' in resp.json()

    @pytest.mark.django_db
    def test_itens_ausente_retorna_400(self, c, tenant_a):
        resp = c.post(
            '/api/products/lote',
            data=json.dumps({}),
            content_type='application/json',
            **_auth(tenant_a['token']),
        )
        assert resp.status_code == 400

    @pytest.mark.django_db
    def test_lote_acima_do_limite_retorna_400(self, c, tenant_a, settings):
        settings.NFE_BATCH_LIMIT = 2
        itens = [_item(nome=f'P{i}') for i in range(3)]
        resp = _post_lote(c, itens, token=tenant_a['token'])
        assert resp.status_code == 400
        assert 'message' in resp.json()

    @pytest.mark.django_db
    def test_item_sem_nome_retorna_400(self, c, tenant_a):
        resp = _post_lote(c, [{'quantidade': 5, 'unidade': 'UN'}], token=tenant_a['token'])
        assert resp.status_code == 400

    @pytest.mark.django_db
    def test_item_sem_unidade_retorna_400(self, c, tenant_a):
        resp = _post_lote(c, [{'nome': 'X', 'quantidade': 5}], token=tenant_a['token'])
        assert resp.status_code == 400

    @pytest.mark.django_db
    def test_item_quantidade_invalida_retorna_400(self, c, tenant_a):
        resp = _post_lote(c, [_item(quantidade=-1)], token=tenant_a['token'])
        assert resp.status_code == 400


# ── sucesso: criação e empilhamento ───────────────────────────────────────────

class TestBatchSucesso:
    @pytest.mark.django_db
    def test_cria_produto_novo(self, c, tenant_a):
        resp = _post_lote(c, [_item('Novo Produto')], token=tenant_a['token'])
        assert resp.status_code == 201
        data = resp.json()
        assert data['criados'] == 1
        assert data['empilhados'] == 0

    @pytest.mark.django_db
    def test_empilha_produto_existente_com_nfe_chave(self, c, tenant_a, product_a):
        chave = '35230101234567000199550010000000011000000011'
        itens = [_item(nome='Produto A', quantidade=3, nfe_chave=chave)]
        resp = _post_lote(c, itens, token=tenant_a['token'])
        assert resp.status_code == 201
        data = resp.json()
        assert data['criados'] == 0
        assert data['empilhados'] == 1

        with connection.cursor() as cur:
            cur.execute("SELECT quantidade FROM products WHERE id=%s", [product_a['id']])
            qty = cur.fetchone()[0]
        assert float(qty) == 13  # 10 original + 3 empilhado

    @pytest.mark.django_db
    def test_mix_criacao_e_empilhamento(self, c, tenant_a, product_a):
        chave = '35230101234567000199550010000000021000000021'
        itens = [
            _item(nome='Produto A', quantidade=2, nfe_chave=chave),  # empilha
            _item(nome='Produto Novo', quantidade=7, nfe_chave=chave),  # cria
        ]
        resp = _post_lote(c, itens, token=tenant_a['token'])
        assert resp.status_code == 201
        data = resp.json()
        assert data['criados'] == 1
        assert data['empilhados'] == 1

    @pytest.mark.django_db
    def test_retorna_criados_e_empilhados(self, c, tenant_a):
        resp = _post_lote(c, [_item('P1'), _item('P2')], token=tenant_a['token'])
        assert resp.status_code == 201
        data = resp.json()
        assert 'criados' in data
        assert 'empilhados' in data


# ── histórico de movimentação ─────────────────────────────────────────────────

class TestBatchMovimento:
    @pytest.mark.django_db
    def test_grava_movimento_de_entrada(self, c, tenant_a):
        chave = '35230101234567000199550010000000031000000031'
        resp = _post_lote(c, [_item('Prod Mov', quantidade=4, nfe_chave=chave)], token=tenant_a['token'])
        assert resp.status_code == 201

        with connection.cursor() as cur:
            cur.execute(
                "SELECT tipo, detalhes->>'nfe_chave' FROM movements "
                "WHERE tenant_id=%s AND product_nome='Prod Mov' ORDER BY id DESC LIMIT 1",
                [tenant_a['tenant_id']],
            )
            row = cur.fetchone()
        assert row is not None
        assert row[0] == 'entrada'
        assert row[1] == chave


# ── isolamento por tenant ─────────────────────────────────────────────────────

class TestBatchTenantIsolado:
    @pytest.mark.django_db
    def test_produto_criado_pertence_ao_tenant_correto(self, c, tenant_a, tenant_b):
        resp = _post_lote(c, [_item('Exclusivo A')], token=tenant_a['token'])
        assert resp.status_code == 201

        # tenant_b não deve ver o produto de tenant_a
        resp_b = c.get('/api/products', **_auth(tenant_b['token']))
        nomes = [p['nome'] for p in resp_b.json()]
        assert 'Exclusivo A' not in nomes

    @pytest.mark.django_db
    def test_empilhamento_nao_afeta_produto_de_outro_tenant(self, c, tenant_a, tenant_b, product_b):
        chave = '35230101234567000199550010000000041000000041'
        # tenant_a tenta "empilhar" num produto com mesmo nome que tenant_b tem
        itens = [_item(nome='Produto B', quantidade=10, nfe_chave=chave)]
        resp = _post_lote(c, itens, token=tenant_a['token'])
        assert resp.status_code == 201

        # produto de tenant_b não foi alterado
        with connection.cursor() as cur:
            cur.execute("SELECT quantidade FROM products WHERE id=%s", [product_b['id']])
            qty = cur.fetchone()[0]
        assert float(qty) == 5  # quantidade original de product_b


# ── deduplicação por nfe_chave ────────────────────────────────────────────────

class TestBatchDeduplicacao:
    @pytest.mark.django_db
    def test_reimportar_mesma_nfe_retorna_409(self, c, tenant_a):
        chave = '35230101234567000199550010000000051000000051'
        itens = [_item('Prod Dup', quantidade=1, nfe_chave=chave)]

        resp1 = _post_lote(c, itens, token=tenant_a['token'])
        assert resp1.status_code == 201

        resp2 = _post_lote(c, itens, token=tenant_a['token'])
        assert resp2.status_code == 409
        assert 'message' in resp2.json()

    @pytest.mark.django_db
    def test_mesma_chave_aceita_em_tenant_diferente(self, c, tenant_a, tenant_b):
        chave = '35230101234567000199550010000000061000000061'
        itens = [_item('Prod Chave', quantidade=2, nfe_chave=chave)]

        resp_a = _post_lote(c, itens, token=tenant_a['token'])
        assert resp_a.status_code == 201

        # tenant_b pode importar a mesma chave (tenants são isolados)
        resp_b = _post_lote(c, itens, token=tenant_b['token'])
        assert resp_b.status_code == 201


# ── rollback em erro ──────────────────────────────────────────────────────────

class TestBatchRollback:
    @pytest.mark.django_db
    def test_rollback_em_erro_de_validacao(self, c, tenant_a):
        """Se um item tem dados inválidos, nenhum produto deve ser criado."""
        itens = [
            _item('Prod Valido 1'),
            {'nome': '', 'quantidade': 5, 'unidade': 'UN'},  # nome vazio → erro
            _item('Prod Valido 2'),
        ]
        resp = _post_lote(c, itens, token=tenant_a['token'])
        assert resp.status_code == 400

        resp_list = c.get('/api/products', **_auth(tenant_a['token']))
        nomes = [p['nome'] for p in resp_list.json()]
        assert 'Prod Valido 1' not in nomes
        assert 'Prod Valido 2' not in nomes
