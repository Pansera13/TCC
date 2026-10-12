# Design

## Context

O Dashboard usa um estado `activeNav` (string) para controlar qual view é renderizada. Cada tab (`'dashboard'`, `'produtos'`, `'categorias'`, etc.) mapeia para uma função `render*()`. A lista de produtos já está em memória via `products` state carregado no mount — não há custo de fetch adicional para filtrar os esgotados.

A tabela `products` tem `DECIMAL(10,3) NOT NULL` para quantidade e colunas `nome`, `unidade`, `categoria`, `peso_kg`. O `createTable.js` usa `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` implicitamente via blocos try/catch para adicionar colunas em bancos existentes.

## Goals / Non-Goals

**Goals:**
- Card "Sem Estoque" navega para view `'sem-estoque'` dentro do dashboard (sem nova rota).
- View lista produtos com `quantidade = 0`, ordenados por categoria, com nome e categoria visíveis.
- Campo `fornecedor` opcional adicionado ao banco, API, modais de criação/edição e todas as tabelas.

**Non-Goals:**
- Notificações automáticas por email/push quando estoque zera.
- Reordenação ou filtros avançados na view de sem estoque.
- Campo fornecedor obrigatório ou com validação de formato.
- Migração automática de dados históricos (fornecedor será `null` para produtos existentes).

## Decisions

### 1. View `'sem-estoque'` como activeNav, não rota separada

**Decisão:** Adicionar `'sem-estoque'` como valor possível de `activeNav`. O card chama `setActiveNav('sem-estoque')`. Não adicionar item no sidebar (é acessível apenas via card).

**Alternativa:** Abrir modal sobreposto. Descartado — o usuário pediu "nova aba" no sentido de nova seção/view, não modal. A navegação por `activeNav` é o padrão já usado pelo sistema.

### 2. Card "Sem Estoque" com cursor interativo

**Decisão:** Transformar o div do card "Sem Estoque" em `button` (ou adicionar `onClick` + `cursor-pointer`). Os outros três cards permanecem estáticos por ora — apenas "Sem Estoque" recebe interação conforme solicitado.

**Alternativa:** Tornar todos os cards clicáveis. Descartado — fora do escopo solicitado; evita mudança não pedida.

### 3. Coluna `fornecedor VARCHAR(150) NULL` via ALTER TABLE try/catch

**Decisão:** Seguir o padrão já existente em `createTable.js` — executar `ALTER TABLE products ADD COLUMN fornecedor VARCHAR(150) NULL` dentro de try/catch ignorando `ER_DUP_FIELDNAME`. Isso garante idempotência sem precisar de migration tool.

**Alternativa:** Script de migration separado. Descartado — o projeto não usa migration tool; consistência com o padrão existente é prioritária.

### 4. Fornecedor nas tabelas: coluna extra após Categoria

**Decisão:** Adicionar coluna "Fornecedor" após "Categoria" em `renderTabelaProdutos` e `renderCategorias`. Exibe `p.fornecedor || '—'`.

**Alternativa:** Mostrar fornecedor apenas no modal de detalhes. Descartado — o usuário pediu que apareça em "todos os produtos", ou seja, nas listagens.

## Risks / Trade-offs

- **Banco existente sem a coluna** → Mitigado pelo ALTER TABLE try/catch; servidor precisa ser reiniciado após deploy para executar `createTable.js` (ou rodar manualmente).
- **Tabela mais larga** → A coluna Fornecedor estreita as demais em telas pequenas. O `overflow-x-auto` já existente absorve isso.
- **`activeNav = 'sem-estoque'` não está no sidebar** → O usuário não tem como navegar para essa view pelo menu, apenas pelo card. Isso é intencional. Para sair, basta clicar em qualquer item do sidebar.

## Migration Plan

1. Parar o servidor Node.
2. Executar `node backend/src/createTable.js` (ou reiniciar o servidor, que o faz automaticamente se chamado no start).
3. O `ALTER TABLE` adiciona `fornecedor NULL` — todos os produtos existentes ficam com `NULL`, exibido como "—" nas tabelas.
4. Reiniciar frontend (rebuild ou hot-reload).
