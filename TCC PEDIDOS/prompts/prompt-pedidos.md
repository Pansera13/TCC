/opsx:propose integracao-estoque-supabase

## Objetivo
Conectar o TCC PEDIDOS ao estoque (TCC Claude) pelo Supabase. Os dois sistemas usam o MESMO projeto Supabase: o Pedidos lê o catálogo da tabela `products` e baixa o estoque pela função SQL `pagar_pedido`, sem nenhuma chamada HTTP ao backend do estoque.

## Situação atual (já feito, não refazer)
- Schema aplicado no Supabase: `pedidos`, `itens_pedido`, `products`, `movements`, `usuarios` e a função `pagar_pedido(p_pedido_id uuid, p_user_id uuid)` que retorna JSON `{ ok, codigo, mensagem, erros? }`, é atômica (tudo ou nada) e só pode ser chamada com a service key. NÃO criar nem alterar tabelas/funções.
- `backend/.env` (PORT=3002, SUPABASE_URL, SUPABASE_SERVICE_KEY) e `frontend/.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL=http://localhost:3002) já estão preenchidos e ignorados pelo git. Nunca imprimir, logar nem commitar esses valores. A service key só existe no backend.
- A migração revogou UPDATE em `pedidos` para anon/authenticated: mudanças de status só podem ocorrer via backend.

## O que fazer
1. Remover do código e dos `.env.example` tudo de `ESTOQUE_API_URL` e `ESTOQUE_SERVICE_TOKEN`; remover `axios` do backend se não for mais usado.
2. Criar `backend/src/testSupabase.js` (select em `products` e `pedidos`, limit 1, com o client service_role) e script npm `test-supabase`. Rodar; só continuar se passar.
3. `src/services/estoqueService.js`:
   - `getProdutos()` -> `supabase.from('products').select('id, nome, quantidade, unidade, categoria').gt('quantidade', 0).order('nome')`
   - `pagarPedido(pedidoId, userId)` -> `supabase.rpc('pagar_pedido', { p_pedido_id: pedidoId, p_user_id: userId })`
4. `src/routes/pedidos.js`, `PATCH /pedidos/:id/pagar`: substituir toda a lógica atual (marcar pago e depois baixar item a item) por uma chamada a `pagarPedido`. Mapear `codigo`: `nao_encontrado`->404, `acesso_negado`->403, `status_invalido`->400, `estoque_insuficiente`->409 (devolver `erros`). Sucesso: devolver o pedido atualizado.
   - MUDANÇA DE COMPORTAMENTO: sem estoque suficiente o pedido NÃO fica `pago`; continua `confirmado`, nada é baixado e `estoque_erros` é preenchido. Substitui a decisão "pago mesmo com falha de baixa".
5. `src/server.js`: remover o aviso de token; porta padrão 3002 (o estoque usa 3001). `GET /estoque/produtos` permanece, lendo do Supabase.
6. `src/middleware/auth.js`: usar o client Supabase compartilhado em vez de criar um por requisição.
7. Frontend: `DetalhesPedido.jsx` trata HTTP 409 listando, por item, produto e mensagem de estoque insuficiente, mantendo o botão "Marcar como Pago". `NovoPedido.jsx` limita a quantidade ao disponível exibido. Nunca fazer `update` direto em `pedidos` via supabase-js. Rodar o frontend na porta 5174 (`vite.config.js`: `server.port = 5174`) para não colidir com o estoque (5173).
8. Atualizar o change `sistema-pedidos-supabase` (design.md, specs/stock-integration/spec.md, tasks.md): remover token de serviço/HTTP, descrever a RPC `pagar_pedido` e a regra 409, marcar 1.1–1.3 como concluídas e eliminar a task 1.4 (usuário de serviço no TCC Claude).

## Critérios de aceite
- `npm run test-supabase` passa.
- `GET /estoque/produtos` retorna produtos reais criados no sistema de estoque.
- rascunho -> confirmado -> pago reduz `products.quantidade` e cria `movements` com `origem='pedido'` e `pedido_id`.
- Item acima do estoque: 409, nenhuma quantidade alterada, pedido segue `confirmado`.
- Dois pagamentos simultâneos do mesmo pedido baixam o estoque uma única vez.
- Usuário A não acessa pedidos do usuário B.
