const db = require('../db');

const TIPOS = ['entrada', 'saida', 'edicao', 'remocao'];
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const FUSO = 'America/Sao_Paulo';
const PAGE_SIZE_PADRAO = 20;
const PAGE_SIZE_MAX = 100;

function inteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET /api/movements?page&pageSize&user&tipo&q&from&to
// Resposta: { items, total, page, pageSize }, do mais recente para o mais antigo.
async function listMovements(req, res) {
  const { user, tipo, q, from, to } = req.query;

  const page = req.query.page === undefined ? 1 : inteiroPositivo(req.query.page);
  const pageSize = req.query.pageSize === undefined ? PAGE_SIZE_PADRAO : inteiroPositivo(req.query.pageSize);
  if (!page || !pageSize) {
    return res.status(400).json({ message: 'Parâmetros de paginação inválidos.' });
  }
  const limit = Math.min(pageSize, PAGE_SIZE_MAX);

  const where = [];
  const params = [];
  const add = (valor) => { params.push(valor); return `$${params.length}`; };

  // Por nome: registros do seed e do sistema de Pedidos não têm user_id
  if (user !== undefined && String(user).trim() !== '') {
    where.push(`user_nome = ${add(String(user).trim())}`);
  }
  if (tipo !== undefined && tipo !== '') {
    if (!TIPOS.includes(tipo)) return res.status(400).json({ message: 'Tipo de ação inválido.' });
    where.push(`tipo = ${add(tipo)}`);
  }
  if (q !== undefined && String(q).trim() !== '') {
    const trecho = String(q).trim().replace(/[\\%_]/g, '\\$&');
    where.push(`product_nome ILIKE ${add(`%${trecho}%`)}`);
  }
  if (from !== undefined && from !== '') {
    if (!DATA_ISO.test(from) || isNaN(Date.parse(from))) return res.status(400).json({ message: 'Data inicial inválida.' });
    where.push(`created_at >= (${add(from)}::date)::timestamp AT TIME ZONE '${FUSO}'`);
  }
  if (to !== undefined && to !== '') {
    if (!DATA_ISO.test(to) || isNaN(Date.parse(to))) return res.status(400).json({ message: 'Data final inválida.' });
    where.push(`created_at < ((${add(to)}::date + 1)::timestamp AT TIME ZONE '${FUSO}')`);
  }
  if (from && to && from > to) {
    return res.status(400).json({ message: 'A data final deve ser igual ou posterior à data inicial.' });
  }

  where.push(`tenant_id = ${add(req.user.tenant_id)}`);
  const filtro = `WHERE ${where.join(' AND ')}`;

  const { rows: contagem } = await db.query(`SELECT COUNT(*)::int AS total FROM movements ${filtro}`, params);
  const total = contagem[0].total;

  const { rows: items } = await db.query(
    `SELECT id, product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, pedido_id, detalhes, created_at
     FROM movements ${filtro}
     ORDER BY created_at DESC, id DESC
     LIMIT ${add(limit)} OFFSET ${add((page - 1) * limit)}`,
    params
  );

  return res.json({ items, total, page, pageSize: limit });
}

// GET /api/movements/users — nomes de quem já agiu no estoque (opções do filtro; /api/users é só admin)
async function listMovementUsers(req, res) {
  const { rows } = await db.query(
    `SELECT DISTINCT user_nome FROM movements WHERE origem = 'estoque' AND tenant_id = $1`,
    [req.user.tenant_id]
  );
  return res.json(rows.map(r => r.user_nome).sort((a, b) => a.localeCompare(b)));
}

module.exports = { listMovements, listMovementUsers };
