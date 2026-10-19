const db = require('../db');

function detectIdentifierType(value) {
  if (value.includes('@')) return 'email';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 || digits.length === 14) return 'cpf_cnpj';
  return 'nome_empresa';
}

async function findByIdentifier(value) {
  const field = detectIdentifierType(value);
  if (field === 'email') {
    const { rows } = await db.query(
      `SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)`,
      [value.trim()]
    );
    return rows[0] || null;
  }
  if (field === 'cpf_cnpj') {
    const digits = value.replace(/\D/g, '');
    const { rows } = await db.query(
      `SELECT * FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = $1`,
      [digits]
    );
    return rows[0] || null;
  }
  const { rows } = await db.query(
    `SELECT * FROM usuarios WHERE LOWER(nome_empresa) = LOWER($1)`,
    [value.trim()]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT * FROM usuarios WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findByCpfCnpj(cpfCnpj) {
  const digits = cpfCnpj.replace(/\D/g, '');
  const { rows } = await db.query(
    `SELECT * FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = $1`,
    [digits]
  );
  return rows[0] || null;
}

async function create({ nome, nome_empresa, cpf_cnpj, email, senha_hash }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, nome_empresa, cpf_cnpj, email, senha_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [nome, nome_empresa, cpf_cnpj, email.toLowerCase().trim(), senha_hash]
  );
  const id = rows[0].id;
  await db.query(`UPDATE usuarios SET tenant_id = $1 WHERE id = $1`, [id]);
  return id;
}

async function updateResetCode(id, reset_code_hash, reset_code_expires_at) {
  await db.query(
    `UPDATE usuarios SET reset_code_hash = $1, reset_code_expires_at = $2 WHERE id = $3`,
    [reset_code_hash, reset_code_expires_at, id]
  );
}

async function updatePassword(id, senha_hash) {
  await db.query(
    `UPDATE usuarios SET senha_hash = $1, reset_code_hash = NULL, reset_code_expires_at = NULL WHERE id = $2`,
    [senha_hash, id]
  );
}

module.exports = { findByIdentifier, findByEmail, findByCpfCnpj, create, updateResetCode, updatePassword };
