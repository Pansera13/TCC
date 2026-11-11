# Spec Delta

## Purpose

Garante que o StockFlow use dependências Python e npm com versões exatas e receba alertas automáticos de vulnerabilidades conhecidas, eliminando o risco de upgrades silenciosos de supply chain.

## ADDED Requirements

### Requirement: Dependências Python em versões exatas

O projeto SHALL declarar todas as dependências Python de runtime em `requirements.in` (sem operadores `>=`) e manter `requirements.txt` gerado por `pip-compile` ou `uv pip compile` com versões pinadas (`==`). Nenhuma dependência de runtime SHALL usar `>=`, `~=` ou range aberto.

#### Scenario: requirements.txt contém somente versões exatas

- **WHEN** `requirements.txt` é inspecionado
- **THEN** toda linha de dependência usa `==` e nenhuma usa `>=`, `~=` ou range aberto

#### Scenario: Dependências de dev separadas

- **WHEN** o projeto é instalado com `pip install -r requirements.txt`
- **THEN** `pytest`, `pytest-django`, `pytest-cov`, `bandit` e `pip-audit` NÃO são instalados; para instalá-los é necessário usar `requirements-dev.txt`

### Requirement: Varredura de vulnerabilidades no CI

O projeto SHALL executar `pip-audit` sobre `requirements.txt` e `npm audit` sobre `frontend/package.json` em cada push/pull-request. Se alguma vulnerabilidade conhecida for encontrada, o job SHALL falhar com saída não-zero.

#### Scenario: pip-audit sem vulnerabilidades

- **WHEN** `pip-audit -r requirements.txt` é executado sobre o `requirements.txt` do projeto
- **THEN** o comando termina com código de saída 0

#### Scenario: npm audit sem vulnerabilidades críticas

- **WHEN** `npm audit --audit-level=high` é executado no diretório `frontend/`
- **THEN** o comando termina com código de saída 0

### Requirement: Dependabot habilitado para pip e npm

O repositório SHALL ter `.github/dependabot.yml` configurando atualizações automáticas semanais para o ecossistema `pip` em `/TCC-Claude/backend-django` e para o ecossistema `npm` em `/TCC-Claude/frontend`.

#### Scenario: Dependabot detecta atualização pip

- **WHEN** uma nova versão de dependência Python listada em `requirements.txt` é publicada
- **THEN** o Dependabot abre um Pull Request na semana seguinte propondo a atualização

#### Scenario: Dependabot detecta atualização npm

- **WHEN** uma nova versão de pacote npm listado em `package.json` é publicada
- **THEN** o Dependabot abre um Pull Request na semana seguinte propondo a atualização
