"""Fixtures compartilhadas para os testes de contrato e integração."""
import uuid
import os
import datetime
import bcrypt
import pytest
import jwt as pyjwt
from django.db import connection
from django.test import Client


# ── helpers ────────────────────────────────────────────────────────────────────

def _cpf_unico():
    return str(uuid.uuid4().int % 10 ** 11).zfill(11)


def _email_unico(prefix='t'):
    return f'{prefix}_{uuid.uuid4().hex[:8]}@test-stockflow.invalid'


def _hash_senha(pw='test1234'):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=4)).decode()


def _jwt_para(uid, role, tenant_id, nome='Teste'):
    secret = os.environ.get('JWT_SECRET', 'dev-jwt-secret-inseguro')
    exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    return pyjwt.encode(
        {'id': uid, 'nome': nome, 'role': role, 'tenant_id': tenant_id, 'exp': exp},
        secret,
        algorithm='HS256',
    )


def _inserir_tenant(cur, senha='test1234'):
    """Insere uma conta principal e retorna (id, email, senha_hash)."""
    email = _email_unico()
    senha_hash = _hash_senha(senha)
    cur.execute(
        "INSERT INTO usuarios (nome, nome_empresa, email, senha_hash, cpf_cnpj, role, ativo, email_recuperacao) "
        "VALUES (%s,'Empresa Teste',%s,%s,%s,'admin',true,%s) RETURNING id",
        ['Admin Teste', email, senha_hash, _cpf_unico(), 'rec@test.invalid'],
    )
    uid = cur.fetchone()[0]
    cur.execute("UPDATE usuarios SET tenant_id=%s WHERE id=%s", [uid, uid])
    return uid, email, senha


# ── fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def c():
    return Client()


@pytest.fixture
def tenant_a(db):
    """Conta principal A (admin). Dados limpos via rollback de transação."""
    with connection.cursor() as cur:
        uid, email, senha = _inserir_tenant(cur)
    yield {
        'id': uid,
        'tenant_id': uid,
        'email': email,
        'senha': senha,
        'token': _jwt_para(uid, 'admin', uid, 'Admin A'),
        'role': 'admin',
    }


@pytest.fixture
def tenant_b(db):
    """Conta principal B — tenant isolado de A."""
    with connection.cursor() as cur:
        uid, email, _ = _inserir_tenant(cur)
    yield {
        'id': uid,
        'tenant_id': uid,
        'email': email,
        'token': _jwt_para(uid, 'admin', uid, 'Admin B'),
        'role': 'admin',
    }


@pytest.fixture
def socio_a(db, tenant_a):
    """Sócio vinculado ao tenant A."""
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO usuarios (nome, nome_empresa, email, senha_hash, cpf_cnpj, role, ativo, tenant_id) "
            "VALUES (%s,'Empresa Teste',%s,%s,%s,'socio',true,%s) RETURNING id",
            ['Socio A', _email_unico('s'), _hash_senha(), _cpf_unico(), tenant_a['tenant_id']],
        )
        uid = cur.fetchone()[0]
    yield {'id': uid, 'tenant_id': tenant_a['tenant_id'], 'token': _jwt_para(uid, 'socio', tenant_a['tenant_id'])}


@pytest.fixture
def funcionario_a(db, tenant_a):
    """Funcionário (role=user) vinculado ao tenant A."""
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO usuarios (nome, nome_empresa, email, senha_hash, cpf_cnpj, role, ativo, tenant_id) "
            "VALUES (%s,'Empresa Teste',%s,%s,%s,'user',true,%s) RETURNING id",
            ['Func A', _email_unico('f'), _hash_senha(), _cpf_unico(), tenant_a['tenant_id']],
        )
        uid = cur.fetchone()[0]
    yield {'id': uid, 'tenant_id': tenant_a['tenant_id'], 'token': _jwt_para(uid, 'user', tenant_a['tenant_id'])}


@pytest.fixture
def product_a(db, tenant_a):
    """Produto pertencente ao tenant A, quantidade=10."""
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO products (nome, quantidade, unidade, tenant_id, arquivado) "
            "VALUES (%s,10,'UN',%s,false) RETURNING id",
            ['Produto A', tenant_a['tenant_id']],
        )
        pid = cur.fetchone()[0]
    yield {'id': pid, 'nome': 'Produto A', 'quantidade': 10, 'tenant_id': tenant_a['tenant_id']}


@pytest.fixture
def product_b(db, tenant_b):
    """Produto pertencente ao tenant B — não deve aparecer para tenant A."""
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO products (nome, quantidade, unidade, tenant_id, arquivado) "
            "VALUES (%s,5,'KG',%s,false) RETURNING id",
            ['Produto B', tenant_b['tenant_id']],
        )
        pid = cur.fetchone()[0]
    yield {'id': pid, 'nome': 'Produto B', 'quantidade': 5, 'tenant_id': tenant_b['tenant_id']}


@pytest.fixture
def concurrency_tenant(transactional_db):
    """Tenant + produto qty=1 commit real (TransactionTestCase) para teste de concorrência."""
    uid = pid = None
    uid = pid = None
    with connection.cursor() as cur:
        uid, _, _ = _inserir_tenant(cur)
        cur.execute(
            "INSERT INTO products (nome, quantidade, unidade, tenant_id, arquivado) "
            "VALUES (%s,1,'UN',%s,false) RETURNING id",
            ['ProdConc', uid],
        )
        pid = cur.fetchone()[0]

    token = _jwt_para(uid, 'admin', uid)
    yield {'uid': uid, 'pid': pid, 'token': token, 'tenant_id': uid}

    with connection.cursor() as cur:
        cur.execute("DELETE FROM movements WHERE tenant_id=%s", [uid])
        cur.execute("DELETE FROM products WHERE id=%s", [pid])
        cur.execute("DELETE FROM usuarios WHERE id=%s", [uid])
