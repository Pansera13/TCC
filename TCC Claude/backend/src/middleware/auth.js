const jwt = require('jsonwebtoken');
const db = require('../db');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autorizado' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.role) {
      const { rows } = await db.query('SELECT role, ativo FROM usuarios WHERE id = $1', [payload.id]);
      if (!rows[0] || !rows[0].ativo) {
        return res.status(401).json({ message: 'Conta inativa ou não encontrada.' });
      }
      payload.role = rows[0].role;
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Não autorizado' });
  }
}

module.exports = authMiddleware;
