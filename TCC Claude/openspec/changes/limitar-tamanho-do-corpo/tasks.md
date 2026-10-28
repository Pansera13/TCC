# Tasks

## 1. Configurações em settings.py

- [ ] 1.1 Em `backend-django/stockflow/settings.py`, adicionar as três configurações de upload logo após a seção de cabeçalhos de segurança (antes do bloco `if not DEBUG:`):
  ```python
  # ── Limites de tamanho de requisição ─────────────────────────────────────────
  DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024))
  FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('FILE_UPLOAD_MAX_MEMORY_SIZE', 2 * 1024 * 1024))
  DATA_UPLOAD_MAX_NUMBER_FIELDS = int(os.environ.get('DATA_UPLOAD_MAX_NUMBER_FIELDS', 200))
  ```
  Verificar com `python manage.py shell -c "from django.conf import settings; print(settings.DATA_UPLOAD_MAX_MEMORY_SIZE, settings.DATA_UPLOAD_MAX_NUMBER_FIELDS)"` que os valores estão corretos (devem ser 65536 e 200).

## 2. RequestSizeLimitMiddleware

- [ ] 2.1 Em `backend-django/api/middleware.py`, adicionar as importações necessárias ao topo do arquivo:
  ```python
  import logging
  from django.core.exceptions import RequestDataTooBig, TooManyFieldsSent
  ```
  (Preservar as importações existentes `os`, `jwt`, `JsonResponse`, `Usuario`.)

- [ ] 2.2 Adicionar a classe `RequestSizeLimitMiddleware` ao final de `backend-django/api/middleware.py`:
  ```python
  _size_logger = logging.getLogger('api.middleware')

  class RequestSizeLimitMiddleware:
      def __init__(self, get_response):
          self.get_response = get_response

      def _get_limit(self, path):
          from django.conf import settings
          nfe_limit = getattr(settings, 'NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024)
          default_limit = getattr(settings, 'DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024)
          route_limits = {'/api/nfe/xml': nfe_limit}
          return route_limits.get(path.rstrip('/'), default_limit)

      def __call__(self, request):
          path = request.path_info
          limit = self._get_limit(path)
          cl_raw = request.META.get('CONTENT_LENGTH', '')
          try:
              cl = int(cl_raw)
              if cl < 0:
                  raise ValueError
          except (ValueError, TypeError):
              cl = None
          if cl is not None and cl > limit:
              _size_logger.warning(
                  '413 Content-Length %d > %d | ip=%s path=%s',
                  cl, limit, request.META.get('REMOTE_ADDR', '?'), path,
              )
              return JsonResponse(
                  {'message': 'Requisição muito grande.', 'limite_bytes': limit},
                  status=413,
              )
          return self.get_response(request)

      def process_exception(self, request, exception):
          from django.conf import settings
          if isinstance(exception, (RequestDataTooBig, TooManyFieldsSent)):
              limit = getattr(settings, 'DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024)
              _size_logger.warning(
                  '413 RequestDataTooBig | ip=%s path=%s',
                  request.META.get('REMOTE_ADDR', '?'), request.path_info,
              )
              return JsonResponse(
                  {'message': 'Requisição muito grande.', 'limite_bytes': limit},
                  status=413,
              )
          return None
  ```
  Verificar com `python manage.py check` (sem erros).

- [ ] 2.3 Em `backend-django/stockflow/settings.py`, inserir `'api.middleware.RequestSizeLimitMiddleware'` na lista `MIDDLEWARE` **após** `'api.middleware.PermissionsPolicyMiddleware'` e **antes** `'api.middleware.JWTAuthMiddleware'`:
  ```python
  MIDDLEWARE = [
      'django.middleware.security.SecurityMiddleware',
      'django.middleware.csp.ContentSecurityPolicyMiddleware',
      'django.middleware.clickjacking.XFrameOptionsMiddleware',
      'api.cors.CorsMiddleware',
      'django.middleware.common.CommonMiddleware',
      'api.middleware.PermissionsPolicyMiddleware',
      'api.middleware.RequestSizeLimitMiddleware',   # ← NOVO
      'api.middleware.JWTAuthMiddleware',
  ]
  ```
  Verificar com `python manage.py check`.

- [ ] 2.4 Adicionar o logger `api.middleware` à configuração de `LOGGING` em `settings.py`:
  ```python
  'api.middleware': {
      'handlers': ['console'],
      'level': 'WARNING',
      'propagate': False,
  },
  ```
  (Adicionar logo após a entrada `api.limites` existente no dict `loggers`.)

## 3. Correção da view NF-e

- [ ] 3.1 Em `backend-django/api/views/nfe.py`, na função `parse_nfe`, substituir as duas respostas de tamanho:

  **Multipart (caminho `request.FILES.get('arquivo')`):**
  ```python
  if f.size > max_size:
      return JsonResponse(
          {'message': 'Requisição muito grande.', 'limite_bytes': max_size},
          status=413,
      )
  ```

  **Raw body (caminho `else`):**
  ```python
  else:
      xml_bytes = request.body   # RequestDataTooBig → capturado por process_exception se > DATA_UPLOAD_MAX_MEMORY_SIZE
      if len(xml_bytes) > max_size:
          return JsonResponse(
              {'message': 'Requisição muito grande.', 'limite_bytes': max_size},
              status=413,
          )
  ```
  (O fallback `len(xml_bytes) > max_size` é defesa em profundidade para o caso sem `Content-Length`; o middleware já cuida de requisições com `Content-Length` declarado.)

  Verificar com `python manage.py check`.

## 4. Testes

- [ ] 4.1 Criar `backend-django/api/tests/test_request_size_limits.py`. Escrever testes de **Content-Length** que **não** precisam de acesso ao banco:
  - `test_content_length_acima_do_limite_retorna_413`: POST em `/api/auth/login` com `CONTENT_LENGTH=99999` (> 64 KB) → 413, corpo JSON com `limite_bytes`.
  - `test_content_length_dentro_do_limite_passa`: POST em `/api/auth/login` com `CONTENT_LENGTH=100` → não é 413.
  - `test_content_length_ausente_nao_retorna_413`: POST sem `CONTENT_LENGTH` → não é 413.
  - `test_content_length_negativo_nao_retorna_413`: POST com `CONTENT_LENGTH=-1` → não é 413.
  - `test_content_length_invalido_nao_retorna_413`: POST com `CONTENT_LENGTH=abc` → não é 413.
  - `test_limite_nfe_maior_que_padrao`: mesma `CONTENT_LENGTH=200000` (200 KB): em `/api/auth/login` → 413; em `/api/nfe/xml` → não é 413 (dentro do limite NF-e de 2 MB).
  Verificar que `python -m pytest api/tests/test_request_size_limits.py` passa.

- [ ] 4.2 No mesmo arquivo, escrever testes de **cabeçalhos de segurança em 413**:
  - `test_413_tem_x_frame_options`: resposta 413 contém `X-Frame-Options: DENY`.
  - `test_413_tem_nosniff`: resposta 413 contém `X-Content-Type-Options: nosniff`.
  - `test_413_tem_csp`: resposta 413 contém `Content-Security-Policy`.
  - `test_413_tem_permissions_policy`: resposta 413 contém `Permissions-Policy`.
  Verificar que o teste passa.

- [ ] 4.3 No mesmo arquivo, escrever testes de **NF-e** (precisam de `db`):
  - `test_nfe_arquivo_multipart_acima_do_limite_retorna_413`: upload multipart com arquivo > `NFE_MAX_SIZE_BYTES` → 413 com `limite_bytes`.
  - `test_nfe_arquivo_multipart_dentro_do_limite_passa`: upload multipart com arquivo válido e pequeno → não é 413 (pode ser 200 ou 422 dependendo do XML, mas não 413).
  - `test_nfe_content_length_acima_do_limite_nfe_retorna_413`: POST em `/api/nfe/xml` com `CONTENT_LENGTH` acima de `NFE_MAX_SIZE_BYTES` → 413.
  - `test_nfe_content_length_abaixo_do_limite_nfe_passa`: POST em `/api/nfe/xml` com `CONTENT_LENGTH` dentro do limite NF-e → não é 413.
  - Para os testes autenticados de NF-e, usar `override_settings` para forçar `NFE_MAX_SIZE_BYTES=1024` (1 KB), o que permite criar um arquivo fake pequeno e outro levemente maior sem precisar de 2 MB reais.
  Verificar que os testes passam.

- [ ] 4.4 Rodar a suite completa com `python -m pytest -q` e confirmar que todos os testes anteriores (78) continuam passando, com os novos totalizando ≥ 88. Se algum teste existente falhar, investigar e corrigir antes de continuar.

## 5. Documentação

- [ ] 5.1 Em `backend-django/.env.example`, adicionar na seção "Cabeçalhos de segurança" (ou logo antes da linha `DEBUG=false`):
  ```
  # ── Limites de tamanho de requisição ────────────────────────────────────────
  # Corpo máximo em memória para JSON e formulários (padrão: 65536 = 64 KB)
  DATA_UPLOAD_MAX_MEMORY_SIZE=65536
  # Número máximo de campos em formulários multipart (padrão: 200)
  DATA_UPLOAD_MAX_NUMBER_FIELDS=200
  ```
  Confirmar que `NFE_MAX_SIZE_BYTES` já está documentado (foi adicionado na change anterior ou está na seção de Rate limiting) e o aviso sobre limite real de arquivo estar no código — se não estiver, adicionar:
  ```
  # Tamanho máximo de arquivo NF-e em bytes (padrão: 2097152 = 2 MB)
  # Em produção, configure também client_max_body_size no Nginx/proxy
  NFE_MAX_SIZE_BYTES=2097152
  ```

- [ ] 5.2 Em `README.md` (raiz do projeto), adicionar subseção "Limites de tamanho em produção" dentro da seção de Backend, com o conteúdo:
  - O Django rejeita corpos maiores que `DATA_UPLOAD_MAX_MEMORY_SIZE` (64 KB para JSON, 2 MB para NF-e).
  - **Em produção**, o servidor/proxy (Nginx, Caddy, etc.) deve ter o mesmo limite configurado (`client_max_body_size 2m` no Nginx) para rejeitar a requisição na borda, antes que o Django seja acionado.
  - O servidor de desenvolvimento do Django não é defesa suficiente contra DoS.

## 6. Vault — rastreabilidade, métricas e diário

- [ ] 6.1 Atualizar `C:\Users\lucas\Documents\TCC\TCC\02 - Requisitos\Requisitos (rastreabilidade).md`: adicionar seção R50 para `backend/request-size-limits` com todos os requisitos da spec, referenciando código (`settings.py`, `api/middleware.py`, `api/views/nfe.py`) e testes (`api/tests/test_request_size_limits.py`), status "Atendido". Adicionar delta para R49 (`products/nfe-scan`) e R30 (`backend/django-runtime`). Verificar que o arquivo foi salvo.

- [ ] 6.2 Registrar a change em `C:\Users\lucas\Documents\TCC\TCC\03 - Metricas\Registro de metricas.md`: linha com data, tempo de especificação, implementação, correção, validação, erros, retrabalhos e intervenções desta change. Verificar que o arquivo foi salvo.

- [ ] 6.3 Atualizar o diário do dia em `C:\Users\lucas\Documents\TCC\TCC\05 - Diario\<data>.md` com resumo do implementado. No arquivo `C:\Users\lucas\Documents\TCC\TCC\04 - Proposta e TCC\Roadmap profissional.md`, marcar "Limite de body" (`express.json({ limit: '100kb' })`) como concluído para Django. Atualizar o índice `00 - Indice.md` com o novo estado rápido. Verificar que todos os arquivos foram salvos.
