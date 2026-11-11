# Design

## Context

Ver `proposal.md — Why` para motivação. Estado atual relevante:

- `requirements.txt` tem 11 linhas, todas com `>=`; inclui 2 pacotes não usados (`djangorestframework`, `django-ratelimit`) e 2 de dev (`pytest-django`, `pytest-cov`).
- `settings.py` referencia `'rest_framework'` em `INSTALLED_APPS`, o bloco `REST_FRAMEWORK` e `RATELIMIT_USE_CACHE`. O bloco `CACHES` (LocMemCache `'default'`) é mantido — usado por `GlobalRateLimitMiddleware`.
- 4 arquivos de template Vite existem mas nenhum source os importa.
- `.gitignore` da raiz usa `/*` + allowlist; `.github/` está implicitamente bloqueado.

## Goals / Non-Goals

**Goals:**
- `requirements.txt` com versões `==` gerado por ferramenta (reproduzível).
- `requirements-dev.txt` isolando deps de dev e CI.
- Dependabot ativo para pip e npm, semanal.
- Projeto limpo de código morto (DRF, assets Vite).

**Non-Goals:**
- Atualizar versões das dependências existentes (somente fixar as versões atuais).
- Configurar CI completo (fica no Bloco 2).
- Alterar comportamento da API ou do banco.

## Decisions

### 1. pip-tools (`pip-compile`) para gerar `requirements.txt`

**Escolha:** `pip-compile` (pacote `pip-tools`).  
**Alternativa considerada:** `uv pip compile` — mais rápido, mas adiciona `uv` como dependência de tooling sem benefício relevante para um projeto de tamanho TCC.  
**Rationale:** `pip-tools` é o padrão estabelecido; gera `requirements.txt` com hashes opcionais, resolve transitividade e é amplamente documentado. Peço autorização antes de instalar.

### 2. Remover `REST_FRAMEWORK` e `RATELIMIT_USE_CACHE` mas manter `CACHES`

**Escolha:** Remover bloco `REST_FRAMEWORK`, linha `RATELIMIT_USE_CACHE` e `'rest_framework'` de `INSTALLED_APPS`. Manter bloco `CACHES`.  
**Rationale:** `GlobalRateLimitMiddleware` usa `django.core.cache.backends.locmem.LocMemCache` com alias `'default'` — depende do `CACHES`. Já `RATELIMIT_USE_CACHE` é configuração do `django-ratelimit`, que está sendo removido.

### 3. `.gitignore` da raiz — confirmação antes de editar

**Escolha:** Propor a linha `!/.github/` imediatamente após `!/TCC-Claude/` e aguardar OK do Lucas.  
**Rationale:** A linha `/*` bloqueia tudo na raiz; sem `!/.github/`, o `dependabot.yml` não sobe para o GitHub e a automação nunca é ativada. É uma mudança pequena mas irreversível no fluxo de CI.

### 4. Separação requirements / requirements-dev

| Arquivo | Conteúdo |
|---|---|
| `requirements.in` | Deps de runtime diretas (sem `>=`) |
| `requirements.txt` | Gerado por `pip-compile` com `==` |
| `requirements-dev.txt` | `pytest-django`, `pytest-cov`, `bandit`, `pip-audit` (versões `>=` ou `==`) |

`requirements-dev.txt` não precisa ser gerado por `pip-compile` para este projeto (ferramentas de dev, não produção).

## Risks / Trade-offs

- **Versões fixas podem ficar desatualizadas** → Dependabot abre PRs semanais automaticamente; risco gerenciado.
- **pip-compile resolve transitividade** → `requirements.txt` resultante pode ter mais linhas (sub-deps); normal e esperado.
- **Remoção de DRF** → `'rest_framework'` em `INSTALLED_APPS` carregava o app DRF no boot; removê-lo elimina o carregamento desnecessário. Risco zero — confirmado por grep: nenhum arquivo em `api/` importa `rest_framework`.

## Migration Plan

1. Pedir autorização para instalar `pip-tools`.
2. Editar `settings.py` e `requirements.txt` (remoções).
3. Criar `requirements.in` e rodar `pip-compile` → novo `requirements.txt`.
4. Criar `requirements-dev.txt`.
5. Deletar 4 assets Vite.
6. Criar `.github/dependabot.yml`.
7. Propor linha `!/.github/` no `.gitignore` da raiz; aguardar OK.
8. Rodar `pip-audit -r requirements.txt` e `npm audit` para confirmar estado limpo.
9. Avisar Lucas antes de rodar pytest; aguardar autorização.

**Rollback:** Todos os arquivos editados estão em git. `git checkout -- <arquivo>` restaura qualquer estado anterior.
