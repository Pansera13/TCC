import ReCAPTCHA from 'react-google-recaptcha';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  buscarContaRecuperacao, enviarCodigoRecuperacao, verificarCodigoRecuperacao, redefinirSenhaRecuperacao,
} from '../services/api';

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition';
const botaoClass = 'w-full py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md';
const cardClass = 'w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8';

const mensagemDe = (err, padrao) => err.response?.data?.message || padrao;

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

// Passo 1: e-mail de login ou CPF/CNPJ
function Buscar({ darkMode, onNext }) {
  const [identificador, setIdentificador] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaRef = useRef();
  const hasSiteKey = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  function handleChange(e) {
    const raw = e.target.value;
    const soNumeros = !raw.includes('@') && /^[\d.\-/\s]*$/.test(raw);
    setIdentificador(soNumeros ? formatCpfCnpj(raw) : raw);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!identificador.trim()) { setError('Informe o e-mail de login ou o CPF/CNPJ.'); return; }
    setLoading(true);
    try {
      const { data } = await buscarContaRecuperacao(identificador.trim(), recaptchaToken);
      onNext(data);
    } catch (err) {
      setError(mensagemDe(err, 'Erro ao processar. Tente novamente.'));
      recaptchaRef.current?.reset();
      setRecaptchaToken('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cardClass}>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Esqueci minha senha</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Informe o e-mail de login ou o CPF/CNPJ da conta.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">E-mail de login ou CPF/CNPJ</label>
          <input value={identificador} onChange={handleChange} placeholder="seu@email.com ou 000.000.000-00" className={inputClass} />
        </div>
        {hasSiteKey && (
          <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={setRecaptchaToken}
              onExpired={() => setRecaptchaToken('')}
              theme={darkMode ? 'dark' : 'light'}
            />
          </div>
        )}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button type="submit" disabled={loading || (hasSiteKey && !recaptchaToken)} className={botaoClass}>
          {loading ? 'Buscando...' : 'Buscar conta'}
        </button>
        <p className="text-center text-sm">
          <Link to="/" className="text-purple-600 dark:text-purple-400 hover:underline">← Voltar para o login</Link>
        </p>
      </form>
    </div>
  );
}

// Passo 2: confirmar a conta (dados mascarados) antes de enviar o código
function Confirmar({ busca, onVoltar, onEnviado }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function enviar() {
    setLoading(true);
    setError('');
    try {
      const { data } = await enviarCodigoRecuperacao(busca.busca_token);
      onEnviado(data.reenvio_em ?? 60);
    } catch (err) {
      setError(mensagemDe(err, 'Não foi possível enviar o código. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cardClass}>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Essa é a conta correta?</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Conta de <strong className="text-gray-700 dark:text-gray-300">{busca.nome_mascarado}</strong>.
        Vamos enviar um código para <strong className="text-gray-700 dark:text-gray-300">{busca.email_mascarado}</strong>.
      </p>
      {error && <p className="text-sm text-red-500 text-center mb-4">{error}</p>}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={enviar} disabled={loading} className={botaoClass}>
          {loading ? 'Enviando...' : 'Sim, enviar código'}
        </button>
        <button type="button" onClick={onVoltar} disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          Não, voltar
        </button>
      </div>
    </div>
  );
}

// Passo 3: código de 6 dígitos, com reenvio após 60 s
function Codigo({ busca, esperaInicial, onNext }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(esperaInicial);
  const [reenviando, setReenviando] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleDigit(index, value) {
    const limpo = value.replace(/\D/g, '');
    if (limpo.length > 1) { // colar o código inteiro
      setDigits(Array.from({ length: 6 }, (_, i) => limpo[i] || ''));
      refs.current[Math.min(limpo.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = limpo;
    setDigits(next);
    if (limpo && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const codigo = digits.join('');
    if (codigo.length < 6) { setError('Digite todos os 6 dígitos.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await verificarCodigoRecuperacao(busca.busca_token, codigo);
      onNext(data.reset_token);
    } catch (err) {
      const restantes = err.response?.data?.tentativas_restantes;
      let msg = mensagemDe(err, 'Código inválido ou expirado.');
      if (restantes === 0) msg += ' Peça um novo código.';
      else if (typeof restantes === 'number') msg += ` Restam ${restantes} ${restantes === 1 ? 'tentativa' : 'tentativas'}.`;
      setError(msg);
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function reenviar() {
    setReenviando(true);
    setError('');
    try {
      const { data } = await enviarCodigoRecuperacao(busca.busca_token);
      setCountdown(data.reenvio_em ?? 60);
      setDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(mensagemDe(err, 'Não foi possível reenviar o código.'));
      if (err.response?.data?.retry_after) setCountdown(err.response.data.retry_after);
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className={cardClass}>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Insira o código</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enviamos um código para <strong className="text-gray-700 dark:text-gray-300">{busca.email_mascarado}</strong>. Ele vale por 15 minutos.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex gap-2 justify-center">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              aria-label={`Dígito ${i + 1}`}
              className="w-11 h-12 text-center text-xl font-bold rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-purple-500 transition"
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          {countdown > 0 ? (
            <span>Reenviar código em 00:{String(countdown).padStart(2, '0')}</span>
          ) : (
            <button type="button" disabled={reenviando} onClick={reenviar} className="text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-60">
              {reenviando ? 'Reenviando...' : 'Reenviar código'}
            </button>
          )}
        </div>
        <button type="submit" disabled={loading} className={botaoClass}>
          {loading ? 'Verificando...' : 'CONFIRMAR'}
        </button>
      </form>
    </div>
  );
}

// Passo 4: nova senha
function NovaSenha({ resetToken, onExpirou }) {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (senha.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    if (senha !== confirmar) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    setError('');
    try {
      await redefinirSenhaRecuperacao(resetToken, senha);
      navigate('/?success=senha');
    } catch (err) {
      setError(mensagemDe(err, 'Não foi possível salvar a senha.'));
      if (err.response?.status === 400 && !err.response?.data?.field) setTimeout(onExpirou, 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cardClass}>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Nova senha</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Escolha uma nova senha com pelo menos 8 caracteres.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nova senha</label>
          <div className="relative">
            <input type={showSenha ? 'text' : 'password'} autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" className={inputClass + ' pr-10'} />
            <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" tabIndex={-1}>{showSenha ? '🙈' : '👁️'}</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Confirmar nova senha</label>
          <input type="password" autoComplete="new-password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="••••••••" className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button type="submit" disabled={loading} className={botaoClass}>
          {loading ? 'Salvando...' : 'SALVAR SENHA'}
        </button>
      </form>
    </div>
  );
}

export default function ForgotPassword({ darkMode, setDarkMode }) {
  const [step, setStep] = useState(1);
  const [busca, setBusca] = useState(null);
  const [espera, setEspera] = useState(60);
  const [resetToken, setResetToken] = useState('');

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-white to-[#E879F9]/30 dark:from-black dark:via-[#2e1065] dark:to-[#7C3AED] flex flex-col relative transition-colors duration-500">
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">StockFlow</h1>

        {step === 1 && <Buscar darkMode={darkMode} onNext={(dados) => { setBusca(dados); setStep(2); }} />}
        {step === 2 && (
          <Confirmar
            busca={busca}
            onVoltar={() => { setBusca(null); setStep(1); }}
            onEnviado={(seg) => { setEspera(seg); setStep(3); }}
          />
        )}
        {step === 3 && <Codigo busca={busca} esperaInicial={espera} onNext={(token) => { setResetToken(token); setStep(4); }} />}
        {step === 4 && <NovaSenha resetToken={resetToken} onExpirou={() => { setBusca(null); setResetToken(''); setStep(1); }} />}
      </div>
    </div>
  );
}
