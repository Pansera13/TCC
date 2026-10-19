const bcrypt = require('bcrypt');
const db = require('../db');
const { rank, cargoValido, podeGerenciar } = require('../utils/roles');

const NAO_PODE_ALVO = 'Você não pode alterar alguém com cargo superior ao seu.';

// Carrega o cargo do alvo e confere se quem age pode gerenciá-lo. Devolve true se já respondeu com erro.
async function bloqueiaAlvoSuperior(req, res, id) {
  const { rows } = await db.query('SELECT role FROM usuarios WHERE id = $1', [id]);
  if (rows.length === 0) {
    res.status(404).json({ message: 'Usuário não encontrado.' });
    return true;
  }
  if (!podeGerenciar(req.user.role, rows[0].role)) {
    res.status(403).json({ message: NAO_PODE_ALVO });
    return true;
  }
  return false;
}

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
  const userRole = cargoValido(role) ? role : 'user';
  if (rank(userRole) > rank(req.user.role)) {
    return res.status(403).json({ message: 'Você não pode criar uma conta com cargo superior ao seu.' });
  }

  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, nome_empresa, cpf_cnpj, email, senha_hash, role, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [nome.trim(), nome.trim(), cpf_cnpj.trim(), email.toLowerCase().trim(), senha_hash, userRole, req.user.tenant_id]
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
    return res.status(400).json({ message: 'Você não pode alterar seu próprio cargo.' });
  }
  if (await bloqueiaAlvoSuperior(req, res, id)) return;
  if (rank(role) > rank(req.user.role)) {
    return res.status(403).json({ message: 'Você não pode atribuir um cargo superior ao seu.' });
  }

  const { rowCount } = await db.query(
    `UPDATE usuarios SET role = $1 WHERE id = $2`,
    [role, id]
  );
  if (rowCount === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  return res.json({ message: 'Cargo atualizado com sucesso.' });
}

async function toggleUserStatus(req, res) {
  const id = parseInt(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ message: 'Você não pode alterar o status da sua própria conta.' });
  }
  if (await bloqueiaAlvoSuperior(req, res, id)) return;

  const { rows } = await db.query(`SELECT ativo FROM usuarios WHERE id = $1`, [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  const newStatus = !rows[0].ativo;
  await db.query(`UPDATE usuarios SET ativo = $1 WHERE id = $2`, [newStatus, id]);

  return res.json({ message: newStatus ? 'Conta ativada.' : 'Conta desativada.', ativo: newStatus });
}

async function deleteUser(req, res) {
  const id = parseInt(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ message: 'Você não pode remover sua própria conta.' });
  }
  if (await bloqueiaAlvoSuperior(req, res, id)) return;

  const { rowCount } = await db.query(`DELETE FROM usuarios WHERE id = $1`, [id]);
  if (rowCount === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  return res.json({ message: 'Usuário removido com sucesso.' });
}

module.exports = { listUsers, createUser, updateUserRole, toggleUserStatus, deleteUser };
