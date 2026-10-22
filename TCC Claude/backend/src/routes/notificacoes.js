const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { listar, marcarLidas, dispensar } = require('../controllers/notificacaoController');

router.use(authMiddleware);

router.get('/', listar);
router.post('/marcar-lidas', marcarLidas);
router.post('/:id/dispensar', dispensar);

module.exports = router;
