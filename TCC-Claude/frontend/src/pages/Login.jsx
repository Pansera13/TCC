import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../services/api';


function formatIdentifier(value) {
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

function isNumericInput(value) {
  return /^\d/.test(value.replace(/[\.\-\/]/g, ''));
}

export default function Login({ darkMode, setDarkMode }) {
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const retryTimerRef = useRef(null);
  // Aviso deixado por uma sessão encerrada (ex.: conta desativada)
  const [error, setError] = useState(() => {
    try {
      const aviso = sessionStorage.getItem('sf_aviso');
      sessionStorage.removeItem('sf_aviso');
      return aviso || '';
    } catch {
      return '';
    }
  });
  const [success, setSuccess] = useState('');
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const s = searchParams.get('success');
    if (s === 'cadastro') setSuccess('Conta criada com sucesso! Faça seu login.');
    if (s === 'senha') setSuccess('Senha alterada com sucesso! Faça seu login.');
  }, [searchParams]);

  function handleIdentifierChange(e) {
    const raw = e.target.value;
    if (!raw.includes('@') && isNumericInput(raw)) {
      setIdentifier(formatIdentifier(raw));
    } else {
      setIdentifier(raw);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !senha) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiLogin(identifier.trim(), senha);
      loginUser(data.token, data.nome, data.role, data.id, data.avatar_url, data.permissoes);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 429) {
        const seconds = err.response.data?.retry_after ?? 60;
        setRetryAfter(seconds);
        setError(err.response.data?.message || 'Muitas tentativas. Tente novamente mais tarde.');
        if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        retryTimerRef.current = setInterval(() => {
          setRetryAfter(prev => {
            if (prev <= 1) {
              clearInterval(retryTimerRef.current);
              retryTimerRef.current = null;
              setError('');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(err.response?.data?.message || 'Usuário ou senha inválidos.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-white to-[#E879F9]/30 dark:from-black dark:via-[#2e1065] dark:to-[#7C3AED] flex flex-col relative transition-colors duration-500">

      {/* Alternador dark/light */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-black/50 transition-all text-xl"
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Logo — entre topo da tela e o card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <img
          src="/logo.png"
          alt="StockFlow logo"
          className="w-24 h-24 mb-2 animate-float mix-blend-multiply dark:mix-blend-screen"
        />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
          StockFlow
        </h1>
      </div>

      {/* Card — centralizado na metade inferior */}
      <div className="flex-[2] flex flex-col items-center justify-start px-4 pb-8">
        <div className="w-full max-w-[456px] bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden flex flex-col items-center justify-center" style={{ paddingTop: '2.5cm', paddingBottom: '2.5cm', paddingLeft: '2.27cm', paddingRight: '2.27cm', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 8px 40px rgba(0,0,0,0.18)' }}>
          <div className="w-[332px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
            {/* Campo identificador */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                Empresa / CNPJ / CPF / E-mail
              </label>
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="Nome da empresa, CNPJ, CPF ou e-mail"
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              />
            </div>

            {/* Campo senha */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Links esqueci / cadastrar */}
            <div className="flex justify-between items-center text-sm">
              <Link
                to="/forgot-password"
                className="text-purple-600 dark:text-purple-400 hover:underline"
              >
                Esqueci minha senha
              </Link>
              <Link
                to="/register"
                className="text-purple-600 dark:text-purple-400 hover:underline"
              >
                Cadastrar-se
              </Link>
            </div>

            {/* Mensagens de feedback */}
            {success && <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>}
            {error && (
              <p className="text-sm text-red-500 text-center">
                {error}{retryAfter > 0 ? ` Aguarde ${retryAfter} segundos.` : ''}
              </p>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={loading || retryAfter > 0}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md mt-1"
            >
              {loading ? 'Entrando...' : retryAfter > 0 ? `Aguarde ${retryAfter}s` : 'ENTRAR'}
            </button>
          </form>
          </div>
        </div>
      </div>

    </div>
  );
}
