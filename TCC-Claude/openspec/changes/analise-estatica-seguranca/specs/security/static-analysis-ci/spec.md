# Spec Delta

## Purpose

Pipeline de CI que executa análise estática de segurança em cada push e pull request — bandit, pip-audit, npm audit, oxlint, gitleaks (somente novos commits) e CodeQL — garantindo que nenhum achado não triado chegue ao branch principal.

## ADDED Requirements

### Requirement: Bandit sem achados não triados

O pipeline de CI SHALL executar `bandit -r backend-django/api -x backend-django/api/tests` a cada push/PR. O job SHALL falhar se bandit reportar qualquer achado sem anotação `# nosec`. Achados falsos positivos confirmados DEVEM ser suprimidos em código com `# nosec Bxxx — <motivo>`.

#### Scenario: Bandit passa com todos os nosec documentados

- **WHEN** o job `bandit` executa no CI sobre o branch atual
- **THEN** o comando termina com código de saída 0 (nenhum achado sem triagem)

#### Scenario: Novo código com risco real falha o CI

- **WHEN** um commit introduz SQL construído com concatenação de string não parametrizada
- **THEN** bandit retorna código de saída não-zero e o job falha

### Requirement: Relatório de triagem bandit mantido

O repositório SHALL conter `backend-django/api/tests/RELATORIO_ANALISE_ESTATICA.md` documentando para cada achado bandit: comando exato, versão da ferramenta, severidade, localização, decisão (corrigido ou suprimido) e justificativa.

#### Scenario: Relatório cobre todos os achados

- **WHEN** o relatório é consultado após a execução do bandit
- **THEN** cada achado listado pelo bandit tem uma linha correspondente no relatório com decisão e justificativa

### Requirement: gitleaks restrito a commits novos

O pipeline de CI SHALL executar gitleaks sobre apenas os commits introduzidos pelo push ou PR atual, sem varrer o histórico completo do repositório.

#### Scenario: gitleaks não varre histórico

- **WHEN** o job gitleaks executa num PR
- **THEN** apenas os commits do PR são inspecionados; commits anteriores ao base do PR não são avaliados

#### Scenario: Segredo em commit novo falha o CI

- **WHEN** um commit no PR contém uma string que corresponde a um padrão de segredo conhecido
- **THEN** o job gitleaks falha e o merge é bloqueado

### Requirement: oxlint sem erros no frontend

O pipeline de CI SHALL executar `npm run lint` (oxlint) no diretório `frontend/` a cada push/PR. O job SHALL falhar se oxlint reportar erros.

#### Scenario: oxlint passa no código atual

- **WHEN** o job `oxlint` executa sobre o diretório `frontend/src`
- **THEN** o comando termina com código de saída 0

### Requirement: CodeQL habilitado para Python e JavaScript

O repositório SHALL ter análise CodeQL ativa para as linguagens Python e JavaScript, executada a cada push/PR no branch principal e em schedule semanal.

#### Scenario: CodeQL executa sem erros de configuração

- **WHEN** o workflow CodeQL é disparado por push ou PR
- **THEN** ambas as linguagens são analisadas e o job termina sem erro de configuração
