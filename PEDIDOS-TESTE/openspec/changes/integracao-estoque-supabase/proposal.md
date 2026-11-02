# Proposal

## Why

A integração atual entre o TCC PEDIDOS e o sistema de estoque depende de chamadas HTTP REST server-to-server com um token de serviço estático — exigindo que o TCC Claude esteja acessível em rede, mantendo credenciais extras e permitindo que um pedido seja marcado como `pago` mesmo quando o estoque é insuficiente. Migrar para o Supabase compartilhado elimina a dependência de rede, garante atomicidade via função SQL e alinha o comportamento com a realidade operacional: sem estoque não há venda.

## What Changes

- **BREAKING** — Comportamento de `/pedidos/:id/pagar`: com estoque insuficiente o pedido **não** é marcado como `pago`; permanece `confirmado` e a API retorna HTTP 409 com os erros por item. A regra anterior ("pago mesmo com falha") é removida.
- `estoqueService.js`: `getProdutos()` passa a ler `products` diretamente do Supabase (service_role); `baixarItem()` é substituído por `pagarPedido(pedidoId, userId)` que chama a RPC `pagar_pedido`.
- `routes/pedidos.js` — `PATCH /pedidos/:id/pagar`: substituída por chamada única à RPC; mapeia os códigos de retorno em status HTTP.
- `middleware/auth.js`: reutiliza o cliente Supabase compartilhado em vez de instanciar um por requisição.
- `server.js`: porta padrão 3002, remoção do aviso de token.
- Remoção de `ESTOQUE_API_URL`, `ESTOQUE_SERVICE_TOKEN` e da dependência `axios` do backend.
- Frontend — `DetalhesPedido.jsx`: trata HTTP 409 exibindo por item o motivo de estoque insuficiente e mantém o botão de pagamento habilitado.
- Frontend — `NovoPedido.jsx`: limita a quantidade selecionável ao disponível no produto.
- Frontend — `vite.config.js`: porta fixa 5174 para não colidir com o TCC Claude (5173).
- Adição de `.gitignore` em `backend/` e `frontend/` garantindo que `.env` nunca seja commitado.
- Script `npm run test-supabase` para validar conexão com o Supabase antes de subir o servidor.

## Capabilities

### New Capabilities

*(nenhuma — todas as mudanças são ajustes de comportamento em capabilities existentes)*

### Modified Capabilities

- `stock-integration`: mecanismo de integração muda de HTTP REST para RPC Supabase; comportamento de estoque insuficiente muda de "registra erro mas paga" para "retorna 409 e pedido segue confirmado".
- `order-management`: o endpoint de pagamento passa a retornar 409 quando o estoque falha; o estado `pago` só é atingido quando todos os itens têm estoque suficiente.

## Impact

- **Backend TCC PEDIDOS**: `estoqueService.js`, `routes/pedidos.js`, `middleware/auth.js`, `server.js`, `package.json` (remove `axios`).
- **Frontend TCC PEDIDOS**: `DetalhesPedido.jsx`, `NovoPedido.jsx`, `vite.config.js`.
- **Supabase**: pré-requisito — `002_estoque_integracao.sql` executado (tabelas `products`, `movements`, `usuarios` e função `pagar_pedido`).
- **TCC Claude**: nenhuma modificação de código. Passa a usar o mesmo projeto Supabase como banco; o backend MySQL pode coexistir ou ser migrado separadamente.
- **Variáveis de ambiente removidas**: `ESTOQUE_API_URL`, `ESTOQUE_SERVICE_TOKEN`.
