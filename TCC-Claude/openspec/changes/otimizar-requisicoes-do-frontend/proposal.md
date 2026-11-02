# Proposal

## Why

O frontend do StockFlow gera requisições desnecessárias que, com apenas 4 a 6 usuários ativos no mesmo IP (NAT de uma loja), já estouram os tetos razoáveis de rate-limiting medidos no relatório "Tráfego da API" (2026-11-02). O problema mais grave são: polling de produtos a cada 20 s mesmo com Realtime ativo e aba oculta (3 req/min por aba), N POSTs paralelos na importação de NF-e (estoura 20 req/s sozinha com ≥ 21 itens) e `/api/profile` chamado 4 vezes na carga em dev. Essa change corrige os 9 problemas levantados no relatório e adiciona o endpoint em lote no backend — preparando o sistema para a change `limite-geral-da-api` sem alterar nenhum comportamento visível ao usuário.

## What Changes

- **`frontend/src/services/api.js`** — interceptor de resposta passa a tratar 429: respeita `retry_after` antes de repetir chamadas automáticas (polling); exibe aviso discreto reutilizando o componente de aviso existente; ações do usuário **não** são repetidas. Nova função exportada: `importProductsBatch(itens)`.
- **`frontend/src/context/AuthContext.jsx`** — passa a buscar `GET /api/profile` uma única vez na montagem e compartilhar o resultado via contexto; revalida somente após `PUT /api/profile`. Remove as chamadas duplicadas em `Dashboard.jsx` e `TopNav.jsx`.
- **`frontend/src/pages/Dashboard.jsx`** — polling de produtos muda para fallback: ativo só quando o canal Realtime não está `SUBSCRIBED`, pausado quando `document.hidden`, intervalo de 60 s; ao ganhar foco faz uma única atualização imediata. Cache em memória para a lista de Arquivados (invalidado ao arquivar/restaurar/excluir um produto e pelo botão Atualizar já existente).
- **`frontend/src/components/NotificationBell.jsx`** — deduplicação de `focus` e `visibilitychange`: trata apenas um evento e ignora chamadas com menos de 5 s de intervalo. Polling de 60 s permanece; pausado quando `document.hidden`.
- **`frontend/src/components/MovementsHistory.jsx`** — primeira consulta ao servidor só é feita depois que `useFitRows` estabiliza o `pageSize`; elimina as 2–3 consultas redundantes por abertura.
- **`frontend/src/components/Reports.jsx`** — debounce de 500 ms para datas no modo personalizado; trocar o período para "Personalizado" não reexecuta a última consulta de 30 dias.
- **`frontend/src/components/AddProductModal.jsx`** — `handleConfirmNfe` substitui o `Promise.all` de N POSTs por uma única chamada a `importProductsBatch`; totais exibidos ao usuário permanecem idênticos.
- **`frontend/src/components/WithdrawModal.jsx` e `EntradaModal.jsx`** — `onError` não recarrega produtos quando o status for 429 (respeita `Retry-After`); limitado a uma recarga por falha.
- **`backend-django/api/views/products.py`** — nova view `products_batch` para `POST /api/products/lote`: processa todos os itens em uma única transação, reusa a lógica de criação/empilhamento existente, faz rollback completo em caso de erro, respeita `tenant_id`, deduplicação por `chNFe` e histórico de movimentação. Limite de itens configurável (padrão 500).
- **`backend-django/api/urls.py`** — registra `POST /api/products/lote`.
- Paginação opcional em `GET /api/products` (aceitar `page`/`page_size` na query sem quebrar clientes sem parâmetros).

## Capabilities

### New Capabilities
- `backend/products-batch`: Endpoint `POST /api/products/lote` que recebe uma lista de itens de NF-e e cria/empilha todos em uma única transação atômica, com rollback completo em erro.

### Modified Capabilities
- `frontend/api-client`: Adiciona tratamento central de 429 (respeito a `retry_after`, aviso discreto) e exporta `importProductsBatch(itens)`.
- `dashboard/product-refresh`: Polling de produtos muda de sempre-ativo (20 s) para fallback condicional (60 s, só quando Realtime não está `SUBSCRIBED`, pausado com `document.hidden`, atualização imediata ao ganhar foco).
- `notifications/notification-center`: Consultas ao voltar à janela são deduplicadas (debounce de 5 s; apenas um evento tratado); polling continua a 60 s, pausado com `document.hidden`.
- `dashboard/movement-audit`: A primeira consulta ao servidor é feita somente após `pageSize` estabilizar, eliminando consultas redundantes por abertura.
- `products/nfe-scan`: A confirmação de importação passa a usar `POST /api/products/lote` (1 requisição), mantendo totais e mensagens idênticos ao usuário.
- `dashboard/reports`: Alterações de data no modo personalizado disparam consulta com debounce de 500 ms; trocar para "Personalizado" não reexecuta a consulta de 30 dias.
- `frontend/auth-context`: Busca `GET /api/profile` na montagem e disponibiliza o perfil via contexto; revalida somente após `PUT /api/profile`.
- `products/product-archiving`: A lista de Arquivados é mantida em cache em memória e recarregada somente ao arquivar/restaurar/excluir produto ou ao clicar em Atualizar.

## Impact

- **Backend**: novo endpoint `POST /api/products/lote`; `GET /api/products` recebe suporte opcional a `page`/`page_size`; nenhum endpoint existente muda formato de resposta.
- **Frontend**: mudanças em `api.js`, `AuthContext.jsx`, `Dashboard.jsx`, `NotificationBell.jsx`, `MovementsHistory.jsx`, `Reports.jsx`, `AddProductModal.jsx`, `WithdrawModal.jsx`, `EntradaModal.jsx`.
- **Banco de dados**: nenhuma alteração de schema (restrição de compatibilidade com TCC PEDIDOS).
- **Supabase Realtime**: nenhuma assinatura nova; o canal `products-realtime` passa a controlar a ativação do fallback de polling.
- **Testes**: novos testes pytest para `products_batch`; todos os 98 testes existentes devem continuar passando.
- **Sem novas dependências npm**: implementação usa hooks e utilitários simples existentes.
