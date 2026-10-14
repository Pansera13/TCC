const db = require('../db');

async function logMovement({ product_id, product_nome, tipo, quantidade, user_id, user_nome, origem = 'estoque', pedido_id = null }) {
  await db.query(
    `INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, pedido_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [product_id, String(product_nome), tipo, quantidade, user_id, String(user_nome), origem, pedido_id]
  );
}

module.exports = { logMovement };
