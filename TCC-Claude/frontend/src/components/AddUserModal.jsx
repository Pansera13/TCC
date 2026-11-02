import { useEffect, useState } from 'react';
import { createUser } from '../services/api';
import { ROLES } from '../utils/roles';

const INITIAL = { nome: '', email: '', cpf_cnpj: '', senha: '', role: 'user' };

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

// `cargos`: cargos que quem está logado pode atribuir (nunca superiores ao próprio)
export default function AddUserModal({ onClose, onUserAdded, cargos = ['user'] }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    if (!form.email.trim()) e.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido.';
    if (!form.cpf_cnpj.trim()) e.cpf_cnpj = 'CPF é obrigatório.';
    if (!form.senha) e.senha = 'Senha é obrigatória.';
    else if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await createUser({
        nome: form.nome.trim(),
        cpf_cnpj: form.cpf_cnpj.trim(),
        email: form.email.trim(),
        senha: form.senha,
        role: form.role,
      });
      onUserAdded();
      onClose();
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Erro ao criar usuário.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Adicionar Membro</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
          {errors._global && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {errors._global}
            </div>
          )}

          <Field label="Nome completo" required error={errors.nome}>
            <input className={inputCls(errors.nome)} value={form.nome} onChange={e => set('nome', e.target.value)} autoFocus />
          </Field>

          <Field label="E-mail" required error={errors.email}>
            <input type="email" className={inputCls(errors.email)} value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>

          <Field label="CPF (para recuperação de acesso)" required error={errors.cpf_cnpj}>
            <input className={inputCls(errors.cpf_cnpj)} value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
          </Field>

          <Field label="Senha" required error={errors.senha}>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className={inputCls(errors.senha)}
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition"
              >
                {showPass ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </Field>

          <Field label="Cargo" required>
            <select
              className={inputCls(false)}
              value={form.role}
              onChange={e => set('role', e.target.value)}
            >
              {[...cargos].reverse().map(c => (
                <option key={c} value={c}>{ROLES[c]}</option>
              ))}
            </select>
          </Field>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition font-medium">
              {loading ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
