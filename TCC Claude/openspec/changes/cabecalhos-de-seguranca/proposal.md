# Proposal

## Why

O backend Django não inclui `SecurityMiddleware` na pilha de middleware, opera com `DEBUG=True` como padrão, aceita qualquer host (`ALLOWED_HOSTS = ['*']`) e não envia nenhum cabeçalho de segurança HTTP. Isso expõe a API a clickjacking, sniffing de MIME type, ausência de política de referrer e outros vetores básicos que o OWASP lista como controláveis por cabeçalhos — sem custo de bibliotecas externas, pois o Django 6.1 já inclui todos os primitivos necessários.

## What Changes

- `SecurityMiddleware` adicionado como **primeiro** item de `MIDDLEWARE` em `settings.py`, ativando nosniff, referrer-policy, HSTS e SSL redirect.
- `django.middleware.csp.ContentSecurityPolicyMiddleware` adicionado logo após, usando `SECURE_CSP` (nativo do Django 6.1) para emitir `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` em todas as respostas da API.
- `PermissionsPolicyMiddleware` adicionado em `api/middleware.py`: emite `Permissions-Policy: camera=(), microphone=(), geolocation=()` (câmera está no frontend, não na API).
- `DEBUG` muda de padrão `'true'` para `'false'` (seguro por padrão).
- `ALLOWED_HOSTS` muda de `['*']` para lista lida de variável de ambiente, com padrão seguro `['localhost', '127.0.0.1']`.
- Configurações de produção (ativas somente quando `DEBUG=False`): `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`.
- `SECURE_PROXY_SSL_HEADER` ativado somente quando `TRUSTED_PROXY=true`.
- `.env.example` documentado com `DEBUG`, `ALLOWED_HOSTS`, `SECURE_HSTS_SECONDS` e lembrete de `TRUSTED_PROXY`.
- Nota de documentação do frontend (sem código): cabeçalhos equivalentes que o servidor do build React precisa enviar.

## Capabilities

### New Capabilities

- `security/http-security-headers`: Cabeçalhos HTTP de segurança da API — SecurityMiddleware, CSP nativa do Django 6.1, Permissions-Policy, configuração segura de DEBUG/ALLOWED_HOSTS e modo produção com HSTS/SSL.

### Modified Capabilities

*(nenhuma — os requisitos de segurança existentes cobrem higiene do repositório e variáveis de ambiente; os novos requisitos são uma capacidade distinta)*

## Impact

- **`backend-django/stockflow/settings.py`**: ordem do MIDDLEWARE, DEBUG, ALLOWED_HOSTS, bloco de segurança (básico + produção + proxy).
- **`backend-django/api/middleware.py`**: nova classe `PermissionsPolicyMiddleware`.
- **`backend-django/.env.example`**: novas variáveis documentadas.
- **Testes**: novo arquivo `api/tests/test_security_headers.py` (ou adição ao test_contract.py) — sem regressão nos 66 testes existentes.
- **Nenhuma mudança de banco**, nenhuma mudança de endpoint, nenhuma dependência nova.
