# Design

## Context

Ver `proposal.md — Why` para motivação. Pontos relevantes para as decisões técnicas:

- Cache configurado como `LocMemCache` em `settings.py`; `RATELIMIT_USE_CACHE = 'default'` já existe.
- A recuperação de senha usa `_verificar_limite`/`_registrar_limite` em `api/views/recuperacao.py` com dois bugs: `cache.ttl` não existe no `LocMemCache` (retorna 0 ou lança `AttributeError`), e cada chamada a `cache.set(..., timeout=HORA_S)` reinicia o TTL, criando janela deslizante.
- O login em `api/views/auth.py` não tem nenhum rate limit.
- Banco compartilhado com TCC PEDIDOS: nenhuma tabela pode ser criada ou alterada.

## Goals / Non-Goals

**Goals:**

- Rate limiting por IP e por identificador no login, com janela fixa e `retry_after` real.
- Rate limiting por IP no cadastro.
- Corrigir a recuperação de senha para usar o mesmo módulo.
- Zero dependências novas obrigatórias (só `django.core.cache`).
- Zero alterações no banco.

**Non-Goals:**

- Redis em produção (documentado, mas não implementado nesta change).
- 2FA ou refresh token (Roadmap).
- Rate limiting em outras rotas (movimentações, produtos etc.).
- Bloqueio permanente de conta (apenas temporário).

## Decisions

### D1 — Módulo próprio em vez de `django-ratelimit`

**Escolha:** `api/limites.py` usando `django.core.cache` diretamente.

**Por quê:** `django-ratelimit` já estava instalado (`RATELIMIT_USE_CACHE` no settings), mas tem limitações: não expõe facilmente o `retry_after` real (tempo restante), e sua interface baseada em decorator dificulta a lógica condicional (ex.: não contar conta desativada, zerar após login correto). Com um módulo próprio de ~50 linhas mantemos controle total sem adicionar dependência.

**Alternativa descartada:** `django-ratelimit` com decorator — não expõe `retry_after` calculado do timestamp.

---

### D2 — Janela fixa com `cache.add` + chave de bloqueio separada

**Escolha:** O contador usa `cache.add(chave_contador, 1, timeout=janela_s)` na primeira falha (cria apenas se não existir) e `cache.incr(chave_contador)` nas seguintes. O bloqueio usa uma chave separada `<chave>:bloq` armazenando o `timestamp` de expiração (`time.time() + bloqueio_s`), com TTL igual a `bloqueio_s`.

**Por quê:** `cache.add` garante que o TTL da janela é definido uma única vez, eliminando a janela deslizante do código atual. O timestamp de expiração permite calcular `retry_after = int(expira_em - time.time())` sem depender de `cache.ttl` (inexistente no `LocMemCache`).

**Cuidado:** `cache.incr` lança `ValueError` se a chave não existir (expirou exatamente entre `add` e `incr`). Solução: capturar e chamar `cache.add` novamente (race condition aceitável — a janela recomeça).

---

### D3 — Duas chaves por verificação no login (IP + identificador)

**Escolha:** `login:ip:<ip>` e `login:id:<hash(identificador_normalizado)>`. O identificador é normalizado (minúsculas, sem espaços) e hasheado com SHA-256 truncado para não expor dados no cache.

**Por quê:** Bloquear separadamente previne dois vetores distintos: força bruta de uma conta específica (identificador) e varredura de múltiplas contas do mesmo IP. A conta desativada não incrementa nenhum contador (evitar negar serviço por credenciais válidas de conta desativada). Login correto zera só o identificador para não premiar um atacante que tentou vários IPs.

---

### D4 — Timing constante para identificadores inexistentes

**Escolha:** Quando o identificador não existe, executar `bcrypt.checkpw` com um hash dummy antes de retornar 401, para equalizar o tempo de resposta com o caso de senha errada.

**Por quê:** Sem isso, a ausência do `checkpw` torna a resposta ~100ms mais rápida para identificadores inexistentes — oráculo de enumeração de contas por timing. O hash dummy pode ser um valor fixo pré-computado em tempo de módulo (não em cada requisição).

---

### D5 — `TRUSTED_PROXY` explícito em vez de `REMOTE_ADDR` sempre

**Escolha:** `ip_do_cliente(request)` lê `TRUSTED_PROXY` do ambiente; se `true`, usa o primeiro IP de `X-Forwarded-For`; caso contrário, usa `REMOTE_ADDR`.

**Por quê:** Confiar em `X-Forwarded-For` sem confirmar que há um proxy confiável permite que qualquer cliente forje o IP e burle o rate limit por IP. O opt-in explícito via variável de ambiente documenta a decisão e evita o problema em dev/test.

---

### D6 — Logging com identificador mascarado

**Escolha:** Logger `api.limites`, nível WARNING, mensagem: `"Rate limit atingido: ip=<ip> chave=<primeiros 2 chars>*** endpoint=<nome>"`. Nunca logar a senha, o identificador completo ou o e-mail.

**Por quê:** Logs úteis para diagnóstico sem expor dados pessoais (LGPD).

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Bloqueio deliberado da conta de outra pessoa | Bloqueio curto (15 min); IP do atacante também é bloqueado; sem persistência no banco | 
| LocMemCache não compartilhado entre workers | Documentar necessidade de Redis em produção; em dev/1 worker funciona corretamente |
| Race condition em `incr` após expiração | Capturar `ValueError` e chamar `add` — a janela recomeça, comportamento aceitável |
| Hash dummy para timing constante adiciona ~100ms no caminho feliz | Não: o hash dummy é executado apenas quando o usuário não existe, não no login bem-sucedido |

## Migration Plan

1. Criar branch `feature/limitar-tentativas-login` a partir de `main`.
2. Criar `api/limites.py` com testes unitários passando.
3. Integrar ao login; verificar que os 48 testes existentes continuam passando.
4. Corrigir a recuperação de senha; verificar testes.
5. Integrar ao register.
6. Atualizar `settings.py` (logging), `.env.example` e `README.md`.
7. Ajustar `Login.jsx` no frontend.
8. Atualizar vault (rastreabilidade e métricas).
9. Abrir PR para `main`.

**Rollback:** reverter o merge. Não há alteração de banco.

## Open Questions

- **Cache em produção:** Redis via `django-redis` é recomendado; a decisão de quando configurar fica com Lucas (fora do escopo desta change).
- **Limite de cadastro:** default 10/h por IP é uma estimativa conservadora; ajuste via env var sem redeployar.
