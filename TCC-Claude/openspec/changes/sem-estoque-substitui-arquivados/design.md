# Design

## Context

Hoje o Dashboard tem cinco abas na barra (`ALL_NAV_ITEMS` em `Dashboard.jsx`): Início, Produtos, Movimentações, Relatórios e Arquivados (esta só com `produto:ver-arquivados`, ou seja, Administrador). Já existe uma view "Sem estoque" (`renderSemEstoque`, id `sem-estoque`), mas ela só é alcançada pelo cartão vermelho do Início e não tem ações por linha. Os produtos vêm todos de `GET /api/products` e ficam no estado `products`, mantido em tempo real pelo Supabase Realtime. A aba Arquivados busca outra lista (`?arquivados=1`) e tem cache próprio. Motivação e escopo em `proposal.md`.

Pontos do código que condicionam a abordagem:
- Os indicadores do Início contam com `p.quantidade === 0` (comparação estrita), enquanto a view Sem estoque usa `parseFloat(p.quantidade) === 0`. O Realtime pode entregar a quantidade num formato diferente do da API, então o critério precisa ser um só.
- Os modais de Entrada e de Edição ficam montados na raiz do Dashboard (`entradaItem`, `editProduct`) e funcionam a partir de qualquer aba.
- `EntradaModal` e `WithdrawModal` já atualizam `products` localmente ao concluir (`onEntered`, `onWithdrawn`).

## Goals / Non-Goals

**Goals:**
- Um único critério de "sem estoque" usado em todos os pontos da interface.
- O produto trocar de lugar na hora, sem nova requisição, quando a quantidade chega a zero ou deixa de ser zero.
- Remover do frontend todo o código de arquivamento sem mexer em servidor nem banco.

**Non-Goals:**
- Alterar rotas, permissões ou colunas de arquivamento no backend e no banco.
- Mudar relatórios: eles continuam contando os produtos não arquivados, inclusive os zerados.
- Avisos ou notificações quando um produto zera.
- Dar ao Sócio uma nova forma de remover produtos das listas.

## Decisions

**1. A lista Sem estoque é derivada no frontend, com um predicado único.**
`estaSemEstoque(p)` fica em `utils/products.js` e retorna `parseFloat(p.quantidade) === 0`. Início, Produtos, a aba Sem estoque e os cartões usam essa função.
- *Por quê:* a lista completa já está em memória e já é atualizada pelo Realtime, então a mudança de lugar é imediata e não custa requisições. O `parseFloat` cobre quantidade como número ou como texto.
- *Alternativas descartadas:* filtro no servidor (`?sem_estoque=1`) cria uma segunda lista para manter em sincronia e uma requisição a mais; uma view no banco exigiria SQL e fugiria de "nenhuma mudança no banco".

**2. A aba Sem estoque ocupa o lugar de Arquivados na barra, sem permissão.**
O item `{ id: 'sem-estoque', label: 'Sem estoque' }` substitui o de `arquivados` e não tem `permissao`, então todos os cargos o veem. O id `sem-estoque` já está tratado como aba de tabela (`h-full`), e o cartão vermelho do Início já navega para ele.

**3. A aba reaproveita `renderSemEstoque` e ganha uma coluna de ações.**
Cada linha mostra Entrada (todos) e Editar (`produto:editar`), chamando `setEntradaItem` e `setEditProduct`. Não há Retirar. Ao concluir a entrada, `onEntered` já soma a quantidade em `products` e o produto sai da aba na hora. Ao salvar uma edição, `onSaved` recarrega a lista.
- *Por quê:* sem Entrada nessa aba, ninguém conseguiria repor um produto zerado, já que ele sai da aba Produtos, que é onde está o botão hoje.

**4. Início e Produtos recebem a lista já sem os zerados.**
`renderInicio` (tabela) e `renderProdutos` (agrupamento, seletor de categoria e busca) partem de `products.filter(p => !estaSemEstoque(p))`. Os cartões continuam usando a lista completa. O seletor de categoria é montado a partir dos produtos com estoque, para não oferecer categoria que levaria a uma tela vazia. O `AddProductModal` continua recebendo as categorias de todos os produtos, porque sugerir uma categoria já usada no cadastro é útil mesmo se os itens dela estão zerados. Quando só existem produtos zerados, a aba Produtos mostra "Todos os produtos estão sem estoque" em vez de "Nenhum produto cadastrado ainda".

**5. Todo o código de arquivados sai do frontend.**
Saem: item de navegação, `renderArquivados`, estados e cache (`produtosArquivados`, `loadingArquivados`, `arquivadosLoadedRef`, `fetchArquivados`, `invalidarArquivados`), o efeito que busca ao abrir a aba, o botão "Arquivar produto" e suas duas confirmações em `EditProductModal`, e `listArchivedProducts`, `archiveProduct` e `restoreProduct` em `api.js`. O handler do Realtime continua removendo produtos com `arquivado: true`, para que um produto arquivado pela API por outra sessão ou por script continue saindo da lista.

**6. Backend e banco ficam como estão.**
As rotas `/archive` e `/restore`, o parâmetro `?arquivados=1`, a permissão `produto:ver-arquivados` e as colunas `arquivado` e `arquivado_em` permanecem. O sistema de Pedidos, que usa o mesmo banco, não é afetado.

**7. Forma dos deltas de spec.**
O validador do OpenSpec não aceita que um requisito MODIFIED descarte cenários antigos. Onde os cenários antigos deixariam de ser verdade (abas do menu, funções de produto do cliente, arquivar), o requisito antigo é REMOVED e um novo é ADDED.

## Risks / Trade-offs

- **Produtos já arquivados ficam sem tela** → continuam arquivados e fora de todas as listas, sem perda de dados. Para ver quais são, e opcionalmente desarquivá-los, o SQL abaixo pode ser rodado à mão no Supabase. Não será aplicado por esta change.
- **O Sócio fica sem forma de tirar um produto das listas** (não arquiva e continua sem poder excluir) → aceitável: o que acaba sai sozinho para Sem estoque. Mudar isso exigiria alterar permissões, fora do escopo.
- **O produto some da aba Produtos no instante da retirada que o zera** → é o comportamento pedido; o produto aparece na aba Sem estoque imediatamente.
- **Não há testes automatizados de frontend** (só `oxlint` e o build) → verificação manual no navegador. Qualquer teste que grave dados (retirar até zerar, dar entrada) usa a conta de teste e só com confirmação do Lucas antes e depois, para limpar.
- **Outras specs ainda citam Equipe e a restauração de arquivados** (`team/team-management`, `auth/roles-permissions`) → fora do escopo. A restauração continua verdadeira na API. A limpeza do restante merece uma change própria.

## Migration Plan

Só o frontend muda, sem migração de dados.
1. Aplicar as alterações do frontend.
2. Rodar `npm run lint` e `npm run build`, e conferir no navegador os cenários das specs.
3. Rollback: reverter os commits do frontend. O backend e o banco nunca deixaram de suportar o arquivamento.

## Open Questions

- Desarquivar os produtos que já estão arquivados? Pode ser decidido depois, sem mudar specs nem tarefas. SQL de apoio (rodar à mão, nada disso é aplicado por esta change):

```sql
-- Ver quais produtos estão arquivados hoje
SELECT id, tenant_id, nome, quantidade, arquivado_em FROM products WHERE arquivado = true;

-- OPCIONAL: desarquivar todos. Os com quantidade 0 caem em "Sem estoque", os demais voltam a "Produtos".
UPDATE products SET arquivado = false, arquivado_em = NULL WHERE arquivado = true;

-- Reversão: guarde os ids do SELECT acima antes e arquive de novo
-- UPDATE products SET arquivado = true, arquivado_em = NOW() WHERE id IN (...);
```
