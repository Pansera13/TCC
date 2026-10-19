const { can } = require('../utils/permissoes');

// Exige que o cargo de quem chama (req.user.role, vindo do banco no authMiddleware) tenha a permissão
function exigePermissao(permissao) {
  return (req, res, next) => {
    if (!can(req.user?.role, permissao)) {
      return res.status(403).json({ message: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

module.exports = exigePermissao;
