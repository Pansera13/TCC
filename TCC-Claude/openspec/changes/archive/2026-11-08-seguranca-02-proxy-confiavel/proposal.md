# Proposal

## Why

A função `ip_do_cliente()` usa `TRUSTED_PROXY=true/false` (booleano), que só permite
"confiar em tudo" ou "não confiar em nada". Isso não é suficiente para ambientes com
cadeia de proxies (ex.: CDN + LB), onde o número de hops confiáveis importa para
extrair o IP real do cliente do `X-Forwarded-For`.

Além disso, `settings.py` usa a mesma variável booleana para habilitar
`SECURE_PROXY_SSL_HEADER`, e ela não está documentada de forma precisa.

## What Changes

- Substituir `TRUSTED_PROXY` (bool) por `TRUSTED_PROXY_COUNT` (int) em `api/limites.py`.
  Semântica: 0 = usa REMOTE_ADDR; N = pega o N-ésimo IP contando da direita do
  X-Forwarded-For (assumindo N proxies reversos confiáveis na frente do servidor).
- Atualizar `settings.py` para usar `TRUSTED_PROXY_COUNT > 0` ao ligar
  `SECURE_PROXY_SSL_HEADER`.
- Atualizar `.env.example`: substituir `TRUSTED_PROXY=false` por `TRUSTED_PROXY_COUNT=0`.
- Atualizar `test_rate_limit.py`: adaptar os 3 testes existentes de `ip_do_cliente` e
  adicionar testes para: N=0 ignora XFF forjado; N=2 pega 2º da direita; XFF com
  poucos entries faz fallback ao mais antigo disponível.

## Capabilities

### Modified Capabilities

- `security/rate-limiting`: `ip_do_cliente` agora é mais precisa em ambientes multi-proxy.
  Backward-incompatible: usuário precisa trocar `TRUSTED_PROXY=true` por
  `TRUSTED_PROXY_COUNT=1` no `.env` (instrução no tasks.md).

## Impact

- **Arquivos modificados:** `api/limites.py`, `stockflow/settings.py`, `.env.example`,
  `api/tests/test_rate_limit.py`.
- **Ação manual necessária:** trocar `TRUSTED_PROXY=false` → `TRUSTED_PROXY_COUNT=0`
  no `.env` real (ou `TRUSTED_PROXY_COUNT=1` se TRUSTED_PROXY era true).
- **Sem alteração de banco, sem nova rota, sem alteração de modelo.**
