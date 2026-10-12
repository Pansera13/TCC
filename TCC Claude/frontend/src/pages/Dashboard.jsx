import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import WithdrawModal from '../components/WithdrawModal';
import AddUserModal from '../components/AddUserModal';
import ThemeToggle from '../components/ThemeToggle';
import api, { listMovements, listUsers, updateUserRole, toggleUserStatus } from '../services/api';

const ALL_NAV_ITEMS = [
  { id: 'dashboard',     label: 'Início',          icon: '🏠' },
  { id: 'produtos',      label: 'Produtos',         icon: '📦' },
  { id: 'categorias',    label: 'Categorias',       icon: '🗂️' },
  { id: 'movimentacoes', label: 'Movimentações',    icon: '🔄' },
  { id: 'equipe',        label: 'Equipe',           icon: '👥', adminOnly: true },
];

const LOW_STOCK_THRESHOLD = 3;

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ darkMode, setDarkMode }) {
  const { user, logoutUser, updateUser } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarRef = useRef(null);

  // Products
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [withdrawItem, setWithdrawItem] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');

  // Movements
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementsLoaded, setMovementsLoaded] = useState(false);

  // Users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);


  // Profile menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const profileRef = useRef(null);
  const photoInputRef = useRef(null);

  const navItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  const METRICS = [
    { label: 'Total de Produtos',  value: products.length || '—', icon: '📦', color: 'from-purple-500 to-purple-700' },
    { label: 'Em Estoque',         value: products.filter(p => p.quantidade > 0).length || '—', icon: '✅', color: 'from-green-500 to-green-700' },
    { label: 'Estoque Baixo',      value: products.filter(p => p.quantidade > 0 && p.quantidade <= LOW_STOCK_THRESHOLD).length || '—', icon: '⚠️', color: 'from-yellow-500 to-yellow-600' },
    { label: 'Sem Estoque',        value: products.filter(p => p.quantidade === 0).length || '—', icon: '❌', color: 'from-red-500 to-red-700' },
  ];

  async function fetchProducts() {
    setLoadingProducts(true);
    try {
      const { data } = await api.get('/api/products');
      setProducts(data);
    } catch {
      // silently fail
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchMovements() {
    setLoadingMovements(true);
    try {
      const { data } = await listMovements();
      setMovements(data);
      setMovementsLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoadingMovements(false);
    }
  }

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const { data } = await listUsers();
      setUsers(data);
      setUsersLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (activeNav === 'movimentacoes' && !movementsLoaded) fetchMovements();
  }, [activeNav]);

  useEffect(() => {
    if (activeNav === 'equipe' && !usersLoaded && isAdmin) fetchUsers();
  }, [activeNav]);

  // Abre o sidebar quando o cursor está nos primeiros 113px da borda esquerda (≈ 3 cm a 96 dpi)
  useEffect(() => {
    function handleMouseMove(e) {
      if (e.clientX <= 113) setSidebarVisible(true);
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
        setEditingName(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleToggleRole(u) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(u.id, newRole);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao atualizar cargo.');
    }
  }

  async function handleToggleStatus(u) {
    try {
      const { data } = await toggleUserStatus(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ativo: data.ativo } : x));
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao atualizar status.');
    }
  }

  async function handleSaveName() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await api.put('/api/profile', { nome: trimmed });
    } catch {
      // silently update locally if offline
    }
    updateUser({ nome: trimmed });
    setEditingName(false);
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateUser({ avatarUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ─── Renderers ──────────────────────────────────────────────────

  function renderInicio() {
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {METRICS.map(metric => (
            <div key={metric.label} className={`bg-gradient-to-br ${metric.color} rounded-2xl p-5 text-white shadow-md`}>
              <div className="text-2xl mb-2">{metric.icon}</div>
              <div className="text-3xl font-bold">{metric.value}</div>
              <div className="text-xs opacity-80 mt-1">{metric.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Visão geral dos produtos</h2>
            <button onClick={() => setActiveNav('produtos')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
              Gerenciar →
            </button>
          </div>
          {renderTabelaProdutos(false)}
        </div>
      </>
    );
  }

  function renderProdutos() {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Produtos</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
          >
            + Novo produto
          </button>
        </div>
        {renderTabelaProdutos(true)}
      </div>
    );
  }

  function renderTabelaProdutos(comAcoes) {
    if (loadingProducts) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3 animate-pulse">📦</span>
          <p className="text-sm">Carregando produtos…</p>
        </div>
      );
    }
    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3">📦</span>
          <p className="text-sm">Nenhum produto cadastrado ainda.</p>
          {comAcoes && (
            <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">
              + Adicionar primeiro produto
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Quantidade</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              {comAcoes && <th className="px-4 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{p.nome}</td>
                <td className="px-4 py-3">
                  <span className={
                    p.quantidade === 0
                      ? 'text-red-500 font-semibold'
                      : p.quantidade <= LOW_STOCK_THRESHOLD
                        ? 'text-yellow-500 font-semibold'
                        : 'text-gray-600 dark:text-gray-400'
                  }>
                    {p.quantidade}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.unidade}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-500">{p.categoria || '—'}</td>
                {comAcoes && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWithdrawItem(p)}
                        disabled={p.quantidade === 0}
                        className="px-4 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Retirar
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setEditProduct(p)}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCategorias() {
    const filtered = products.filter(p =>
      p.nome.toLowerCase().includes(search.toLowerCase().trim())
    );
    const grouped = filtered.reduce((acc, p) => {
      const cat = p.categoria || 'Sem Categoria';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
    const categorias = Object.keys(grouped).sort((a, b) =>
      a === 'Sem Categoria' ? 1 : b === 'Sem Categoria' ? -1 : a.localeCompare(b)
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            placeholder="Buscar produto por nome…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition">✕</button>
          )}
        </div>

        {loadingProducts ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-3 animate-pulse">🗂️</span>
            <p className="text-sm">Carregando…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm">Nenhum produto encontrado{search ? ` para "${search}"` : ''}.</p>
          </div>
        ) : (
          categorias.map(cat => (
            <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="text-base">🗂️</span>
                <h3 className="font-semibold text-sm text-gray-800 dark:text-white">{cat}</h3>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{grouped[cat].length} produto{grouped[cat].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-2.5 font-medium">Nome</th>
                      <th className="px-4 py-2.5 font-medium">Quantidade</th>
                      <th className="px-4 py-2.5 font-medium">Unidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {grouped[cat].map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{p.nome}</td>
                        <td className="px-4 py-2.5">
                          <span className={
                            p.quantidade === 0
                              ? 'text-red-500 font-semibold'
                              : p.quantidade <= LOW_STOCK_THRESHOLD
                                ? 'text-yellow-500 font-semibold'
                                : 'text-gray-600 dark:text-gray-400'
                          }>
                            {p.quantidade}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  function renderMovimentacoes() {
    if (loadingMovements) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3 animate-pulse">🔄</span>
          <p className="text-sm">Carregando movimentações…</p>
        </div>
      );
    }
    if (movements.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3">🔄</span>
          <p className="text-sm">Nenhuma movimentação registrada ainda.</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 font-medium">Data / Hora</th>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Quantidade</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {movements.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(m.created_at)}</td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{m.product_nome}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                    ${m.tipo === 'entrada'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.quantidade}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{m.user_nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderEquipe() {
    return (
      <>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Membros da equipe</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              + Adicionar membro
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
              <span className="text-4xl mb-3 animate-pulse">👥</span>
              <p className="text-sm">Carregando…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Cargo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        {u.nome}
                        {u.id === user?.id && <span className="ml-1.5 text-xs text-gray-400">(você)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium
                          ${u.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${u.ativo ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.id !== user?.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleRole(u)}
                              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition whitespace-nowrap"
                            >
                              {u.role === 'admin' ? 'Tornar Operador' : 'Tornar Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-4 py-2 text-sm rounded-lg border transition whitespace-nowrap
                                ${u.ativo
                                  ? 'border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                }`}
                            >
                              {u.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── Active nav label ────────────────────────────────────────────
  const activeLabel = ALL_NAV_ITEMS.find(i => i.id === activeNav)?.label || 'Dashboard';

  // ─── Sidebar hover trigger zone (16px strip on the left edge) ───
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors duration-300 relative">

      {/* Sidebar — slides in from the left */}
      <aside
        ref={sidebarRef}
        onMouseLeave={() => { setSidebarVisible(false); setShowProfileMenu(false); setEditingName(false); }}
        className={`fixed left-0 top-0 h-full z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-100 dark:border-gray-800 transition-transform duration-300 w-56
          ${sidebarVisible ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <img src="/logo.png" alt="logo" className="w-8 h-8 shrink-0 mix-blend-multiply dark:mix-blend-screen" />
          <span className="font-bold text-gray-800 dark:text-white text-sm tracking-tight">StockFlow</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); setSidebarVisible(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all text-left
                ${activeNav === item.id
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom links */}
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1">
          <a
            href="https://linkedin.com/in/lucas-pansera-a80b92320"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <span className="text-base">💼</span><span>LinkedIn</span>
          </a>
          <a
            href="https://github.com/Pansera13/TCC"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <span className="text-base">🐙</span><span>GitHub</span>
          </a>
        </div>

        {/* Profile area */}
        <div className="px-3 pb-4" ref={profileRef}>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <button
            onClick={() => { setShowProfileMenu(v => !v); setEditingName(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600 overflow-hidden shrink-0 flex items-center justify-center">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-white text-sm font-bold">{user?.nome?.[0]?.toUpperCase() || '?'}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{user?.nome}</p>
              <p className="text-xs text-gray-400">{isAdmin ? 'Admin' : 'Operador'}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
              {editingName ? (
                <div className="px-3 py-2 flex flex-col gap-2">
                  <input
                    autoFocus
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:border-purple-500"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                    placeholder="Novo nome"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => setEditingName(false)} className="flex-1 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">Cancelar</button>
                    <button onClick={handleSaveName} className="flex-1 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition">Salvar</button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                  >
                    📷 Alterar foto
                  </button>
                  <button
                    onClick={() => { setNewName(user?.nome || ''); setEditingName(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                  >
                    ✏️ Alterar nome
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={logoutUser}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
                  >
                    🚪 Sair da conta
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop when sidebar is open — clique fora para fechar */}
      {sidebarVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => { setSidebarVisible(false); setShowProfileMenu(false); setEditingName(false); }}
        />
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger trigger */}
            <button
              onClick={() => setSidebarVisible(v => !v)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg shrink-0"
              title="Menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">{activeLabel}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Bem-vindo, {user?.nome}</p>
            </div>
          </div>
          <div className="flex items-center shrink-0" style={{ marginRight: '1.5cm' }}>
            <ThemeToggle isDark={darkMode} onToggle={() => setDarkMode(d => !d)} />
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ paddingLeft: '3cm', paddingRight: '3cm', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
          <div className="flex flex-col gap-4">
            {activeNav === 'dashboard'     && renderInicio()}
            {activeNav === 'produtos'      && renderProdutos()}
            {activeNav === 'categorias'    && renderCategorias()}
            {activeNav === 'movimentacoes' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Histórico de Movimentações</h2>
                  <button onClick={fetchMovements} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">Atualizar</button>
                </div>
                {renderMovimentacoes()}
              </div>
            )}
            {activeNav === 'equipe' && isAdmin && renderEquipe()}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onProductsAdded={() => { fetchProducts(); setMovementsLoaded(false); }}
        />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={fetchProducts}
        />
      )}
      {withdrawItem && (
        <WithdrawModal
          product={withdrawItem}
          onClose={() => setWithdrawItem(null)}
          onWithdrawn={() => { fetchProducts(); setMovementsLoaded(false); }}
        />
      )}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onUserAdded={fetchUsers}
        />
      )}
    </div>
  );
}
