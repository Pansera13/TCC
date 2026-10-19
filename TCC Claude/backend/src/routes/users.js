const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exigePermissao = require('../middleware/exigePermissao');
const { listUsers, createUser, updateUserRole, toggleUserStatus, deleteUser } = require('../controllers/userController');

router.use(authMiddleware);

router.get('/', exigePermissao('equipe:ver'), listUsers);
router.post('/', exigePermissao('usuario:criar-funcionario'), createUser);
router.put('/:id/role', exigePermissao('usuario:alterar-cargo'), updateUserRole);
router.put('/:id/status', exigePermissao('usuario:status-funcionario'), toggleUserStatus);
router.delete('/:id', exigePermissao('usuario:excluir'), deleteUser);

module.exports = router;
