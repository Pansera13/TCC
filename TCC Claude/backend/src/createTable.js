const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTable() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  await conn.query(`USE \`${process.env.DB_NAME}\``);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id                    INT PRIMARY KEY AUTO_INCREMENT,
      nome                  VARCHAR(150) NOT NULL,
      nome_empresa          VARCHAR(150) NOT NULL,
      cpf_cnpj              VARCHAR(18)  NOT NULL UNIQUE,
      email                 VARCHAR(150) NOT NULL UNIQUE,
      senha_hash            VARCHAR(255) NOT NULL,
      reset_code_hash       VARCHAR(255) NULL,
      reset_code_expires_at DATETIME     NULL,
      ativo                 BOOLEAN      DEFAULT TRUE,
      criado_em             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Tabela `usuarios` criada com sucesso no banco `' + process.env.DB_NAME + '`.');
  await conn.end();
}

createTable().catch(err => {
  console.error('Erro ao criar tabela:', err.message || err.code || err);
  console.error('Detalhes:', JSON.stringify({ code: err.code, errno: err.errno, sqlState: err.sqlState, address: err.address, port: err.port }));
  process.exit(1);
});
