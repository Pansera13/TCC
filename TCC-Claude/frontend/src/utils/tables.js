// Alternância de linhas (zebra) e largura/centralização compartilhadas pelas tabelas de dados.
const LINHA_CLARA = 'bg-white dark:bg-gray-900';
const LINHA_ESCURA = 'bg-gray-100/70 dark:bg-gray-800/60';
const LINHA_HOVER = 'hover:bg-purple-50 dark:hover:bg-gray-700/50 transition-colors';

// Classes de uma linha de dados pelo seu índice (0 = tom claro) dentro do grupo/categoria.
export const zebra = (i) => `${i % 2 === 0 ? LINHA_CLARA : LINHA_ESCURA} ${LINHA_HOVER}`;

// Em telas largas (lg+) a tabela ocupa 60% da área de conteúdo, centralizada.
export const TABLE_WRAP = 'w-full lg:w-[88%] mx-auto';
