# Tasks

## 1. Script de seed

- [x] 1.1 Criar `backend/src/seedProdutos20.js`: importar `pg` diretamente com `DATABASE_URL` e `ssl: { rejectUnauthorized: false }`; definir o array com os 20 produtos (nome, categoria, quantidade, unidade, peso_kg, fornecedor); verificar que o arquivo existe e que `node -e "require('./src/seedProdutos20.js')"` não lança erro de sintaxe.
- [x] 1.2 Implementar a lógica principal dentro de uma transação única (`BEGIN`/`COMMIT`/`ROLLBACK`): para cada produto, executar `SELECT id FROM products WHERE LOWER(nome) = LOWER($1)` — se existir, incrementar contador de ignorados e pular; se não, executar `INSERT INTO products (...) VALUES (...) RETURNING id` e em seguida `INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome, origem) VALUES ($1, $2, 'entrada', $3, NULL, 'Seed', 'estoque')`; verificar que após executar o script uma vez existem exatamente 20 produtos e 20 movimentações de entrada com `user_nome = 'Seed'`.
- [x] 1.3 Implementar idempotência e resumo: ao final da transação, imprimir "X inseridos, Y ignorados" e a contagem por categoria; verificar que rodar o script uma segunda vez imprime "0 inseridos, 20 ignorados" sem alterar os dados do banco.

## 2. Script npm e verificação final

- [x] 2.1 Adicionar `"seed:20-alimentos": "node src/seedProdutos20.js"` em `backend/package.json` e verificar que `npm run seed:20-alimentos` executa sem erro de "script not found".
- [x] 2.2 Executar `npm run seed:20-alimentos` no ambiente com Supabase e confirmar: 20 produtos inseridos, 13 categorias presentes na saída (Refrigerantes, Sucos, Águas, Cervejas, Laticínios, Carboidratos, Padaria, Grãos, Carnes, Hortifruti, Biscoitos e Snacks, Doces, Mercearia), e `SUM(quantidade)` das entradas de cada produto em `movements` bate com `products.quantidade`.
- [x] 2.3 Executar `npm run seed:20-alimentos` uma segunda vez e confirmar saída "0 inseridos, 20 ignorados" com código de saída 0 e sem novos registros no banco.

## Workflow follow-up

- Arquivar o change após validar que os produtos aparecem na tela de estoque, nos filtros de categoria e em `GET /estoque/produtos` (sistema de Pedidos).
