export default function RecarregarProdutos({ onClick, recarregando, erro }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={recarregando}
        title="Recarregar produtos"
        aria-label="Recarregar produtos"
        aria-busy={recarregando}
        className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-500 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-4 h-4 ${recarregando ? 'animate-spin' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
      {erro && (
        <span role="status" className="text-xs text-red-500 dark:text-red-400">
          Não foi possível recarregar. Tente novamente.
        </span>
      )}
    </div>
  );
}
