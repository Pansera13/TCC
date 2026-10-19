const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exigePermissao = require('../middleware/exigePermissao');
const { getReport } = require('../controllers/reportController');

router.use(authMiddleware);
router.get('/', exigePermissao('relatorio:ver'), getReport);

module.exports = router;
