const db = require('./db');

async function main() {
  const { rows: [p] } = await db.query('SELECT COUNT(*)::int AS n FROM products');
  console.log(`OK: products (${p.n} produtos)`);

  const { rows: [o] } = await db.query('SELECT COUNT(*)::int AS n FROM pedidos');
  console.log(`OK: pedidos (${o.n} pedidos)`);
}

main()
  .catch(err => { console.error('ERRO:', err.message); process.exitCode = 1; })
  .finally(() => db.end());
