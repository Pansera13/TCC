const { isGestor } = require('../utils/roles');

// Funções de gestão (equipe, remoção de produtos...): administrador e sócio
function adminMiddleware(req, res, next) {
  if (!isGestor(req.user?.role)) {
    return res.status(403).json({ message: 'Acesso restrito a administradores e sócios.' });
  }
  next();
}

module.exports = adminMiddleware;
