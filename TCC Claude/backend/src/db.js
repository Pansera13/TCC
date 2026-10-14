const { Pool, types } = require('pg');
require('dotenv').config();

types.setTypeParser(1700, parseFloat);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params) {
  const result = await pool.query(sql, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

module.exports = { query };
