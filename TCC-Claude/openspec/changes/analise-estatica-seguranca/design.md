# Design

## Context

Ver `proposal.md — Why`. Estado atual relevante:

- bandit 1.9.4 rodado manualmente encontrou **7 achados B608** — todos em `movements.py` (linhas 86, 91) e `reports.py` (linhas 55, 64, 73, 82, 96). Nenhum outro achado.
- `oxlint` já está em `devDependencies` e no script `"lint": "oxlint"` do `package.json` do frontend.
- `.github/workflows/` não existe; `.github/dependabot.yml` já existe após o Bloco 1.
- O histórico do repo tem segredos antigos que foram decididos não reescrever — gitleaks deve varrer apenas novos commits.

## Goals / Non-Goals

**Goals:**
- Nenhum achado bandit sem `# nosec` no code base após esta change.
- CI falha automaticamente em qualquer push com novo achado não triado.
- gitleaks protege novos commits sem bloquear o histórico.

**Non-Goals:**
- Executar pytest no CI (exige Supabase real — sem solução de mock satisfatória).
- Reescrever as queries SQL para eliminar os B608 (correto funcionamento confirmado por testes de SQL injection no RELATORIO_ATAQUES_SIMULADOS.md).
- Corrigir o aviso de chunk size do frontend (não é achado de segurança).

## Decisions

### 1. Suprimir B608 com `# nosec` — justificativa por localização

| Arquivo | Linha | Fragmentos interpolados | Motivo da supressão |
|---|---|---|---|
| movements.py | 86 | `{filtro}` | `filtro` é `'WHERE ' + ' AND '.join(where)`, onde cada cláusula usa `add(val)` → `%s`; nenhum valor do usuário na string SQL |
| movements.py | 91 | `{filtro}`, `{coluna}`, `{direcao}` | `coluna` ∈ `COLUNAS_ORDEM` (whitelist), `direcao` ∈ `{'ASC','DESC'}` (ternário), `filtro` só tem `%s` |
| reports.py | 55 | *(nenhum)* | f-string sem interpolação de variáveis; `%s` literais no texto |
| reports.py | 64 | `{periodo}`, `{nao_arquivado}` | ambos são constantes de módulo sem dados do usuário |
| reports.py | 73 | `{periodo}`, `{nao_arquivado}` | idem |
| reports.py | 82 | `{periodo}`, `{nao_arquivado}` | idem |
| reports.py | 96 | `{periodo}`, `{nao_arquivado}` | idem |

### 2. gitleaks — varrer apenas commits novos

**Escolha:** `gitleaks/gitleaks-action@v2` com configuração de range de commits.  
Para push: `git log --diff-filter=A --no-walk --format="%H" <before>..<after>`  
Para PR: `github.event.pull_request.base.sha..github.event.pull_request.head.sha`  
**Alternativa considerada:** `--no-git` para varrer somente os arquivos staged — mais simples, mas não pega segredos em mensagens de commit.  
**Rationale:** O range de commits garante que o histórico antigo (com segredos já expostos e decididos não reescrever) não seja avaliado.

### 3. Estrutura do workflow seguranca.yml

```
jobs:
  pip-audit   → pip-audit -r requirements.txt
  npm-audit   → npm audit --audit-level=high
  bandit      → bandit -r api -x api/tests (exit non-zero = falha)
  oxlint      → npm run lint
  gitleaks    → gitleaks-action@v2, apenas commits novos
  codeql      → github/codeql-action (python + javascript)
```

Cada job é independente; falha em qualquer um bloqueia o PR.

### 4. CodeQL — linguagens Python e JavaScript

**Escolha:** Usar a action `github/codeql-action/init@v3` com `languages: ['python', 'javascript']`.  
CodeQL analisa o repositório completo; para Python usa autobuilder (sem compilação), para JavaScript idem.

## Risks / Trade-offs

- **CodeQL pode ser lento** (~5 min) → Jobs paralelos; não bloqueia outros jobs.
- **gitleaks falso positivo em variável de ambiente no código** → Adicionar `.gitleaks.toml` com allowlist se necessário; configurar no apply se houver achado.
- **bandit com Python 3.14** → Testado localmente: bandit 1.9.4 roda corretamente.
