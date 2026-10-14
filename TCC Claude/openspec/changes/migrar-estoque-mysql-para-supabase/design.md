# Design

## Context

O backend usa Express 5 + CommonJS. `src/db.js` expõe um pool `mysql2` importado por todos os controllers, model `User`, `middleware/auth.js` e `routes/profile.js`. Cada chamada usa `pool.execute(sql, params)` retornando `[rows, fields]`, com placeholders `?` e campos `insertId` / `affectedRows`.

O schema no Supabase já está aplicado (`usuarios`, `products`, `movements`, `pedidos`, `itens_pedido`, `pagar_pedido`). `DATABASE_URL` já está no `.env` e o arquivo está no `.gitignore`. O trabalho restante é exclusivamente na camada de código Node.js.

## Goals / Non-Goals

**Goals:**
- Substituir `mysql2` por `pg` sem alterar nenhum endpoint HTTP nem lógica de negócio.
- Expor `origem` e `pedido_id` no endpoint de movimentações e exibi-los no frontend.
- Remover `node_modules` do índice git.

**Non-Goals:**
- Criar ou alterar qualquer tabela no banco — schema já está pronto.
- Migrar para Supabase Auth — login continua JWT + bcrypt + tabela `usuarios`.
- Criar testes automatizados.
- Alterar a porta (3001), CORS ou qualquer outro comportamento de servidor.

## Decisions

### 1. `pg.Pool` com Session pooler

Session pooler (porta 5432) é compatível com `pg` padrão que usa prepared statements. Transaction pooler (porta 6543) exigiria configuração adicional. Como `DATABASE_URL` já aponta para Session pooler, nenhuma mudança de configuração é necessária.

### 2. Parser de tipo OID 1700 (NUMERIC → float)

`pg` retorna colunas `NUMERIC` como string. Registrar `pg.types.setTypeParser(1700, parseFloat)` uma vez na inicialização do pool resolve para todas as colunas de `quantidade` e `peso_kg` sem alterar nenhum controller.

### 3. Interface `query(sql, params)` → `{ rows, rowCount }`

Minimiza a diff: controllers trocam apenas `const [rows] = await pool.execute(...)` por `const { rows } = await db.query(...)`. `insertId` vira `RETURNING id` + `rows[0].id`. `affectedRows` vira `rowCount`.

### 4. `withdrawProduct` — decremento atômico

O padrão `UPDATE products SET quantidade = quantidade - $1 WHERE id = $2 AND quantidade >= $1 RETURNING nome` preserva atomicidade idêntica ao MySQL. O `RETURNING nome` elimina a segunda query separada de busca do nome, simplificando o controller.

### 5. `logMovement` com origem/pedido_id opcionais

Adicionar `origem = 'estoque'` e `pedido_id = null` como defaults na assinatura de `logMovement` garante que todos os callers existentes continuem funcionando sem alteração, enquanto o INSERT passa a gravar os campos na tabela.

### 6. REGEXP_REPLACE em vez de REPLACE encadeado

MySQL usa `REPLACE(REPLACE(REPLACE(...)))` para limpar CPF/CNPJ. Em Postgres usa-se `REGEXP_REPLACE(cpf_cnpj, '[.\-/\s]', '', 'g')`. Aplicar em `models/User.js` e `userController.js`.

### 7. `ativo` é booleano nativo no Postgres

A coluna `ativo BOOLEAN` retorna `true`/`false` diretamente. O código existente (`!rows[0].ativo`, `newStatus = !rows[0].ativo`) funciona sem alteração. Nenhuma conversão `1/0` é necessária.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Segredos já commitados no histórico git | `git rm --cached` impede novos commits; usuário deve rotacionar JWT_SECRET, JWT_RESET_SECRET e EMAIL_PASS |
| Pool do Supabase encerra conexões idle | Configurar `idleTimeoutMillis` no Pool se necessário; Session pooler suporta até 15 conexões na camada gratuita |
| Seeds com `pool.execute` quebram silenciosamente | Converter seeds junto com os controllers; verificar execução manual |

## Migration Plan

1. `npm uninstall mysql2 && npm install pg` (dentro de `backend/`).
2. Reescrever `src/db.js`.
3. Criar `src/testConnection.js` + script `test-db`; rodar e confirmar conexão.
4. Converter `models/User.js`, `middleware/auth.js`, `routes/profile.js`.
5. Converter controllers: `authController`, `productController`, `movementController`, `userController`.
6. Converter `services/movementService.js` (adicionar `origem`/`pedido_id`).
7. Converter scripts seed.
8. Remover `src/createTable.js` + script `setup-db`.
9. Atualizar frontend de Movimentações.
10. `git rm -r --cached backend/node_modules frontend/node_modules`.
11. Atualizar `backend/.env.example` (remover DB_*, adicionar DATABASE_URL=).
12. Alertar sobre rotação de segredos.

**Rollback**: reverter `src/db.js` para `mysql2` pool, restaurar variáveis `DB_*` no `.env`. Schema do Supabase não é afetado.
