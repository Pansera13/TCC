# Tasks

O frontend não tem executor de testes. A verificação usa `npm run lint` e `npm run build` em `frontend/`, `grep` no código e conferência manual no navegador (claro, escuro e 360 px). Backend e banco não mudam, então não há teste de backend novo. Para ver o efeito de um produto zerado é preciso ter um: se a conta de teste não tiver nenhum, **pedir confirmação ao Lucas antes de gravar dados** (retirar até zerar e dar entrada depois) e conferir ao final que o estoque voltou ao valor original.

## 1. Predicado único e listas sem os zerados

- [x] 1.1 Criar `estaSemEstoque(p)` em `frontend/src/utils/products.js`, retornando `parseFloat(p.quantidade) === 0`. Verificar com um script `node` (o arquivo não tem JSX) que cobre `0`, `'0'`, `'0.0000'` e `0` decimal como sem estoque, e `0.5`, `'2'`, `null` e `undefined` como com estoque.
- [x] 1.2 Em `Dashboard.jsx`, fazer os cartões de indicadores usarem `estaSemEstoque` no "Sem Estoque", mantendo os outros critérios e a lista completa como base. Verificar no navegador que os quatro números do Início não mudam em relação a antes da alteração.
- [x] 1.3 Em `renderInicio`, montar a tabela "Visão geral dos produtos" com `products.filter(p => !estaSemEstoque(p))` e mostrar "Todos os produtos estão sem estoque." quando só houver zerados. Verificar no navegador que um produto zerado não aparece na tabela e que o cartão "Total de Produtos" continua contando-o.
- [x] 1.4 Em `renderProdutos`, usar a lista com estoque no agrupamento por categoria, na busca e no seletor de categoria, mantendo as categorias do `AddProductModal` a partir de todos os produtos, e trocar a mensagem vazia por "Todos os produtos estão sem estoque. Veja a aba Sem estoque." quando existirem produtos mas todos zerados. Verificar nos 4 layouts que um produto zerado não aparece em nenhuma categoria nem na busca, que uma categoria só com zerados some do seletor e que o filtro por categoria segue funcionando.

## 2. Aba Sem estoque no lugar de Arquivados

- [x] 2.1 Em `ALL_NAV_ITEMS`, trocar o item `arquivados` por `{ id: 'sem-estoque', label: 'Sem estoque', icon: '❌' }` sem `permissao`, e tirar do `main` o ramo de `arquivados`. Verificar com `grep` que `'arquivados'` não aparece mais na navegação e, no navegador como Administrador, que o menu lista Início, Produtos, Movimentações, Relatórios e Sem estoque, e que o cartão vermelho do Início abre a mesma aba com o item ativo.
- [x] 2.2 Em `renderSemEstoque`, usar `estaSemEstoque`, trocar o título para "Sem estoque" (com a contagem) e acrescentar a coluna de ações com **Entrada** (todos) e **Editar** (só com `can('produto:editar')`), sem Retirar. Verificar no navegador que Entrada abre o modal e, ao concluir, o produto sai da aba e aparece em Produtos na sua categoria sem recarregar, e que Editar abre o modal de edição. Conferir no código que o botão Editar depende de `can('produto:editar')`.
- [ ] 2.3 Conferir os cenários de tempo real da spec: zerar um produto por uma retirada o move de Produtos para Sem estoque, e o mesmo vale para uma alteração vinda de outra sessão (Realtime). Verificar com duas abas abertas no navegador, usando a conta de teste e só após confirmação do Lucas para gravar.

## 3. Remoção do arquivamento do frontend

- [x] 3.1 Em `Dashboard.jsx`, remover `renderArquivados`, os estados e refs de arquivados, `fetchArquivados`, `invalidarArquivados`, o efeito que busca ao abrir a aba, os imports `listArchivedProducts`, `restoreProduct` e `deleteProduct` e as chamadas a `invalidarArquivados` em `onSaved`, mantendo no handler do Realtime a remoção de produto com `arquivado: true`. Verificar com `grep -niE "arquiv" frontend/src/pages/Dashboard.jsx` que só sobra o tratamento do Realtime, e que `npm run lint` e `npm run build` passam.
- [x] 3.2 Em `EditProductModal.jsx`, remover o estado de confirmação de arquivar, `handleArquivar`, a seção "Arquivar produto" com as duas confirmações e o import de `archiveProduct`, mantendo a exclusão definitiva para quem tem `produto:excluir`. Verificar no navegador como Administrador que o modal mostra só "Excluir definitivamente" com as duas confirmações e que salvar uma edição continua funcionando.
- [x] 3.3 Em `services/api.js`, remover `listArchivedProducts`, `archiveProduct` e `restoreProduct`. Verificar com `grep -rniE "ArchivedProducts|archiveProduct|restoreProduct" frontend/src` que nada mais os usa e que `npm run build` passa.

## 4. Verificação integrada e documentação

- [x] 4.1 Rodar `npm run lint` e `npm run build` em `frontend/` e confirmar que não surgiu nenhum erro novo em relação ao estado anterior (anotar os avisos que já existiam).
- [ ] 4.2 Passada manual pelos cenários das specs alteradas (`dashboard/navigation`, `dashboard/out-of-stock-view`, `frontend/product-layouts`, `products/category-filter`, `frontend/edit-product-modal`), em modo claro, escuro e 360 px (sem rolagem horizontal), incluindo a paginação e a ordenação por coluna da aba Sem estoque. Verificar com o resultado anotado na conversa e com o estoque da conta de teste de volta ao valor original.
- [x] 4.3 Atualizar o vault: a nota `01 - Sistema/Visao geral e stack.md` (funcionalidades: sai arquivar/restaurar, entra a aba Sem estoque) e o diário do dia em `05 - Diario`. Verificar abrindo as notas e conferindo que descrevem o novo comportamento.

## Workflow follow-up

- Arquivar a change (`/opsx:archive sem-estoque-substitui-arquivados`) depois da revisão, o que também sincroniza as specs principais.
- Decidir se os produtos que já estão arquivados no banco devem ser desarquivados (SQL de apoio no `design.md`, nada é aplicado por esta change).
