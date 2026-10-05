import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: '🏠' },
  { id: 'produtos', label: 'Produtos', icon: '📦' },
  { id: 'categorias', label: 'Categorias', icon: '🗂️' },
  { id: 'movimentacoes', label: 'Movimentações', icon: '🔄' },
  { id: 'relatorios', label: 'Relatórios', icon: '📊' },
];

const METRICS = [
  { label: 'Total de Produtos', value: '—', icon: '📦', color: 'from-purple-500 to-purple-700' },
  { label: 'Em Estoque', value: '—', icon: '✅', color: 'from-green-500 to-green-700' },
  { label: 'Estoque Baixo', value: '—', icon: '⚠️', color: 'from-yellow-500 to-yellow-600' },
  { label: 'Sem Estoque', value: '—', icon: '❌', color: 'from-red-500 to-red-700' },
];

export default function Dashboard({ darkMode, setDarkMode }) {
  const { user, logoutUser } = useAuth();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-950 transition-colors duration-300">

      {/* Sidebar */}
      <aside
        className="flex flex-col bg-white dark:bg-gray-900 shadow-lg transition-all duration-300 shrink-0"
        style={{ width: sidebarOpen ? '220px' : '64px' }}
      >
        {/* Logo sidebar */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <img src="/logo.png" alt="logo" className="w-8 h-8 shrink-0 mix-blend-multiply dark:mix-blend-screen" />
          {sidebarOpen && (
            <span className="font-bold text-gray-800 dark:text-white text-sm tracking-tight whitespace-nowrap">
              StockFlow
            </span>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${activeNav === item.id
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Botão recolher sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="m-3 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
          title={sidebarOpen ? 'Recolher' : 'Expandir'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
              {NAV_ITEMS.find(i => i.id === activeNav)?.label}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Bem-vindo, {user?.nome}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-lg"
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={logoutUser}
              className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 p-6 overflow-auto">

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {METRICS.map(metric => (
              <div
                key={metric.label}
                className={`bg-gradient-to-br ${metric.color} rounded-2xl p-4 text-white shadow-md`}
              >
                <div className="text-2xl mb-1">{metric.icon}</div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-xs opacity-80 mt-0.5">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Tabela de produtos */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Produtos</h2>
              <button className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">
                + Novo produto
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
              <span className="text-4xl mb-3">📦</span>
              <p className="text-sm">Nenhum produto cadastrado ainda.</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
