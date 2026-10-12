const pool = require('../db');

async function listMovements(req, res) {
  const [rows] = await pool.execute(
    `SELECT id, product_id, product_nome, tipo, quantidade, user_id, user_nome, created_at
     FROM movements
     ORDER BY created_at DESC
     LIMIT 500`
  );
  return res.json(rows);
}

module.exports = { listMovements };
