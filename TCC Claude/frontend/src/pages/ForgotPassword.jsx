import ReCAPTCHA from 'react-google-recaptcha';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword as apiForgot, resetPassword as apiReset, verifyCode as apiVerify } from '../services/api';

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

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
}

function Step1({ darkMode, onNext }) {
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !cpfCnpj || !recaptchaToken) {
      setError('Preencha todos os campos e complete o CAPTCHA.');
      return;
    }
    setLoading(true);
    try {
      await apiForgot(email, cpfCnpj, recaptchaToken);
      onNext(email);
    } catch {
      setError('Erro ao processar. Tente novamente.');
      recaptchaRef.current?.reset();
      setRecaptchaToken('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Recuperar acesso</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Informe seu e-mail e CPF/CNPJ cadastrados.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">E-mail</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">CPF ou CNPJ</label>
          <input
            value={cpfCnpj} onChange={e => setCpfCnpj(formatCpfCnpj(e.target.value))}
            placeholder="000.000.000-00"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
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
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !recaptchaToken}
          className="w-full py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md"
        >
          {loading ? 'Enviando...' : 'AVANÇAR'}
        </button>
        <p className="text-center text-sm">
          <Link to="/" className="text-purple-600 dark:text-purple-400 hover:underline">← Voltar para o login</Link>
        </p>
      </form>
    </div>
  );
}

function Step2({ email, onNext }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const refs = Array.from({ length: 6 }, () => useRef());

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleDigit(index, value) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) refs[index + 1].current?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Digite todos os 6 dígitos.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await apiVerify(email, code);
      onNext(data.resetToken);
    } catch {
      setError('Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Insira o código</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enviamos para <strong className="text-gray-700 dark:text-gray-300">{maskEmail(email)}</strong>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex gap-2 justify-center">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-xl font-bold rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-purple-500 transition"
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          {canResend ? (
            <button type="button" className="text-purple-600 dark:text-purple-400 hover:underline" onClick={() => { setCountdown(59); setCanResend(false); }}>
              Reenviar código
            </button>
          ) : (
            <span>Reenviar código em 00:{String(countdown).padStart(2, '0')}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md"
        >
          {loading ? 'Verificando...' : 'CONFIRMAR'}
        </button>
      </form>
    </div>
  );
}

function Step3({ resetToken }) {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (senha !== confirmar) { setError('As senhas não coincidem.'); return; }
    if (senha.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiReset(resetToken, senha);
      navigate('/?success=senha');
    } catch {
      setError('Token inválido ou expirado. Recomece o processo.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition';

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Nova senha</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Escolha uma nova senha segura.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nova senha</label>
          <div className="relative">
            <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" className={inputClass + ' pr-10'} />
            <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" tabIndex={-1}>{showSenha ? '🙈' : '👁️'}</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Confirmar nova senha</label>
          <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="••••••••" className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md"
        >
          {loading ? 'Salvando...' : 'SALVAR SENHA'}
        </button>
      </form>
    </div>
  );
}

export default function ForgotPassword({ darkMode, setDarkMode }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

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

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <img src="/logo.png" alt="StockFlow" className="w-16 h-16 mb-2 animate-float mix-blend-multiply dark:mix-blend-screen" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">StockFlow</h1>

        {step === 1 && (
          <Step1
            darkMode={darkMode}
            onNext={(em) => { setEmail(em); setStep(2); }}
          />
        )}
        {step === 2 && (
          <Step2
            email={email}
            onNext={(token) => { setResetToken(token); setStep(3); }}
          />
        )}
        {step === 3 && <Step3 resetToken={resetToken} />}
      </div>
    </div>
  );
}
