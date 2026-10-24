const bcrypt = require('bcrypt');
const db = require('../db');
const { cargoValido, podeAlterarConta, podeCriarCargo } = require('../utils/permissoes');

async function listUsers(req, res) {
  const { rows } = await db.query(
    `SELECT id, nome, nome_empresa, email, role, ativo, criado_em FROM usuarios WHERE tenant_id = $1 ORDER BY criado_em ASC`,
    [req.user.tenant_id]
  );
  return res.json(rows);
}

async function createUser(req, res) {
  const { nome, cpf_cnpj, email, senha, role } = req.body;

  if (!nome?.trim() || !cpf_cnpj?.trim() || !email?.trim() || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  const cargoNovo = cargoValido(role) ? role : 'user';
  if (!podeCriarCargo(req.user.role, cargoNovo)) {
    return res.status(403).json({ message: 'Você não tem permissão para criar uma conta com esse cargo.' });
  }

  const { rows: existingEmail } = await db.query(
    `SELECT id FROM usuarios WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  if (existingEmail.length > 0) {
    return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
  }

  const { rows: existingCpf } = await db.query(
    `SELECT id FROM usuarios WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = $1`,
    [cpf_cnpj.replace(/\D/g, '')]
  );
  if (existingCpf.length > 0) {
    return res.status(409).json({ message: 'Este CPF já está cadastrado.' });
  }

  const senha_hash = await bcrypt.hash(senha, 12);

  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, nome_empresa, cpf_cnpj, email, senha_hash, role, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [nome.trim(), nome.trim(), cpf_cnpj.trim(), email.toLowerCase().trim(), senha_hash, cargoNovo, req.user.tenant_id]
  );

  return res.status(201).json({ id: rows[0].id, message: 'Usuário criado com sucesso.' });
}

async function updateUserRole(req, res) {
  const id = parseInt(req.params.id);
  const { role } = req.body;

  if (!cargoValido(role)) {
    return res.status(400).json({ message: 'Cargo inválido.' });
  }
  if (id === req.user.id) {
    return res.status(403).json({ message: 'Você não pode alterar o próprio cargo.' });
  }

  const { rows } = await db.query('SELECT role FROM usuarios WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }
  if (!podeAlterarConta(req.user.role, rows[0].role)) {
    return res.status(403).json({ message: 'Você não tem permissão para alterar esse usuário.' });
  }

  await db.query(`UPDATE usuarios SET role = $1 WHERE id = $2`, [role, id]);

  return res.json({ message: 'Cargo atualizado com sucesso.' });
}

async function toggleUserStatus(req, res) {
  const id = parseInt(req.params.id);

  if (id === req.user.id) {
    return res.status(403).json({ message: 'Você não pode alterar o status da própria conta.' });
  }

  const { rows } = await db.query(`SELECT ativo, role FROM usuarios WHERE id = $1 AND tenant_id = $2`, [id, req.user.tenant_id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }
  if (!podeAlterarConta(req.user.role, rows[0].role)) {
    return res.status(403).json({ message: 'Você não tem permissão para alterar esse usuário.' });
  }

  const newStatus = !rows[0].ativo;
  await db.query(`UPDATE usuarios SET ativo = $1 WHERE id = $2`, [newStatus, id]);

  return res.json({ message: newStatus ? 'Conta ativada.' : 'Conta desativada.', ativo: newStatus });
}

async function deleteUser(req, res) {
  const id = parseInt(req.params.id);

  if (id === req.user.id) {
    return res.status(403).json({ message: 'Você não pode remover a própria conta.' });
  }

  const { rows } = await db.query('SELECT role FROM usuarios WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }
  if (!podeAlterarConta(req.user.role, rows[0].role)) {
    return res.status(403).json({ message: 'Você não tem permissão para remover esse usuário.' });
  }

  await db.query(`DELETE FROM usuarios WHERE id = $1`, [id]);

  return res.json({ message: 'Usuário removido com sucesso.' });
}

module.exports = { listUsers, createUser, updateUserRole, toggleUserStatus, deleteUser };
