import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { updateEmailRecuperacao } from '../services/api';
import { aplicarSugestao, normalizarEmail, problemaEmailRecuperacao } from '../utils/emailRecuperacao';

const inputCls = (err) =>
  `w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none transition
   ${err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'}`;

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

// `emailLogin` serve só para a checagem imediata "diferente do e-mail de login"; o backend decide.
export default function EmailRecuperacaoModal({ emailAtual, emailLogin, onClose, onSaved }) {
  const [form, setForm] = useState({ email_recuperacao: '', confirmacao: '', senha_atual: '' });
  const [errors, setErrors] = useState({});
  const [sugestao, setSugestao] = useState('');
  const [loading, setLoading] = useState(false);
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
    setErrors(e => ({ ...e, [campo]: '', _global: '' }));
    if (campo === 'email_recuperacao') setSugestao('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const erros = {};
    const problema = problemaEmailRecuperacao(form.email_recuperacao, emailLogin);
    if (problema) {
      erros.email_recuperacao = problema.message;
      setSugestao(problema.sugestao || '');
    } else if (normalizarEmail(form.email_recuperacao) !== normalizarEmail(form.confirmacao)) {
      erros.confirmacao = 'Os e-mails de recuperação não coincidem.';
    }
    if (!form.senha_atual) erros.senha_atual = 'Informe a senha atual.';
    if (Object.keys(erros).length) { setErrors(erros); return; }

    setLoading(true);
    try {
      const { data } = await updateEmailRecuperacao(form);
      onSaved(data.email_recuperacao);
      setFeito(true);
    } catch (err) {
      const dados = err.response?.data;
      const msg = dados?.message || 'Não foi possível salvar o e-mail de recuperação.';
      if (dados?.field) setErrors({ [dados.field]: msg });
      else setErrors({ _global: msg });
      if (dados?.field === 'email_recuperacao') setSugestao(dados.sugestao || '');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm">E-mail de recuperação</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none">✕</button>
        </div>

        {feito ? (
          <div className="px-5 py-6 flex flex-col gap-4">
            <p className="text-sm text-green-600 dark:text-green-400">E-mail de recuperação atualizado com sucesso.</p>
            <button onClick={onClose} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Atual: <strong className="text-gray-700 dark:text-gray-300">{emailAtual || 'nenhum cadastrado'}</strong>
            </p>

            {errors._global && (
              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{errors._global}</div>
            )}

            <Field label="Novo e-mail de recuperação" error={errors.email_recuperacao}>
              <input type="email" autoFocus className={inputCls(errors.email_recuperacao)} value={form.email_recuperacao}
                onChange={e => set('email_recuperacao', e.target.value)} placeholder="outro@gmail.com" />
              {sugestao && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  Você quis dizer <strong>{sugestao}</strong>?{' '}
                  <button type="button" className="text-purple-600 dark:text-purple-400 hover:underline font-medium" onClick={() => {
                    set('email_recuperacao', aplicarSugestao(form.email_recuperacao, sugestao));
                  }}>Corrigir</button>
                </span>
              )}
            </Field>

            <Field label="Confirmar novo e-mail" error={errors.confirmacao}>
              <input type="email" className={inputCls(errors.confirmacao)} value={form.confirmacao}
                onChange={e => set('confirmacao', e.target.value)} onPaste={e => e.preventDefault()} placeholder="Digite novamente" />
            </Field>

            <Field label="Senha atual" error={errors.senha_atual}>
              <input type="password" autoComplete="current-password" className={inputCls(errors.senha_atual)} value={form.senha_atual}
                onChange={e => set('senha_atual', e.target.value)} placeholder="••••••••" />
            </Field>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition font-medium">
                {loading ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
