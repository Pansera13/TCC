import { useEffect, useState } from 'react';
import api, { deleteProduct } from '../services/api';

const UNIDADES = ['UN', 'KG', 'L', 'CX'];

function Field({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none transition
   ${err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'}`;

export default function EditProductModal({ product, onClose, onSaved, categories = [] }) {
  const [form, setForm] = useState({
    nome: product.nome,
    quantidade: String(parseFloat(product.quantidade)),
    unidade: product.unidade,
    categoria: product.categoria || '',
    fornecedor: product.fornecedor || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function validate() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    const qty = parseFloat(form.quantidade);
    if (form.quantidade.trim() === '') e.quantidade = 'Quantidade é obrigatória.';
    else if (isNaN(qty) || qty < 0) e.quantidade = 'Quantidade deve ser zero ou maior.';
    if (!form.unidade) e.unidade = 'Unidade é obrigatória.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.put(`/api/products/${product.id}`, {
        nome: form.nome.trim(),
        quantidade: parseFloat(form.quantidade),
        unidade: form.unidade,
        categoria: form.categoria.trim() || null,
        fornecedor: form.fornecedor.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Erro ao salvar alterações.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemover() {
    setRemovendo(true);
    try {
      await deleteProduct(product.id);
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Erro ao remover o produto.' });
      setConfirmandoRemocao(false);
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Editar Produto</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
          {errors._global && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {errors._global}
            </div>
          )}

          <Field label="Nome do produto" required error={errors.nome}>
            <input
              className={inputCls(errors.nome)}
              value={form.nome}
              onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setErrors(er => ({ ...er, nome: '' })); }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade" required error={errors.quantidade}>
              <input
                type="text"
                inputMode="decimal"
                className={inputCls(errors.quantidade)}
                value={form.quantidade}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || /^\d*\.?\d*$/.test(v)) { setForm(f => ({ ...f, quantidade: v })); setErrors(er => ({ ...er, quantidade: '' })); }
                }}
              />
            </Field>
            <Field label="Unidade" required error={errors.unidade}>
              <select
                className={inputCls(errors.unidade)}
                value={form.unidade}
                onChange={e => { setForm(f => ({ ...f, unidade: e.target.value })); setErrors(er => ({ ...er, unidade: '' })); }}
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Categoria" error={errors.categoria}>
            <input
              className={inputCls(errors.categoria)}
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              placeholder="Opcional"
              list="edit-categorias-list"
            />
            <datalist id="edit-categorias-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <Field label="Fornecedor">
            <input
              className={inputCls(false)}
              value={form.fornecedor}
              onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
              placeholder="Opcional"
            />
          </Field>

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
              className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            {!confirmandoRemocao ? (
              <button
                type="button"
                onClick={() => setConfirmandoRemocao(true)}
                className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline"
              >
                Remover produto
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-3">
                <p className="text-xs text-red-600 dark:text-red-300">
                  Remover <strong>{product.nome}</strong>? Essa ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmandoRemocao(false)}
                    disabled={removendo}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemover}
                    disabled={removendo}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition disabled:opacity-50"
                  >
                    {removendo ? 'Removendo…' : 'Sim, remover'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
