# Proposal

## Why

O endpoint de login do StockFlow não tem nenhum limite de tentativas, permitindo força bruta e enumeração de contas por diferença de tempo de resposta. A recuperação de senha tem um rate limit defeituoso: usa `cache.ttl` (inexistente no LocMemCache) e uma janela deslizante que reinicia a cada falha em vez de ser fixa.

## What Changes

- Criar `api/limites.py`: módulo único e reutilizável de rate limiting baseado em `django.core.cache`, com janela fixa, bloqueio temporário com `retry_after` real e log de cada bloqueio.
- Aplicar ao login: 5 falhas em 15 min por IP ou por identificador → bloqueio de 15 min; identificadores inexistentes contam igual para impedir enumeração.
- Aplicar ao cadastro: 10 tentativas por hora por IP.
- Corrigir a recuperação de senha para usar o mesmo módulo, eliminando `cache.ttl` e a janela deslizante.
- Login correto limpa o contador do identificador (não o do IP).
- Conta desativada retorna 403 e não conta como força bruta.
- Todos os bloqueios retornam HTTP 429 com `{"message": "...", "retry_after": <segundos>}` e cabeçalho `Retry-After`.
- IP do cliente: função única que só confia em `X-Forwarded-For` quando `TRUSTED_PROXY=true`.
- Configuração por variáveis de ambiente: `LOGIN_MAX_FALHAS`, `LOGIN_JANELA_SEGUNDOS`, `LOGIN_BLOQUEIO_SEGUNDOS`.
- Frontend: tela de login exibe mensagem e contagem regressiva ao receber 429, botão desabilitado até o tempo acabar.
- Cache: LocMemCache em dev (já configurado); documentar necessidade de cache compartilhado (Redis) em produção. Nenhuma tabela criada ou alterada.

## Capabilities

### New Capabilities

- `security/rate-limiting`: Módulo `api/limites.py` e regras de limite de tentativas por IP e identificador nos endpoints de login, register e recuperação de senha.

### Modified Capabilities

- `auth/backend`: login agora pode retornar 429 (bloqueio por IP ou identificador); register agora pode retornar 429 (excesso por IP); recuperação de senha corrige o rate limit para usar janela fixa e `retry_after` real.
- `auth/forgot-password`: o limite de envios passa a usar janela fixa e informa `retry_after` correto; a busca da conta (`buscar`) não ganha limite novo, mas passa a usar o módulo centralizado.
- `frontend/login-page`: ao receber 429, exibe mensagem e contagem regressiva e desabilita o botão até o tempo acabar.

## Impact

- **Backend modificado:** `api/views/auth.py` (login, register), `api/views/recuperacao.py` (enviar-codigo, e indiretamente as demais rotas), `backend-django/stockflow/settings.py` (variáveis de env, logging), `backend-django/.env.example`.
- **Novo arquivo:** `api/limites.py`.
- **Novos testes:** `api/tests/test_rate_limit.py` (≥ 9 cenários).
- **Frontend modificado:** `frontend/src/pages/Login.jsx` (exibir 429, contagem regressiva).
- **Sem alteração de banco:** nenhuma tabela, coluna ou migração.
- **Risco — bloqueio deliberado de conta alheia:** um atacante pode bloquear o identificador de outra pessoa enviando falhas propositalmente. Mitigação: o bloqueio é curto (15 min), por IP separado do identificador, e o IP do atacante também é bloqueado. Decisão de aceitar esse trade-off fica com Lucas.
- **Risco — cache em memória não compartilhado:** em produção com múltiplos workers, cada processo tem seu próprio contador → limite efetivo multiplicado pelo número de workers. Solução documentada: configurar Redis via `django-redis`.
