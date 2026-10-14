# Proposal

## Why

O banco Supabase está vazio após a migração do MySQL, o que impede testar listagem, filtros por categoria, retirada e a integração com o sistema de Pedidos. Um seed com dados realistas de alimentos e bebidas permite validar o sistema de ponta a ponta sem inserção manual.

## What Changes

- Novo arquivo `backend/src/seedProdutos20.js`: insere 20 produtos de alimentos e bebidas em 13 categorias, cada um com sua movimentação de entrada correspondente, dentro de uma única transação.
- Novo script npm `seed:20-alimentos` em `backend/package.json`.
- Nenhum arquivo existente é alterado (`seed.js`, `seedCategorias.js`, `seedCategorias100.js` permanecem intocados).

## Capabilities

### New Capabilities

- `data/seed-produtos-alimentos`: Capacidade de popular o estoque com produtos de alimentos e bebidas de forma idempotente, atômica e com histórico de movimentações consistente.

### Modified Capabilities

<!-- Nenhuma requisição de comportamento existente é alterada. -->

## Impact

- **Código**: novo `backend/src/seedProdutos20.js`; linha adicionada em `backend/package.json`
- **Banco**: insere até 20 linhas em `products` e 20 em `movements` (idempotente — segunda execução insere 0)
- **APIs**: nenhuma API alterada; os produtos ficam visíveis em `GET /api/products` e `GET /estoque/produtos` (sistema de Pedidos)
- **Dependências**: nenhuma nova dependência
