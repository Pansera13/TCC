# Proposal

## Why

A aba **Arquivados** (só do Administrador) existe para esconder produtos que saíram de uso sem apagar o histórico, mas não resolve o problema do dia a dia: o que o negócio precisa ver à parte são os produtos que **acabaram**. Hoje os produtos com quantidade 0 continuam misturados com os demais nas categorias e no Início, e a lista "Sem estoque" só é alcançável pelo cartão vermelho do Início, sem aparecer no menu. Esta change troca o conceito: a área separada passa a ser **Sem estoque**, alimentada automaticamente pela quantidade, e o arquivamento manual deixa de ter presença na interface.

## What Changes

- A aba **Arquivados** é substituída pela aba **Sem estoque** na barra de navegação, **visível para todos os cargos** (sem permissão especial).
- A aba Sem estoque lista automaticamente todos os produtos com quantidade 0. A lista é derivada da própria lista de produtos no frontend, então o produto muda de lugar em tempo real: ao zerar numa retirada ele passa para Sem estoque, e ao receber entrada volta para Produtos.
- Produtos com quantidade 0 **somem da aba Produtos** (categorias, filtro de categoria e busca) e da tabela "Visão geral dos produtos" do Início. Os quatro cartões de indicadores continuam contando todos os produtos, e o cartão vermelho "Sem Estoque" passa a abrir a nova aba.
- Cada linha da aba Sem estoque ganha as ações **Entrada** (todos os cargos, para repor) e **Editar** (quem tem `produto:editar`). O modal de edição já oferece a exclusão definitiva ao Administrador.
- Removido do frontend o que restava do arquivamento: aba Arquivados, cache de arquivados, botão "Arquivar produto" do modal de edição e as funções `listArchivedProducts`, `archiveProduct` e `restoreProduct` do cliente da API.
- **BREAKING (interno):** o Sócio deixa de ter pela interface uma forma de tirar um produto das listas (não arquiva mais e continua sem poder excluir). O Administrador deixa de ter a visão para restaurar produtos arquivados.
- Backend e banco **não mudam**: as rotas `/archive`, `/restore` e `?arquivados=1` e as colunas `arquivado` e `arquivado_em` continuam existindo, só sem uso na interface. Nenhum SQL é aplicado.
- Reconciliação de specs: `dashboard/navigation` e `frontend/dashboard-layout` ainda citavam a aba Equipe, removida em change anterior. Os requisitos alterados aqui passam a refletir o menu real.

## Capabilities

### New Capabilities

*(nenhuma — o comportamento novo cabe em capabilities existentes)*

### Modified Capabilities

- `dashboard/navigation`: conjunto de abas do menu (Sem estoque no lugar de Arquivados, para todos os cargos), card "Sem Estoque" levando à aba e abas preservadas.
- `dashboard/out-of-stock-view`: a view vira aba aberta a todos, com ações Entrada e Editar, e produtos zerados saem das demais listas.
- `products/product-archiving`: a interface deixa de oferecer arquivar e a visão Arquivados do Administrador é removida; o arquivamento fica só no servidor.
- `frontend/edit-product-modal`: sai a ação de arquivar e a exclusão mútua das confirmações.
- `frontend/api-client`: sai o trio de funções de arquivamento das funções de produto.
- `frontend/dashboard-layout`: filtragem das abas por permissão e fim do carregamento sob demanda de Arquivados.
- `frontend/product-layouts`: estado vazio da aba Produtos quando todos os produtos estão sem estoque.
- `products/category-filter`: o seletor de categoria passa a listar só categorias de produtos com estoque.

## Impact

- **Frontend:** `src/pages/Dashboard.jsx` (navegação, Início, Produtos, aba Sem estoque, remoção do código de arquivados), `src/components/EditProductModal.jsx` (remove arquivar), `src/services/api.js` (remove 3 funções), `src/utils/products.js` (predicado único `estaSemEstoque`).
- **Backend e banco:** nenhum. Rotas e colunas de arquivamento permanecem, sem uso na interface.
- **Produtos já arquivados no banco** continuam arquivados e passam a não ter tela para serem vistos. Registrado como risco no `design.md`.
- **Sistema de Pedidos** (mesmo banco): não é afetado, pois nada muda no esquema.
- Sem novas dependências.
