# Proposal

## Why

O projeto não tem análise estática de segurança no CI nem documentação das decisões de triagem. Sem isso, qualquer commit pode introduzir um problema de segurança que só seria percebido em revisão manual. É o Bloco 2 do ciclo de segurança/LGPD.

## What Changes

- Adicionar `# nosec B608` com comentário de justificativa nos 7 achados do bandit em `movements.py` (2) e `reports.py` (5) — todos falsos positivos confirmados: user data entra via `%s`, os fragmentos interpolados são constantes ou validados por whitelist.
- Criar `backend-django/api/tests/RELATORIO_ANALISE_ESTATICA.md` documentando: comando, versão da ferramenta, achados e decisão por achado.
- Criar `.github/workflows/seguranca.yml` com jobs: `pip-audit`, `npm audit`, `bandit`, `oxlint` (já existe no devDependencies do frontend), CodeQL (Python + JavaScript) e gitleaks **somente sobre commits novos** (sem varrer histórico).

## Capabilities

### New Capabilities

- `security/static-analysis-ci`: Pipeline de CI que executa análise estática de segurança em cada push/PR — bandit, pip-audit, npm audit, oxlint, gitleaks (novos commits) e CodeQL.

### Modified Capabilities

*(nenhuma — os `# nosec` não alteram comportamento observável; são anotações de triagem)*

## Impact

- **`backend-django/api/views/movements.py`**: 2 comentários `# nosec B608` adicionados.
- **`backend-django/api/views/reports.py`**: 5 comentários `# nosec B608` adicionados.
- **`backend-django/api/tests/RELATORIO_ANALISE_ESTATICA.md`** (novo): relatório de triagem bandit.
- **`.github/workflows/seguranca.yml`** (novo): pipeline CI de segurança.
- **Sem alteração de banco, sem nova rota, sem alteração de comportamento da API.**
