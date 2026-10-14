# Spec Delta

## Purpose

Garante que o repositório do StockFlow não versione `node_modules` e que os segredos já expostos em histórico anterior sejam rotacionados.

## ADDED Requirements

### Requirement: node_modules removido do rastreamento git

`backend/node_modules` e `frontend/node_modules` NÃO DEVEM ser rastreados pelo git. Se estiverem rastreados, DEVEM ser removidos do índice com `git rm -r --cached` sem excluir os arquivos locais.

#### Scenario: node_modules não rastreado após a mudança

- **WHEN** `git ls-files backend/node_modules` e `git ls-files frontend/node_modules` são executados
- **THEN** nenhum dos comandos retorna arquivos

### Requirement: .env.example atualizado sem segredos

`backend/.env.example` DEVE listar `DATABASE_URL=` (vazio) e NÃO DEVE conter `DB_HOST`, `DB_USER`, `DB_PASS` ou `DB_NAME`. Nenhuma senha ou segredo real DEVE constar no arquivo.

#### Scenario: .env.example contém DATABASE_URL sem valor

- **WHEN** `backend/.env.example` é aberto
- **THEN** contém a linha `DATABASE_URL=` e não contém nenhuma das quatro variáveis DB_* antigas

### Requirement: Alerta de rotação de segredos expostos

O usuário DEVE ser informado de que `JWT_SECRET`, `JWT_RESET_SECRET` e `EMAIL_PASS` foram commitados em histórico anterior e DEVEM ser rotacionados antes de uso em produção.

#### Scenario: Instrução de rotação apresentada ao usuário

- **WHEN** a migração é concluída
- **THEN** o usuário recebe instrução explícita para gerar novos valores para `JWT_SECRET`, `JWT_RESET_SECRET` e `EMAIL_PASS` e atualizá-los no `.env`
