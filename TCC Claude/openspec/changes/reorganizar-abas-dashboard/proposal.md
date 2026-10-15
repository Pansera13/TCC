## Why

O Dashboard do StockFlow tem abas redundantes e limitadas: **Categorias** repete o agrupamento que **Produtos** já faz (só leitura), **Produtos** renderiza todos os itens de uma vez (o seed tem 640 produtos), e **Movimentações** mostra apenas entradas/retiradas das últimas 500 linhas, sem filtros e sem registrar quem editou ou removeu um produto. Falta também uma visão de análise (consumo, giro, itens críticos). Esta mudança reorganiza as abas para resolver isso.

## What Changes

- **Paginação em Produtos** (parte 1): máximo de 15 produtos por categoria por página (constante única), nos 4 layouts (lista, acordeão, grade, compacto). Controles por categoria (primeira/anterior/próxima/última + "Página X de Y"), escondidos quando a categoria tem ≤ 15 itens. Cada categoria guarda sua própria página; buscar/filtrar volta todas para a página 1. Um componente de paginação e uma função de agrupamento compartilhados pelos 4 layouts.
- **Histórico/auditoria em Movimentações** (parte 2): cada registro mostra quem, o que (entrada, retirada, edição, remoção), qual produto, quantidade, data e hora. Filtros por usuário, tipo de ação, produto e período; mais recentes primeiro; paginação no servidor (substitui o `LIMIT 500` fixo).
  - Hoje só `createProduct` (entrada) e `withdrawProduct` (saída) gravam em `movements`. `updateProduct` não registra nada e **não existe rota de remoção de produto**. Propõe-se registrar edições e adicionar a remoção (rota + registro).
  - **Exige mudança no esquema do banco** (ver design): a coluna `movements.tipo` tem `CHECK (tipo IN ('entrada','saida'))`, então `edicao` e `remocao` hoje seriam rejeitados. **Nenhuma migração será aplicada sem aprovação explícita.**
- **Relatórios no lugar de Categorias** (parte 3): remover a aba **Categorias**; criar a aba **Relatórios** com filtro de período (7/30/90 dias/personalizado), resumo (total de produtos, estoque baixo, esgotados, total de entradas e de saídas), top 10 mais retirados, giro de estoque por produto, consumo por categoria e exportação CSV. Os dados vêm de `movements` + `products`; propõe-se um endpoint de consolidação `GET /api/reports` (sem mudança de esquema).
- **BREAKING (interface)**: a aba Categorias deixa de existir; `GET /api/movements` passa a responder de forma paginada (`{ items, total, page, pageSize }`) em vez de um array. Os consumidores internos (Dashboard) são atualizados na mesma mudança.
- Não regressão: Realtime de `products`, abas Início, Sem estoque e Equipe permanecem como estão; layout responsivo (celular) e modo escuro reaproveitando as classes atuais.

## Capabilities

### New Capabilities
- `dashboard/navigation`: conjunto de abas do Dashboard (Início, Produtos, Movimentações, Relatórios, Equipe; Sem estoque via card) e ausência da aba Categorias.
- `dashboard/product-pagination`: paginação por categoria da aba Produtos, comum aos 4 layouts.
- `dashboard/movement-audit`: histórico/auditoria de ações de estoque, registro de edições e remoções, filtros e paginação.
- `dashboard/reports`: aba Relatórios, métricas, endpoint de consolidação e exportação CSV.

### Modified Capabilities
<!-- Nenhuma: o único spec principal existente é `auth`, que não muda. Os requisitos de Categorias vivem apenas em changes ainda não arquivados (não há nada a REMOVER em openspec/specs/). -->

## Impact

- **Frontend**: `frontend/src/pages/Dashboard.jsx` (nav, `renderProdutos`, `renderMovimentacoes`, remoção de `renderCategorias`, nova aba), novos componentes (paginação, relatórios, filtros de movimentações), `frontend/src/services/api.js` (novas chamadas).
- **Backend**: `controllers/movementController.js` e `routes/movements.js` (filtros/paginação), `controllers/productController.js` + `routes/products.js` (log de edição, `DELETE /api/products/:id`), `services/movementService.js` (novos tipos), novo `controllers/reportController.js` + rota `/api/reports`.
- **Banco (Supabase, compartilhado com TCC PEDIDOS)**: alteração proposta em `movements` (CHECK de `tipo`, coluna de detalhes, índices) — **requer aprovação**; ver `design.md`. A função `pagar_pedido` e o sistema de Pedidos continuam inserindo apenas `entrada`/`saida`, portanto compatíveis.
- **Sem novas dependências**; CSV gerado no cliente.
