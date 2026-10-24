import { useEffect, useState } from 'react';
import { entryProduct } from '../services/api';

export default function EntradaModal({ product, onClose, onEntered, onError }) {
  const [quantidade, setQuantidade] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const qty = parseFloat(quantidade);
    if (!quantidade.trim() || isNaN(qty) || qty <= 0) {
      setError('Informe uma quantidade válida maior que zero.');
      return;
    }
    setLoading(true);
    try {
      await entryProduct(product.id, qty);
      onEntered(qty);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar entrada.');
      onError?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Entrada de Estoque</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Produto</p>
            <p className="font-semibold text-gray-800 dark:text-white text-sm mt-0.5">{product.nome}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Estoque atual: <span className="font-medium">{parseFloat(product.quantidade)} {product.unidade}</span>
            </p>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Quantidade a adicionar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none transition
                ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'}`}
              value={quantidade}
              onChange={e => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d*$/.test(v)) { setQuantidade(v); setError(''); }
              }}
              placeholder="Ex: 10"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
            >
              {loading ? 'Registrando…' : 'Confirmar Entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
