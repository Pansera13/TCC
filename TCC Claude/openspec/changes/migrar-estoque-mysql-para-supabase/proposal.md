# Proposal

## Why

O backend do TCC Claude (StockFlow) usa MySQL/mysql2, mas o schema do Supabase já foi criado (tabelas `usuarios`, `products`, `movements`, `pedidos`, `itens_pedido` e function `pagar_pedido` estão prontas) e o `DATABASE_URL` já está no `.env`. O único trabalho restante é trocar a camada de acesso ao banco de `mysql2` para `pg` e adaptar todas as queries.

## What Changes

- Substituir `mysql2` por `pg`; reescrever `src/db.js` com `Pool` + SSL + parser NUMERIC.
- Remover `DB_HOST/DB_USER/DB_PASS/DB_NAME` do `.env` e do `.env.example`; adicionar `DATABASE_URL=` ao `.env.example`.
- Criar `src/testConnection.js` e script npm `test-db`.
- Converter todos os controllers, model `User`, `middleware/auth.js`, `routes/profile.js` e `services/movementService.js` de syntax MySQL (`?`, `[rows]`, `insertId`, `affectedRows`) para syntax pg (`$n`, `result.rows`, `RETURNING id`, `rowCount`).
- Adicionar `origem` e `pedido_id` ao SELECT de movimentações; atualizar frontend para exibi-los sem quebrar quando `user_id = null`.
- Remover `src/createTable.js` e script npm `setup-db`.
- Executar `git rm -r --cached backend/node_modules frontend/node_modules` (ainda rastreados).
- Alertar usuário para rotacionar `JWT_SECRET`, `JWT_RESET_SECRET` e `EMAIL_PASS`.
- Opcional: `src/migrarMysqlParaSupabase.js` se houver dados a preservar.

## Capabilities

### New Capabilities

- `database/pg-connection`: Camada de conexão ao Postgres via `pg.Pool` com `DATABASE_URL`, SSL e parser NUMERIC → float. Exporta `query(sql, params)` retornando `{ rows, rowCount }`.
- `integration/pedidos-shared-schema`: Requisitos de exibição das colunas `origem` e `pedido_id` de `movements` no frontend, tratando `user_id = null` de forma segura.
- `security/repo-hygiene`: Requisitos de remoção de `node_modules` do rastreamento git e rotação de segredos expostos.

### Modified Capabilities

Nenhuma capability existente tem alteração de comportamento observável externamente. A troca MySQL → Postgres é detalhe de implementação.

## Impact

- **Backend** (`backend/src/`): `db.js`, todos os controllers, `models/User.js`, `middleware/auth.js`, `routes/profile.js`, `services/movementService.js`, scripts seed.
- **Dependências**: remover `mysql2`; adicionar `pg`.
- **Frontend**: página de Movimentações exibe `origem` e trata `user_id` nulo.
- **Git**: `git rm --cached` para `backend/node_modules` e `frontend/node_modules`.
- **Segredo**: usuário deve trocar `JWT_SECRET`, `JWT_RESET_SECRET` e `EMAIL_PASS`.
- **Não muda**: schema do banco (já aplicado), `DATABASE_URL` no `.env`, `.gitignore`.
