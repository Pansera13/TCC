# Tasks

## 1. SecurityMiddleware e cabeçalhos básicos

- [x] 1.1 Em `backend-django/stockflow/settings.py`, inserir `'django.middleware.security.SecurityMiddleware'` como **primeiro** item da lista `MIDDLEWARE`. Verificar com `python manage.py check` (sem erros de configuração) e confirmar que o servidor sobe com `python manage.py runserver 3002 --noreload` (Ctrl+C imediato — só checar que inicializa sem traceback).

- [x] 1.2 Em `settings.py`, adicionar as três configurações sempre ativas: `X_FRAME_OPTIONS = 'DENY'`; `SECURE_CONTENT_TYPE_NOSNIFF = True`; `SECURE_REFERRER_POLICY = 'same-origin'`. Verificar no shell do Django com `from django.conf import settings; print(settings.X_FRAME_OPTIONS, settings.SECURE_CONTENT_TYPE_NOSNIFF, settings.SECURE_REFERRER_POLICY)` que os valores estão corretos.

## 2. DEBUG e ALLOWED_HOSTS seguros

- [x] 2.1 Alterar a linha de `DEBUG` em `settings.py` de `os.environ.get('DEBUG', 'true').lower() == 'true'` para `os.environ.get('DEBUG', 'false').lower() == 'true'`. Verificar com `python -c "import os; os.environ.pop('DEBUG', None); exec(open('stockflow/settings.py').read()); print('DEBUG =', DEBUG)"` (executado no diretório `backend-django/`, com variáveis de ambiente limpas) que o resultado é `DEBUG = False`. Confirmar que o `.env` existente tem `DEBUG=true` para que o ambiente de desenvolvimento local continue funcionando.

- [x] 2.2 Substituir `ALLOWED_HOSTS = ['*']` em `settings.py` por leitura da variável de ambiente:
  ```python
  _allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', '')
  ALLOWED_HOSTS = (
      [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]
      if _allowed_hosts_env
      else ['localhost', '127.0.0.1']
  )
  ```
  Verificar que `'*'` não aparece em nenhum caminho de código do bloco. O comportamento de `ALLOWED_HOSTS` quando `DEBUG=True` (nosso ambiente de testes padrão) é permissivo no Django — hosts não listados são aceitos, então os testes existentes não quebrarão enquanto `DEBUG=True`.

- [x] 2.3 Rodar `python -m pytest -q` e confirmar que todos os 66 testes passam sem alterações nos testes existentes. Se algum falhar por `DisallowedHost`, adicionar `'testserver'` ao `ALLOWED_HOSTS` padrão ou usar `@override_settings(ALLOWED_HOSTS=['testserver', 'localhost', '127.0.0.1'])` nos testes afetados.

## 3. Modo produção — HSTS, SSL redirect, cookies seguros e proxy

- [x] 3.1 Adicionar bloco condicional em `settings.py` logo após as definições de `DEBUG` e `ALLOWED_HOSTS`:
  ```python
  if not DEBUG:
      SECURE_SSL_REDIRECT = True
      SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 300))
      SECURE_HSTS_INCLUDE_SUBDOMAINS = True
      SECURE_HSTS_PRELOAD = False
      SESSION_COOKIE_SECURE = True
      CSRF_COOKIE_SECURE = True
  ```
  Verificar com teste de unidade (usando `from django.test import override_settings`) que, com `DEBUG=True`, `SECURE_SSL_REDIRECT` não está definido (ou é `False`) e `SECURE_HSTS_SECONDS` é `0`.

- [x] 3.2 Dentro do mesmo bloco `if not DEBUG:`, adicionar `SECURE_PROXY_SSL_HEADER` condicionalmente:
  ```python
      if os.environ.get('TRUSTED_PROXY', '').lower() == 'true':
          SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
  ```
  Verificar que sem `TRUSTED_PROXY=true` a chave `SECURE_PROXY_SSL_HEADER` não está definida no settings (não existe no namespace, ou é `None`).

## 4. CSP nativa e Permissions-Policy

- [x] 4.1 Adicionar a importação e configuração da CSP nativa do Django 6.1 em `settings.py`:
  ```python
  from django.utils.csp import CSP
  SECURE_CSP = {
      'default-src': [CSP.NONE],
      'frame-ancestors': [CSP.NONE],
  }
  ```
  Adicionar `'django.middleware.csp.ContentSecurityPolicyMiddleware'` como **segundo** item de `MIDDLEWARE` (logo após `SecurityMiddleware`). Verificar com `python manage.py shell -c "from django.conf import settings; print(settings.SECURE_CSP)"` que o valor está correto.

- [x] 4.2 Em `backend-django/api/middleware.py`, adicionar a classe `PermissionsPolicyMiddleware` ao final do arquivo:
  ```python
  class PermissionsPolicyMiddleware:
      def __init__(self, get_response):
          self.get_response = get_response

      def __call__(self, request):
          response = self.get_response(request)
          response.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
          return response
  ```
  Adicionar `'api.middleware.PermissionsPolicyMiddleware'` ao final da lista `MIDDLEWARE` em `settings.py`. Verificar com `python manage.py check`.

## 5. Testes de cabeçalhos de segurança

- [x] 5.1 Criar `backend-django/api/tests/test_security_headers.py`. Escrever testes que verificam a presença dos três cabeçalhos básicos (`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`) em respostas de endpoints distintos: um endpoint de sucesso (ex.: login com credenciais inválidas → 401), um 404 (URL inexistente) e um 429 (simulado via rate limit ou `override_settings`). Verificar que `python -m pytest api/tests/test_security_headers.py` passa.

- [x] 5.2 No mesmo arquivo, testar `Content-Security-Policy`: verificar que o cabeçalho está presente nas respostas e contém `default-src 'none'` e `frame-ancestors 'none'`. Verificar que `python -m pytest api/tests/test_security_headers.py` passa.

- [x] 5.3 No mesmo arquivo, testar `Permissions-Policy`: verificar que `camera=()`, `microphone=()` e `geolocation=()` estão presentes no cabeçalho. Verificar que o teste passa.

- [x] 5.4 No mesmo arquivo, testar comportamento de produção usando `@override_settings(DEBUG=False, SECURE_SSL_REDIRECT=True, SECURE_HSTS_SECONDS=300, ALLOWED_HOSTS=['testserver', 'localhost'])`:
  - Uma requisição HTTP simples (não segura) retorna HTTP 301 apontando para HTTPS.
  - Uma requisição marcada como segura (`wsgi.url_scheme='https'`) inclui `Strict-Transport-Security` com `max-age=300; includeSubDomains`.
  - Com `DEBUG=True` (default dos outros testes), nem o redirect nem o HSTS estão presentes.
  Verificar que o teste passa.

- [x] 5.5 No mesmo arquivo, testar `ALLOWED_HOSTS`: com `@override_settings(DEBUG=False, ALLOWED_HOSTS=['allowed.example.com'])`, uma requisição com `SERVER_NAME='bad.example.com'` retorna HTTP 400. Verificar que o teste passa.

- [x] 5.6 Testar que `python manage.py check --deploy` não reporta erros críticos quando executado com as variáveis de produção setadas:
  ```powershell
  $env:DEBUG='false'; $env:DJANGO_SECRET_KEY='secreta-de-teste-longa-o-suficiente-32chars'; $env:ALLOWED_HOSTS='example.com'; $env:SECURE_HSTS_SECONDS='300'; python manage.py check --deploy 2>&1
  ```
  Aceitar avisos de `W001`-`W006` se referirem a `SECURE_HSTS_PRELOAD` ou a configs de sessão não usadas; o objetivo é não ter `SystemCheckError` (erros com `E`). Verificar que `python -m pytest` completo (≥ 66 testes + novos) passa com 0 falhas.

## 6. Documentação — .env.example e nota do frontend

- [x] 6.1 Atualizar `backend-django/.env.example`: adicionar as novas variáveis com comentários:
  ```
  # Modo de execução (false = seguro por padrão; true somente em desenvolvimento)
  DEBUG=false

  # Hosts permitidos (separados por vírgula); padrão: localhost,127.0.0.1
  ALLOWED_HOSTS=localhost,127.0.0.1

  # HSTS — subida gradual recomendada: 300 → 3600 → 86400 → 31536000 (só após HTTPS estável)
  # Só ativo quando DEBUG=false
  SECURE_HSTS_SECONDS=300
  ```
  Confirmar que `TRUSTED_PROXY` já está documentado (adicionado na change anterior) e o aviso de falsificação está presente. Verificar visualmente que não contém valores reais.

- [x] 6.2 No `README.md` da raiz, adicionar uma subseção "Cabeçalhos de segurança do frontend" (sem código de implementação) descrevendo: (a) os cabeçalhos que o servidor de hospedagem do frontend React precisa enviar (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy-Report-Only: ...` inicialmente); (b) as diretivas de CSP que precisam de ajuste para funcionar (`frame-src https://www.google.com/recaptcha/` para reCAPTCHA, `connect-src <URL-Supabase>` para queries em tempo real, `media-src` ou `camera`/`microphone` permissions se o leitor de barras for ativado). Verificar que o README está correto.

## 7. Vault — rastreabilidade, métricas e diário

- [x] 7.1 Atualizar `C:\Users\lucas\Documents\TCC\TCC\02 - Requisitos\Requisitos (rastreabilidade).md`: adicionar seção R49 para `security/http-security-headers` com todos os requisitos da spec, referenciando código (`settings.py`, `api/middleware.py`) e testes (`api/tests/test_security_headers.py`), status "Atendido". Verificar que o arquivo foi salvo.

- [x] 7.2 Registrar a change em `C:\Users\lucas\Documents\TCC\TCC\03 - Metricas\Registro de metricas.md`: linha com data de início/fim, tempo de especificação, implementação, correção, validação, erros encontrados, retrabalhos e intervenções. Verificar que o arquivo foi salvo.

- [x] 7.3 Atualizar o diário do dia em `C:\Users\lucas\Documents\TCC\TCC\05 - Diario\<data>.md` com resumo do implementado. No arquivo `C:\Users\lucas\Documents\TCC\TCC\Roadmap profissional.md`, marcar "helmet/cabeçalhos de segurança" como concluído (se a entrada existir) ou adicionar como concluído. Atualizar o índice `00 - Indice.md` com o novo estado rápido. Verificar que todos os arquivos foram salvos.
