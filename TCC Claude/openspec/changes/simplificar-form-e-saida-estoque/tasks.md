# Tasks

## 1. Simplificar formulário manual de cadastro

- [x] 1.1 Em `AddProductModal.jsx`, remover `peso_kg` de `INITIAL_FORM` e do estado, remover o campo `<Field label="Peso (kg)">` do JSX e remover o envio de `peso_kg` na chamada `api.post('/api/products', ...)` — verificar que o formulário renderiza sem o campo e salva corretamente

## 2. Backend — endpoint de retirada de estoque

- [x] 2.1 Criar função `withdrawProduct` em `productController.js` que recebe `{ quantidade }` no body, valida que é número positivo, executa `UPDATE products SET quantidade = quantidade - ? WHERE id = ? AND quantidade >= ?` e retorna 409 se `affectedRows = 0` (saldo insuficiente) — verificar com curl que `POST /api/products/1/withdraw` com quantidade válida retorna 200 e quantidade inválida retorna 400 ou 409
- [x] 2.2 Registrar rota `POST /api/products/:id/withdraw` em `backend/src/routes/products.js` protegida por JWT e verificar que sem token retorna 401

## 3. Frontend — componente WithdrawModal

- [x] 3.1 Criar `frontend/src/components/WithdrawModal.jsx` com props `product` (objeto com `id`, `nome`, `quantidade`, `unidade`) e `onClose`/`onWithdrawn` — exibe nome do produto, estoque disponível, campo numérico para quantidade a retirar, botões "Confirmar" e "Cancelar" — verificar que renderiza sem erros
- [x] 3.2 Implementar validação client-side: quantidade deve ser > 0 e ≤ `product.quantidade`; exibir mensagem de erro inline sem fechar o modal — verificar que ao digitar valor maior que o estoque aparece a mensagem de erro
- [x] 3.3 Ao confirmar, chamar `POST /api/products/:id/withdraw` e fechar o modal chamando `onWithdrawn()` em caso de sucesso; exibir mensagem de erro do backend em caso de falha (ex.: 409) — verificar que o estoque atualizado aparece na tabela após confirmação
- [x] 3.4 Implementar fechamento por tecla Escape e por clique fora do modal sem retirar — verificar comportamento

## 4. Dashboard — integrar botão "Retirar"

- [x] 4.1 Em `Dashboard.jsx`, adicionar estado `withdrawProduct` (null ou objeto do produto selecionado) e renderizar `<WithdrawModal>` quando não for null
- [x] 4.2 Na tabela de produtos, adicionar coluna "Ações" com botão "Retirar" em cada linha; desabilitar o botão quando `p.quantidade <= 0` — verificar que o botão está desabilitado para produtos sem estoque
- [x] 4.3 Ao clicar "Retirar", setar `withdrawProduct` com o produto da linha e verificar que o modal abre com o nome e estoque corretos do produto clicado
- [x] 4.4 Ao fechar o `WithdrawModal` (cancelar ou sucesso), chamar `fetchProducts()` para atualizar a tabela — verificar que após retirada o novo saldo aparece imediatamente

## 5. Validação final

- [x] 5.1 Testar retirada de quantidade exata do estoque e verificar que o produto fica com 0 e o botão "Retirar" fica desabilitado
- [x] 5.2 Testar tentativa de retirar mais do que o disponível e verificar que a mensagem de erro aparece e o estoque não muda
- [x] 5.3 Verificar que o formulário manual de cadastro não tem mais o campo "Peso (kg)" e salva produto corretamente com nome, quantidade, unidade e categoria
