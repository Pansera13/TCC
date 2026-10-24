import { Fragment, useEffect, useState } from 'react';
import { listMovements, listMovementUsers } from '../services/api';
import Pagination from './Pagination';
import SortTh from './SortTh';
import { zebra } from '../utils/tables';
import { useFitRows } from '../utils/useFitRows';
import { proximaOrdem } from '../utils/sort';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE_INICIAL = 8;
const FILTROS_VAZIOS = { user: '', tipo: '', q: '', from: '', to: '' };

const ACOES = {
  entrada: { label: '↑ Entrada',  cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  saida:   { label: '↓ Retirada', cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  edicao:  { label: '✎ Edição',   cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  remocao: { label: '🗑 Remoção',  cls: 'bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300' },
};
const ACAO_DESCONHECIDA = { cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };

const CAMPOS = { nome: 'Nome', quantidade: 'Quantidade', unidade: 'Unidade', categoria: 'Categoria', fornecedor: 'Fornecedor', arquivado: 'Arquivado' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function valor(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}

const inputCls =
  'w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ' +
  'text-gray-700 dark:text-gray-200 outline-none focus:border-purple-400 dark:focus:border-purple-500';

export default function MovementsHistory() {
  const { can } = useAuth();
  const podeVerTodas = can('movimentacao:ver-todas');
  const [resp, setResp] = useState({ key: null, dados: { items: [], total: 0 }, erro: '' });
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [usuarios, setUsuarios] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [recarregar, setRecarregar] = useState(0);
  const [ordem, setOrdem] = useState({ key: 'created_at', dir: 'desc' });
  // Linhas por página = quantas cabem na altura disponível (sem rolagem vertical)
  const [areaRef, pageSize] = useFitRows(PAGE_SIZE_INICIAL);
  const periodoInvalido = !!(filtros.from && filtros.to && filtros.from > filtros.to);

  // Identifica a consulta pedida; "carregando" = a resposta guardada ainda é de outra consulta
  const key = JSON.stringify([filtros, page, recarregar, pageSize, ordem]);
  const loading = !periodoInvalido && resp.key !== key;
  const { dados, erro } = resp;

  // Opções do filtro de usuário (só busca se puder ver todas)
  useEffect(() => {
    if (!podeVerTodas) return;
    listMovementUsers().then(({ data }) => setUsuarios(data)).catch(() => {});
  }, [podeVerTodas]);

  // Produto: espera o usuário parar de digitar
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros(f => (f.q === busca.trim() ? f : { ...f, q: busca.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  // Busca no servidor a cada mudança de filtro, página ou clique em "Atualizar"
  useEffect(() => {
    if (periodoInvalido) return;
    let cancelado = false;
    const params = { page, pageSize };
    for (const [k, v] of Object.entries(filtros)) if (v) params[k] = v;
    if (ordem?.key) { params.orderBy = ordem.key; params.orderDir = ordem.dir; }

    listMovements(params)
      .then(({ data }) => { if (!cancelado) setResp({ key, dados: data, erro: '' }); })
      .catch(err => {
        if (!cancelado) setResp(r => ({ ...r, key, erro: err.response?.data?.message || 'Não foi possível carregar o histórico.' }));
      });
    return () => { cancelado = true; };
  }, [key, filtros, page, pageSize, periodoInvalido]);

  function mudarFiltro(campo, v) {
    setFiltros(f => ({ ...f, [campo]: v }));
    setPage(1);
    setAberto(null);
  }

  function mudarOrdem(k) {
    setOrdem(o => proximaOrdem(o, k) ?? { key: 'created_at', dir: 'desc' });
    setPage(1);
  }

  function limpar() {
    setFiltros(FILTROS_VAZIOS);
    setBusca('');
    setPage(1);
    setAberto(null);
  }

  const temFiltro = Object.values(filtros).some(Boolean) || busca !== '';
  const totalPages = Math.max(1, Math.ceil(dados.total / pageSize));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {!podeVerTodas && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
            Mostrando apenas as suas movimentações.
          </p>
        </div>
      )}
      {/* Filtros */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 grid grid-cols-2 lg:grid-cols-6 gap-2">
        {podeVerTodas && (
          <select className={inputCls} value={filtros.user} onChange={e => mudarFiltro('user', e.target.value)} aria-label="Usuário">
            <option value="">Todos os usuários</option>
            {usuarios.map(nome => <option key={nome} value={nome}>{nome}</option>)}
          </select>
        )}
        <select className={`${inputCls} ${!podeVerTodas ? 'lg:col-span-2' : ''}`} value={filtros.tipo} onChange={e => mudarFiltro('tipo', e.target.value)} aria-label="Tipo de ação">
          <option value="">Todas as ações</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Retirada</option>
          <option value="edicao">Edição</option>
          <option value="remocao">Remoção</option>
        </select>
        <input className={`${inputCls} col-span-2 lg:col-span-1`} placeholder="Produto…" value={busca}
          onChange={e => setBusca(e.target.value)} aria-label="Produto" />
        <input type="date" className={inputCls} value={filtros.from} max={filtros.to || undefined}
          onChange={e => mudarFiltro('from', e.target.value)} aria-label="Data inicial" />
        <input type="date" className={inputCls} value={filtros.to} min={filtros.from || undefined}
          onChange={e => mudarFiltro('to', e.target.value)} aria-label="Data final" />
        {/* Seletor de ordenação — visível só em telas estreitas onde colunas ficam ocultas */}
        <select
          className={`${inputCls} lg:hidden col-span-2`}
          value={ordem ? `${ordem.key}|${ordem.dir}` : ''}
          onChange={e => {
            if (!e.target.value) { setOrdem({ key: 'created_at', dir: 'desc' }); return; }
            const sep = e.target.value.lastIndexOf('|');
            setOrdem({ key: e.target.value.slice(0, sep), dir: e.target.value.slice(sep + 1) });
            setPage(1);
          }}
          aria-label="Ordenar por"
        >
          <option value="created_at|desc">Data (mais recente)</option>
          <option value="created_at|asc">Data (mais antiga)</option>
          <option value="product_nome|asc">Produto A–Z</option>
          <option value="product_nome|desc">Produto Z–A</option>
          <option value="tipo|asc">Ação A–Z</option>
          <option value="quantidade|desc">Maior quantidade</option>
          <option value="quantidade|asc">Menor quantidade</option>
          <option value="origem|asc">Origem</option>
          <option value="user_nome|asc">Responsável A–Z</option>
        </select>
        <div className="flex gap-2 col-span-2 lg:col-span-1">
          <button type="button" onClick={limpar} disabled={!temFiltro}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed">
            Limpar
          </button>
          <button type="button" onClick={() => setRecarregar(n => n + 1)}
            className="flex-1 px-3 py-2 text-xs rounded-lg text-purple-600 dark:text-purple-400 hover:underline">
            Atualizar
          </button>
        </div>
      </div>

      {periodoInvalido && (
        <p className="px-4 py-3 text-xs text-red-500">A data final deve ser igual ou posterior à data inicial.</p>
      )}
      {erro && !periodoInvalido && <p className="px-4 py-3 text-xs text-red-500">{erro}</p>}

      {loading && dados.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3 animate-pulse">🔄</span>
          <p className="text-sm">Carregando movimentações…</p>
        </div>
      ) : dados.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3">🔄</span>
          <p className="text-sm">
            {temFiltro ? 'Nenhuma movimentação encontrada para esses filtros.' : 'Nenhuma movimentação registrada ainda.'}
          </p>
        </div>
      ) : (
        <div ref={areaRef} className={`overflow-x-auto ${aberto ? 'overflow-y-auto' : 'overflow-y-hidden'} flex-1 min-h-0`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <SortTh k="created_at" ordem={ordem} onSort={mudarOrdem} className="px-4 py-3 font-medium">Data / Hora</SortTh>
                <SortTh k="product_nome" ordem={ordem} onSort={mudarOrdem} className="px-4 py-3 font-medium">Produto</SortTh>
                <SortTh k="tipo" ordem={ordem} onSort={mudarOrdem} className="px-4 py-3 font-medium">Ação</SortTh>
                <SortTh k="quantidade" ordem={ordem} onSort={mudarOrdem} className="px-4 py-3 font-medium">Quantidade</SortTh>
                <SortTh k="origem" ordem={ordem} onSort={mudarOrdem} className="px-4 py-3 font-medium hide-lt-850">Origem</SortTh>
                <SortTh k="user_nome" ordem={ordem} onSort={mudarOrdem} className="px-4 py-3 font-medium hide-lt-1100">Responsável</SortTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {dados.items.map((m, i) => {
                const acao = ACOES[m.tipo] || { ...ACAO_DESCONHECIDA, label: m.tipo };
                const campos = m.tipo === 'edicao' && m.detalhes ? Object.keys(m.detalhes.depois || {}) : [];
                return (
                  <Fragment key={m.id}>
                    <tr className={zebra(i)}>
                      <td className="px-4 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(m.created_at)}</td>
                      <td className="px-4 py-1.5 font-medium whitespace-normal sm:whitespace-nowrap text-gray-800 dark:text-gray-200" title={m.product_nome}>{m.product_nome}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${acao.cls}`}>{acao.label}</span>
                        {campos.length > 0 && (
                          <button type="button" onClick={() => setAberto(aberto === m.id ? null : m.id)}
                            className="ml-2 text-xs text-purple-600 dark:text-purple-400 hover:underline">
                            {aberto === m.id ? 'Ocultar' : 'Detalhes'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">
                        {m.tipo === 'edicao' && Number(m.quantidade) === 0 ? '—' : m.quantidade}
                      </td>
                      <td className="px-4 py-1.5 hide-lt-850">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${m.origem === 'pedido'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                          {m.origem === 'pedido' ? 'Pedido' : 'Estoque'}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400 hide-lt-1100">
                        {m.origem === 'pedido' ? 'Sistema de Pedidos' : (m.user_nome || '—')}
                      </td>
                    </tr>
                    {aberto === m.id && campos.length > 0 && (
                      <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                        <td colSpan={6} className="px-4 py-3">
                          <ul className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                            {campos.map(c => (
                              <li key={c}>
                                <span className="font-medium">{CAMPOS[c] || c}:</span>{' '}
                                <span className="line-through opacity-70">{valor(m.detalhes.antes?.[c])}</span>
                                {' → '}
                                <span className="font-medium">{valor(m.detalhes.depois[c])}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dados.total > 0 && (
        <div className="shrink-0 flex flex-col items-center border-t border-gray-100 dark:border-gray-800">
          <Pagination page={page} totalPages={totalPages} onChange={n => { setPage(n); setAberto(null); }} />
          <p className="pb-3 text-xs text-gray-400 dark:text-gray-500">{dados.total} registro{dados.total !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}
