## Context

As tabelas são escritas à mão em JSX com Tailwind, em dois arquivos: `Dashboard.jsx` (tabela de produtos, esgotados e `linhasTabela`, compartilhada pelos layouts Lista e por categoria) e `MovementsHistory.jsx`. Hoje as linhas usam `hover:bg-gray-50` e `divide-y` no `tbody`. No layout Lista, um único `tbody` mistura linhas de cabeçalho de categoria, de dados e de paginação, então `odd:`/`even:` do CSS seria desalinhado.

## Goals / Non-Goals

**Goals:** zebra sutil em todas as tabelas, claro/escuro, hover visível, reinício por categoria.
**Non-Goals:** mudar o layout Grade (cartões), cores de texto/badges, ou criar componente de tabela genérico.

## Decisions

- **Classe por índice, não `even:`/`odd:`.** O índice do `.map` decide o tom; assim linhas auxiliares não interferem. Uma pequena função utilitária `zebra(i)` em `frontend/src/utils/` retorna `i % 2 === 0 ? CLARO : ESCURO`, evitando duplicar strings nos dois arquivos.
- **Cores:** claro = `bg-white dark:bg-gray-900` (igual ao card); escuro = `bg-gray-100/70 dark:bg-gray-800/60`. A diferença é pequena para ficar sutil.
- **Hover:** trocar para `hover:bg-purple-50 dark:hover:bg-gray-700/50` (alinhado ao roxo já usado no app), distinto de ambos os tons.
- **Divisores:** manter `divide-y` existente; com zebra ficam discretos e não atrapalham.
- Alternativa descartada: CSS `tr:nth-child` global em `index.css` — afetaria linhas auxiliares e tabelas futuras sem controle.

- **Largura e centralização:** o wrapper de cada tabela recebe `w-full lg:w-1/2 mx-auto overflow-x-auto`, via constante `TABLE_WRAP` exportada junto com `zebra`. Cabeçalho de categoria e paginação ficam dentro do mesmo wrapper e acompanham a largura.
- **Estado atual:** parte dos wrappers já usa `w-full lg:w-1/2` com `marginInline: 'auto'` inline; a implementação unifica tudo em `TABLE_WRAP` em vez de duplicar a regra.
- **Fundo:** fora de escopo; o degradê já é o mesmo em todas as telas.

- **Causa raiz do descentramento:** o reset `* { margin: 0; padding: 0 }` de `index.css` está fora de `@layer`, e em Tailwind v4 CSS sem camada vence os utilitários. Foi removido (o preflight do Tailwind já zera margens e paddings). Isso também faz valerem `p-5`, `pl-[23px]` e `px-[3cm]`, e telas como o Login passam a exibir o espaçamento previsto nas classes.
- **Paginação:** `Pagination` ganhou o seletor "Ir para"; `TABLE_PAGE_SIZE = 8` em `utils/products.js` para Início, Sem estoque, Equipe e Relatórios (giro), cada um com sua página em `pagTabelas`/estado local. Produtos mantém 15 por categoria.

- **Sem vazar da tela:** classes `hide-lt-1350` (Peso e Cadastro), `hide-lt-1100` (Fornecedor, Status, Responsável) e `hide-lt-850` (Categoria, Cargo, Origem) em `index.css`; abaixo de 1280 px o texto quebra nos espaços e abaixo de 640 px as células usam `padding-inline: .5rem`.

## Risks / Trade-offs

- Com a largura de metade, nomes longos quebram em várias linhas e botões da coluna de ações podem exigir rolagem horizontal; se incomodar, a largura final é 88% (`lg:w-[88%]`), medida para que todas as colunas caibam sem corte.

- Com metade da largura, tabelas de 5 colunas podem ficar apertadas → `overflow-x-auto` e, se necessário, `lg:w-2/3`.

- Contraste do tom escuro no tema escuro pode ficar pouco perceptível → validar visualmente nos dois temas e ajustar opacidade.
- A linha de detalhes (edição) mantém seu próprio fundo; fica visualmente atrelada à linha acima. Aceitável.
