const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exigePermissao = require('../middleware/exigePermissao');
const { listMovements, listMovementUsers } = require('../controllers/movementController');

router.use(authMiddleware);
router.get('/users', exigePermissao('estoque:ver'), listMovementUsers);
router.get('/', exigePermissao('estoque:ver'), listMovements);

module.exports = router;
