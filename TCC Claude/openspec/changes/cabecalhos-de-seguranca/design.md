# Design

## Context

Ver proposal.md — Why para motivação. Estado atual relevante:

```python
# settings.py (atual)
DEBUG = os.environ.get('DEBUG', 'true').lower() == 'true'   # padrão inseguro
ALLOWED_HOSTS = ['*']                                         # aceita tudo

MIDDLEWARE = [
    'api.cors.CorsMiddleware',       # CORS primeiro
    'django.middleware.common.CommonMiddleware',
    'api.middleware.JWTAuthMiddleware',
    # SecurityMiddleware ausente
]
```

Django 6.1.2 instalado. Verificado via inspeção do código-fonte instalado:
- `django.middleware.security.SecurityMiddleware`: lida com nosniff, referrer-policy, HSTS, SSL redirect (via `process_response`). **Não** tem suporte a CSP nem a Permissions-Policy.
- `django.middleware.csp.ContentSecurityPolicyMiddleware`: nativo no Django 6.1, lê `SECURE_CSP = {}` (dict) e `SECURE_CSP_REPORT_ONLY = {}` de settings. Usa `django.utils.csp.CSP` (enum) para constantes como `CSP.NONE = "'none'"`.
- `django.conf.global_settings`: confirma `SECURE_CSP = {}` e `SECURE_CSP_REPORT_ONLY = {}` como padrões — sem valor padrão, nenhum cabeçalho emitido.
- **Sem** `SECURE_PERMISSIONS_POLICY` nas configurações nativas → middleware próprio necessário.
- `X_FRAME_OPTIONS = 'DENY'` e `SECURE_CONTENT_TYPE_NOSNIFF = True` são configurações de `SecurityMiddleware`.

## Goals / Non-Goals

**Goals:**
- Emitir `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` em todas as respostas.
- Emitir `Content-Security-Policy` restritiva para API JSON.
- Emitir `Permissions-Policy` desabilitando câmera/microfone/geolocalização.
- Ativar HSTS, SSL redirect e cookies seguros apenas em produção (`DEBUG=False`).
- Corrigir `DEBUG` default para `False` e `ALLOWED_HOSTS` para lista segura.
- Sem novas dependências de bibliotecas externas.

**Non-Goals:**
- CSP do frontend React (documentação, não implementação).
- Configuração do servidor de hospedagem (nginx, Caddy, etc.).
- Remover ou substituir o middleware CORS existente (`api/cors.py`).

## Decisions

### D1 — Ordem dos middlewares

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',           # 1º: SSL redirect antes de tudo
    'django.middleware.csp.ContentSecurityPolicyMiddleware',   # 2º: CSP em todas as respostas
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  # 3º: X-Frame-Options em todas
    'api.cors.CorsMiddleware',                                 # 4º: CORS (já existia)
    'django.middleware.common.CommonMiddleware',
    'api.middleware.PermissionsPolicyMiddleware',               # antes do JWT (ver nota abaixo)
    'api.middleware.JWTAuthMiddleware',
]
```

`SecurityMiddleware` precisa ser o primeiro para poder redirecionar HTTP→HTTPS antes que outros middlewares processem a requisição. `ContentSecurityPolicyMiddleware` e `XFrameOptionsMiddleware` vêm logo após para garantir CSP e X-Frame-Options em todas as respostas, incluindo as de erro do próprio `SecurityMiddleware`. `CorsMiddleware` mantém sua posição — o CORS precisa rodar antes da autenticação JWT para que preflights (`OPTIONS`) sem token recebam os cabeçalhos CORS.

**Nota crítica sobre `PermissionsPolicyMiddleware`:** deve vir ANTES de `JWTAuthMiddleware`, não após. `JWTAuthMiddleware` retorna antecipadamente (sem chamar `get_response`) nas respostas 401, o que impede que qualquer middleware declarado depois dele processe a resposta. Como `Permissions-Policy` deve estar presente em todas as respostas (incluindo 401), o middleware precisa ser encadeado antes do JWT na pilha.

### D2 — CSP nativa do Django 6.1

```python
from django.utils.csp import CSP

SECURE_CSP = {
    'default-src': [CSP.NONE],
    'frame-ancestors': [CSP.NONE],
}
```

`CSP.NONE` expande para `'none'` (com aspas simples, conforme a spec). Resultado: `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`. Não é necessário middleware próprio para CSP.

### D3 — Permissions-Policy: middleware próprio simples

Django 6.1 não tem suporte nativo a `Permissions-Policy`. Solução: adicionar `PermissionsPolicyMiddleware` em `api/middleware.py`:

```python
class PermissionsPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        return response
```

Câmera (`camera=()`) está desabilitada na API. No frontend, o contexto de navegação é separado: a câmera funciona normalmente no documento React, pois a `Permissions-Policy` da API só se aplica às respostas da própria API, não ao documento HTML do frontend (que tem origem diferente).

### D4 — DEBUG padrão seguro e ALLOWED_HOSTS

```python
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'

_allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = (
    [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]
    if _allowed_hosts_env
    else ['localhost', '127.0.0.1']
)
```

Não aceita `'*'` em nenhum caminho de código. Em `DEBUG=False` com `ALLOWED_HOSTS` vazio, Django levanta `DisallowedHost` (400), que é o comportamento correto.

Nota para os testes existentes: o `conftest.py` ou o `.env` de testes pode precisar definir `DEBUG=true` (ou `override_settings(DEBUG=True)`) para evitar que o redirecionamento SSL quebre os testes que usam HTTP. Como os testes já usam `@override_settings(CACHES=...)`, o mesmo padrão se aplica.

### D5 — Configurações de produção condicionais

```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 300))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = False   # não ativar sem validação humana prévia
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    if os.environ.get('TRUSTED_PROXY', '').lower() == 'true':
        SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

`SECURE_HSTS_PRELOAD = False` por padrão: o pré-carregamento do HSTS é irreversível sem ação junto aos navegadores; o usuário deve ativar explicitamente após consolidar o domínio. Rota de subida gradual de `SECURE_HSTS_SECONDS`: 300 → 3600 → 86400 → 31536000.

### D6 — HSTS em backend de API pura

HSTS num backend de API só é útil para clientes que acessam a API diretamente no navegador (via fetch com `credentials: include`). Mesmo assim, segue boas práticas e não tem custo. Não interfere com o frontend React que consome a API via fetch — os cookies e o HSTS do frontend são gerenciados pelo servidor do frontend.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| `DEBUG=False` nos testes sem `override_settings` quebra HTTPS redirect | `conftest.py` ou `.env` de testes deve definir `DEBUG=true`; os testes de segurança específicos usam `override_settings(DEBUG=False)` explicitamente |
| HSTS ativa impede acesso HTTP mesmo após desfazer | Começar com 300s; não ativar `SECURE_HSTS_PRELOAD`; subir gradualmente |
| `SECURE_SSL_REDIRECT` em produção atrás de proxy sem `TRUSTED_PROXY=true` gera loop infinito | Documentar claramente; o redirect só ativa em `DEBUG=False` e o proxy SSL header é opt-in |
| `Permissions-Policy: camera=()` bloqueia câmera em páginas servidas pela API | A API não serve HTML; o frontend tem origem separada e não herda essa política |

## Open Questions para o usuário

1. **Valor inicial de SECURE_HSTS_SECONDS**: o padrão de 300s é para teste; quando você confirmar que o HTTPS está estável em produção, qual é o prazo para subir para 31536000 (1 ano)?
2. **TRUSTED_PROXY**: a produção terá nginx/Cloudflare/outro proxy na frente do Django? (Isso define se `TRUSTED_PROXY=true` precisa estar no `.env` de produção.)
3. **ALLOWED_HOSTS em produção**: qual será o domínio de produção? (Precisa estar em `ALLOWED_HOSTS` no `.env` de produção.)
4. **Frontend hosting**: onde o frontend React será publicado? (Determina os ajustes de CSP do frontend que serão documentados, especialmente `connect-src` do Supabase e `frame-src` do reCAPTCHA.)
