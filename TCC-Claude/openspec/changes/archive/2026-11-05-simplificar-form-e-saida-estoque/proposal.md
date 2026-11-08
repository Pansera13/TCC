# Proposal

## Why

O formulário manual de cadastro de produto tem dois problemas de UX: o campo "Peso (kg)" é redundante porque o usuário já escolhe "KG" como unidade de medida; e não existe forma de retirar produtos do estoque, o que impede o controle real de movimentações de saída com validação de quantidade disponível.

## What Changes

- **Remover o campo "Peso (kg)"** do formulário manual de cadastro de produto — a unidade "KG" já cobre esse caso, eliminando a duplicidade.
- **Adicionar funcionalidade de saída de estoque**: cada produto na tabela do Dashboard terá um botão "Retirar" que abre um modal simples com o campo de quantidade a retirar, com validação de que o valor não pode exceder o estoque atual.
- Backend: novo endpoint `POST /api/products/:id/withdraw` que subtrai a quantidade do estoque e rejeita se o resultado for negativo.
- A coluna `peso_kg` permanece na tabela do banco de dados (usada pela importação via NF-e), mas deixa de aparecer no formulário manual.

## Capabilities

### New Capabilities

- `products/stock-withdrawal`: Retirada de quantidade de um produto do estoque com validação de saldo disponível.

### Modified Capabilities

- `products/add-modal`: Remoção do campo "Peso (kg)" do formulário manual — o requisito de campos obrigatórios e opcionais muda.

## Impact

- **Frontend**: `AddProductModal.jsx` — remover campo `peso_kg` do formulário e do estado inicial; `Dashboard.jsx` — adicionar botão "Retirar" em cada linha da tabela e novo componente `WithdrawModal`.
- **Backend**: novo endpoint `POST /api/products/:id/withdraw` em `productController.js` e rota em `products.js`.
- **Banco de dados**: nenhuma alteração de schema — `peso_kg` permanece na tabela.
- **Sem impacto** em auth, NF-e scan ou importação por câmera.
