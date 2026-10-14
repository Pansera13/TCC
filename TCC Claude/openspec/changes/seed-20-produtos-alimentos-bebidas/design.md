# Design

## Context

O backend usa `pg` com `src/db.js` expondo `query(sql, params)`. Os seeds existentes (`seedCategorias.js`) processam produtos em loop sem transação e não inserem movimentações. O novo script precisa de atomicidade e consistência entre `products` e `movements`.

## Goals / Non-Goals

**Goals:**
- Inserir 20 produtos com `peso_kg` e `fornecedor` (colunas ausentes nos seeds antigos)
- Gerar movimentação de entrada para cada produto inserido, dentro da mesma transação
- Idempotência por nome (case-insensitive), igual ao padrão já adotado nos seeds existentes

**Non-Goals:**
- Alterar seeds existentes (`seedCategorias.js`, `seed.js`, `seedCategorias100.js`)
- Criar ou modificar tabelas
- Suportar atualização de produtos já existentes

## Decisions

**Transação única via `pool.connect()` + `client.query()`**
`src/db.js` expõe apenas `query()`, que não suporta transações multi-step. O script usará `pool` diretamente (importando do mesmo `db.js` ou criando um pool local) para obter um `client` e executar `BEGIN`/`COMMIT`/`ROLLBACK`. Alternativa considerada: múltiplos `db.query()` sem transação — rejeitada porque deixa o banco inconsistente se a inserção das movimentações falhar após os produtos.

**Verificação de existência por nome case-insensitive antes do INSERT**
`SELECT id FROM products WHERE LOWER(nome) = LOWER($1)` antes de cada produto. Alternativa: `INSERT ... ON CONFLICT DO NOTHING` — rejeitada porque requer unique constraint em `nome` que não existe no schema atual e alteraria o schema.

**Script independente, não reutiliza `movementService.js`**
O service usa `db.query()` (sem transação compartilhada). Para manter tudo no mesmo `client.query()`, o INSERT em `movements` é feito inline no script.

## Risks / Trade-offs

- [Risco] `db.js` exporta apenas `query`, não o `pool` → Mitigação: importar `pg` diretamente no script com a mesma `DATABASE_URL`, sem alterar `db.js`.
- [Trade-off] Verificação de existência por `SELECT` antes do `INSERT` tem race condition em concorrência alta → aceitável para script de seed executado manualmente.

## Migration Plan

1. Criar `backend/src/seedProdutos20.js`
2. Adicionar `"seed:20-alimentos": "node src/seedProdutos20.js"` em `backend/package.json`
3. Executar `npm run seed:20-alimentos` no ambiente desejado
4. Rollback: `DELETE FROM movements WHERE user_nome = 'Seed'; DELETE FROM products WHERE fornecedor IN ('Coca-Cola FEMSA','Ambev',...);` (ou dropar e recriar pelo Supabase se o banco estiver vazio)
