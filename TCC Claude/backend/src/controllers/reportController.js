const db = require('../db');

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const FUSO = 'America/Sao_Paulo';
const MAX_DIAS = 366;
// Mesmo limiar de "estoque baixo" usado na tela Início do frontend (LOW_STOCK_THRESHOLD).
const LOW_STOCK_THRESHOLD = 3;

const num = (v) => Number(v ?? 0);
const dataValida = (s) => typeof s === 'string' && DATA_ISO.test(s) && !isNaN(Date.parse(s));

// GET /api/reports?from=AAAA-MM-DD&to=AAAA-MM-DD
// Somente movimentações 'entrada' e 'saida' entram nos cálculos.
async function getReport(req, res) {
  const { from, to } = req.query;
  if (!dataValida(from) || !dataValida(to)) {
    return res.status(400).json({ message: 'Informe as datas inicial e final no formato AAAA-MM-DD.' });
  }
  if (from > to) {
    return res.status(400).json({ message: 'A data final deve ser igual ou posterior à data inicial.' });
  }
  const dias = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (dias > MAX_DIAS) {
    return res.status(400).json({ message: `O período máximo é de ${MAX_DIAS} dias.` });
  }

  const tenantId = req.user.tenant_id;
  const periodo = [
    `m.created_at >= ($1::date)::timestamp AT TIME ZONE '${FUSO}'`,
    `m.created_at < (($2::date + 1)::timestamp AT TIME ZONE '${FUSO}')`,
  ].join(' AND ');
  const params = [from, to];

  // Exclui produtos arquivados de todos os cálculos. Produtos já excluídos (sem linha em products)
  // continuam aparecendo nos relatórios de movimentações — apenas arquivados são filtrados.
  const naoArquivado = `NOT EXISTS (SELECT 1 FROM products _p WHERE _p.id = m.product_id AND _p.arquivado = true)`;

  const [estoque, totais, top, giro, consumo] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE quantidade > 0 AND quantidade <= $1)::int AS baixo,
              COUNT(*) FILTER (WHERE quantidade = 0)::int AS esgotados
       FROM products WHERE tenant_id = $2 AND arquivado = false`,
      [LOW_STOCK_THRESHOLD, tenantId]
    ),
    db.query(
      `SELECT COALESCE(SUM(m.quantidade) FILTER (WHERE m.tipo = 'entrada'), 0) AS entradas,
              COALESCE(SUM(m.quantidade) FILTER (WHERE m.tipo = 'saida'), 0) AS saidas
       FROM movements m WHERE m.tipo IN ('entrada','saida') AND m.tenant_id = $3 AND ${periodo}
         AND ${naoArquivado}`,
      [...params, tenantId]
    ),
    db.query(
      `SELECT m.product_id, MAX(m.product_nome) AS nome, SUM(m.quantidade) AS quantidade
       FROM movements m WHERE m.tipo = 'saida' AND m.tenant_id = $3 AND ${periodo}
         AND ${naoArquivado}
       GROUP BY m.product_id ORDER BY SUM(m.quantidade) DESC, MAX(m.product_nome) LIMIT 10`,
      [...params, tenantId]
    ),
    db.query(
      `SELECT p.id AS product_id, p.nome, p.categoria, p.unidade, p.quantidade AS estoque,
              COALESCE(s.retirado, 0) AS retirado
       FROM products p
       LEFT JOIN (
         SELECT m.product_id, SUM(m.quantidade) AS retirado
         FROM movements m WHERE m.tipo = 'saida' AND m.tenant_id = $3 AND ${periodo} GROUP BY m.product_id
       ) s ON s.product_id = p.id
       WHERE p.tenant_id = $4 AND p.arquivado = false
       ORDER BY COALESCE(s.retirado, 0) DESC, p.nome`,
      [...params, tenantId, tenantId]
    ),
    db.query(
      `SELECT COALESCE(NULLIF(TRIM(p.categoria), ''), 'Sem Categoria') AS categoria, SUM(m.quantidade) AS quantidade
       FROM movements m JOIN products p ON p.id = m.product_id
       WHERE m.tipo = 'saida' AND m.tenant_id = $3 AND ${periodo} AND p.arquivado = false
       GROUP BY 1 ORDER BY SUM(m.quantidade) DESC, 1`,
      [...params, tenantId]
    ),
  ]);

  return res.json({
    period: { from, to },
    summary: {
      totalProdutos: estoque.rows[0].total,
      estoqueBaixo: estoque.rows[0].baixo,
      esgotados: estoque.rows[0].esgotados,
      totalEntradas: num(totais.rows[0].entradas),
      totalSaidas: num(totais.rows[0].saidas),
    },
    topRetirados: top.rows.map(r => ({ product_id: r.product_id, nome: r.nome, quantidade: num(r.quantidade) })),
    giro: giro.rows.map(r => {
      const estoqueAtual = num(r.estoque);
      const retirado = num(r.retirado);
      return {
        product_id: r.product_id, nome: r.nome, categoria: r.categoria || 'Sem Categoria', unidade: r.unidade,
        estoque: estoqueAtual, retirado,
        giro: estoqueAtual > 0 ? retirado / estoqueAtual : null,
      };
    }),
    consumoPorCategoria: consumo.rows.map(r => ({ categoria: r.categoria, quantidade: num(r.quantidade) })),
  });
}

module.exports = { getReport };
