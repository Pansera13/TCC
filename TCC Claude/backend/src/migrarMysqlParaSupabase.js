/**
 * Script de migração única: MySQL → Supabase
 * Copia usuarios, products e movements preservando os IDs originais.
 * Requer: DB_HOST, DB_USER, DB_PASS, DB_NAME (MySQL) + DATABASE_URL (Supabase) no .env
 * Executar: node src/migrarMysqlParaSupabase.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Pool, types } = require('pg');

types.setTypeParser(1700, parseFloat);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const mysql_conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  console.log('Conectado ao MySQL e ao Supabase.\n');

  // ── usuarios ────────────────────────────────────────────────────────────────
  const [usuarios] = await mysql_conn.execute('SELECT * FROM usuarios');
  console.log(`Migrando ${usuarios.length} usuários...`);
  for (const u of usuarios) {
    await pgPool.query(
      `INSERT INTO usuarios (id, nome, nome_empresa, cpf_cnpj, email, senha_hash,
         reset_code_hash, reset_code_expires_at, ativo, role, criado_em)
       OVERRIDING SYSTEM VALUE
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.nome, u.nome_empresa, u.cpf_cnpj, u.email, u.senha_hash,
       u.reset_code_hash || null, u.reset_code_expires_at || null,
       Boolean(u.ativo), u.role || 'admin', u.criado_em]
    );
  }
  if (usuarios.length > 0) {
    await pgPool.query(
      `SELECT setval(pg_get_serial_sequence('usuarios','id'), (SELECT MAX(id) FROM usuarios))`
    );
  }
  console.log(`✓ ${usuarios.length} usuários migrados.\n`);

  // ── products ────────────────────────────────────────────────────────────────
  const [products] = await mysql_conn.execute('SELECT * FROM products');
  console.log(`Migrando ${products.length} produtos...`);
  for (const p of products) {
    await pgPool.query(
      `INSERT INTO products (id, nome, quantidade, unidade, peso_kg, categoria, fornecedor, created_at)
       OVERRIDING SYSTEM VALUE
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.nome, parseFloat(p.quantidade), p.unidade,
       p.peso_kg != null ? parseFloat(p.peso_kg) : null,
       p.categoria || null, p.fornecedor || null, p.created_at]
    );
  }
  if (products.length > 0) {
    await pgPool.query(
      `SELECT setval(pg_get_serial_sequence('products','id'), (SELECT MAX(id) FROM products))`
    );
  }
  console.log(`✓ ${products.length} produtos migrados.\n`);

  // ── movements ───────────────────────────────────────────────────────────────
  const [movements] = await mysql_conn.execute('SELECT * FROM movements');
  console.log(`Migrando ${movements.length} movimentações...`);
  for (const m of movements) {
    await pgPool.query(
      `INSERT INTO movements (id, product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, pedido_id, created_at)
       OVERRIDING SYSTEM VALUE
       VALUES ($1,$2,$3,$4,$5,$6,$7,'estoque',NULL,$8)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.product_id, m.product_nome, m.tipo,
       parseFloat(m.quantidade), m.user_id, m.user_nome, m.created_at]
    );
  }
  if (movements.length > 0) {
    await pgPool.query(
      `SELECT setval(pg_get_serial_sequence('movements','id'), (SELECT MAX(id) FROM movements))`
    );
  }
  console.log(`✓ ${movements.length} movimentações migradas.\n`);

  await mysql_conn.end();
  await pgPool.end();
  console.log('Migração concluída com sucesso!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err.message || err);
  process.exit(1);
});
