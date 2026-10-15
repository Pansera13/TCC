const btn =
  'px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 ' +
  'hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';

// Controles de paginação reutilizados pelas abas Produtos e Movimentações.
// Não renderiza nada quando há uma página ou menos.
export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (totalPages <= 1) return null;
  const first = page <= 1;
  const last = page >= totalPages;
  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 ${className}`}>
      <button type="button" className={btn} disabled={first} onClick={() => onChange(1)} aria-label="Primeira página">« Primeira</button>
      <button type="button" className={btn} disabled={first} onClick={() => onChange(page - 1)} aria-label="Página anterior">‹ Anterior</button>
      <span className="px-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Página {page} de {totalPages}</span>
      <button type="button" className={btn} disabled={last} onClick={() => onChange(page + 1)} aria-label="Próxima página">Próxima ›</button>
      <button type="button" className={btn} disabled={last} onClick={() => onChange(totalPages)} aria-label="Última página">Última »</button>
    </div>
  );
}
