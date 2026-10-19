import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';
import WithdrawModal from '../components/WithdrawModal';
import AddUserModal from '../components/AddUserModal';
import TopNav from '../components/TopNav';
import Pagination from '../components/Pagination';
import MovementsHistory from '../components/MovementsHistory';
import Reports from '../components/Reports';
import { groupProductsByCategory, paginate, TABLE_PAGE_SIZE } from '../utils/products';
import { useFitRows } from '../utils/useFitRows';
import SortTh from '../components/SortTh';
import { ROLES, isGestor, podeGerenciar, cargosAtribuiveis, corCargo } from '../utils/roles';
import { sortRows, proximaOrdem } from '../utils/sort';
import { zebra, TABLE_WRAP } from '../utils/tables';
import api, { listUsers, updateUserRole, toggleUserStatus, deleteUser } from '../services/api';
import { supabase } from '../supabaseClient';

const ALL_NAV_ITEMS = [
  { id: 'dashboard',     label: 'Início',          icon: '🏠' },
  { id: 'produtos',      label: 'Produtos',         icon: '📦' },
  { id: 'movimentacoes', label: 'Movimentações',    icon: '🔄' },
  { id: 'relatorios',     label: 'Relatórios',       icon: '📊' },
  { id: 'equipe',        label: 'Equipe',           icon: '👥', adminOnly: true },
];

const LOW_STOCK_THRESHOLD = 3;

const fmtPeso = (p) => (p.peso_kg === null || p.peso_kg === undefined || p.peso_kg === '' ? '—' : Number(p.peso_kg).toLocaleString('pt-BR', { maximumFractionDigits: 3 }));
const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ darkMode, setDarkMode }) {
  const { user, logoutUser, updateUser } = useAuth();
  // Funções de gestão: administrador e sócio
  const isAdmin = isGestor(user?.role);

  const [activeNav, setActiveNav] = useState('dashboard');

  // Products
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [withdrawItem, setWithdrawItem] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const produtosCarregadosRef = useRef(false);
  const [search, setSearch] = useState('');
  const [layoutProdutos, setLayoutProdutos] = useState(() => localStorage.getItem('sf_layout') || 'lista');
  const [tamanhoLayout, setTamanhoLayout] = useState(() => localStorage.getItem('sf_tamanho') || 'm');
  const [categoriasAbertas, setCategoriasAbertas] = useState(new Set());
  const [pagePorCategoria, setPagePorCategoria] = useState({});
  const [pagTabelas, setPagTabelas] = useState({ inicio: 1, esgotados: 1, equipe: 1 });
  // Linhas que cabem na área da tabela ativa (Início, Sem estoque ou Equipe), sem rolagem vertical
  const [areaTabelaRef, linhasPorPagina] = useFitRows(TABLE_PAGE_SIZE);
  // Ordenação por coluna de cada tabela (null = ordem original)
  const [ordem, setOrdem] = useState({ inicio: null, esgotados: null, produtos: null, equipe: null });
  function alternarOrdem(tabela, key) {
    setOrdem(o => ({ ...o, [tabela]: proximaOrdem(o[tabela], key) }));
    if (tabela === 'produtos') setPagePorCategoria({});
    else setPagTabelas(p => ({ ...p, [tabela]: 1 }));
  }
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

  // A tela "Carregando…" só aparece na primeira leitura; as seguintes (polling, salvar, etc.) atualizam em silêncio
  async function fetchProducts() {
    if (!produtosCarregadosRef.current) setLoadingProducts(true);
    try {
      const { data } = await api.get('/api/products');
      setProducts(data);
      produtosCarregadosRef.current = true;
    } catch {
      // silently fail
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchUsers() {
    if (!usersLoaded) setLoadingUsers(true);
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
      // Mantém o cargo da sessão igual ao do banco (sessão antiga pode ter cargo desatualizado ou ausente)
      if (data.role && data.role !== user?.role) updateUser({ role: data.role });
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

  async function handleChangeRole(u, newRole) {
    if (newRole === u.role) return;
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
    const pagInicio = paginate(sortRows(products, ordem.inicio), pagTabelas.inicio, linhasPorPagina);
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map(metric => (
            metric.label === 'Sem Estoque'
              ? (
                <button
                  key={metric.label}
                  onClick={() => setActiveNav('sem-estoque')}
                  className={`bg-gradient-to-br ${metric.color} rounded-2xl p-3 pl-[15px] text-white shadow-md text-left cursor-pointer hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{metric.icon}</div>
                    <div>
                      <div className="text-2xl font-bold leading-none">{metric.value}</div>
                      <div className="text-xs opacity-80 mt-1">{metric.label}</div>
                    </div>
                  </div>
                </button>
              )
              : (
                <div key={metric.label} className={`bg-gradient-to-br ${metric.color} rounded-2xl p-3 pl-[15px] text-white shadow-md`}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{metric.icon}</div>
                    <div>
                      <div className="text-2xl font-bold leading-none">{metric.value}</div>
                      <div className="text-xs opacity-80 mt-1">{metric.label}</div>
                    </div>
                  </div>
                </div>
              )
          ))}
        </div>

        <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 min-h-0 flex flex-col ${TABLE_WRAP}`}>
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
            <>
            <div ref={areaTabelaRef} className="overflow-x-auto overflow-y-hidden flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <SortTh k="nome" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium">Nome</SortTh>
                    <SortTh k="quantidade" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium whitespace-nowrap">Qtd.</SortTh>
                    <SortTh k="unidade" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium whitespace-nowrap">Un.</SortTh>
                    <SortTh k="categoria" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-850">Categoria</SortTh>
                    <SortTh k="fornecedor" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-1100">Fornecedor</SortTh>
                    <SortTh k="peso_kg" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-1350">Peso (kg)</SortTh>
                    <SortTh k="created_at" ordem={ordem.inicio} onSort={k => alternarOrdem('inicio', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-1350">Cadastro</SortTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pagInicio.items.map((p, i) => (
                    <tr key={p.id} className={zebra(i)}>
                      <td className="px-4 py-1.5 font-medium whitespace-normal sm:whitespace-nowrap text-gray-800 dark:text-gray-200" title={p.nome}>{p.nome}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <span className={parseFloat(p.quantidade) === 0 ? 'text-red-500 font-semibold' : parseFloat(p.quantidade) <= LOW_STOCK_THRESHOLD ? 'text-yellow-500 font-semibold' : 'text-gray-600 dark:text-gray-400'}>{parseFloat(p.quantidade)}</span>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{p.unidade}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-500 hide-lt-850">{p.categoria || '—'}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-500 hide-lt-1100">{p.fornecedor || '—'}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400 hide-lt-1350">{fmtPeso(p)}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-500 hide-lt-1350">{fmtData(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagInicio.page} totalPages={pagInicio.totalPages} onChange={n => setPagTabelas(s => ({ ...s, inicio: n }))} className="shrink-0 border-t border-gray-100 dark:border-gray-800" />
            </>
          )}
        </div>
      </>
    );
  }

  function renderSemEstoque() {
    const esgotados = products
      .filter(p => parseFloat(p.quantidade) === 0)
      .sort((a, b) => (a.categoria || 'Sem Categoria').localeCompare(b.categoria || 'Sem Categoria'));
    const pagEsgotados = paginate(sortRows(esgotados, ordem.esgotados), pagTabelas.esgotados, linhasPorPagina);

    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 min-h-0 flex flex-col">
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
          <>
          <div ref={areaTabelaRef} className="overflow-x-auto overflow-y-hidden flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <SortTh k="nome" ordem={ordem.esgotados} onSort={k => alternarOrdem('esgotados', k)} className="px-4 py-3 font-medium">Nome</SortTh>
                  <SortTh k="categoria" ordem={ordem.esgotados} onSort={k => alternarOrdem('esgotados', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-850">Categoria</SortTh>
                  <SortTh k="unidade" ordem={ordem.esgotados} onSort={k => alternarOrdem('esgotados', k)} className="px-4 py-3 font-medium whitespace-nowrap">Un.</SortTh>
                  <SortTh k="fornecedor" ordem={ordem.esgotados} onSort={k => alternarOrdem('esgotados', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-1100">Fornecedor</SortTh>
                  <SortTh k="peso_kg" ordem={ordem.esgotados} onSort={k => alternarOrdem('esgotados', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-1350">Peso (kg)</SortTh>
                  <SortTh k="created_at" ordem={ordem.esgotados} onSort={k => alternarOrdem('esgotados', k)} className="px-4 py-3 font-medium whitespace-nowrap hide-lt-1350">Cadastro</SortTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {pagEsgotados.items.map((p, i) => (
                  <tr key={p.id} className={zebra(i)}>
                    <td className="px-4 py-1.5 font-medium whitespace-normal sm:whitespace-nowrap text-gray-800 dark:text-gray-200" title={p.nome}>{p.nome}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-500 hide-lt-850">{p.categoria || 'Sem Categoria'}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{p.unidade}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-500 hide-lt-1100">{p.fornecedor || '—'}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400 hide-lt-1350">{fmtPeso(p)}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-500 hide-lt-1350">{fmtData(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagEsgotados.page} totalPages={pagEsgotados.totalPages} onChange={n => setPagTabelas(s => ({ ...s, esgotados: n }))} className="shrink-0 border-t border-gray-100 dark:border-gray-800" />
          </>
        )}
      </div>
    );
  }

  function renderProdutos() {
    const { grouped, categorias } = groupProductsByCategory(products, search);
    // Ordenação por coluna dentro de cada categoria
    if (ordem.produtos) for (const cat of categorias) grouped[cat] = sortRows(grouped[cat], ordem.produtos);
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
        tablePy: 'py-1.5',  tableText: 'text-sm',
        gradeCols: 'grid-cols-3 lg:grid-cols-4',
        gradeP: 'p-4',      gradeNome: 'text-sm',   gradeQty: 'text-xl',
        compactoCols: 'grid-cols-3 lg:grid-cols-5',
        compactoP: 'p-3',   compactoNome: 'text-xs', compactoQty: 'text-base',
      },
      g: {
        tablePy: 'py-2.5',    tableText: 'text-base',
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
        <SortTh k="nome" ordem={ordem.produtos} onSort={k => alternarOrdem('produtos', k)} className={`px-4 ${sz.tablePy} font-medium`}>Nome</SortTh>
        <SortTh k="quantidade" ordem={ordem.produtos} onSort={k => alternarOrdem('produtos', k)} className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap`}>Qtd.</SortTh>
        <SortTh k="unidade" ordem={ordem.produtos} onSort={k => alternarOrdem('produtos', k)} className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap`}>Un.</SortTh>
        <SortTh k="fornecedor" ordem={ordem.produtos} onSort={k => alternarOrdem('produtos', k)} className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap hide-lt-1100`}>Fornecedor</SortTh>
        <SortTh k="peso_kg" ordem={ordem.produtos} onSort={k => alternarOrdem('produtos', k)} className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap hide-lt-1350`}>Peso (kg)</SortTh>
        <SortTh k="created_at" ordem={ordem.produtos} onSort={k => alternarOrdem('produtos', k)} className={`px-4 ${sz.tablePy} font-medium whitespace-nowrap hide-lt-1350`}>Cadastro</SortTh>
        <th className={`px-4 ${sz.tablePy} font-medium`}></th>
      </tr>
    );

    const linhasTabela = (prods) => prods.map((p, i) => (
      <tr key={p.id} className={zebra(i)}>
        <td className={`px-4 ${sz.tablePy} font-medium ${sz.tableText} text-gray-800 dark:text-gray-200`}>{p.nome}</td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap`}>
          <span className={`${sz.tableText} ${qtyClass(p)}`}>{parseFloat(p.quantidade)}</span>
        </td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap ${sz.tableText} text-gray-600 dark:text-gray-400`}>{p.unidade}</td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap ${sz.tableText} text-gray-500 dark:text-gray-500 hide-lt-1100`}>{p.fornecedor || '—'}</td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap ${sz.tableText} text-gray-600 dark:text-gray-400 hide-lt-1350`}>{fmtPeso(p)}</td>
        <td className={`px-4 ${sz.tablePy} whitespace-nowrap ${sz.tableText} text-gray-500 dark:text-gray-500 hide-lt-1350`}>{fmtData(p.created_at)}</td>
        <td className={`px-4 ${sz.tablePy}`}>
          <div className="flex flex-wrap gap-1.5">
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
                    <td colSpan={7} className="px-4 py-2">
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
                      <td colSpan={7}>{rodapePaginacao(cat)}</td>
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
      <div className={`flex flex-col gap-4 flex-1 ${TABLE_WRAP}`}>
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

  function renderEquipe() {
    const pagEquipe = paginate(sortRows(users, ordem.equipe), pagTabelas.equipe, linhasPorPagina);
    return (
      <>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 min-h-0 flex flex-col">
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
            <>
            <div ref={areaTabelaRef} className="overflow-x-auto overflow-y-hidden flex-1 min-h-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <SortTh k="nome" ordem={ordem.equipe} onSort={k => alternarOrdem('equipe', k)} className="px-4 py-3 font-medium">Nome</SortTh>
                    <SortTh k="email" ordem={ordem.equipe} onSort={k => alternarOrdem('equipe', k)} className="px-4 py-3 font-medium">E-mail</SortTh>
                    <SortTh k="role" ordem={ordem.equipe} onSort={k => alternarOrdem('equipe', k)} className="px-4 py-3 font-medium hide-lt-850">Cargo</SortTh>
                    <SortTh k="ativo" ordem={ordem.equipe} onSort={k => alternarOrdem('equipe', k)} className="px-4 py-3 font-medium hide-lt-1100">Status</SortTh>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pagEquipe.items.map((u, i) => (
                    <tr key={u.id} className={zebra(i)}>
                      <td className="px-4 py-1.5 font-medium text-gray-800 dark:text-gray-200">
                        {u.nome}
                        {u.id === user?.id && <span className="ml-1.5 text-xs text-gray-400">(você)</span>}
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap break-anywhere text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-1.5 hide-lt-850">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${corCargo(u.role)}`}>
                          {ROLES[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 hide-lt-1100">
                        <span className={`text-xs font-medium ${u.ativo ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-1.5">
                        {u.id !== user?.id && podeGerenciar(user?.role, u.role) ? (
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={u.role}
                              onChange={e => handleChangeRole(u, e.target.value)}
                              title="Alterar cargo"
                              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 outline-none focus:border-purple-500"
                            >
                              {cargosAtribuiveis(user?.role).map(c => (
                                <option key={c} value={c}>{ROLES[c]}</option>
                              ))}
                            </select>
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
            <Pagination page={pagEquipe.page} totalPages={pagEquipe.totalPages} onChange={n => setPagTabelas(s => ({ ...s, equipe: n }))} className="shrink-0 border-t border-gray-100 dark:border-gray-800" />
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-white via-white to-[#E879F9]/30 dark:from-black dark:via-[#2e1065] dark:to-[#7C3AED] transition-colors duration-500 relative">

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">

        <TopNav
          items={navItems}
          activeNav={activeNav}
          onSelect={setActiveNav}
          user={user}
          isAdmin={isAdmin}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(dm => !dm)}
          profileRef={profileRef}
          photoInputRef={photoInputRef}
          onPhotoChange={handlePhotoChange}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          editingName={editingName}
          setEditingName={setEditingName}
          newName={newName}
          setNewName={setNewName}
          onSaveName={handleSaveName}
          onLogout={logoutUser}
        />

        <main className="flex-1 overflow-auto px-3 sm:px-[3cm] pt-4 sm:pt-6 pb-[1cm]">
          <div className={`flex flex-col gap-4 ${['dashboard', 'sem-estoque', 'equipe', 'movimentacoes'].includes(activeNav) ? 'h-full' : 'min-h-full'}`}>
            {activeNav === 'dashboard'     && renderInicio()}
            {activeNav === 'produtos'      && renderProdutos()}
            {activeNav === 'movimentacoes' && (
              <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 min-h-0 flex flex-col ${TABLE_WRAP}`}>
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Histórico de Movimentações</h2>
                </div>
                <MovementsHistory />
              </div>
            )}
            {activeNav === 'relatorios' && <Reports />}
            {activeNav === 'sem-estoque' && <div className={`${TABLE_WRAP} flex-1 min-h-0 flex flex-col`}>{renderSemEstoque()}</div>}
            {activeNav === 'equipe' && isAdmin && <div className={`${TABLE_WRAP} flex-1 min-h-0 flex flex-col`}>{renderEquipe()}</div>}
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
          cargos={cargosAtribuiveis(user?.role)}
        />
      )}
    </div>
  );
}
