import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../services/api';

const GITHUB_URL = 'https://github.com/Pansera13/TCC';
const LINKEDIN_URL = 'https://www.linkedin.com/in/lucas-pansera-a80b92320/';
const WHATSAPP_URL = 'https://wa.me/5546991219170';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const s = searchParams.get('success');
    if (s === 'cadastro') setSuccess('Conta criada com sucesso! Faça seu login.');
    if (s === 'senha') setSuccess('Senha alterada com sucesso! Faça seu login.');
  }, [searchParams]);

  function handleIdentifierChange(e) {
    const raw = e.target.value;
    if (isNumericInput(raw)) {
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
      loginUser(data.token, data.nome);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Usuário ou senha inválidos.');
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
                Empresa / CNPJ / CPF
              </label>
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="Nome da empresa, CNPJ ou CPF"
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
                Esqueci a senha
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
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 transition-all shadow-md mt-1"
            >
              {loading ? 'Entrando...' : 'ENTRAR'}
            </button>
          </form>
          </div>
        </div>
      </div>

      {/* Rodapé social */}
      <div className="flex gap-4 p-6">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" title="GitHub" className="group">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition shadow">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-700 dark:fill-gray-200">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.298 24 12 24 5.37 18.627 0 12 0z"/>
            </svg>
          </div>
        </a>

        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" title="LinkedIn" className="group">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition shadow">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-600 dark:fill-blue-400">
              <path d="M20.447 20.452H17.21v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.987V9h3.102v1.561h.046c.432-.818 1.489-1.681 3.065-1.681 3.276 0 3.881 2.155 3.881 4.959v6.613zM5.337 7.433a1.8 1.8 0 1 1 0-3.601 1.8 1.8 0 0 1 0 3.601zM6.891 20.452H3.78V9h3.111v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
        </a>

        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" title="WhatsApp" className="group">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition shadow">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
          </div>
        </a>
      </div>
    </div>
  );
}
