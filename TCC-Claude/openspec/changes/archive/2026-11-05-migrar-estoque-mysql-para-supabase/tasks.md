# Tasks

## 1. Dependências e ambiente

- [x] 1.1 Dentro de `backend/`, executar `npm uninstall mysql2 && npm install pg`; verificar que `package.json` lista `pg` em `dependencies` e não contém `mysql2`.
- [x] 1.2 Atualizar `backend/.env.example`: remover linhas `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`; adicionar `DATABASE_URL=`; verificar que o arquivo não contém nenhuma senha ou segredo real.

## 2. Camada de banco de dados

- [x] 2.1 Reescrever `backend/src/db.js`: criar `pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })`; registrar `pg.types.setTypeParser(1700, parseFloat)`; exportar `async function query(sql, params)` retornando `{ rows, rowCount }`; verificar que nenhum import de `mysql2` permanece no arquivo.
- [x] 2.2 Criar `backend/src/testConnection.js` que executa `SELECT 1`, `SELECT count(*) FROM products`, `SELECT count(*) FROM movements` e `SELECT count(*) FROM usuarios`; se alguma tabela não existir, imprimir aviso e sair com código não-zero sem tentar criar; adicionar `"test-db": "node src/testConnection.js"` em `package.json`; executar `npm run test-db` e confirmar saída de sucesso antes de continuar.

## 3. Model User

- [x] 3.1 Reescrever `backend/src/models/User.js`: trocar todos os `?` por `$1, $2, …`; trocar `[rows]` por `{ rows }`; substituir `REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ', '')` por `REGEXP_REPLACE(cpf_cnpj, '[.\-\/\s]', '', 'g')`; `result.insertId` → `rows[0].id` com `RETURNING id`; verificar que nenhum `?` como placeholder permanece no arquivo.

## 4. Middleware e routes

- [x] 4.1 Atualizar `backend/src/middleware/auth.js`: trocar `pool.execute('... WHERE id = ?', [id])` por `db.query('... WHERE id = $1', [id])` e acessar `result.rows[0]`; `ativo` é booleano nativo, nenhuma conversão necessária; verificar que uma requisição com token válido passa pelo middleware sem erro 401.
- [x] 4.2 Atualizar `backend/src/routes/profile.js`: trocar `pool.execute('UPDATE usuarios SET nome = ? WHERE id = ?', [...])` por `db.query('UPDATE usuarios SET nome = $1 WHERE id = $2', [...])`; verificar que `PUT /api/profile` retorna 200 com nome atualizado.

## 5. Controllers

- [x] 5.1 Converter `backend/src/controllers/authController.js`: todos os `pool.execute` → `db.query` com `$n`; `insertId` → `RETURNING id` + `rows[0].id`; `affectedRows` → `rowCount`; verificar que login, cadastro, forgot-password, verify-code e reset-password respondem sem erro 500.
- [x] 5.2 Converter `backend/src/controllers/productController.js`: `pool.execute` → `db.query` com `$n`; `createProduct` usa `RETURNING id`; `updateProduct` usa `rowCount`; `withdrawProduct` usa `UPDATE … WHERE quantidade >= $1 RETURNING nome` (uma única query, eliminar a segunda); verificar que retirada acima do saldo retorna 400 sem alterar `quantidade`.
- [x] 5.3 Converter `backend/src/controllers/movementController.js`: adicionar `origem` e `pedido_id` ao SELECT; trocar `pool.execute` por `db.query` com `$n`; verificar que `GET /api/movements` retorna objetos com campos `origem` e `pedido_id`.
- [x] 5.4 Converter `backend/src/controllers/userController.js`: todos os `pool.execute` → `db.query` com `$n`; `insertId` → `RETURNING id`; `affectedRows` → `rowCount`; substituir `REPLACE` encadeado por `REGEXP_REPLACE`; verificar que CRUD de usuários (listar, criar, atualizar role, toggle status, deletar) funciona sem erro.

## 6. Services e seeds

- [x] 6.1 Atualizar `backend/src/services/movementService.js`: adicionar parâmetros `origem = 'estoque'` e `pedido_id = null`; atualizar INSERT para incluir essas colunas como `$7` e `$8`; verificar que `createProduct` e `withdrawProduct` ainda registram movimentação corretamente (origem = 'estoque').
- [x] 6.2 Converter `backend/src/seed.js`, `seedCategorias.js` e `seedCategorias100.js`: substituir `pool.execute` por `db.query` com `$n`; `insertId` → `RETURNING id`; verificar que os arquivos não contêm mais `?` como placeholder nem `pool.execute`.

## 7. Remoção de legado

- [x] 7.1 Deletar `backend/src/createTable.js`; remover o script `"setup-db"` de `package.json`; verificar que nenhum arquivo importa `createTable.js` e que `npm run setup-db` resulta em "script not found".

## 8. Frontend — tela de Movimentações

- [x] 8.1 Localizar o componente React da tela de Movimentações; adicionar coluna `Origem` à tabela; quando `origem === 'pedido'` exibir "Sistema de Pedidos" no campo de usuário (tratar `user_id = null` sem quebrar); verificar que a tela renderiza sem erro com dados de ambas as origens.

## 9. Higiene do repositório git

- [x] 9.1 Executar `git rm -r --cached backend/node_modules frontend/node_modules`; verificar com `git ls-files backend/node_modules` e `git ls-files frontend/node_modules` que nenhum resultado é retornado.
- [x] 9.2 Alertar o usuário para rotacionar `JWT_SECRET`, `JWT_RESET_SECRET` e `EMAIL_PASS` — esses valores foram commitados em histórico anterior e devem ser substituídos por valores novos no `.env` antes de uso em produção.

## 10. Script opcional de migração de dados MySQL

- [x] 10.1 Se o usuário confirmar que há dados MySQL a preservar: criar `backend/src/migrarMysqlParaSupabase.js` que conecta ao MySQL via variáveis `DB_*` e ao Supabase via `DATABASE_URL`; insere `usuarios`, `products` e `movements` com `OVERRIDING SYSTEM VALUE`; executa `SELECT setval(seq, MAX(id))` para reajustar sequences; verificar que o count de cada tabela no Supabase corresponde ao MySQL de origem. (Pular se não houver dados a migrar.)

## 11. Verificação final

- [x] 11.1 Executar `npm run test-db` e confirmar código de saída 0.
- [x] 11.2 Iniciar o servidor (`npm run dev`) e testar manualmente: login, cadastro, recuperação de senha, listagem e criação de produtos, retirada dentro e acima do saldo, listagem de movimentações com `origem` visível; confirmar que `quantidade` e `peso_kg` chegam ao frontend como número.
- [x] 11.3 Executar `grep -r "mysql2" backend/src` e confirmar que nenhum resultado é retornado.

## Workflow follow-up

- Após validar que todas as funcionalidades operam corretamente, arquivar o change com `/opsx:archive`.
