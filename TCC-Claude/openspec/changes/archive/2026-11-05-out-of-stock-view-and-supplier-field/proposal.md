# Proposal

## Why

O card "Sem Estoque" no dashboard exibe apenas um número estático, sem permitir que o usuário identifique rapidamente quais produtos esgotaram e de qual categoria são. Além disso, não há campo de fornecedor nos produtos, dificultando o reabastecimento ao não registrar quem fornece cada item.

## What Changes

- O card "Sem Estoque" torna-se clicável e navega para uma nova view dentro do dashboard listando todos os produtos com quantidade zero, exibindo nome e categoria de cada um.
- Campo `fornecedor` (opcional) é adicionado ao cadastro de produtos: aparece no formulário de criação (`AddProductModal`), no formulário de edição (`EditProductModal`) e em todas as tabelas de listagem de produtos (aba Produtos, visão geral do Início e aba Categorias).
- Backend: nova coluna `fornecedor VARCHAR(150) NULL` na tabela `products`; endpoints `POST /api/products` e `PUT /api/products/:id` passam a aceitar e persistir o campo; `GET /api/products` passa a retorná-lo.

## Capabilities

### New Capabilities

- `dashboard/out-of-stock-view`: View dedicada de produtos esgotados, acessível pelo clique no card "Sem Estoque", exibindo nome e categoria de cada produto com `quantidade = 0`.
- `products/supplier-field`: Campo opcional de fornecedor em produtos — armazenado no banco, exibido e editável em todos os formulários e listagens de produtos.

### Modified Capabilities

(nenhuma — as capabilities existentes não mudam requisitos; as adições são inteiramente novas)

## Impact

- `backend/src/controllers/productController.js` — leitura/escrita do campo `fornecedor` em `createProduct`, `updateProduct`, `listProducts`.
- `backend/src/createTable.js` — `ALTER TABLE` para adicionar coluna `fornecedor` caso não exista.
- `frontend/src/components/AddProductModal.jsx` — campo `fornecedor` opcional.
- `frontend/src/components/EditProductModal.jsx` — campo `fornecedor` opcional pré-preenchido.
- `frontend/src/pages/Dashboard.jsx` — card "Sem Estoque" clicável, nova função `renderSemEstoque()`, coluna "Fornecedor" nas tabelas de produtos.
