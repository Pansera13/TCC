## 1. Utilitário

- [x] 1.1 Criar `frontend/src/utils/tables.js` exportando `zebra(i)` com os tons claro/escuro e o hover definidos no design

## 1b. Largura e centralização

- [x] 1b.1 Exportar `TABLE_WRAP` (`w-full lg:w-1/2 mx-auto overflow-x-auto`) no utilitário
- [x] 1b.2 Auditar quais tabelas já estão centralizadas (wrappers inline `w-full lg:w-1/2` + `marginInline: 'auto'`) e trocar esse inline por `TABLE_WRAP`, cobrindo as que faltam (6 tabelas de `Dashboard.jsx` e a de `MovementsHistory.jsx`), incluindo cabeçalho de categoria e paginação

## 2. Dashboard

- [x] 2.1 Aplicar `zebra(i)` às linhas da tabela de produtos (`products.map`) em `Dashboard.jsx`
- [x] 2.2 Aplicar `zebra(i)` às linhas da tabela de esgotados (`esgotados.map`)
- [x] 2.3 Aplicar `zebra(i)` em `linhasTabela` (layouts Lista e por categoria), garantindo reinício por categoria

## 3. Histórico de movimentações

- [x] 3.1 Aplicar `zebra(i)` às linhas de `MovementsHistory.jsx`, sem contar a linha de detalhes

## 4. Verificação

- [x] 4.1 Conferir visualmente nos temas claro e escuro, em todos os layouts e no histórico, incluindo hover, paginação e centralização em telas larga e estreita

## 5. Paginação e correção do reset global

- [x] 5.1 Remover `margin: 0; padding: 0` do `*` em `frontend/src/index.css`
- [x] 5.2 Adicionar o seletor "Ir para" ao `Pagination` e `TABLE_PAGE_SIZE` em `utils/products.js`
- [x] 5.3 Paginar as tabelas de Início, Sem estoque, Equipe e giro de Relatórios
- [x] 5.4 Conferir no navegador (claro, escuro, 360 px) o centro das tabelas, o recuo dos cartões e a navegação entre páginas

## 6. Ajustes de tamanho e altura

- [x] 6.1 Linhas mais baixas (`py-1.5`) e tabelas com 60% da largura (`TABLE_WRAP = lg:w-3/5`)
- [x] 6.2 Cartões de métricas do Início em layout horizontal, ~1 cm mais baixos (112 px para 68 px)
- [x] 6.3 Cartão da tabela ocupa a altura da tela até 1 cm do fim (`pb-[1cm]`); a paginação fica fixa no rodapé do cartão sem rolagem vertical na área das linhas (as linhas por página se ajustam à altura disponível)
- [x] 6.4 Sem rolagem vertical nas tabelas: `useFitRows` mede a altura disponível e define as linhas por página (Início, Sem estoque, Equipe e Movimentações); células em uma linha só, com reticências
- [x] 6.5 Colunas Peso (kg) e Cadastro nas tabelas de produtos (Início, Lista/Acordeão, Sem estoque); texto sem reticências; `TABLE_WRAP` passa a `lg:w-[88%]` para tudo caber sem corte
- [x] 6.6 Tabelas sempre dentro da tela: colunas secundárias somem abaixo de 1350/1100/850 px (`hide-lt-*`), texto quebra linha abaixo de 1280 px e o espaçamento das células diminui abaixo de 640 px; verificado de 360 a 1920 px
- [x] 6.7 Ordenação por coluna (`utils/sort.js`, `components/SortTh.jsx`) em Início, Produtos, Sem estoque e Equipe; verificado no navegador (quantidade crescente/decrescente, nome A–Z)
- [x] 6.8 Ordenação em Movimentações (exige parâmetro de ordem no backend) e seletor de ordem para telas estreitas, onde colunas ficam ocultas
