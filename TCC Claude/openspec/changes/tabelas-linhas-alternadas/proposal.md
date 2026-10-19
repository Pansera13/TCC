# Proposal

## Why

As tabelas do sistema (estoque por categoria, lista, esgotados e histórico de movimentações) usam todas as linhas com o mesmo fundo, separadas apenas por um divisor fino. Isso dificulta acompanhar uma linha ao longo das colunas. Alternar tons de linha melhora a leitura e dá mais destaque às tabelas sobre o fundo da página.

## What Changes

- Todas as tabelas de produtos/movimentações passam a alternar o fundo das linhas: uma linha com tom mais claro e a seguinte com tom mais escuro, de forma sutil (a tabela se destaca levemente do fundo do card).
- A alternância funciona nos temas claro e escuro, com tons próprios para cada um.
- A alternância reinicia a cada grupo/categoria (a primeira linha de dados é sempre a clara) e não é afetada por linhas auxiliares (cabeçalho de categoria, rodapé de paginação, linha de detalhes de edição).
- O realce de hover continua visível por cima das cores alternadas.
- Todas as tabelas ficam centralizadas horizontalmente e com cerca de 88% da largura da área de conteúdo em telas largas (largura suficiente para exibir todas as colunas do produto) (≥ `lg`); em telas estreitas mantêm largura total com rolagem horizontal (suposição).
- O degradê de fundo das telas já é idêntico ao do login (Login, Cadastro, Recuperar senha e Dashboard); nenhuma mudança necessária.

- Toda tabela de dados passa a mostrar no máximo uma página de linhas (8 nas tabelas de Início, Sem estoque, Equipe e Relatórios; 15 por categoria em Produtos), com botões Primeira, Anterior, Próxima, Última, seletor "Ir para" a página desejada e o texto "Página X de Y", em vez de rolagem longa.
- Corrigir o reset global de `margin`/`padding` em `index.css`, que ficava fora das camadas do Tailwind e anulava utilitários como `mx-auto`, `p-5` e `pl-[23px]` (causa de tabelas fora do centro e do recuo de 3 px nos cartões de métricas não aparecer).

## Capabilities

### New Capabilities
- `table-row-striping`: aparência das tabelas de dados do frontend, com linhas alternando entre tom claro e escuro nos temas claro e escuro.

### Modified Capabilities

## Impact

- `frontend/src/pages/Dashboard.jsx`: as 6 tabelas (produtos, esgotados, `linhasTabela` nos layouts Lista e por categoria, e as tabelas de produtos no layout acordeão e de Equipe).
- `frontend/src/components/MovementsHistory.jsx`: tabela do histórico de movimentações.
- Apenas classes Tailwind; sem mudanças de API, banco ou dependências.
