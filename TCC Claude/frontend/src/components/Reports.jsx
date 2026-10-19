import { useEffect, useState } from 'react';
import { getReport } from '../services/api';
import { downloadReportCsv } from '../utils/reportCsv';
import Pagination from './Pagination';
import { paginate, TABLE_PAGE_SIZE } from '../utils/products';
import { zebra, TABLE_WRAP } from '../utils/tables';

const PERIODOS = [
  { id: '7', label: '7 dias', dias: 7 },
  { id: '30', label: '30 dias', dias: 30 },
  { id: '90', label: '90 dias', dias: 90 },
  { id: 'custom', label: 'Personalizado' },
];

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function intervalo(dias) {
  const fim = new Date();
  const ini = new Date();
  ini.setDate(fim.getDate() - (dias - 1));
  return { from: iso(ini), to: iso(fim) };
}
const fmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const CARD = 'bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden';
const CAB = 'px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm text-gray-800 dark:text-white';
const TH = 'px-4 py-2.5 font-medium';
const THEAD = 'text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800';
const INPUT = 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-purple-500';

export default function Reports() {
  const [periodo, setPeriodo] = useState('30');
  const [custom, setCustom] = useState(() => intervalo(30));
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [paginaGiro, setPaginaGiro] = useState(1);

  const invalido = periodo === 'custom' && (!custom.from || !custom.to || custom.to < custom.from);
  const { from, to } = periodo === 'custom' ? custom : intervalo(PERIODOS.find(p => p.id === periodo).dias);

  useEffect(() => {
    if (invalido) return;
    let ativo = true;
    setLoading(true);
    setErro('');
    getReport(from, to)
      .then(res => { if (ativo) setDados(res.data); })
      .catch(err => { if (ativo) setErro(err.response?.data?.message || 'Não foi possível carregar o relatório.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [from, to, invalido]);

  const pagGiro = paginate(dados?.giro ?? [], paginaGiro, TABLE_PAGE_SIZE);

  const cartoes = dados && [
    { label: 'Total de produtos', valor: dados.summary.totalProdutos, cor: 'from-purple-500 to-purple-700' },
    { label: 'Estoque baixo', valor: dados.summary.estoqueBaixo, cor: 'from-yellow-500 to-orange-500' },
    { label: 'Esgotados', valor: dados.summary.esgotados, cor: 'from-red-500 to-red-700' },
    { label: 'Entradas no período', valor: fmt(dados.summary.totalEntradas), cor: 'from-green-500 to-emerald-600' },
    { label: 'Saídas no período', valor: fmt(dados.summary.totalSaidas), cor: 'from-blue-500 to-blue-700' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filtro de período + exportação */}
      <div className={`${CARD} ${TABLE_WRAP} px-4 py-3 flex flex-wrap items-center gap-2`}>
        {PERIODOS.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${periodo === p.id
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {p.label}
          </button>
        ))}
        {periodo === 'custom' && (
          <>
            <input type="date" className={INPUT} value={custom.from} max={custom.to || undefined}
              onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} />
            <span className="text-xs text-gray-400">até</span>
            <input type="date" className={INPUT} value={custom.to} min={custom.from || undefined}
              onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} />
          </>
        )}
        <button onClick={() => dados && downloadReportCsv(dados)} disabled={!dados || loading || invalido}
          className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed">
          Exportar CSV
        </button>
        {invalido && <p className="w-full text-xs text-red-500">A data final deve ser igual ou posterior à data inicial.</p>}
        {erro && !invalido && <p className="w-full text-xs text-red-500">{erro}</p>}
      </div>

      {loading && !dados ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-3 animate-pulse">📊</span>
          <p className="text-sm">Carregando relatório…</p>
        </div>
      ) : dados && (
        <div className={`flex flex-col gap-4 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {cartoes.map(c => (
              <div key={c.label} className={`bg-gradient-to-br ${c.cor} rounded-2xl p-4 pl-[19px] text-white shadow-md`}>
                <div className="text-2xl font-bold">{c.valor}</div>
                <div className="text-xs opacity-80 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <div className={`${CARD} ${TABLE_WRAP}`}>
            <h2 className={CAB}>Top 10 mais retirados</h2>
            {dados.topRetirados.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma retirada no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className={THEAD}>
                    <th className={TH}>#</th><th className={TH}>Produto</th><th className={TH}>Retirado</th>
                  </tr></thead>
                  <tbody>
                    {dados.topRetirados.map((t, i) => (
                      <tr key={t.product_id} className={zebra(i)}>
                        <td className="px-4 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-1.5 font-medium text-gray-800 dark:text-gray-200">{t.nome}</td>
                        <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{fmt(t.quantidade)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`${CARD} ${TABLE_WRAP}`}>
            <h2 className={CAB}>Consumo por categoria</h2>
            {dados.consumoPorCategoria.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma retirada no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className={THEAD}>
                    <th className={TH}>Categoria</th><th className={TH}>Retirado</th>
                  </tr></thead>
                  <tbody>
                    {dados.consumoPorCategoria.map((c, i) => (
                      <tr key={c.categoria} className={zebra(i)}>
                        <td className="px-4 py-1.5 font-medium text-gray-800 dark:text-gray-200">{c.categoria}</td>
                        <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{fmt(c.quantidade)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`${CARD} ${TABLE_WRAP}`}>
            <h2 className={CAB}>Giro de estoque por produto</h2>
            <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              Giro = quantidade retirada no período ÷ estoque atual. Produto sem estoque exibe “—”.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className={THEAD}>
                  <th className={TH}>Produto</th><th className={TH}>Estoque</th><th className={TH}>Retirado</th><th className={TH}>Giro</th>
                </tr></thead>
                <tbody>
                  {pagGiro.items.map((g, i) => (
                    <tr key={g.product_id} className={zebra(i)}>
                      <td className="px-4 py-1.5 font-medium text-gray-800 dark:text-gray-200">{g.nome}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmt(g.estoque)} {g.unidade}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmt(g.retirado)}</td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {g.giro === null ? '—' : g.giro.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pagGiro.page} totalPages={pagGiro.totalPages} onChange={setPaginaGiro}
              className="border-t border-gray-100 dark:border-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}
