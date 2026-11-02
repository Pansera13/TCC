"""
Testes de contrato: paridade de campos, isolamento por tenant, respostas de erro JSON
e concorrência com SELECT FOR UPDATE.

Tarefas cobertas: 11.1, 11.2, 11.3, 11.4
"""
import json
import threading
import pytest
from django.test import Client


AUTH_HEADER = 'HTTP_AUTHORIZATION'


def _auth(token):
    return {AUTH_HEADER: f'Bearer {token}'}


def _post(c, url, body, token=None):
    headers = _auth(token) if token else {}
    return c.post(url, data=json.dumps(body), content_type='application/json', **headers)


def _get(c, url, token=None, **params):
    headers = _auth(token) if token else {}
    return c.get(url, data=params, **headers)


# ── 11.1 — Campos do login e listagem de produtos ─────────────────────────────

class TestLoginContrato:
    @pytest.mark.django_db
    def test_login_retorna_campos_esperados(self, c, tenant_a):
        resp = _post(c, '/api/auth/login', {'identifier': tenant_a['email'], 'senha': tenant_a['senha']})
        assert resp.status_code == 200
        data = resp.json()
        assert set(data.keys()) == {'token', 'nome', 'role', 'id', 'avatar_url', 'permissoes'}

    @pytest.mark.django_db
    def test_login_token_e_string(self, c, tenant_a):
        resp = _post(c, '/api/auth/login', {'identifier': tenant_a['email'], 'senha': tenant_a['senha']})
        data = resp.json()
        assert isinstance(data['token'], str)
        assert len(data['token']) > 20

    @pytest.mark.django_db
    def test_login_permissoes_e_lista(self, c, tenant_a):
        resp = _post(c, '/api/auth/login', {'identifier': tenant_a['email'], 'senha': tenant_a['senha']})
        data = resp.json()
        assert isinstance(data['permissoes'], list)
        assert len(data['permissoes']) > 0

    @pytest.mark.django_db
    def test_login_role_e_string_valida(self, c, tenant_a):
        resp = _post(c, '/api/auth/login', {'identifier': tenant_a['email'], 'senha': tenant_a['senha']})
        data = resp.json()
        assert data['role'] in ('admin', 'socio', 'user')

    @pytest.mark.django_db
    def test_login_id_e_inteiro(self, c, tenant_a):
        resp = _post(c, '/api/auth/login', {'identifier': tenant_a['email'], 'senha': tenant_a['senha']})
        data = resp.json()
        assert isinstance(data['id'], int)
        assert data['id'] == tenant_a['id']


class TestProdutosListContrato:
    @pytest.mark.django_db
    def test_listagem_retorna_lista(self, c, tenant_a, product_a):
        resp = _get(c, '/api/products', token=tenant_a['token'])
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    @pytest.mark.django_db
    def test_produto_tem_campos_obrigatorios(self, c, tenant_a, product_a):
        resp = _get(c, '/api/products', token=tenant_a['token'])
        data = resp.json()
        assert any(p['id'] == product_a['id'] for p in data), 'produto criado deve aparecer na lista'
        produto = next(p for p in data if p['id'] == product_a['id'])
        for campo in ('id', 'nome', 'quantidade', 'unidade', 'created_at'):
            assert campo in produto, f'campo {campo!r} ausente'

    @pytest.mark.django_db
    def test_quantidade_e_numero(self, c, tenant_a, product_a):
        resp = _get(c, '/api/products', token=tenant_a['token'])
        data = resp.json()
        produto = next(p for p in data if p['id'] == product_a['id'])
        assert isinstance(produto['quantidade'], (int, float))

    @pytest.mark.django_db
    def test_listagem_sem_token_retorna_401(self, c, tenant_a, product_a):
        resp = _get(c, '/api/products')
        assert resp.status_code == 401


# ── 11.2 — Respostas de erro são JSON com Content-Type correto ─────────────────

class TestRespostasErroJSON:
    CONTENT_TYPE_JSON = 'application/json'

    def _assert_json_error(self, resp, expected_status):
        assert resp.status_code == expected_status, f'esperava {expected_status}, obteve {resp.status_code}'
        assert self.CONTENT_TYPE_JSON in resp.get('Content-Type', ''), 'Content-Type deve ser application/json'
        data = resp.json()
        assert 'message' in data, f'campo "message" ausente na resposta de erro: {data}'

    @pytest.mark.django_db
    def test_400_login_body_vazio(self, c):
        resp = _post(c, '/api/auth/login', {})
        self._assert_json_error(resp, 400)

    @pytest.mark.django_db
    def test_401_sem_token(self, c):
        resp = _get(c, '/api/products')
        self._assert_json_error(resp, 401)

    @pytest.mark.django_db
    def test_401_credenciais_invalidas(self, c):
        resp = _post(c, '/api/auth/login', {'identifier': 'nao@existe.com', 'senha': 'errada'})
        self._assert_json_error(resp, 401)

    @pytest.mark.django_db
    def test_403_funcionario_arquivados(self, c, funcionario_a):
        resp = _get(c, '/api/products', token=funcionario_a['token'], arquivados='1')
        self._assert_json_error(resp, 403)

    @pytest.mark.django_db
    def test_404_produto_inexistente(self, c, tenant_a):
        resp = c.put(
            '/api/products/999999999',
            data=json.dumps({'nome': 'X', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            **_auth(tenant_a['token']),
        )
        self._assert_json_error(resp, 404)

    @pytest.mark.django_db
    def test_400_campo_obrigatorio_com_field(self, c):
        resp = _post(c, '/api/auth/login', {'identifier': '', 'senha': ''})
        assert resp.status_code == 400
        data = resp.json()
        assert 'message' in data


# ── 11.3 — Isolamento por tenant ───────────────────────────────────────────────

class TestIsolamentoPorTenant:
    @pytest.mark.django_db
    def test_tenant_a_nao_ve_produto_b(self, c, tenant_a, tenant_b, product_a, product_b):
        resp = _get(c, '/api/products', token=tenant_a['token'])
        assert resp.status_code == 200
        ids = [p['id'] for p in resp.json()]
        assert product_a['id'] in ids, 'tenant A deve ver seu próprio produto'
        assert product_b['id'] not in ids, 'tenant A NÃO deve ver produto de B'

    @pytest.mark.django_db
    def test_tenant_b_nao_ve_produto_a(self, c, tenant_a, tenant_b, product_a, product_b):
        resp = _get(c, '/api/products', token=tenant_b['token'])
        assert resp.status_code == 200
        ids = [p['id'] for p in resp.json()]
        assert product_b['id'] in ids, 'tenant B deve ver seu próprio produto'
        assert product_a['id'] not in ids, 'tenant B NÃO deve ver produto de A'

    @pytest.mark.django_db
    def test_tenant_a_nao_edita_produto_b(self, c, tenant_a, product_b):
        resp = c.put(
            f'/api/products/{product_b["id"]}',
            data=json.dumps({'nome': 'Invasao', 'quantidade': 1, 'unidade': 'UN'}),
            content_type='application/json',
            **_auth(tenant_a['token']),
        )
        assert resp.status_code == 404, 'produto de outro tenant deve retornar 404'

    @pytest.mark.django_db
    def test_tenant_a_nao_retira_produto_b(self, c, tenant_a, product_b):
        resp = _post(
            c,
            f'/api/products/{product_b["id"]}/withdraw',
            {'quantidade': 1},
            token=tenant_a['token'],
        )
        assert resp.status_code == 404, 'retirada em produto de outro tenant deve retornar 404'

    @pytest.mark.django_db
    def test_zero_vazamento_na_lista(self, c, tenant_a, tenant_b, product_a, product_b):
        """Garante que a lista de A tem exatamente os produtos de A inseridos neste teste."""
        resp_a = _get(c, '/api/products', token=tenant_a['token'])
        ids_a = {p['id'] for p in resp_a.json()}
        resp_b = _get(c, '/api/products', token=tenant_b['token'])
        ids_b = {p['id'] for p in resp_b.json()}
        assert ids_a.isdisjoint(ids_b), 'nenhum produto deve aparecer nas duas listas'


# ── 11.4 — Concorrência: SELECT FOR UPDATE ─────────────────────────────────────

@pytest.mark.django_db(transaction=True)
def test_select_for_update_previne_saldo_negativo(concurrency_tenant):
    """
    Duas threads simultâneas retiram 1 unidade de um produto com estoque=1.
    SELECT FOR UPDATE garante que exatamente uma recebe 200 e a outra recebe 400.
    """
    results = []
    lock = threading.Lock()

    def do_withdraw():
        client = Client()
        resp = client.post(
            f'/api/products/{concurrency_tenant["pid"]}/withdraw',
            data=json.dumps({'quantidade': 1}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {concurrency_tenant["token"]}',
        )
        with lock:
            results.append(resp.status_code)

    t1 = threading.Thread(target=do_withdraw)
    t2 = threading.Thread(target=do_withdraw)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(results) == 2, 'ambas as threads devem ter respondido'
    assert 200 in results, 'uma retirada deve ter sido bem-sucedida'
    assert 400 in results, 'a outra deve ter falhado por estoque insuficiente'
    assert sorted(results) == [200, 400], f'esperava [200, 400], obteve {sorted(results)}'
