"""
Testes de validação de upload de NF-e: extensão, Content-Type, sniff,
defusedxml, limite estrutural, rate limit e tamanho.
"""
import io
import pytest
from django.core.cache import cache
from django.test import Client, override_settings

NFE_URL = '/api/nfe/xml'

# XML mínimo de NF-e válido (sem namespace — suficiente para parse e estrutura)
_XML_VALIDO = b"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe12345678901234567890123456789012345678901234">
      <chNFe>12345678901234567890123456789012345678901234</chNFe>
      <det nItem="1">
        <prod>
          <xProd>Produto Teste</xProd>
          <qCom>5.0</qCom>
          <uCom>UN</uCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>""".strip()


def _upload(client, token, filename, content, content_type='application/xml'):
    """Envia upload multipart de NF-e."""
    f = io.BytesIO(content)
    f.name = filename
    return client.post(
        NFE_URL,
        {'arquivo': f},
        HTTP_AUTHORIZATION=f'Bearer {token}',
        content_type=None,  # deixa Django montar o multipart
    )


def _upload_multipart(client, token, filename, content, file_content_type='application/xml'):
    """Envia upload multipart usando SimpleUploadedFile para controlar content_type."""
    from django.core.files.uploadedfile import SimpleUploadedFile
    f = SimpleUploadedFile(filename, content, content_type=file_content_type)
    return client.post(
        NFE_URL,
        {'arquivo': f},
        HTTP_AUTHORIZATION=f'Bearer {token}',
    )


# ── Extensão e nome ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_extensao_txt_retorna_415(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.txt', _XML_VALIDO)
    assert resp.status_code == 415
    assert resp.json()['message'] == 'Envie um arquivo no formato .xml.'


@pytest.mark.django_db
def test_extensao_exe_retorna_415(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.exe', _XML_VALIDO)
    assert resp.status_code == 415


@pytest.mark.django_db
def test_dupla_extensao_retorna_415(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.exe.xml', _XML_VALIDO)
    assert resp.status_code == 415


@pytest.mark.django_db
def test_extensao_maiuscula_aceita(tenant_a):
    c = Client()
    cache.clear()
    # Arquivo válido mas sem DB match de chave — qualquer status diferente de 415
    resp = _upload_multipart(c, tenant_a['token'], 'NOTA.XML', _XML_VALIDO)
    assert resp.status_code != 415


@pytest.mark.django_db
def test_extensao_sem_ponto_retorna_415(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota', _XML_VALIDO)
    assert resp.status_code == 415


# ── Content-Type ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_content_type_image_png_retorna_415(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO, file_content_type='image/png')
    assert resp.status_code == 415


@pytest.mark.django_db
def test_content_type_octet_stream_aceito(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO, file_content_type='application/octet-stream')
    assert resp.status_code != 415


@pytest.mark.django_db
def test_content_type_text_xml_aceito(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO, file_content_type='text/xml')
    assert resp.status_code != 415


# ── Content sniff ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_conteudo_binario_retorna_415(tenant_a):
    c = Client()
    cache.clear()
    conteudo_binario = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', conteudo_binario)
    assert resp.status_code == 415


@pytest.mark.django_db
def test_conteudo_texto_plano_retorna_415(tenant_a):
    # Texto que não começa com '<' é rejeitado pelo sniff
    c = Client()
    cache.clear()
    conteudo_texto = b'Isso nao eh XML, eh texto plano'
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', conteudo_texto)
    assert resp.status_code == 415


@pytest.mark.django_db
def test_conteudo_com_bom_utf8_aceito(tenant_a):
    c = Client()
    cache.clear()
    bom_utf8 = b'\xef\xbb\xbf'
    conteudo = bom_utf8 + _XML_VALIDO
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', conteudo)
    # BOM UTF-8 deve ser removido antes do sniff; deve passar o sniff
    assert resp.status_code != 415


# ── defusedxml: XXE e billion laughs ──────────────────────────────────────────

@pytest.mark.django_db
def test_xxe_retorna_400(tenant_a):
    c = Client()
    cache.clear()
    xxe_xml = b"""<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<nfeProc><NFe><infNFe>&xxe;</infNFe></NFe></nfeProc>"""
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', xxe_xml)
    assert resp.status_code == 400
    data = resp.json()
    assert data['message'] == 'O arquivo não é um XML válido.'
    assert 'passwd' not in str(data)
    assert 'Traceback' not in str(data)


@pytest.mark.django_db
def test_billion_laughs_retorna_400(tenant_a):
    c = Client()
    cache.clear()
    billion_laughs = b"""<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<nfeProc>&lol3;</nfeProc>"""
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', billion_laughs)
    assert resp.status_code == 400
    assert resp.json()['message'] == 'O arquivo não é um XML válido.'


# ── Limite estrutural ──────────────────────────────────────────────────────────

def _xml_com_n_dets(n):
    dets = ''.join(
        f'<det nItem="{i}"><prod><xProd>Prod {i}</xProd><qCom>1.0</qCom><uCom>UN</uCom></prod></det>'
        for i in range(1, n + 1)
    )
    return (
        b'<?xml version="1.0"?><nfeProc><NFe><infNFe Id="NFe12345678901234567890123456789012345678901234">'
        + dets.encode()
        + b'</infNFe></NFe></nfeProc>'
    )


@pytest.mark.django_db
@override_settings(NFE_MAX_ITENS=2)
def test_nfe_acima_limite_itens_retorna_422(tenant_a):
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _xml_com_n_dets(3))
    assert resp.status_code == 422
    assert '2' in resp.json()['message']


@pytest.mark.django_db
@override_settings(NFE_MAX_ITENS=500)
def test_nfe_dentro_limite_itens_aceito(tenant_a):
    c = Client()
    cache.clear()
    # 1 item — deve passar o limite estrutural (pode falhar em outra validação, mas não por limite)
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _xml_com_n_dets(1))
    assert resp.status_code != 422 or 'muitos itens' not in resp.json().get('message', '')


# ── Rate limit ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(NFE_MAX_IMPORTACOES=2, NFE_JANELA_SEGUNDOS=60, NFE_BLOQUEIO_SEGUNDOS=60)
def test_rate_limit_retorna_429(tenant_a):
    c = Client()
    cache.clear()
    # Primeira e segunda requisição incrementam o contador
    _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    # Terceira deve ser bloqueada
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    assert resp.status_code == 429
    data = resp.json()
    assert 'retry_after' in data
    assert data['retry_after'] > 0


@pytest.mark.django_db
@override_settings(NFE_MAX_IMPORTACOES=2, NFE_JANELA_SEGUNDOS=60, NFE_BLOQUEIO_SEGUNDOS=60)
def test_rate_limit_inclui_retry_after_header(tenant_a):
    c = Client()
    cache.clear()
    _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    assert resp.status_code == 429
    assert 'Retry-After' in resp


# ── Tamanho ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
@override_settings(NFE_MAX_SIZE_BYTES=1024)
def test_multipart_acima_do_limite_retorna_413(tenant_a):
    c = Client()
    cache.clear()
    conteudo_grande = b'<x>' + b'A' * 2000 + b'</x>'
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', conteudo_grande)
    assert resp.status_code == 413
    data = resp.json()
    assert 'limite_bytes' in data
    assert data['limite_bytes'] == 1024


@pytest.mark.django_db
@override_settings(NFE_MAX_SIZE_BYTES=1024)
def test_multipart_status_era_400_agora_413(tenant_a):
    """Confirma que o bug de retornar 400 para tamanho foi corrigido."""
    c = Client()
    cache.clear()
    conteudo_grande = b'<x>' + b'A' * 2000 + b'</x>'
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', conteudo_grande)
    assert resp.status_code == 413
    assert resp.status_code != 400


@pytest.mark.django_db
@override_settings(NFE_MAX_SIZE_BYTES=100000)
def test_multipart_dentro_do_limite_passa(tenant_a):
    """Arquivo pequeno não deve retornar 413."""
    c = Client()
    cache.clear()
    resp = _upload_multipart(c, tenant_a['token'], 'nota.xml', _XML_VALIDO)
    assert resp.status_code != 413
