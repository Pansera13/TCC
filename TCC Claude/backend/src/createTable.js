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

  // Adiciona coluna role se ainda não existir
  try {
    await conn.query(`ALTER TABLE usuarios ADD COLUMN role ENUM('admin','user') NOT NULL DEFAULT 'admin'`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      nome       VARCHAR(255) NOT NULL,
      quantidade DECIMAL(10,3) NOT NULL DEFAULT 0,
      unidade    VARCHAR(10) NOT NULL DEFAULT 'UN',
      peso_kg    DECIMAL(10,3) NULL,
      categoria  VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await conn.query(`ALTER TABLE products ADD COLUMN fornecedor VARCHAR(150) NULL`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS movements (
      id           INT PRIMARY KEY AUTO_INCREMENT,
      product_id   INT NOT NULL,
      product_nome VARCHAR(255) NOT NULL,
      tipo         ENUM('entrada','saida') NOT NULL,
      quantidade   DECIMAL(10,3) NOT NULL,
      user_id      INT NOT NULL,
      user_nome    VARCHAR(150) NOT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_product (product_id),
      INDEX idx_created (created_at)
    )
  `);

  console.log('Tabelas criadas com sucesso no banco `' + process.env.DB_NAME + '`.');
  await conn.end();
}

createTable().catch(err => {
  console.error('Erro ao criar tabela:', err.message || err.code || err);
  console.error('Detalhes:', JSON.stringify({ code: err.code, errno: err.errno, sqlState: err.sqlState, address: err.address, port: err.port }));
  process.exit(1);
});
