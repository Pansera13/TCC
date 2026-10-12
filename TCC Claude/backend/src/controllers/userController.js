const bcrypt = require('bcrypt');
const pool = require('../db');

async function listUsers(req, res) {
  const [rows] = await pool.execute(
    'SELECT id, nome, nome_empresa, email, role, ativo, criado_em FROM usuarios ORDER BY criado_em ASC'
  );
  return res.json(rows);
}

async function createUser(req, res) {
  const { nome, cpf_cnpj, email, senha, role } = req.body;

  if (!nome?.trim() || !cpf_cnpj?.trim() || !email?.trim() || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  const [existingEmail] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
  if (existingEmail.length > 0) {
    return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
  }

  const [existingCpf] = await pool.execute(
    'SELECT id FROM usuarios WHERE REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, ".", ""), "-", ""), "/", ""), " ", "") = ?',
    [cpf_cnpj.replace(/\D/g, '')]
  );
  if (existingCpf.length > 0) {
    return res.status(409).json({ message: 'Este CPF já está cadastrado.' });
  }

  const senha_hash = await bcrypt.hash(senha, 12);
  const userRole = ['admin', 'user'].includes(role) ? role : 'user';

  const [result] = await pool.execute(
    'INSERT INTO usuarios (nome, nome_empresa, cpf_cnpj, email, senha_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
    [nome.trim(), nome.trim(), cpf_cnpj.trim(), email.toLowerCase().trim(), senha_hash, userRole]
  );

  return res.status(201).json({ id: result.insertId, message: 'Usuário criado com sucesso.' });
}

async function updateUserRole(req, res) {
  const id = parseInt(req.params.id);
  const { role } = req.body;

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Cargo inválido.' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ message: 'Você não pode alterar seu próprio cargo.' });
  }

  const [result] = await pool.execute('UPDATE usuarios SET role = ? WHERE id = ?', [role, id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  return res.json({ message: 'Cargo atualizado com sucesso.' });
}

async function toggleUserStatus(req, res) {
  const id = parseInt(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ message: 'Você não pode alterar o status da sua própria conta.' });
  }

  const [rows] = await pool.execute('SELECT ativo FROM usuarios WHERE id = ?', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  const newStatus = !rows[0].ativo;
  await pool.execute('UPDATE usuarios SET ativo = ? WHERE id = ?', [newStatus, id]);

  return res.json({ message: newStatus ? 'Conta ativada.' : 'Conta desativada.', ativo: newStatus });
}

module.exports = { listUsers, createUser, updateUserRole, toggleUserStatus };
