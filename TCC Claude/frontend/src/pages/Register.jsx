import ReCAPTCHA from 'react-google-recaptcha';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../services/api';

function formatCpfCnpj(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export default function Register({ darkMode, setDarkMode }) {
  const [form, setForm] = useState({
    nome: '', nome_empresa: '', cpf_cnpj: '', email: '', senha: '', confirmar: '',
  });
  const [errors, setErrors] = useState({});
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const recaptchaRef = useRef();
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'cpf_cnpj') {
      setForm(f => ({ ...f, cpf_cnpj: formatCpfCnpj(value) }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
    setErrors(e => ({ ...e, [name]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Campo obrigatório.';
    if (!form.nome_empresa.trim()) e.nome_empresa = 'Campo obrigatório.';
    if (!form.cpf_cnpj.trim()) e.cpf_cnpj = 'Campo obrigatório.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'E-mail inválido.';
    if (!form.senha) e.senha = 'Campo obrigatório.';
    else if (form.senha.length < 8) e.senha = 'Mínimo 8 caracteres.';
    if (form.senha !== form.confirmar) e.confirmar = 'As senhas não coincidem.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!recaptchaToken) { setApiError('Complete o CAPTCHA.'); return; }

    setLoading(true);
    try {
      await apiRegister({
        nome: form.nome,
        nome_empresa: form.nome_empresa,
        cpf_cnpj: form.cpf_cnpj,
        email: form.email,
        senha: form.senha,
        recaptchaToken,
      });
      navigate('/?success=cadastro');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao cadastrar.';
      const field = err.response?.data?.field;
      if (field) setErrors(e => ({ ...e, [field]: msg }));
      else setApiError(msg);
      recaptchaRef.current?.reset();
      setRecaptchaToken('');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg border ${errors[field] ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition`;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white to-[#E879F9] dark:from-black dark:to-[#7C3AED] flex flex-col relative transition-colors duration-500">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-black/50 transition-all text-xl"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <img src="/logo.png" alt="StockFlow" className="w-16 h-16 mb-2 animate-float mix-blend-multiply dark:mix-blend-screen" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">StockFlow — Criar conta</h1>

        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nome completo</label>
              <input name="nome" value={form.nome} onChange={handleChange} placeholder="Seu nome completo" className={inputClass('nome')} />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nome da empresa</label>
              <input name="nome_empresa" value={form.nome_empresa} onChange={handleChange} placeholder="Nome da sua empresa" className={inputClass('nome_empresa')} />
              {errors.nome_empresa && <p className="text-xs text-red-500 mt-1">{errors.nome_empresa}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">CPF ou CNPJ</label>
              <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="000.000.000-00 ou 00.000.000/0001-00" className={inputClass('cpf_cnpj')} />
              {errors.cpf_cnpj && <p className="text-xs text-red-500 mt-1">{errors.cpf_cnpj}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">E-mail</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" className={inputClass('email')} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Senha</label>
                <div className="relative">
                  <input name="senha" type={showSenha ? 'text' : 'password'} value={form.senha} onChange={handleChange} placeholder="••••••••" className={inputClass('senha') + ' pr-10'} />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" tabIndex={-1}>{showSenha ? '🙈' : '👁️'}</button>
                </div>
                {errors.senha && <p className="text-xs text-red-500 mt-1">{errors.senha}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Confirmar</label>
                <div className="relative">
                  <input name="confirmar" type={showConfirmar ? 'text' : 'password'} value={form.confirmar} onChange={handleChange} placeholder="••••••••" className={inputClass('confirmar') + ' pr-10'} />
                  <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" tabIndex={-1}>{showConfirmar ? '🙈' : '👁️'}</button>
                </div>
                {errors.confirmar && <p className="text-xs text-red-500 mt-1">{errors.confirmar}</p>}
              </div>
            </div>

            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={setRecaptchaToken}
                onExpired={() => setRecaptchaToken('')}
                theme={darkMode ? 'dark' : 'light'}
              />
            </div>

            {apiError && <p className="text-sm text-red-500 text-center">{apiError}</p>}

            <button
              type="submit"
              disabled={loading || !recaptchaToken}
              className="w-full py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md"
            >
              {loading ? 'Cadastrando...' : 'CADASTRAR'}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              <Link to="/" className="text-purple-600 dark:text-purple-400 hover:underline">← Já tenho conta</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
