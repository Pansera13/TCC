import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import WithdrawModal from '../components/WithdrawModal';
import AddUserModal from '../components/AddUserModal';
import ThemeToggle from '../components/ThemeToggle';
import Pagination from '../components/Pagination';
import MovementsHistory from '../components/MovementsHistory';
import { groupProductsByCategory, paginate } from '../utils/products';
import api, { listUsers, updateUserRole, toggleUserStatus, deleteUser } from '../services/api';
import { supabase } from '../supabaseClient';

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
  const [layoutProdutos, setLayoutProdutos] = useState(() => localStorage.getItem('sf_layout') || 'lista');
  const [tamanhoLayout, setTamanhoLayout] = useState(() => localStorage.getItem('sf_tamanho') || 'm');
  const [categoriasAbertas, setCategoriasAbertas] = useState(new Set());
  const [pagePorCategoria, setPagePorCategoria] = useState({});
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutMenuRef = useRef(null);

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

  // Sincroniza avatar com o banco ao abrir o dashboard
  useEffect(() => {
    api.get('/api/profile').then(({ data }) => {
      if (data.avatar_url && data.avatar_url !== user?.avatarUrl) {
        updateUser({ avatarUrl: data.avatar_url });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, ({ new: updated }) => {
        setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, ({ new: inserted }) => {
        setProducts(prev => [...prev, inserted]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, ({ old: deleted }) => {
        setProducts(prev => prev.filter(p => p.id !== deleted.id));
      })
      .subscribe((status) => {
        console.log('[Supabase Realtime] status:', status);
      });

    const poll = setInterval(fetchProducts, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (activeNav === 'equipe' && !usersLoaded && isAdmin) fetchUsers();
  }, [activeNav]);


  // Abre o sidebar quando o cursor está nos primeiros 113px da borda esquerda (≈ 3 cm a 96 dpi).
  // A faixa de baixo (90px) fica de fora para não disparar ao se aproximar dos botões GitHub/LinkedIn.
  useEffect(() => {
    function handleMouseMove(e) {
      if (e.clientX <= 113 && e.clientY < window.innerHeight - 90) setSidebarVisible(true);
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Esconde os botões sociais (sem colisão) enquanto o sidebar está aberto
  useEffect(() => {
    document.documentElement.toggleAttribute('data-sidebar-open', sidebarVisible);
    return () => document.documentElement.removeAttribute('data-sidebar-open');
  }, [sidebarVisible]);

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

  // Close layout menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target)) {
        setShowLayoutMenu(false);
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

  async function handleDeleteUser(u) {
    if (!window.confirm(`Remover "${u.nome}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao remover usuário.');
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
    e.target.value = '';

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      const MAX = 240;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const base64 = canvas.toDataURL('image/jpeg', 0.82);
      updateUser({ avatarUrl: base64 });
      try {
        await api.put('/api/profile', { avatar_url: base64 });
      } catch {
        // salvo localmente mesmo se a API falhar
      }
    };
    img.src = objectUrl;
  }

  // ─── Renderers ──────────────────────────────────────────────────

  function renderInicio() {
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {METRICS.map(metric => (
            metric.label === 'Sem Estoque'
              ? (
                <button
                  key={metric.label}
                  onClick={() => setActiveNav('sem-estoque')}
                  className={`bg-gradient-to-br ${metric.color} rounded-2xl p-5 text-white shadow-md text-left cursor-pointer hover:opacity-90 transition-opacity`}
                >
                  <div className="text-2xl mb-2">{metric.icon}</div>
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <div className="text-xs opacity-80 mt-1">{metric.label}</div>
                </button>
              )
              : (
                <div key={metric.label} className={`bg-gradient-to-br ${metric.color} rounded-2xl p-5 text-white shadow-md`}>
                  <div className="text-2xl mb-2">{metric.icon}</div>
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <div className="text-xs opacity-80 mt-1">{metric.label}</div>
                </div>
              )
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 w-full lg:w-1/2" style={{ marginInline: 'auto' }}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Visão geral dos produtos</h2>
            <button onClick={() => setActiveNav('produtos')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
              Gerenciar →
            </button>
          </div>
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
              <span className="text-3xl mb-2 animate-pulse">📦</span>
              <p className="text-sm">Carregando…</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
              <span className="text-3xl mb-2">📦</span>
              <p className="text-sm">Nenhum produto cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Qtd.</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Un.</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Categoria</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Fornecedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{p.nome}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={parseFloat(p.quantidade) === 0 ? 'text-red-500 font-semibold' : parseFloat(p.quantidade) <= LOW_STOCK_THRESHOLD ? 'text-yellow-500 font-semibold' : 'text-gray-600 dark:text-gray-400'}>{parseFloat(p.quantidade)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{p.unidade}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-500">{p.categoria || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-500">{p.fornecedor || '—'}</td>
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

  function renderSemEstoque() {
    const esgotados = products
      .filter(p => parseFloat(p.quantidade) === 0)
      .sort((a, b) => (a.categoria || 'Sem Categoria').localeCompare(b.categoria || 'Sem Categoria'));

    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Produtos Esgotados</h2>
            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({esgotados.length})</span>
          </div>
          <button onClick={() => setActiveNav('dashboard')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
            ← Voltar ao Início
          </button>
        </div>

        {esgotados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-3">✅</span>
            <p className="text-sm">Nenhum produto esgotado no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {esgotados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{p.nome}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-500">{p.categoria || 'Sem Categoria'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderProdutos() {
    const { grouped, categorias } = groupProductsByCategory(products, search);
    const filtered = categorias.flatMap(cat => grouped[cat]);

    // Buscar volta todas as categorias para a página 1
    const buscar = (valor) => { setSearch(valor); setPagePorCategoria({}); };

    // Página atual de uma categoria (limitada ao intervalo válido, também quando o Realtime encolhe a lista)
    const paginaDe = (cat) => paginate(grouped[cat], pagePorCategoria[cat] ?? 1);
    const irParaPagina = (cat, page) => setPagePorCategoria(prev => ({ ...prev, [cat]: page }));
    const rodapePaginacao = (cat, className) => {
      const { page, totalPages } = paginaDe(cat);
      return <Pagination page={page} totalPages={totalPages} onChange={n => irParaPagina(cat, n)} className={className} />;
    };

    // Tamanho por layout
    const SZ = {
      p: {
        tablePy: 'py-1',    tableText: 'text-xs',
        gradeCols: 'grid-cols-4 lg:grid-cols-5',
        gradeP: 'p-3',      gradeNome: 'text-xs',   gradeQty: 'text-lg',
        compactoCols: 'grid-cols-5 lg:grid-cols-7',
        compactoP: 'p-2',   compactoNome: 'text-xs', compactoQty: 'text-sm',
      },
      m: {
        tablePy: 'py-2.5',  tableText: 'text-sm',
        gradeCols: 'grid-cols-3 lg:grid-cols-4',
        gradeP: 'p-4',      gradeNome: 'text-sm',   gradeQty: 'text-xl',
        compactoCols: 'grid-cols-3 lg:grid-cols-5',
        compactoP: 'p-3',   compactoNome: 'text-xs', compactoQty: 'text-base',
      },
      g: {
        tablePy: 'py-4',    tableText: 'text-base',
        gradeCols: 'grid-cols-2 lg:grid-cols-3',
        gradeP: 'p-5',      gradeNome: 'text-base',  gradeQty: 'text-2xl',
        compactoCols: 'grid-cols-3 lg:grid-cols-4',
        compactoP: 'p-4',   compactoNome: 'text-sm', compactoQty: 'text-lg',
      },
    };
    const sz = SZ[tamanhoLayout];

    function qtyClass(p) {
      if (parseFloat(p.quantidade) === 0) return 'text-red-500 font-semibold';
      if (parseFloat(p.quantidade) <= LOW_STOCK_THRESHOLD) return 'text-yellow-500 font-semibold';
      return 'text-gray-600 dark:text-gray-400';
    }

    function toggleCategoria(cat) {
      setCategoriasAbertas(prev => {
        const next = new Set(prev);
        if (next.has(cat)) next.delete(cat); else next.add(cat);
        return next;
      });
    }

    const cabecalhoTabela = (
      <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
        <th className={`px-4 ${sz.tablePy} font-medium`}>Nome</th>
        <th className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap`}>Qtd.</th>
        <th className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap`}>Un.</th>
        <th className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap`}>Fornecedor</th>
        <th className={`px-4 ${sz.tablePy} font-medium`}></th>
      </tr>
    );

    const linhasTabela = (prods) => prods.map(p => (
      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td className={`px-4 ${sz.tablePy} font-medium ${sz.tableText} text-gray-800 dark:text-gray-200`}>{p.nome}</td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap`}>
          <span className={`${sz.tableText} ${qtyClass(p)}`}>{parseFloat(p.quantidade)}</span>
        </td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap ${sz.tableText} text-gray-600 dark:text-gray-400`}>{p.unidade}</td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap ${sz.tableText} text-gray-500 dark:text-gray-500`}>{p.fornecedor || '—'}</td>
        <td className={`px-4 ${sz.tablePy}`}>
          <div className="flex gap-1.5">
            <button onClick={() => setWithdrawItem(p)} disabled={parseFloat(p.quantidade) === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
              Retirar
            </button>
            {isAdmin && (
              <button onClick={() => setEditProduct(p)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                Editar
              </button>
            )}
          </div>
        </td>
      </tr>
    ));

    const catLabel = (cat, count) => (
      <div className="flex items-center gap-2 px-1 mb-2">
        <span>🗂️</span>
        <h3 className="font-semibold text-sm text-gray-800 dark:text-white">{cat}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{count} produto{count !== 1 ? 's' : ''}</span>
      </div>
    );

    // ── Layout: Lista — única tabela, colunas alinhadas entre categorias ─
    function renderLista() {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>{cabecalhoTabela}</thead>
              <tbody>
                {categorias.flatMap(cat => [
                  <tr key={`hdr-${cat}`} className="bg-gray-50/80 dark:bg-gray-800/60 border-t-2 border-gray-100 dark:border-gray-700">
                    <td colSpan={5} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🗂️</span>
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{cat}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{grouped[cat].length} produto{grouped[cat].length !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                  </tr>,
                  ...linhasTabela(paginaDe(cat).items),
                  ...(paginaDe(cat).totalPages > 1 ? [
                    <tr key={`pg-${cat}`}>
                      <td colSpan={5}>{rodapePaginacao(cat)}</td>
                    </tr>,
                  ] : []),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── Layout: Acordeão ───────────────────────────────────────────
    function renderAcordeao() {
      const aberta = categorias.find(cat => categoriasAbertas.has(cat));
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {categorias.map(cat => {
              const open = categoriasAbertas.has(cat);
              const prods = grouped[cat];
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategoria(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                    open
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                >
                  <span>🗂️</span>
                  <span>{cat}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${open ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                    {prods.length}
                  </span>
                  <span className="ml-0.5 text-xs opacity-60">{open ? '▲' : '▼'}</span>
                </button>
              );
            })}
          </div>

          {categorias.filter(cat => categoriasAbertas.has(cat)).map(cat => (
            <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="text-sm">🗂️</span>
                <span className="font-semibold text-sm text-gray-800 dark:text-white">{cat}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{grouped[cat].length} produto{grouped[cat].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>{cabecalhoTabela}</thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">{linhasTabela(paginaDe(cat).items)}</tbody>
                </table>
              </div>
              {rodapePaginacao(cat, 'border-t border-gray-100 dark:border-gray-800')}
            </div>
          ))}
        </div>
      );
    }

    // ── Layout: Grade (cartões completos) ──────────────────────────
    function renderGrade() {
      return categorias.map(cat => (
        <div key={cat} className="flex flex-col gap-3">
          {catLabel(cat, grouped[cat].length)}
          <div className={`grid ${sz.gradeCols} gap-3`}>
            {paginaDe(cat).items.map(p => (
              <div key={p.id} className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 ${sz.gradeP} flex flex-col gap-2`}>
                <p className={`font-semibold ${sz.gradeNome} text-gray-800 dark:text-gray-100 leading-snug`}>{p.nome}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`${sz.gradeQty} font-bold tabular-nums ${qtyClass(p)}`}>{parseFloat(p.quantidade)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{p.unidade}</span>
                </div>
                {p.fornecedor && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.fornecedor}</p>}
                <div className="flex gap-1.5 mt-auto pt-1">
                  <button onClick={() => setWithdrawItem(p)} disabled={parseFloat(p.quantidade) === 0}
                    className="flex-1 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    Retirar
                  </button>
                  {isAdmin && (
                    <button onClick={() => setEditProduct(p)}
                      className="flex-1 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                      Editar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {rodapePaginacao(cat)}
        </div>
      ));
    }

    // ── Layout: Compacto (mini cartões lado a lado) ────────────────
    function renderCompacto() {
      return categorias.map(cat => (
        <div key={cat} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{cat}</span>
            <div className="flex-1 h-px bg-purple-200 dark:bg-purple-900/40" />
            <span className="text-xs text-gray-400 dark:text-gray-500">{grouped[cat].length}</span>
          </div>
          <div className={`grid ${sz.compactoCols} gap-2`}>
            {paginaDe(cat).items.map(p => (
              <div key={p.id} className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 ${sz.compactoP} flex flex-col items-center text-center gap-1.5`}>
                <p className={`font-semibold ${sz.compactoNome} text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 w-full`}>{p.nome}</p>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className={`${sz.compactoQty} font-bold tabular-nums ${qtyClass(p)}`}>{parseFloat(p.quantidade)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{p.unidade}</span>
                </div>
                <div className="flex gap-1 w-full mt-0.5">
                  <button onClick={() => setWithdrawItem(p)} disabled={parseFloat(p.quantidade) === 0}
                    className="flex-1 py-1 text-xs rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    −
                  </button>
                  {isAdmin && (
                    <button onClick={() => setEditProduct(p)}
                      className="flex-1 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {rodapePaginacao(cat)}
        </div>
      ));
    }

    const LAYOUTS = [
      { id: 'lista',    icon: '☰', label: 'Lista',    desc: 'Tabela por categoria' },
      { id: 'acordeao', icon: '⊟', label: 'Acordeão', desc: 'Recolher/expandir' },
      { id: 'grade',    icon: '⊞', label: 'Grade',    desc: 'Cartões grandes' },
      { id: 'compacto', icon: '▦', label: 'Compacto', desc: 'Mini cartões' },
    ];

    const TAMANHOS = [
      { id: 'p', label: 'Pequeno' },
      { id: 'm', label: 'Médio' },
      { id: 'g', label: 'Grande' },
    ];

    const conteudo =
      layoutProdutos === 'acordeao' ? renderAcordeao() :
      layoutProdutos === 'grade'    ? renderGrade()    :
      layoutProdutos === 'compacto' ? renderCompacto() :
      renderLista();

    const layoutAtual = LAYOUTS.find(l => l.id === layoutProdutos);

    return (
      <div className="flex flex-col gap-4 w-full lg:w-1/2" style={{ marginInline: 'auto' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3 flex-1 min-w-0">
            <span className="text-gray-400 text-lg">🔍</span>
            <input
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 min-w-0"
              placeholder="Buscar produto por nome…"
              value={search}
              onChange={e => buscar(e.target.value)}
            />
            {search && (
              <button onClick={() => buscar('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition shrink-0">✕</button>
            )}
          </div>

          {/* Layout selector button */}
          <div className="relative shrink-0" ref={layoutMenuRef}>
            <button
              onClick={() => setShowLayoutMenu(v => !v)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:border-purple-400 dark:hover:border-purple-500 shadow-sm transition"
            >
              <span>{layoutAtual?.icon}</span>
              <span className="font-medium">{layoutAtual?.label}</span>
              <span className="text-gray-400 text-xs ml-0.5">{showLayoutMenu ? '▲' : '▼'}</span>
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 top-full mt-2 z-20 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 w-72">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Visualização</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {LAYOUTS.map(l => (
                    <button key={l.id}
                      onClick={() => { setLayoutProdutos(l.id); localStorage.setItem('sf_layout', l.id); }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
                        layoutProdutos === l.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}>
                      <span className="text-lg shrink-0">{l.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs">{l.label}</p>
                        <p className="text-xs opacity-60 truncate">{l.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Tamanho</p>
                  <div className="flex gap-2">
                    {TAMANHOS.map(t => (
                      <button key={t.id}
                        onClick={() => { setTamanhoLayout(t.id); localStorage.setItem('sf_tamanho', t.id); }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition ${
                          tamanhoLayout === t.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* New product */}
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium whitespace-nowrap shrink-0">
            + Novo produto
          </button>
        </div>

        {/* Conteúdo */}
        {loadingProducts ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-3 animate-pulse">📦</span>
            <p className="text-sm">Carregando produtos…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-3">📦</span>
            <p className="text-sm">{search ? `Nenhum produto encontrado para "${search}".` : 'Nenhum produto cadastrado ainda.'}</p>
            {!search && (
              <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium">
                + Adicionar primeiro produto
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">{conteudo}</div>
        )}
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
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">Quantidade</th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">Unidade</th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">Fornecedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {grouped[cat].map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{p.nome}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={parseFloat(p.quantidade) === 0 ? 'text-red-500 font-semibold' : parseFloat(p.quantidade) <= LOW_STOCK_THRESHOLD ? 'text-yellow-500 font-semibold' : 'text-gray-600 dark:text-gray-400'}>{parseFloat(p.quantidade)}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{p.unidade}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-500 dark:text-gray-500">{p.fornecedor || '—'}</td>
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
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-4 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition whitespace-nowrap"
                            >
                              Remover
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
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-white via-white to-[#E879F9]/30 dark:from-black dark:via-[#2e1065] dark:to-[#7C3AED] transition-colors duration-500 relative">

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

        {/* Social links */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <a href="https://github.com/Pansera13/TCC" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-xs font-medium">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-current">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.298 24 12 24 5.37 18.627 0 12 0z"/>
            </svg>
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/lucas-pansera-a80b92320/" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-xs font-medium">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-current">
              <path d="M20.447 20.452H17.21v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.987V9h3.102v1.561h.046c.432-.818 1.489-1.681 3.065-1.681 3.276 0 3.881 2.155 3.881 4.959v6.613zM5.337 7.433a1.8 1.8 0 1 1 0-3.601 1.8 1.8 0 0 1 0 3.601zM6.891 20.452H3.78V9h3.111v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
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

        <main className="flex-1 overflow-auto px-3 sm:px-[3cm] pt-4 sm:pt-6 pb-4 sm:pb-6">
          <div className="flex flex-col gap-4">
            {activeNav === 'dashboard'     && renderInicio()}
            {activeNav === 'produtos'      && renderProdutos()}
            {activeNav === 'categorias'    && <div className="w-full lg:w-1/2" style={{ marginInline: 'auto' }}>{renderCategorias()}</div>}
            {activeNav === 'movimentacoes' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 w-full lg:w-1/2" style={{ marginInline: 'auto' }}>
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Histórico de Movimentações</h2>
                </div>
                <MovementsHistory />
              </div>
            )}
            {activeNav === 'sem-estoque' && <div className="w-full lg:w-1/2" style={{ marginInline: 'auto' }}>{renderSemEstoque()}</div>}
            {activeNav === 'equipe' && isAdmin && <div className="w-full lg:w-1/2" style={{ marginInline: 'auto' }}>{renderEquipe()}</div>}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showModal && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onProductsAdded={fetchProducts}
          categories={[...new Set(products.map(p => p.categoria).filter(Boolean))].sort()}
        />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={fetchProducts}
          categories={[...new Set(products.map(p => p.categoria).filter(Boolean))].sort()}
        />
      )}
      {withdrawItem && (
        <WithdrawModal
          product={withdrawItem}
          onClose={() => setWithdrawItem(null)}
          onWithdrawn={(qty) => {
              setProducts(prev => prev.map(p =>
                p.id === withdrawItem.id ? { ...p, quantidade: parseFloat(p.quantidade) - qty } : p
              ));
            }}
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
