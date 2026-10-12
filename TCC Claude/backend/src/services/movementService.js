const pool = require('../db');

async function logMovement({ product_id, product_nome, tipo, quantidade, user_id, user_nome }) {
  await pool.execute(
    `INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [product_id, String(product_nome), tipo, quantidade, user_id, String(user_nome)]
  );
}

module.exports = { logMovement };
