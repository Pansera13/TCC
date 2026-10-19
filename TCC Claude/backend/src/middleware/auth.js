const jwt = require('jsonwebtoken');
const db = require('../db');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autorizado' });
  }
  const token = header.split(' ')[1];

  // 1) Valida o token. Só aqui um erro significa "sessão inválida" (401).
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Sua sessão expirou. Entre novamente.' : 'Não autorizado';
    return res.status(401).json({ message });
  }

  // 2) O token sozinho não basta: conta desativada ou removida perde o acesso na hora,
  //    e cargo e nome vêm sempre do banco (não do token, que pode estar desatualizado).
  //    Falha do banco NÃO é 401: responde 503 para o painel não encerrar a sessão por um erro passageiro.
  let conta;
  try {
    const { rows } = await db.query('SELECT nome, role, ativo, tenant_id FROM usuarios WHERE id = $1', [payload.id]);
    conta = rows[0];
  } catch (err) {
    console.error('auth: falha ao consultar a conta', err.message);
    return res.status(503).json({ message: 'Não foi possível validar o acesso agora. Tente novamente.' });
  }

  if (!conta) {
    return res.status(401).json({ message: 'Conta não encontrada. Entre novamente.' });
  }
  if (!conta.ativo) {
    return res.status(401).json({ message: 'Sua conta foi desativada. Entre em contato com o administrador.' });
  }

  payload.nome = conta.nome;
  payload.role = conta.role;
  payload.tenant_id = conta.tenant_id;
  req.user = payload;
  next();
}

module.exports = authMiddleware;
