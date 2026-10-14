const db = require('../db');

async function listMovements(req, res) {
  const { rows } = await db.query(
    `SELECT id, product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, pedido_id, created_at
     FROM movements
     ORDER BY created_at DESC
     LIMIT 500`
  );
  return res.json(rows);
}

module.exports = { listMovements };
