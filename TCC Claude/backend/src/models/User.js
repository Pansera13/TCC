const db = require('../db');

function detectIdentifierType(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return 'cpf_cnpj';
  if (digits.length === 14) return 'cpf_cnpj';
  return 'nome_empresa';
}

async function findByIdentifier(value) {
  const field = detectIdentifierType(value);
  if (field === 'cpf_cnpj') {
    const digits = value.replace(/\D/g, '');
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, ".", ""), "-", ""), "/", ""), " ", "") = ? AND ativo = TRUE',
      [digits]
    );
    return rows[0] || null;
  }
  const [rows] = await db.query(
    'SELECT * FROM usuarios WHERE LOWER(nome_empresa) = LOWER(?) AND ativo = TRUE',
    [value.trim()]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await db.query(
    'SELECT * FROM usuarios WHERE email = ?',
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findByCpfCnpj(cpfCnpj) {
  const digits = cpfCnpj.replace(/\D/g, '');
  const [rows] = await db.query(
    'SELECT * FROM usuarios WHERE REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, ".", ""), "-", ""), "/", ""), " ", "") = ?',
    [digits]
  );
  return rows[0] || null;
}

async function create({ nome, nome_empresa, cpf_cnpj, email, senha_hash }) {
  const [result] = await db.query(
    'INSERT INTO usuarios (nome, nome_empresa, cpf_cnpj, email, senha_hash) VALUES (?, ?, ?, ?, ?)',
    [nome, nome_empresa, cpf_cnpj, email.toLowerCase().trim(), senha_hash]
  );
  return result.insertId;
}

async function updateResetCode(id, reset_code_hash, reset_code_expires_at) {
  await db.query(
    'UPDATE usuarios SET reset_code_hash = ?, reset_code_expires_at = ? WHERE id = ?',
    [reset_code_hash, reset_code_expires_at, id]
  );
}

async function updatePassword(id, senha_hash) {
  await db.query(
    'UPDATE usuarios SET senha_hash = ?, reset_code_hash = NULL, reset_code_expires_at = NULL WHERE id = ?',
    [senha_hash, id]
  );
}

module.exports = { findByIdentifier, findByEmail, findByCpfCnpj, create, updateResetCode, updatePassword };
