// Cabeçalho de coluna clicável que ordena a tabela (crescente, decrescente, sem ordem).
export default function SortTh({ k, ordem, onSort, className = '', children }) {
  const ativo = ordem?.key === k;
  const dir = ativo ? ordem.dir : null;
  return (
    <th className={className} aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
      <button
        type="button"
        onClick={() => onSort(k)}
        title="Ordenar por esta coluna"
        className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-purple-600 dark:hover:text-purple-400 ${ativo ? 'text-purple-600 dark:text-purple-400' : ''}`}
      >
        {children}
        <span className={`text-[10px] leading-none ${ativo ? '' : 'opacity-40'}`} aria-hidden="true">
          {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    </th>
  );
}
