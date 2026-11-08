# Design

## Context

Estado atual relevante:

```python
# settings.py (atual) — sem DATA_UPLOAD_MAX_MEMORY_SIZE nem DATA_UPLOAD_MAX_NUMBER_FIELDS
# Django usa padrão de 2,5 MB para DATA_UPLOAD_MAX_MEMORY_SIZE

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csp.ContentSecurityPolicyMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.cors.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'api.middleware.PermissionsPolicyMiddleware',
    'api.middleware.JWTAuthMiddleware',
]
```

```python
# api/views/nfe.py (atual) — bug: lê request.body completo antes de checar tamanho
else:
    if len(request.body) > max_size:   # ← corpo já está em memória aqui
        return JsonResponse({'message': f'Payload muito grande. Máximo: ...'}, status=400)
```

```python
# api/views/nfe.py (atual) — bug: multipart retorna 400 ao invés de 413
if f.size > max_size:
    return JsonResponse({'message': f'Arquivo muito grande. ...'}, status=400)
```

## Goals / Non-Goals

**Goals:**
- Rejeitar corpos grandes ANTES da leitura em memória (Content-Length check no middleware).
- Converter `RequestDataTooBig`/`TooManyFieldsSent` em 413 JSON sem traceback.
- Padronizar respostas de tamanho da NF-e para 413 + `{"message": ..., "limite_bytes": n}`.
- Zero novas dependências externas.

**Non-Goals:**
- Limitar upload via servidor (nginx/Caddy) — documentado, não implementado aqui.
- Integração com rate limit de autenticação (ver D5).
- Mudanças no frontend além de nota opcional na tela de NF-e.

## Decisions

### D1 — Configurações Django de limite de corpo

```python
# settings.py
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get(
    'DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024))           # 64 KB
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get(
    'FILE_UPLOAD_MAX_MEMORY_SIZE', 2 * 1024 * 1024))     # 2 MB (threshold disco, não limite)
DATA_UPLOAD_MAX_NUMBER_FIELDS = int(os.environ.get(
    'DATA_UPLOAD_MAX_NUMBER_FIELDS', 200))
```

`DATA_UPLOAD_MAX_MEMORY_SIZE = 64 KB` é a última linha de defesa quando `Content-Length` está ausente: o Django lança `RequestDataTooBig` ao ler o corpo. `FILE_UPLOAD_MAX_MEMORY_SIZE` controla apenas quando arquivos enviados vão para disco temporário — **não é um limite de tamanho**. O limite real de arquivo (NF-e) é verificado no código com `UploadedFile.size`.

**Tensão entre limites:** `DATA_UPLOAD_MAX_MEMORY_SIZE = 64 KB` é o limite global do Django. Mas `/api/nfe/xml` aceita até 2 MB. Para requisições sem `Content-Length` no endpoint NF-e, o Django lançaria `RequestDataTooBig` em 64 KB. O middleware `process_exception` precisa usar `settings.DATA_UPLOAD_MAX_MEMORY_SIZE` como `limite_bytes` nesse caso, o que é correto — foi esse limite que foi violado.

### D2 — RequestSizeLimitMiddleware: Content-Length check + process_exception

```python
import logging
from django.conf import settings
from django.core.exceptions import RequestDataTooBig, TooManyFieldsSent
from django.http import JsonResponse

logger = logging.getLogger('api.middleware')

class RequestSizeLimitMiddleware:
    _ROUTE_LIMITS = None   # lazy-init em __call__ (settings não disponível em __init__)

    def __init__(self, get_response):
        self.get_response = get_response

    def _get_limit(self, path):
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
            cl = None   # ausente ou inválido → deixa passar; Django enforça DATA_UPLOAD_MAX_MEMORY_SIZE

        if cl is not None and cl > limit:
            logger.warning('413 Content-Length %d > %d | ip=%s path=%s',
                           cl, limit, request.META.get('REMOTE_ADDR', '?'), path)
            return JsonResponse(
                {'message': 'Requisição muito grande.', 'limite_bytes': limit},
                status=413,
            )
        return self.get_response(request)

    def process_exception(self, request, exception):
        if isinstance(exception, (RequestDataTooBig, TooManyFieldsSent)):
            limit = getattr(settings, 'DATA_UPLOAD_MAX_MEMORY_SIZE', 64 * 1024)
            logger.warning('413 RequestDataTooBig | ip=%s path=%s',
                           request.META.get('REMOTE_ADDR', '?'), request.path_info)
            return JsonResponse(
                {'message': 'Requisição muito grande.', 'limite_bytes': limit},
                status=413,
            )
        return None
```

O dicionário de rotas é calculado a cada chamada (inline) para garantir que lê `settings` já configurados. Como o dicionário tem apenas uma entrada por agora, o overhead é insignificante. Se crescer, pode ser cacheado em `__init__` usando `django.apps.apps.ready` ou lazy init com flag.

### D3 — Posição do middleware na pilha

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csp.ContentSecurityPolicyMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.cors.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'api.middleware.PermissionsPolicyMiddleware',
    'api.middleware.RequestSizeLimitMiddleware',   # ← NOVO: após Permissions, antes de JWT
    'api.middleware.JWTAuthMiddleware',
]
```

**Por que após `PermissionsPolicyMiddleware`?** Em Django, middlewares acima na lista processam respostas de volta (no retorno de `get_response`). Quando `RequestSizeLimitMiddleware` retorna 413 sem chamar `get_response`, a resposta sobe pela pilha: `PermissionsPolicyMiddleware` adiciona `Permissions-Policy`, `CorsMiddleware` adiciona CORS headers, `XFrameOptionsMiddleware` adiciona `X-Frame-Options`. Resultado: a resposta 413 leva todos os cabeçalhos de segurança — o mesmo comportamento das respostas 401 do JWT.

**Por que antes de `JWTAuthMiddleware`?** Evita uma consulta desnecessária ao banco para autenticar uma requisição que vai ser rejeitada por tamanho.

### D4 — Correção da view NF-e

```python
# api/views/nfe.py — path multipart: status 400 → 413, formato padronizado
if f.size > max_size:
    return JsonResponse(
        {'message': 'Requisição muito grande.', 'limite_bytes': max_size},
        status=413,
    )

# api/views/nfe.py — path raw body: middleware já garante rejeição por CL;
# a verificação len(request.body) > max_size pode ser removida ou mantida
# como fallback com status 413. Optamos por mantê-la como fallback explícito
# (defesa em profundidade), mas apenas para o caso sem Content-Length:
else:
    body_so_far = request.body   # pode lançar RequestDataTooBig → capturado por process_exception
    if len(body_so_far) > max_size:
        return JsonResponse(
            {'message': 'Requisição muito grande.', 'limite_bytes': max_size},
            status=413,
        )
    xml_bytes = body_so_far
```

### D5 — Rate limit para 413: somente log

A função `registrar_falha` de `api/limites.py` é específica para autenticação (login, recuperação). Contar uma requisição grande ao endpoint NF-e como "falha de login" não faz sentido semanticamente e poderia bloquear usuários legítimos que enviaram um arquivo grande por engano. Decisão: **apenas log** com IP e rota. Revisitar se houver requisito específico de rate limit para uploads.

### D6 — Ausência de Content-Length

Requisições sem `Content-Length` passam pelo middleware sem verificação (D2). O Django aplica `DATA_UPLOAD_MAX_MEMORY_SIZE` (64 KB) quando o corpo é lido. Para `/api/nfe/xml` sem `Content-Length`: se o corpo for maior que 64 KB, `RequestDataTooBig` é lançado e o `process_exception` retorna 413. Isso é conservador (2 MB seria o limite esperado), mas é aceitável: clientes HTTP bem implementados sempre enviam `Content-Length` para corpos não-chunked, e XMLs de NF-e reais costumam ser menores que 64 KB de qualquer forma.

**Decisão pendente:** se o usuário confirmar que NF-es reais podem exceder 64 KB e que clientes sem `Content-Length` são comuns no cenário, o `DATA_UPLOAD_MAX_MEMORY_SIZE` deve ser elevado para `NFE_MAX_SIZE_BYTES` (2 MB), aceitando que a defesa para JSON sem `Content-Length` cai para 2 MB.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| `DATA_UPLOAD_MAX_MEMORY_SIZE = 64 KB` rejeita NF-e sem `Content-Length` em 64 KB | NF-es reais geralmente ≤ 50 KB; clientes HTTP padrão enviam CL; documentado como limitação conhecida |
| Middleware não captura corpos lidos fora de views (ex.: em outros middlewares) | Não existe tal caso no código atual |
| `process_exception` com `TooManyFieldsSent` reporta `limite_bytes = DATA_UPLOAD_MAX_MEMORY_SIZE` em vez do limite de campos | Comportamento aceitável: o usuário recebe 413 JSON limpo sem traceback; o campo exato violado não é necessário |
| Sem proteção de proxy em produção | Documentado em `.env.example` e README; fora do escopo desta change |

## Open Questions para o usuário

1. **Tamanho real de NF-e:** XMLs de NF-e dos clientes reais ultrapassam 64 KB? (Determina se `DATA_UPLOAD_MAX_MEMORY_SIZE` deve ser 64 KB ou 2 MB.)
2. **Nginx na frente:** a produção terá Nginx/Caddy com `client_max_body_size`? (Determina o nível de detalhe da nota de proxy.)
3. **Limites por rota adicionais:** algum outro endpoint precisa de limite específico diferente de 64 KB (ex.: upload de avatar, se houver)? (Determina se o dicionário de rotas precisa de mais entradas.)
4. **Rate limit em 413:** deseja que requisições recusadas por tamanho também incrementem o contador de falhas por IP nos endpoints de autenticação? (Decisão D5 pode ser revisada.)
