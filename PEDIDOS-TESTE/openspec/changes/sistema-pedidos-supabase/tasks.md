# Tasks

<!-- Decisão da Open Question do design.md:
     O TCC Claude não precisa de modificação. O ESTOQUE_SERVICE_TOKEN será um JWT
     válido gerado para um usuário de serviço cadastrado no TCC Claude. -->

## 1. Supabase e infraestrutura

- [ ] 1.1 Criar projeto Supabase dedicado ao TCC PEDIDOS no console e anotar `SUPABASE_URL` e `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_KEY`. Verificação: credenciais disponíveis para uso nas próximas etapas.
- [ ] 1.2 Executar script SQL no Supabase para criar as tabelas `pedidos` e `itens_pedido` conforme estrutura definida no design. Verificação: tabelas visíveis no painel Supabase com colunas corretas.
- [ ] 1.3 Configurar Row Level Security (RLS) nas tabelas: usuário só lê e escreve nos seus próprios pedidos (`user_id = auth.uid()`). Verificação: chamar diretamente via Supabase JS com token de outro usuário e confirmar que retorna vazio.
- [ ] 1.4 Cadastrar um usuário de serviço no TCC Claude (ex: `servico@pedidos.local`) e gerar um JWT de longa duração para ele. Usar esse JWT como `ESTOQUE_SERVICE_TOKEN`. Verificação: chamar `GET /products` no TCC Claude com o token e receber 200.

## 2. Backend — estrutura e configuração

- [x] 2.1 Inicializar projeto Node.js no diretório `backend/` com `npm init`, instalar dependências: `express`, `@supabase/supabase-js`, `axios`, `dotenv`, `cors`. Verificação: `node -e "require('@supabase/supabase-js')"` executa sem erro.
- [x] 2.2 Criar `backend/src/server.js` com Express, CORS e carregamento de rotas. Criar `.env.example` com `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ESTOQUE_API_URL`, `ESTOQUE_SERVICE_TOKEN`. Verificação: servidor inicia com `node src/server.js` e responde `200` em `GET /health`.
- [x] 2.3 Criar `backend/src/supabase.js` com cliente Supabase usando `SUPABASE_SERVICE_KEY` (client administrativo para operações de backend). Verificação: importar e chamar `supabase.from('pedidos').select('*')` sem erro de configuração.
- [x] 2.4 Criar `backend/src/middleware/auth.js` que valida o JWT Supabase do request (`Authorization: Bearer <token>`) e anexa `req.userId`. Verificação: rota protegida retorna 401 sem token e 200 com token válido.

## 3. Backend — gerenciamento de pedidos

- [x] 3.1 Criar `backend/src/routes/pedidos.js` com `POST /pedidos` (cria pedido em `rascunho`) e registrar no servidor. Verificação: `POST /pedidos` autenticado retorna 201 com id do pedido; sem auth retorna 401.
- [x] 3.2 Implementar `POST /pedidos/:id/itens` (adiciona item) com validações de quantidade > 0 e status `rascunho`. Verificação: adicionar item válido retorna 201; quantidade ≤ 0 retorna 400; pedido em `confirmado` retorna 400.
- [x] 3.3 Implementar `DELETE /pedidos/:id/itens/:itemId` (remove item) com validação de status `rascunho`. Verificação: remover item existente retorna 200; tentar remover de pedido `confirmado` retorna 400.
- [x] 3.4 Implementar `PATCH /pedidos/:id/confirmar` com validação de ao menos 1 item. Verificação: confirmar pedido com itens retorna 200 com status `confirmado`; confirmar pedido vazio retorna 400.
- [x] 3.5 Implementar `GET /pedidos` (lista pedidos do usuário, ordenado por data desc) e `GET /pedidos/:id` (detalhes com itens, verificando autoria). Verificação: listar retorna array correto; buscar pedido de outro usuário retorna 403.

## 4. Backend — integração com estoque

- [x] 4.1 Criar `backend/src/services/estoqueService.js` com funções `getProdutos()` (chama `GET /products` no TCC Claude) e `baixarItem(productId, quantidade)` (chama `POST /products/:id/withdraw`). Todas as requisições incluem `Authorization: Bearer ESTOQUE_SERVICE_TOKEN`. Verificação: chamar `getProdutos()` diretamente retorna lista de produtos do TCC Claude.
- [x] 4.2 Implementar `PATCH /pedidos/:id/pagar`: marca pedido como `pago`, itera sobre itens e chama `baixarItem` para cada um. Registrar erros por item no campo `estoque_erros` sem reverter o status `pago`. Verificação: pagar pedido com itens em estoque retorna 200 e `POST /products/:id/withdraw` é chamado para cada item; erro de baixa é registrado em `estoque_erros`.
- [x] 4.3 Implementar `GET /estoque/produtos` (proxy para `getProdutos()`) para uso pelo frontend sem expor o token de serviço. Verificação: frontend consegue listar produtos via essa rota sem token de serviço.

## 5. Frontend — estrutura e autenticação

- [x] 5.1 Inicializar projeto React + Vite no diretório `frontend/` e instalar `@supabase/supabase-js`, `react-router-dom`. Criar `.env.example` com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`. Verificação: `npm run dev` sobe o app sem erros.
- [x] 5.2 Criar `frontend/src/lib/supabase.js` (cliente Supabase com anon key) e contexto de auth `AuthContext` com login, logout e estado do usuário. Verificação: login com email/senha de usuário Supabase redireciona para área autenticada.
- [x] 5.3 Criar página `Login.jsx` com formulário de email/senha usando Supabase Auth. Criar `ProtectedRoute` que redireciona para login se não autenticado. Verificação: acesso direto à rota protegida redireciona para login; login válido redireciona de volta.

## 6. Frontend — criação e gestão de pedidos

- [x] 6.1 Criar página `NovoPedido.jsx`: lista produtos do estoque via `GET /estoque/produtos` e permite selecioná-los com quantidade para montar o pedido. Verificação: produtos do TCC Claude aparecem listados com nome, quantidade disponível e unidade.
- [x] 6.2 Implementar criação do pedido: ao confirmar seleção, chama `POST /pedidos` e `POST /pedidos/:id/itens` para cada produto selecionado. Redireciona para a tela de detalhes do pedido após criação. Verificação: pedido criado aparece na listagem com status `rascunho` e itens corretos.
- [x] 6.3 Criar página `DetalhesPedido.jsx`: exibe itens do pedido, status atual e botões de ação (`Confirmar` para rascunho, `Marcar como Pago` para confirmado). Verificação: fluxo completo rascunho → confirmado → pago funciona via interface; estoque do TCC Claude é decrementado ao pagar.
- [x] 6.4 Criar página `MeusPedidos.jsx`: lista todos os pedidos do usuário com status e data, com link para detalhes. Verificação: após criar e pagar um pedido, ele aparece na listagem com status `pago`.

## 7. Verificação de integração

- [ ] 7.1 Testar fluxo end-to-end: criar pedido → adicionar itens → confirmar → marcar como pago → verificar que o estoque no TCC Claude foi decrementado nas quantidades corretas. Verificação: `GET /products` no TCC Claude retorna quantidades reduzidas.
- [ ] 7.2 Testar cenário de falha de estoque: tentar pagar pedido com item que excede o estoque disponível no TCC Claude, verificar que o campo `estoque_erros` é preenchido no Supabase e o pedido permanece com status `pago`. Verificação: resposta da API indica o erro e o registro em `estoque_erros` é não-nulo.

## Workflow follow-up

- Após validação completa do fluxo, arquivar o change com `/opsx:archive`.
