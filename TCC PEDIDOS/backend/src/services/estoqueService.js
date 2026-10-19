const db = require('../db');

async function getProdutos() {
  const { rows } = await db.query(
    `SELECT id, nome, quantidade::float8 AS quantidade, unidade, categoria
       FROM products
      WHERE quantidade > 0
      ORDER BY nome`
  );
  return rows;
}

async function pagarPedido(pedidoId, userId) {
  const { rows } = await db.query('SELECT pagar_pedido($1::uuid, $2::uuid) AS r', [pedidoId, userId]);
  return rows[0].r;
}

module.exports = { getProdutos, pagarPedido };
