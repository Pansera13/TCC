require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CATEGORIAS_REMOVER = ['alimento', 'teste'];

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: produtos } = await client.query(
      `SELECT id, nome, categoria FROM products WHERE LOWER(categoria) = ANY($1)`,
      [CATEGORIAS_REMOVER]
    );

    if (produtos.length === 0) {
      console.log('Nenhum produto encontrado nas categorias:', CATEGORIAS_REMOVER.join(', '));
      await client.query('ROLLBACK');
      return;
    }

    const ids = produtos.map(p => p.id);

    const { rowCount: movDel } = await client.query(
      `DELETE FROM movements WHERE product_id = ANY($1)`,
      [ids]
    );

    const { rowCount: prodDel } = await client.query(
      `DELETE FROM products WHERE id = ANY($1)`,
      [ids]
    );

    await client.query('COMMIT');

    console.log(`\nRemovidos ${prodDel} produto(s) e ${movDel} movimentação(ões):\n`);
    produtos.forEach(p => console.log(`  - [${p.categoria}] ${p.nome}`));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch(err => { console.error('Erro:', err.message); process.exit(1); });
