# Tasks

## 1. Pré-requisito: SQL e variáveis de ambiente

- [x] 1.1 Confirmar que `002_estoque_integracao.sql` foi executado no Supabase (tabelas `products`, `movements`, `usuarios` e função `pagar_pedido` existem). Verificação: no Supabase SQL Editor, `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'pagar_pedido'` retorna 1 linha.
- [x] 1.2 Criar `backend/.env` a partir do `.env.example` com `PORT=3002`, `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` reais. Criar `frontend/.env` com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_API_URL=http://localhost:3002`. Verificação: ambos os arquivos existem com os valores preenchidos.
- [x] 1.3 Garantir que `backend/.gitignore` e `frontend/.gitignore` contêm a entrada `.env`. Verificação: `git status` não exibe `.env` como arquivo a commitar em nenhum dos dois diretórios.

## 2. Conexão e validação do Supabase

- [x] 2.1 Atualizar `.env.example` do backend: remover `ESTOQUE_API_URL` e `ESTOQUE_SERVICE_TOKEN`; manter `PORT=3002`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. Verificação: `.env.example` não contém as variáveis removidas.
- [x] 2.2 Criar `backend/src/testSupabase.js`: importa o client Supabase e faz `select` (limit 1) em `products` e em `pedidos`. Adicionar script `"test-supabase": "node src/testSupabase.js"` no `package.json`. Verificação: `npm run test-supabase` imprime "OK: products" e "OK: pedidos" sem erros.
- [x] 2.3 Remover dependência `axios` do `backend/package.json` e executar `npm install`. Verificação: `node -e "require('axios')"` retorna erro "Cannot find module".

## 3. Backend — estoqueService.js

- [x] 3.1 Reescrever `getProdutos()`: substituir chamada axios por `supabase.from('products').select('id, nome, quantidade, unidade, categoria').gt('quantidade', 0).order('nome')`. Verificação: `GET /estoque/produtos` retorna array de produtos do Supabase.
- [x] 3.2 Substituir `baixarItem()` por `pagarPedido(pedidoId, userId)`: chama `supabase.rpc('pagar_pedido', { p_pedido_id: pedidoId, p_user_id: userId })` e retorna o JSON da RPC (`{ ok, codigo, mensagem, erros? }`). Verificação: função exportada existe e tem a assinatura correta.

## 4. Backend — rota PATCH /pedidos/:id/pagar

- [x] 4.1 Substituir toda a lógica atual de `PATCH /pedidos/:id/pagar` por uma chamada a `pagarPedido(pedidoId, req.userId)`. Mapear `codigo`: `nao_encontrado`→404, `acesso_negado`→403, `status_invalido`→400, `estoque_insuficiente`→409 (incluir `erros` no body). Sucesso: buscar e retornar o pedido atualizado com `select`. Verificação: pagar pedido com estoque suficiente retorna 200 e status `pago`; com estoque insuficiente retorna 409 e pedido segue `confirmado`.
- [x] 4.2 Verificar que `PATCH /pedidos/:id/confirmar` ainda usa `supabase.from('pedidos').update(...)` (não foi afetado). Verificação: fluxo rascunho→confirmado continua funcionando após as alterações.

## 5. Backend — server.js e auth.js

- [x] 5.1 Atualizar `server.js`: alterar porta padrão de 3001 para 3002; remover o bloco `if (!process.env.ESTOQUE_SERVICE_TOKEN)`. Verificação: servidor inicia na porta 3002 sem mensagem de aviso de token.
- [x] 5.2 Atualizar `middleware/auth.js`: substituir a instanciação local de `createClient` por importação do cliente compartilhado em `../supabase`. Verificação: requisição sem token retorna 401; com token válido retorna 200.

## 6. Frontend — vite.config.js e NovoPedido.jsx

- [x] 6.1 Criar ou atualizar `frontend/vite.config.js` adicionando `server: { port: 5174 }`. Verificação: `npm run dev` sobe na porta 5174.
- [x] 6.2 Atualizar `NovoPedido.jsx`: adicionar atributo `max={p.quantidade}` no `<input type="number">` de quantidade. Verificação: não é possível digitar ou arrastar um valor acima do disponível no campo de quantidade.

## 7. Frontend — DetalhesPedido.jsx

- [x] 7.1 Atualizar `handlePagar` em `DetalhesPedido.jsx`: capturar resposta HTTP 409; em vez de exibir mensagem genérica, listar por produto o erro de estoque insuficiente. Manter o botão "Marcar como Pago" visível e habilitado após o 409. Verificação: ao pagar pedido com item acima do estoque, a tela exibe a lista de itens com o motivo e o botão permanece disponível.

## 8. Verificação de integração

- [ ] 8.1 Testar fluxo feliz end-to-end: criar pedido com produto que tem estoque → confirmar → marcar como pago → verificar no Supabase que `products.quantidade` foi decrementada e que um registro aparece em `movements` com `origem='pedido'` e `pedido_id` correto. Verificação: query SQL confirma os valores esperados.
- [ ] 8.2 Testar fluxo de 409: criar pedido com item acima do estoque disponível → confirmar → tentar pagar → confirmar HTTP 409, pedido em `confirmado`, `movements` sem novo registro, `products.quantidade` inalterada. Verificação: query SQL confirma que nada foi alterado.

## Workflow follow-up

- Após validação dos dois fluxos, atualizar o change `sistema-pedidos-supabase` (marcar tasks 1.4 como não necessária e atualizar tasks 4.2 com nova semântica) e arquivá-lo com `/opsx:archive`.
- Arquivar este change com `/opsx:archive` depois do `sistema-pedidos-supabase`.
