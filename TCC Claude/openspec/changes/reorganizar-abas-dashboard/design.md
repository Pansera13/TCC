# Design

## Context

Estado observado no código e no banco (motivação em `proposal.md`, requisitos em `specs/`):

- **Frontend**: `Dashboard.jsx` (~1190 linhas) concentra tudo. `renderProdutos` agrupa por categoria dentro da própria função e os 4 layouts (`renderLista`, `renderAcordeao`, `renderGrade`, `renderCompacto`) iteram `grouped[cat]` inteiro. `renderCategorias` é uma segunda visão só leitura. `renderMovimentacoes` desenha um array vindo de `GET /api/movements`. O Realtime do Supabase atualiza `products` por `postgres_changes` (INSERT/UPDATE/DELETE) e há polling de 20 s.
- **Backend** (Express + `pg` direto, sem ORM e sem helper de transação): `listMovements` faz `ORDER BY created_at DESC LIMIT 500`. Só `createProduct` (entrada) e `withdrawProduct` (saída) chamam `logMovement`. `updateProduct` não registra nada e não há rota de remoção. `adminMiddleware` existe; `GET /api/users` é só admin.
- **Banco Supabase** (compartilhado com o sistema de Pedidos), verificado em 14/10/2026:
  - `movements`: `id, product_id (NOT NULL), product_nome, tipo, quantidade (NOT NULL), user_id, user_nome, origem ('estoque'|'pedido'), pedido_id, created_at`. **Sem FK de `product_id` para `products`**, então o histórico sobrevive à remoção do produto.
  - `CHECK movements_tipo_check`: `tipo IN ('entrada','saida')`. Impede gravar edição e remoção.
  - Índices: `product_id`, `created_at`, `pedido_id`. RLS ativo; o backend conecta por `DATABASE_URL` e já grava normalmente.
  - `itens_pedido.product_id → products(id) ON DELETE RESTRICT`: produto que consta em pedido **não pode ser apagado**.
  - Dados hoje: 558 entradas (estoque), 11 saídas (pedido), 649 produtos. Realtime publica só `products`.
  - A função `pagar_pedido` insere apenas `entrada`/`saida`.

## Goals / Non-Goals

**Goals:**
- Paginação e agrupamento isolados e reutilizáveis (um componente, uma função), sem duplicar lógica nos 4 layouts.
- Auditoria completa com filtro e paginação feitos no servidor, para escalar além de 500 linhas.
- Relatórios calculados no servidor em uma única consulta consolidada, sem trazer o histórico inteiro ao navegador.
- Cada parte entregável e verificável isoladamente, na ordem: paginação, auditoria, relatórios.

**Non-Goals:**
- Quebrar `Dashboard.jsx` por inteiro em vários arquivos; só extraímos o que as 3 partes precisam.
- Paginação no servidor para produtos (a lista inteira continua vindo de `GET /api/products` e o Realtime continua atualizando o array local).
- Estoque médio histórico (giro "contábil"), gráficos ou novas dependências.
- Permissão por papel nos relatórios e no histórico (todo usuário autenticado vê, como hoje).
- Alterar o sistema de Pedidos.

## Decisions

### D1. Paginação e agrupamento no cliente, com utilitários puros
- `frontend/src/utils/products.js`: `PRODUCTS_PAGE_SIZE = 15`, `groupProductsByCategory(products, search)` (retorna `{ grouped, categorias }` com a mesma ordenação de hoje, "Sem Categoria" por último) e `paginate(items, page, size)` (retorna `{ items, page, totalPages }` já com a página limitada ao intervalo válido).
- `frontend/src/components/Pagination.jsx`: botões Primeira / Anterior / Próxima / Última e "Página X de Y"; recebe `page`, `totalPages`, `onChange`; retorna `null` quando `totalPages <= 1`.
- Estado em `Dashboard`: `pagePorCategoria: { [cat]: number }` (padrão 1). Efeito em `search` zera o objeto. A página exibida passa por `paginate`, que limita ao último índice válido, cobrindo o Realtime que reduz a categoria.
- Cada layout troca `grouped[cat]` por `paginate(grouped[cat], pagePorCategoria[cat] ?? 1, PAGE_SIZE).items` e coloca `<Pagination>` no rodapé do bloco da categoria. O rótulo "N produtos" continua mostrando o total da categoria, não da página.
- Acordeão: a paginação aparece dentro da categoria aberta. Lista: um `<Pagination>` por categoria, em linha própria no `<tbody>` (`<tr><td colSpan>`), para manter colunas alinhadas.
- **Alternativa descartada**: paginar no servidor. Exigiria reescrever Realtime, busca e métricas do Início, que dependem do array completo.
- Trocar de layout ou de tamanho **mantém** as páginas (decisão: menos surpresa); só a busca zera.

### D2. Esquema do banco: migração aditiva, **sujeita a aprovação**
Nada é aplicado sem aprovação explícita (restrição do pedido). Script proposto, `backend/sql/migracao_movements_auditoria.sql`:

```sql
BEGIN;
ALTER TABLE movements DROP CONSTRAINT movements_tipo_check;
ALTER TABLE movements ADD CONSTRAINT movements_tipo_check
  CHECK (tipo IN ('entrada','saida','edicao','remocao'));
ALTER TABLE movements ADD COLUMN detalhes jsonb;
CREATE INDEX idx_movements_user ON movements (user_id);
CREATE INDEX idx_movements_tipo_created ON movements (tipo, created_at DESC);
COMMIT;
```

Reversão: `DELETE` dos registros `edicao`/`remocao`, recriar o CHECK antigo, `DROP COLUMN detalhes`, `DROP INDEX` dos dois índices.

Por que é seguro: só alarga o CHECK e adiciona coluna anulável; `pagar_pedido` e o sistema de Pedidos continuam inserindo `entrada`/`saida` sem tocar em `detalhes`. A consulta de Pedidos que somar `movements` por `tipo` não é afetada, pois os valores novos têm nome distinto, mas **quem lê `movements` fora deste repositório deve ser avisado**.

Convenções de gravação:
- `edicao`: `quantidade = |nova − antiga|` (0 se só mudaram texto), `detalhes = { antes: {campo: valor}, depois: {campo: valor} }` só com campos que mudaram.
- `remocao`: `quantidade` = estoque que existia no momento da remoção; `product_nome` preserva o nome (sem FK, o registro sobrevive).
- Relatórios somam **apenas** `entrada` e `saida`.

**Alternativa descartada**: tabela nova `audit_log`. Duplicaria o histórico e quebraria a ideia de uma lista única e cronológica em Movimentações.

### D3. Backend: registro de edição e remoção
- `updateProduct`: ler a linha atual (`SELECT`), comparar campos (`nome, quantidade, unidade, categoria, fornecedor`), executar o `UPDATE` e, se houve diferença, `logMovement({ tipo: 'edicao', ... , detalhes })`. `logMovement` ganha o parâmetro opcional `detalhes` (JSON).
- Nova rota `DELETE /api/products/:id` com `authMiddleware + adminMiddleware`: lê o produto, apaga, registra `remocao`. Violação de FK (`23503`) vira **409** com a mensagem "Produto vinculado a pedidos e não pode ser removido." e **nenhum** registro é gravado.
- Mesmo padrão atual (consulta, ação, registro), sem transação nova: o projeto não tem helper de transação e `logMovement` já é feito depois da ação. Falha entre as duas etapas pode deixar um registro faltando; aceito e listado em Riscos.
- `updateProduct` hoje não exige admin no backend (só a UI esconde o botão). Fora do escopo; sinalizado em Riscos.

### D4. API de movimentações paginada e filtrada
`GET /api/movements?page=1&pageSize=20&user_id=&tipo=&q=&from=&to=` → `{ items, total, page, pageSize }`.
- Filtros viram `WHERE` parametrizado (sem concatenar strings); `q` usa `ILIKE` em `product_nome`; `from`/`to` em `created_at` (fim inclusivo até 23:59:59 do dia); `tipo` aceita `entrada|saida|edicao|remocao` (valor inválido → 400); `pageSize` limitado a 100.
- Colunas novas no `SELECT`: `detalhes`.
- Opções do filtro de usuário: `GET /api/movements/users` → `[{ user_id, user_nome }]` distintos (`SELECT DISTINCT` sobre `movements`, onde `origem = 'estoque'`). Necessário porque `GET /api/users` é só admin.
- `frontend/src/services/api.js`: `listMovements(params)` e `listMovementUsers()`. `Dashboard` troca `movements` (array) por `{ items, total, page }` e `movementsLoaded` por busca a cada mudança de filtro/página.
- **BREAKING interno**: o formato da resposta muda de array para objeto. Único consumidor conhecido é o `Dashboard`.

### D5. Relatórios: um endpoint consolidado
`GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` (`authMiddleware`; sem dados nem período → 400; `from > to` → 400; período máximo 366 dias). Resposta:

```json
{ "period": {"from","to"},
  "summary": {"totalProdutos","estoqueBaixo","esgotados","totalEntradas","totalSaidas"},
  "topRetirados": [{"product_id","nome","quantidade"}],
  "giro": [{"product_id","nome","categoria","unidade","estoque","retirado","giro"}],
  "consumoPorCategoria": [{"categoria","quantidade"}] }
```
- Fontes: `products` (estoque atual) e `movements` filtrado por `tipo IN ('entrada','saida')` e período, juntando por `product_id`. Retiradas de produto já removido não entram em `giro`/`consumoPorCategoria` (sem categoria atual) mas **entram** em `totalSaidas`; `topRetirados` usa `product_nome` do histórico, então inclui produtos removidos.
- `giro = retirado / estoque atual`, `null` se estoque 0. É um índice simples, **não** o giro contábil com estoque médio (histórico de saldo não existe). Registrado como suposição.
- `estoqueBaixo` usa o mesmo limiar `LOW_STOCK_THRESHOLD = 3` do Início (constante duplicada no backend, comentada).
- `totalEntradas/totalSaidas` somam `quantidade` sem converter unidades (kg, un, L...), como o resto do app. Limitação conhecida.
- Frontend: nova aba `relatorios` (componente `Reports.jsx` em `frontend/src/components/`), filtro de período, CSV gerado no cliente (BOM UTF-8 + separador `;` para o Excel pt-BR, nome `relatorio-AAAA-MM-DD_a_AAAA-MM-DD.csv`), seções separadas por linha em branco (Resumo, Top 10, Consumo por categoria, Giro por produto).
- **Alternativa descartada**: calcular no cliente a partir de `GET /api/movements`. Exigiria baixar o histórico todo e quebraria com a paginação.

### D6. Remoção da aba Categorias e menu
- Remover `renderCategorias`, o item `categorias` de `ALL_NAV_ITEMS` e o ramo em `main`. Adicionar `relatorios` entre Movimentações e Equipe.
- Adicionar o botão "Remover produto" no `EditProductModal` (só admin vê o modal), com confirmação em duas etapas e a mensagem do 409 exibida. O fluxo atual de edição não muda.
- Nada em `openspec/specs/` a remover: os requisitos de Categorias só existem em changes arquivados.

### D7. UI de Movimentações
Cabeçalho de filtros (usuário, tipo, produto com *debounce* de ~300 ms, de/até) acima da tabela; botão "Limpar filtros"; `<Pagination>` reaproveitado no rodapé. Coluna Tipo ganha selos Edição (âmbar) e Remoção (cinza escuro), e edições abrem os valores antes/depois em linha expansível. Em celular a tabela usa `overflow-x-auto` como hoje.

## Risks / Trade-offs

- [Migração de `movements` afeta tabela compartilhada com TCC PEDIDOS] → script aditivo e reversível, aplicado só após aprovação; checar que nada fora deste repositório faça `SELECT ... WHERE tipo <> 'entrada'` assumindo que o resto é saída.
- [Registro de auditoria pode faltar se o processo cair entre a ação e o `logMovement`] → igual ao comportamento atual de entrada/saída; transação fica como melhoria futura.
- [`updateProduct` sem checagem de admin no backend] → fora do escopo; a auditoria ao menos passa a registrar quem editou.
- [Remoção bloqueada por pedidos (`RESTRICT`)] → 409 com mensagem clara; não se altera a FK.
- [Giro simplificado e soma de unidades distintas pode confundir] → rótulo e legenda na tela explicam o cálculo.
- [Paginação no cliente com 649+ produtos continua carregando tudo] → aceitável hoje; o ganho é de renderização, não de rede.
- [`Dashboard.jsx` cresce] → isolar o novo em componentes/utilitários; refatoração maior fica fora.
- [Realtime reduz uma categoria e a página guardada fica inválida] → `paginate` limita ao último índice válido (coberto por spec).
- [`GET /api/movements` muda de formato] → mesma change atualiza o único consumidor; verificar se o sistema de Pedidos não chama este endpoint.

## Migration Plan

1. Entregar o grupo 1 (paginação) sem tocar no backend nem no banco.
2. **Pausa de aprovação**: apresentar `migracao_movements_auditoria.sql` e aguardar o sim explícito.
3. Aplicar a migração, validar com `SELECT` nos constraints e rodar o grupo 2 (backend e frontend de auditoria).
4. Grupo 3 (relatórios e remoção de Categorias) não exige mudança de esquema.
5. Reversão: script de reversão da D2. O frontend novo deve tratar um `tipo` desconhecido sem falhar, para não quebrar se houver registros novos e o código antigo voltar.
