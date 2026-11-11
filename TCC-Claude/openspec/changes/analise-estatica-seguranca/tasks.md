# Tasks

## 1. Suprimir achados B608 no código

- [x] 1.1 Em `backend-django/api/views/movements.py` linha 86, adicionar ao final da linha `# nosec B608 — filtro contém apenas %s; valores do usuário vão por params`; verificar que bandit não reporta mais essa linha.
- [x] 1.2 Em `backend-django/api/views/movements.py` linha 91 (f-string multilinha), adicionar ao final da primeira linha do f-string `# nosec B608 — coluna validada por COLUNAS_ORDEM, direcao é ASC/DESC, filtro usa %s`; verificar que bandit não reporta mais essa linha.
- [x] 1.3 Em `backend-django/api/views/reports.py` linha 55, adicionar ao final da linha do `cur.execute(` `# nosec B608 — f-string sem interpolação de variáveis; %s literais no template`; verificar.
- [x] 1.4 Em `backend-django/api/views/reports.py` linhas 64, 73, 82 e 96, adicionar ao final da linha de abertura de cada f-string `# nosec B608 — periodo e nao_arquivado são constantes sem dados do usuário`; verificar.
- [x] 1.5 Rodar `python -m bandit -r api -x api/tests` e confirmar saída: **0 achados** (código de saída 0).

## 2. Criar relatório de análise estática

- [x] 2.1 Criar `backend-django/api/tests/RELATORIO_ANALISE_ESTATICA.md` com: data, comando exato, versão do bandit, tabela de achados (arquivo, linha, regra, severidade, decisão, justificativa); usar o cabeçalho/estilo de `RELATORIO_ATAQUES_SIMULADOS.md` como modelo.

## 3. Criar workflow de segurança no CI

- [x] 3.1 Criar `.github/workflows/seguranca.yml` com jobs independentes: `pip-audit` (sobre `requirements.txt`), `npm-audit` (frontend), `bandit` (api/, excluindo tests), `oxlint` (`npm run lint`), `gitleaks` (somente commits do push/PR — sem varredura de histórico) e `codeql` (python + javascript). NÃO incluir step de pytest.
- [x] 3.2 Validar que o YAML é sintaticamente correto: `python -c "import yaml; yaml.safe_load(open('.github/workflows/seguranca.yml'))"`.
- [x] 3.3 Verificar que o workflow referencia o `requirements.txt` em `TCC-Claude/backend-django/` e o `package.json` em `TCC-Claude/frontend/` com os caminhos corretos relativos à raiz do repositório.

## 4. Verificação final

- [x] 4.1 Rodar `python -m bandit -r api -x api/tests` localmente; confirmar código de saída 0 e mensagem "No issues identified" ou equivalente.
- [x] 4.2 Rodar `npm run lint` no diretório `frontend/`; confirmar código de saída 0.

## Workflow follow-up

- Arquivar a change após os testes passarem e Lucas aprovar.
- Passar ao Bloco 3 (`testes-isolamento-tenant`) somente após arquivamento.
