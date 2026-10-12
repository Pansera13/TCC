# Design

## Context

O formulário manual em `AddProductModal.jsx` tem os campos `peso_kg` (número), `quantidade` (número) e `unidade` (UN/KG/L/CX). O campo `peso_kg` duplica a informação já contida na combinação quantidade + unidade KG. A coluna `peso_kg` existe na tabela `products` e é usada pela importação via NF-e, portanto não deve ser removida do banco. O backend `productController.js` aceita `peso_kg` opcionalmente; apenas o frontend precisa parar de enviá-lo no modo manual. A tabela de produtos no `Dashboard.jsx` atualmente exibe nome, quantidade, unidade e categoria — não tem botão de ação por linha.

## Goals / Non-Goals

**Goals:**
- Remover `peso_kg` do formulário manual no frontend (estado, campo HTML e envio para API).
- Adicionar coluna de ações na tabela de produtos com botão "Retirar" por linha.
- Criar componente `WithdrawModal` com campo de quantidade, validação client-side e chamada ao backend.
- Criar endpoint `POST /api/products/:id/withdraw` que subtrai a quantidade e valida saldo.

**Non-Goals:**
- Remover a coluna `peso_kg` do banco ou da importação por NF-e.
- Histórico de movimentações (escopo futuro).
- Retirada em lote (múltiplos produtos ao mesmo tempo).

## Decisions

### 1. Endpoint de retirada: `POST /api/products/:id/withdraw`

**Escolha**: endpoint dedicado que recebe `{ quantidade }` e executa `UPDATE products SET quantidade = quantidade - ? WHERE id = ? AND quantidade >= ?`.  
**Por quê**: a validação de saldo deve acontecer atomicamente no banco com a subtração, evitando race condition se dois usuários retirarem ao mesmo tempo. Usar `AND quantidade >= ?` na cláusula WHERE garante que a operação falha (`affectedRows = 0`) se o saldo for insuficiente, sem precisar de transaction explícita.

### 2. Componente `WithdrawModal` separado

**Escolha**: componente novo (`WithdrawModal.jsx`) independente do `AddProductModal`.  
**Por quê**: os dois modais têm propósitos opostos (entrada vs. saída), estados distintos e nenhum código compartilhável além do shell de modal. Mesclar geraria complexidade sem ganho.

### 3. Botão "Retirar" desabilitado quando quantidade = 0

**Escolha**: `disabled={product.quantidade <= 0}` diretamente na prop do botão.  
**Por quê**: evita abrir o modal para um produto sem estoque; a validação backend ainda existe como segunda linha de defesa.

## Risks / Trade-offs

- **Race condition residual**: a abordagem `AND quantidade >= ?` no WHERE previne saldo negativo mesmo com requisições concorrentes. Se `affectedRows = 0`, o backend retorna 409 Conflict.
- **`peso_kg` ainda enviado pela NF-e**: a remoção é apenas no formulário manual; o controller backend continua aceitando `peso_kg` quando presente — nenhuma quebra no fluxo de câmera.
