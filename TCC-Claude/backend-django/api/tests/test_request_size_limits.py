"""
Testes do RequestSizeLimitMiddleware e das respostas 413 do backend StockFlow.

Cobertura:
  4.1 — Content-Length check (sem banco)
  4.2 — Cabeçalhos de segurança em respostas 413
  4.3 — Upload de NF-e com tamanho (precisa de banco)
"""
import pytest
from django.test import Client, override_settings

# ── 4.1 — Content-Length check (sem banco) ────────────────────────────────────

@pytest.fixture
def c():
    return Client()


def test_content_length_acima_do_limite_retorna_413(c):
    # 99999 > 65536 (DATA_UPLOAD_MAX_MEMORY_SIZE padrão)
    resp = c.post(
        '/api/auth/login',
        data=b'x' * 100,
        content_type='application/json',
        CONTENT_LENGTH='99999',
        SERVER_NAME='localhost',
    )
    assert resp.status_code == 413
    data = resp.json()
    assert 'limite_bytes' in data
    assert data['message'] == 'Requisição muito grande.'


def test_content_length_dentro_do_limite_passa(c):
    resp = c.post(
        '/api/auth/login',
        data=b'{}',
        content_type='application/json',
        CONTENT_LENGTH='100',
        SERVER_NAME='localhost',
    )
    assert resp.status_code != 413


def test_content_length_ausente_nao_retorna_413(c):
    resp = c.post(
        '/api/auth/login',
        data=b'{}',
        content_type='application/json',
        SERVER_NAME='localhost',
    )
    assert resp.status_code != 413


def test_content_length_negativo_nao_retorna_413(c):
    resp = c.post(
        '/api/auth/login',
        data=b'{}',
        content_type='application/json',
        CONTENT_LENGTH='-1',
        SERVER_NAME='localhost',
    )
    assert resp.status_code != 413


def test_content_length_invalido_nao_retorna_413(c):
    resp = c.post(
        '/api/auth/login',
        data=b'{}',
        content_type='application/json',
        CONTENT_LENGTH='abc',
        SERVER_NAME='localhost',
    )
    assert resp.status_code != 413


@override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=65536, NFE_MAX_SIZE_BYTES=2 * 1024 * 1024)
def test_limite_nfe_maior_que_padrao(c):
    # 200 KB: acima do limite padrão (64 KB), mas dentro do limite NF-e (2 MB)
    cl = str(200 * 1024)
    resp_login = c.post(
        '/api/auth/login',
        data=b'x',
        content_type='application/json',
        CONTENT_LENGTH=cl,
        SERVER_NAME='localhost',
    )
    assert resp_login.status_code == 413, 'login deveria rejeitar 200 KB'

    resp_nfe = c.post(
        '/api/nfe/xml',
        data=b'x',
        content_type='application/xml',
        CONTENT_LENGTH=cl,
        SERVER_NAME='localhost',
    )
    assert resp_nfe.status_code != 413, 'nfe/xml não deve rejeitar 200 KB (limite é 2 MB)'


# ── 4.2 — Cabeçalhos de segurança em 413 ─────────────────────────────────────

def _resposta_413(c):
    return c.post(
        '/api/auth/login',
        data=b'x',
        content_type='application/json',
        CONTENT_LENGTH='99999',
        SERVER_NAME='localhost',
    )


def test_413_tem_x_frame_options(c):
    resp = _resposta_413(c)
    assert resp.status_code == 413
    assert resp.get('X-Frame-Options') == 'DENY'


def test_413_tem_nosniff(c):
    resp = _resposta_413(c)
    assert resp.status_code == 413
    assert resp.get('X-Content-Type-Options') == 'nosniff'


def test_413_tem_csp(c):
    resp = _resposta_413(c)
    assert resp.status_code == 413
    csp = resp.get('Content-Security-Policy', '')
    assert csp, 'Content-Security-Policy ausente em 413'


def test_413_tem_permissions_policy(c):
    resp = _resposta_413(c)
    assert resp.status_code == 413
    pp = resp.get('Permissions-Policy', '')
    assert pp, 'Permissions-Policy ausente em 413'


# ── 4.3 — NF-e com limite de tamanho (precisa de banco) ──────────────────────

_XML_VALIDO = b"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe99999999999999999999999999999999999999999999">
      <chNFe>99999999999999999999999999999999999999999999</chNFe>
      <det nItem="1">
        <prod>
          <xProd>Produto Limite</xProd>
          <qCom>1.0</qCom>
          <uCom>UN</uCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>""".strip()


@override_settings(NFE_MAX_SIZE_BYTES=1024)
@pytest.mark.django_db
def test_nfe_arquivo_multipart_acima_do_limite_retorna_413(tenant_a):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from django.core.cache import cache
    cache.clear()
    c = Client()
    conteudo = b'x' * 1025  # 1 byte acima de 1 KB
    f = SimpleUploadedFile('nota.xml', conteudo, content_type='application/xml')
    resp = c.post(
        '/api/nfe/xml',
        {'arquivo': f},
        HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
    )
    assert resp.status_code == 413
    data = resp.json()
    assert data['message'] == 'Requisição muito grande.'
    assert data['limite_bytes'] == 1024


@override_settings(NFE_MAX_SIZE_BYTES=1024 * 1024)
@pytest.mark.django_db
def test_nfe_arquivo_multipart_dentro_do_limite_passa(tenant_a):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from django.core.cache import cache
    cache.clear()
    c = Client()
    f = SimpleUploadedFile('nota.xml', _XML_VALIDO, content_type='application/xml')
    resp = c.post(
        '/api/nfe/xml',
        {'arquivo': f},
        HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
    )
    assert resp.status_code != 413


@override_settings(NFE_MAX_SIZE_BYTES=1024)
@pytest.mark.django_db
def test_nfe_content_length_acima_do_limite_nfe_retorna_413(tenant_a):
    from django.core.cache import cache
    cache.clear()
    c = Client()
    resp = c.post(
        '/api/nfe/xml',
        data=b'x',
        content_type='application/xml',
        CONTENT_LENGTH='2000',
        HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        SERVER_NAME='localhost',
    )
    assert resp.status_code == 413


@override_settings(NFE_MAX_SIZE_BYTES=1024 * 1024)
@pytest.mark.django_db
def test_nfe_content_length_abaixo_do_limite_nfe_passa(tenant_a):
    from django.core.cache import cache
    cache.clear()
    c = Client()
    # Envia corpo real (sem forçar CONTENT_LENGTH): middleware não deve rejeitar
    resp = c.post(
        '/api/nfe/xml',
        data=b'x' * 100,
        content_type='application/xml',
        HTTP_AUTHORIZATION=f'Bearer {tenant_a["token"]}',
        SERVER_NAME='localhost',
    )
    assert resp.status_code != 413
