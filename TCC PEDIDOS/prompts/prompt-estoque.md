/opsx:propose migrar-estoque-mysql-para-supabase

## Objetivo
Migrar o TCC Claude (StockFlow: backend Express 5 + MySQL/mysql2, frontend React/Vite) para o Supabase (Postgres), no MESMO projeto usado pelo sistema TCC PEDIDOS, para os dois compartilharem `products` e `movements`. Manter o login próprio (JWT + bcrypt, tabela `usuarios`); NÃO migrar para Supabase Auth.

## Situação atual (já feito, não refazer)
- Projeto Supabase criado e o schema JÁ aplicado: tabelas `usuarios`, `products`, `movements`, `pedidos`, `itens_pedido` e a função `pagar_pedido`. Colunas relevantes: `products(id, nome, quantidade NUMERIC, unidade, peso_kg, categoria, fornecedor, created_at)`, `movements(id, product_id, product_nome, tipo, quantidade, user_id NULL, user_nome, origem 'estoque'|'pedido', pedido_id NULL, created_at)`, `usuarios(id, nome, nome_empresa, cpf_cnpj, email, senha_hash, reset_code_hash, reset_code_expires_at, ativo BOOLEAN, role 'admin'|'user', criado_em)`. NÃO criar nem alterar tabelas.
- `backend/.env` já contém `DATABASE_URL` (Session pooler do Supabase). Não imprimir, logar nem commitar esse valor. O `.env` já foi removido do índice do git e está no `.gitignore`.

## O que fazer
1. Dependências: remover `mysql2`, adicionar `pg`. Remover `DB_HOST/DB_USER/DB_PASS/DB_NAME` do `.env` e do `.env.example`; adicionar `DATABASE_URL=` (vazio) ao `.env.example`.
2. `src/db.js`: `new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })`; `pg.types.setTypeParser(1700, parseFloat)` para NUMERIC voltar como número; exportar `query(sql, params)` retornando `{ rows, rowCount }`.
3. Criar `src/testConnection.js` (`SELECT 1` e `SELECT count(*) FROM products`, `movements`, `usuarios`) e script npm `test-db`. Rodar; só continuar se conectar. Se as tabelas não existirem, parar e avisar o usuário (não criar).
4. Converter TODAS as queries (controllers `authController`, `productController`, `movementController`, `userController`, `routes/profile.js`, `middleware/auth.js`, `services/movementService.js`, `nfeService` se houver SQL, scripts `seed*.js`):
   - placeholders `?` -> `$1, $2, ...`
   - `pool.execute` retorna `[rows]` no MySQL; no pg usar `result.rows`
   - `result.insertId` -> `INSERT ... RETURNING id`; `affectedRows` -> `rowCount`
   - `ativo = 1/0` -> `TRUE/FALSE`
   - `withdrawProduct`: manter decremento atômico (`UPDATE products SET quantidade = quantidade - $1 WHERE id = $2 AND quantidade >= $1 RETURNING nome`).
5. Remover `src/createTable.js` e o script `setup-db` (schema vive no Supabase).
6. `movementController`: incluir `origem` e `pedido_id` no SELECT. No frontend de Movimentações, quando `origem = 'pedido'` mostrar "Pedido" e usuário "Sistema de Pedidos" (`user_id` pode ser null; não quebrar).
7. Opcional: `src/migrarMysqlParaSupabase.js` que copia `usuarios`, `products`, `movements` do MySQL antigo preservando ids (`OVERRIDING SYSTEM VALUE`) e ajusta sequences com `setval`. Só executar se o usuário confirmar que há dados a preservar.
8. Porta do estoque continua 3001, CORS http://localhost:5173 (o Pedidos usa 3002).
9. Segurança: `node_modules/` ainda está versionado no git; fazer `git rm -r --cached backend/node_modules frontend/node_modules`. Avisar o usuário para trocar JWT_SECRET, JWT_RESET_SECRET e a senha do e-mail, pois já foram commitados antes.

## Critérios de aceite
- `npm run test-db` conecta ao Supabase.
- Login, cadastro, recuperação de senha, CRUD de produtos, retirada e movimentações funcionam como antes.
- Retirada acima do saldo retorna 400 "Estoque insuficiente" sem alterar o saldo.
- `quantidade` e `peso_kg` chegam ao frontend como número.
- Nenhum arquivo importa `mysql2`.
