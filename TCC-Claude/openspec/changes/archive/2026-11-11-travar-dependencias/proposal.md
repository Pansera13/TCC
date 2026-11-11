# Proposal

## Why

O projeto usa `>=` em todas as dependências Python, tem dois pacotes instalados mas nunca importados (`djangorestframework`, `django-ratelimit`) e não possui varredura automática de vulnerabilidades. Isso cria risco de supply-chain (versão ruim pode ser puxada automaticamente) e mantém superfície de ataque desnecessária. É o Bloco 1 do ciclo de segurança/LGPD antes do deploy.

## What Changes

- Remover `djangorestframework` e `django-ratelimit` de `requirements.txt`; remover `'rest_framework'` de `INSTALLED_APPS` e os blocos `REST_FRAMEWORK` e `RATELIMIT_USE_CACHE` de `settings.py` (bloco `CACHES` permanece — usado pelo `GlobalRateLimitMiddleware`).
- Criar `requirements.in` com as dependências diretas sem `>=` e gerar `requirements.txt` com versões exatas via `pip-compile` (ou `uv pip compile`). Pedir autorização antes de instalar a ferramenta.
- Criar `requirements-dev.txt` com `pytest-django`, `pytest-cov`, `bandit` e `pip-audit`, removendo-os de `requirements.txt`.
- Deletar os 4 arquivos de template Vite sem referência em nenhum source: `frontend/src/assets/hero.png`, `frontend/src/assets/react.svg`, `frontend/src/assets/vite.svg`, `frontend/public/icons.svg`.
- Criar `.github/dependabot.yml` (pip em `/TCC-Claude/backend-django`, npm em `/TCC-Claude/frontend`, semanal). Propor a linha `!/.github/` no `.gitignore` da raiz e aguardar confirmação antes de editar.

## Capabilities

### New Capabilities

- `security/dependency-pinning`: Dependências Python diretas declaradas em `requirements.in`; `requirements.txt` gerado com versões exatas; `requirements-dev.txt` separado para ferramentas de dev/CI; varredura automática de vulnerabilidades via Dependabot (semanal) e `pip-audit`/`npm audit`.

### Modified Capabilities

*(nenhuma — a remoção de DRF não altera nenhum requisito observável de `backend/django-runtime`, pois o pacote estava instalado mas não era importado em nenhuma view ou middleware)*

## Impact

- **`backend-django/requirements.txt`**: removidas 2 dependências; versões fixadas.
- **`backend-django/requirements.in`** (novo): dependências diretas, sem `>=`.
- **`backend-django/requirements-dev.txt`** (novo): ferramentas de teste/auditoria.
- **`backend-django/stockflow/settings.py`**: remoção de `'rest_framework'` em `INSTALLED_APPS`, bloco `REST_FRAMEWORK` e linha `RATELIMIT_USE_CACHE`.
- **`frontend/src/assets/`** e **`frontend/public/`**: 4 arquivos removidos.
- **`.github/dependabot.yml`** (novo): automatiza PRs de atualização de dependências.
- **`.gitignore` da raiz** (pendente confirmação): adicionar `!/.github/`.
- **Sem alteração de banco, sem nova rota, sem alteração de comportamento da API.**
