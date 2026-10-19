const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { pagarPedido } = require('../services/estoqueService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_COLS = 'id, pedido_id, product_id, product_nome, quantidade::float8 AS quantidade, unidade, created_at';
const PEDIDO_COLS = 'id, status, mesa, estoque_erros, created_at, updated_at';

// Captura exceções de handlers async e responde 500
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => res.status(500).json({ message: err.message }));

// Busca o pedido e valida existência/dono. Retorna o pedido ou null (já respondeu).
async function carregarPedido(req, res) {
  const id = req.params.id;
  const { rows } = UUID_RE.test(id)
    ? await db.query('SELECT id, status, user_id FROM pedidos WHERE id = $1', [id])
    : { rows: [] };
  const pedido = rows[0];

  if (!pedido) { res.status(404).json({ message: 'Pedido não encontrado.' }); return null; }
  if (pedido.user_id !== req.userId) { res.status(403).json({ message: 'Acesso negado.' }); return null; }
  return pedido;
}

// POST /pedidos - cria pedido em rascunho
router.post('/', auth, wrap(async (req, res) => {
  const mesa = req.body.mesa ? parseInt(req.body.mesa) : null;

  const { rows } = await db.query(
    `INSERT INTO pedidos (user_id, status, mesa) VALUES ($1, 'rascunho', $2)
     RETURNING id, status, mesa, created_at`,
    [req.userId, Number.isNaN(mesa) ? null : mesa]
  );
  return res.status(201).json(rows[0]);
}));

// POST /pedidos/:id/itens - adiciona item ao pedido
router.post('/:id/itens', auth, wrap(async (req, res) => {
  const { product_id, product_nome, quantidade, unidade } = req.body;

  const qty = parseFloat(quantidade);
  if (!product_id || !product_nome) {
    return res.status(400).json({ message: 'product_id e product_nome são obrigatórios.' });
  }
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
  }

  const pedido = await carregarPedido(req, res);
  if (!pedido) return;
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Só é possível adicionar itens a pedidos em rascunho.' });
  }

  const { rows } = await db.query(
    `INSERT INTO itens_pedido (pedido_id, product_id, product_nome, quantidade, unidade)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${ITEM_COLS}`,
    [pedido.id, product_id, product_nome, qty, unidade || 'UN']
  );
  return res.status(201).json(rows[0]);
}));

// PATCH /pedidos/:id/itens/:itemId - atualiza quantidade do item
router.patch('/:id/itens/:itemId', auth, wrap(async (req, res) => {
  const qty = parseInt(req.body.quantidade);

  if (isNaN(qty) || qty < 1) {
    return res.status(400).json({ message: 'Quantidade deve ser um número inteiro maior que zero.' });
  }

  const pedido = await carregarPedido(req, res);
  if (!pedido) return;
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Só é possível editar itens de pedidos em rascunho.' });
  }

  const { rows } = UUID_RE.test(req.params.itemId)
    ? await db.query(
        `UPDATE itens_pedido SET quantidade = $1 WHERE id = $2 AND pedido_id = $3 RETURNING ${ITEM_COLS}`,
        [qty, req.params.itemId, pedido.id])
    : { rows: [] };

  if (!rows[0]) return res.status(404).json({ message: 'Item não encontrado.' });
  return res.json(rows[0]);
}));

// DELETE /pedidos/:id/itens/:itemId - remove item do pedido
router.delete('/:id/itens/:itemId', auth, wrap(async (req, res) => {
  const pedido = await carregarPedido(req, res);
  if (!pedido) return;
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Só é possível remover itens de pedidos em rascunho.' });
  }

  if (UUID_RE.test(req.params.itemId)) {
    await db.query('DELETE FROM itens_pedido WHERE id = $1 AND pedido_id = $2', [req.params.itemId, pedido.id]);
  }
  return res.json({ message: 'Item removido com sucesso.' });
}));

// PATCH /pedidos/:id/confirmar - avança para confirmado
router.patch('/:id/confirmar', auth, wrap(async (req, res) => {
  const pedido = await carregarPedido(req, res);
  if (!pedido) return;
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Apenas pedidos em rascunho podem ser confirmados.' });
  }

  const { rowCount } = await db.query('SELECT 1 FROM itens_pedido WHERE pedido_id = $1 LIMIT 1', [pedido.id]);
  if (rowCount === 0) {
    return res.status(400).json({ message: 'Pedido vazio. Adicione ao menos um item antes de confirmar.' });
  }

  const { rows } = await db.query(
    `UPDATE pedidos SET status = 'confirmado', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [pedido.id]
  );
  return res.json(rows[0]);
}));

// PATCH /pedidos/:id/pagar - baixa estoque de forma atômica via função SQL
router.patch('/:id/pagar', auth, wrap(async (req, res) => {
  const pedidoId = req.params.id;
  if (!UUID_RE.test(pedidoId)) return res.status(404).json({ message: 'Pedido não encontrado.' });

  const resultado = await pagarPedido(pedidoId, req.userId);

  if (!resultado.ok) {
    const mapa = {
      nao_encontrado: 404,
      acesso_negado: 403,
      status_invalido: 400,
      estoque_insuficiente: 409,
    };
    return res.status(mapa[resultado.codigo] || 500).json({
      message: resultado.mensagem,
      erros: resultado.erros || [],
    });
  }

  const { rows } = await db.query(`SELECT ${PEDIDO_COLS} FROM pedidos WHERE id = $1`, [pedidoId]);
  return res.json(rows[0]);
}));

// PATCH /pedidos/:id/reabrir - volta de confirmado para rascunho
router.patch('/:id/reabrir', auth, wrap(async (req, res) => {
  const pedido = await carregarPedido(req, res);
  if (!pedido) return;
  if (pedido.status !== 'confirmado') {
    return res.status(400).json({ message: 'Só é possível reabrir pedidos com status confirmado.' });
  }

  const { rows } = await db.query(
    `UPDATE pedidos SET status = 'rascunho', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [pedido.id]
  );
  return res.json(rows[0]);
}));

// GET /pedidos/mesas-ocupadas - retorna {mesa, pedido_id, status} para cada mesa ativa
router.get('/mesas-ocupadas', auth, wrap(async (req, res) => {
  // Só pedidos com ao menos 1 item; uma entrada por mesa (pedido mais recente)
  const { rows } = await db.query(
    `SELECT DISTINCT ON (p.mesa) p.mesa, p.id AS pedido_id, p.status
       FROM pedidos p
      WHERE p.status IN ('rascunho', 'confirmado')
        AND p.mesa IS NOT NULL
        AND EXISTS (SELECT 1 FROM itens_pedido i WHERE i.pedido_id = p.id)
      ORDER BY p.mesa, p.created_at DESC`
  );
  return res.json(rows);
}));

// GET /pedidos - lista todos os pedidos
router.get('/', auth, wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${PEDIDO_COLS} FROM pedidos WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.userId]
  );
  return res.json(rows);
}));

// GET /pedidos/:id - detalhes do pedido com itens
router.get('/:id', auth, wrap(async (req, res) => {
  const pedido = await carregarPedido(req, res);
  if (!pedido) return;

  const { rows: [dados] } = await db.query(`SELECT ${PEDIDO_COLS} FROM pedidos WHERE id = $1`, [pedido.id]);
  const { rows: itens } = await db.query(
    `SELECT id, product_id, product_nome, quantidade::float8 AS quantidade, unidade
       FROM itens_pedido WHERE pedido_id = $1`,
    [pedido.id]
  );
  return res.json({ ...dados, itens });
}));

module.exports = router;
