require('dotenv').config();
const { query } = require('./db');

async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('Conexão com o banco: OK');

    const tables = ['products', 'movements', 'usuarios'];
    for (const table of tables) {
      const { rows } = await query(`SELECT count(*) FROM ${table}`);
      console.log(`Tabela ${table}: ${rows[0].count} registros`);
    }

    console.log('\nTudo certo! Banco conectado e tabelas presentes.');
    process.exit(0);
  } catch (err) {
    if (err.message && err.message.includes('does not exist')) {
      console.error(`Tabela ausente: ${err.message}`);
      console.error('Verifique se as migrações foram aplicadas no Supabase.');
    } else {
      console.error('Falha na conexão:', err.message || err);
    }
    process.exit(1);
  }
}

testConnection();
