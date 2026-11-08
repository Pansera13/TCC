# Tasks

## 1. Configurações em settings.py

- [x] 1.1 Em `backend-django/stockflow/settings.py`, adicionar as variáveis de NF-e logo após a seção de limites de tamanho de requisição (ou no bloco de configurações gerais, antes do `if not DEBUG:`):
  ```python
  # ── NF-e ─────────────────────────────────────────────────────────────────────
  NFE_MAX_SIZE_BYTES = int(os.environ.get('NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024))
  NFE_MAX_ITENS = int(os.environ.get('NFE_MAX_ITENS', 500))
  NFE_MAX_IMPORTACOES = int(os.environ.get('NFE_MAX_IMPORTACOES', 20))
  NFE_JANELA_SEGUNDOS = int(os.environ.get('NFE_JANELA_SEGUNDOS', 600))
  NFE_BLOQUEIO_SEGUNDOS = int(os.environ.get('NFE_BLOQUEIO_SEGUNDOS', 600))
  ```
  Verificar com `python manage.py shell -c "from django.conf import settings; print(settings.NFE_MAX_SIZE_BYTES, settings.NFE_MAX_ITENS)"` que os valores são `2097152` e `500`.

- [x] 1.2 Adicionar o logger `api.nfe` à configuração de `LOGGING` em `settings.py` (logo após `api.middleware` ou `api.limites`):
  ```python
  'api.nfe': {
      'handlers': ['console'],
      'level': 'WARNING',
      'propagate': False,
  },
  ```
  Verificar com `python manage.py check` (sem erros).

## 2. Funções auxiliares e refatoração de `parse_nfe`

- [x] 2.1 Em `backend-django/api/views/nfe.py`, adicionar as importações necessárias ao topo do arquivo (preservando as existentes):
  ```python
  import logging
  import os
  import defusedxml
  from api.limites import ip_do_cliente, segundos_bloqueado, registrar_falha
  ```

- [x] 2.2 Adicionar as funções auxiliares logo após as importações e antes de `_strip_ns`:
  ```python
  _nfe_logger = logging.getLogger('api.nfe')
  _BOMS = (b'\xef\xbb\xbf', b'\xff\xfe', b'\xfe\xff')
  _TIPOS_ACEITOS = frozenset({'application/xml', 'text/xml', 'application/octet-stream'})

  def _log_rejeicao(request, status, motivo):
      user_data = getattr(request, 'user_data', {}) or {}
      _nfe_logger.warning(
          'NFe rejeição status=%d motivo=%s ip=%s user_id=%s tenant_id=%s',
          status, motivo,
          ip_do_cliente(request),
          user_data.get('user_id', '?'),
          user_data.get('tenant_id', '?'),
      )

  def _validar_nome(nome):
      nome = os.path.basename(nome or '')
      if not nome or '\x00' in nome:
          return False
      stem, ext = os.path.splitext(nome)
      if ext.lower() != '.xml':
          return False
      _, inner = os.path.splitext(stem)
      return not inner

  def _ct_ok(ct_raw):
      ct = (ct_raw or '').split(';')[0].strip().lower()
      return not ct or ct in _TIPOS_ACEITOS

  def _parece_xml(data: bytes) -> bool:
      for bom in _BOMS:
          if data.startswith(bom):
              data = data[len(bom):]
              break
      return data.lstrip()[:1] == b'<'

  def _check_rate_limit(request):
      user_id = request.user_data['user_id']
      ip = ip_do_cliente(request)
      chave_user = f'nfe:user:{user_id}'
      chave_ip = f'nfe:ip:{ip}'
      bloq = max(segundos_bloqueado(chave_user), segundos_bloqueado(chave_ip))
      if bloq > 0:
          return bloq
      max_req = getattr(settings, 'NFE_MAX_IMPORTACOES', 20)
      janela = getattr(settings, 'NFE_JANELA_SEGUNDOS', 600)
      bloqueio = getattr(settings, 'NFE_BLOQUEIO_SEGUNDOS', 600)
      registrar_falha(chave_user, janela, max_req, bloqueio, 'nfe')
      registrar_falha(chave_ip, janela, max_req, bloqueio, 'nfe')
      return 0
  ```
  Verificar com `python manage.py check` (sem erros).

- [x] 2.3 Reescrever a função `parse_nfe` em `backend-django/api/views/nfe.py` substituindo todo o corpo da função (da linha 39 até o final). A nova implementação deve aplicar as camadas nesta ordem:
  1. Rate limit (`_check_rate_limit`) → 429 com `Retry-After`
  2. Tamanho por `UploadedFile.size` (multipart) ou Content-Length ausente/inline (raw) → 413
  3. Nome/extensão (`_validar_nome`) → 415
  4. Content-Type (`_ct_ok`) → 415
  5. Leitura do conteúdo (apenas aqui)
  6. Sniff (`_parece_xml`) → 415
  7. Parse defusedxml, capturando `ET.ParseError` e `defusedxml.DefusedXmlException` → 400
  8. Limite estrutural (`len(dets) > NFE_MAX_ITENS`) → 422
  9. Lógica existente de `infNFe`, `chNFe`, dedup por banco, loop de produtos (sem mudança de comportamento ou status codes desta parte)
  10. Log de auditoria em cada rejeição via `_log_rejeicao(request, status, motivo)`

  O nome do arquivo (multipart) é obtido via `f.name`; o Content-Type via `f.content_type`. Para raw body, o Content-Type é `request.content_type`.

  Manter os formatos de resposta 409 (`já foi importada`), 422 (`Formato de NF-e não reconhecido`, `Nenhum produto encontrado`) e 200 (`{produtos, chNFe}`) inalterados.

  Verificar com `python manage.py check`.

## 3. Frontend: countdown 429

- [x] 3.1 Em `frontend/src/components/AddProductModal.jsx`, adicionar o estado `xmlRetryAfter` junto aos demais estados de XML (linha próxima ao `const [xmlError, setXmlError]`):
  ```javascript
  const [xmlRetryAfter, setXmlRetryAfter] = useState(0);
  ```

- [x] 3.2 Adicionar o `useEffect` de countdown logo após os demais `useEffect` (após o handler de Escape):
  ```javascript
  useEffect(() => {
      if (xmlRetryAfter <= 0) return;
      const t = setInterval(() => setXmlRetryAfter(n => Math.max(0, n - 1)), 1000);
      return () => clearInterval(t);
  }, [xmlRetryAfter > 0]);
  ```

- [x] 3.3 No bloco `catch` de `handleXmlFile`, antes de `setXmlError`, capturar o `retry_after`:
  ```javascript
  if (err.response?.status === 429) {
      setXmlRetryAfter(err.response?.data?.retry_after || 60);
  }
  setXmlError(err.response?.data?.message || 'Não foi possível ler o XML da NF-e.');
  ```

- [x] 3.4 Em `renderXml`, desabilitar o dropzone e exibir countdown quando `xmlRetryAfter > 0`:
  - No `onClick` do dropzone: `onClick={() => !loading && !xmlRetryAfter && xmlInputRef.current?.click()}`
  - Adicionar classe condicional de cursor desabilitado: quando `xmlRetryAfter > 0`, trocar `cursor-pointer` por `cursor-not-allowed opacity-60`
  - Após o bloco de erro existente, adicionar:
    ```jsx
    {xmlRetryAfter > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Tente novamente em {xmlRetryAfter}s
        </p>
    )}
    ```

## 4. Testes

- [x] 4.1 Criar `backend-django/api/tests/test_nfe_validacao.py`. Escrever os testes de **extensão e nome** (usando `@pytest.mark.db`):
  - `test_extensao_txt_retorna_415`: upload de `nota.txt` → 415
  - `test_extensao_exe_retorna_415`: upload de `nota.exe` → 415
  - `test_dupla_extensao_retorna_415`: upload de `nota.exe.xml` → 415
  - `test_extensao_maiuscula_aceita`: upload de `NOTA.XML` com XML válido → não é 415
  - `test_byte_nulo_retorna_415`: nome com `\x00` → 415
  Verificar que `python -m pytest api/tests/test_nfe_validacao.py::test_extensao_txt_retorna_415` passa.

- [x] 4.2 No mesmo arquivo, escrever testes de **Content-Type**:
  - `test_content_type_image_png_retorna_415`: upload com `content_type='image/png'` → 415
  - `test_content_type_octet_stream_aceito`: upload com `content_type='application/octet-stream'` e XML válido → não é 415
  - `test_content_type_ausente_aceito`: upload sem Content-Type → não é 415

- [x] 4.3 No mesmo arquivo, escrever testes de **content sniff**:
  - `test_conteudo_binario_retorna_415`: arquivo `.xml` com conteúdo `b'\x89PNG\r\n...'` → 415
  - `test_conteudo_html_retorna_415`: arquivo `.xml` com conteúdo `b'<!DOCTYPE html>'` → 415
  - `test_conteudo_com_bom_utf8_aceito`: arquivo `.xml` com BOM UTF-8 antes do `<` → não é 415

- [x] 4.4 No mesmo arquivo, escrever testes de **defusedxml** (XXE e billion laughs):
  - `test_xxe_retorna_400`: XML com `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` → 400 com `{"message": "O arquivo não é um XML válido."}`
  - `test_billion_laughs_retorna_400`: XML com entidade recursiva → 400
  - Verificar que a mensagem de erro não contém stacktrace nem path de arquivo

- [x] 4.5 No mesmo arquivo, escrever testes de **limite estrutural**:
  - `test_nfe_acima_limite_itens_retorna_422`: usando `override_settings(NFE_MAX_ITENS=2)`, XML com 3 elementos `<det>` → 422 com mensagem indicando o limite
  - `test_nfe_dentro_limite_itens_aceito`: XML com 1 elemento `<det>` válido → 200

- [x] 4.6 No mesmo arquivo, escrever testes de **rate limit**:
  - `test_rate_limit_retorna_429`: usando `override_settings(NFE_MAX_IMPORTACOES=2, NFE_JANELA_SEGUNDOS=60, NFE_BLOQUEIO_SEGUNDOS=60)`, fazer 2 uploads bem-sucedidos e depois 1 upload → 429 com `retry_after`
  - `test_rate_limit_inclui_retry_after_header`: resposta 429 contém cabeçalho `Retry-After`
  - Para isolar, usar `cache.clear()` no `setUp` de cada teste

- [x] 4.7 No mesmo arquivo, escrever testes de **tamanho** (corrigindo bugs existentes):
  - `test_multipart_acima_do_limite_retorna_413`: upload multipart com arquivo `> NFE_MAX_SIZE_BYTES` → 413 com `{"message": ..., "limite_bytes": ...}`
  - `test_multipart_status_era_400_agora_413`: garantir que não retorna mais 400 para tamanho
  - Usar `override_settings(NFE_MAX_SIZE_BYTES=1024)` para criar um arquivo de 2 KB no teste

- [x] 4.8 Rodar a suite completa com `python -m pytest -q` e confirmar que todos os testes anteriores continuam passando e que os novos testes somam pelo menos 15. Se algum teste existente falhar, investigar e corrigir antes de continuar.

## 5. Documentação

- [x] 5.1 Em `backend-django/.env.example`, adicionar a seção de NF-e após a seção de limites de requisição (ou criar se não existir):
  ```
  # ── NF-e ────────────────────────────────────────────────────────────────────
  # Tamanho máximo do arquivo XML em bytes (padrão: 2097152 = 2 MB)
  NFE_MAX_SIZE_BYTES=2097152
  # Número máximo de itens <det> por NF-e (padrão: 500)
  NFE_MAX_ITENS=500
  # Rate limit: máximo de importações por usuário/IP na janela (padrão: 20/10min)
  NFE_MAX_IMPORTACOES=20
  NFE_JANELA_SEGUNDOS=600
  NFE_BLOQUEIO_SEGUNDOS=600
  ```

## 6. Vault — rastreabilidade, métricas e diário

- [x] 6.1 Atualizar `C:\Users\lucas\Documents\TCC\TCC\02 - Requisitos\Requisitos (rastreabilidade).md`: adicionar seção R50 para `products/nfe-scan` (validação em camadas) com os novos requisitos da spec, referenciando `api/views/nfe.py` e `api/tests/test_nfe_validacao.py`, status "Atendido". Atualizar R47 (`frontend/add-modal`) com o delta 429. Atualizar R30 (`backend/django-runtime`) com 415 e 422. Verificar que o arquivo foi salvo.

- [x] 6.2 Registrar a change em `C:\Users\lucas\Documents\TCC\TCC\03 - Metricas\Registro de metricas.md`: nova linha com data, tempo de especificação, implementação, testes, erros e intervenções desta change. Verificar que o arquivo foi salvo.

- [x] 6.3 Atualizar o diário em `C:\Users\lucas\Documents\TCC\TCC\05 - Diario\<data>.md` com resumo do implementado. Em `C:\Users\lucas\Documents\TCC\TCC\04 - Proposta e TCC\Roadmap profissional.md`, marcar a validação de upload XML como concluída. Atualizar `00 - Indice.md` com o novo estado rápido. Verificar que todos os arquivos foram salvos.
