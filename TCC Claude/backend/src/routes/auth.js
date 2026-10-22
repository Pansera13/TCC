const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { buscar, enviarCodigo, verificarCodigo, redefinirSenha } = require('../controllers/recuperacaoController');
const { limitePorIp } = require('../middleware/limiteRequisicoes');

router.post('/register', register);
router.post('/login', login);

// Recuperação de senha (design.md D3 a D5)
const limiteBusca = limitePorIp({ max: 10, janelaMs: 15 * 60 * 1000 }, 'Muitas buscas. Tente novamente mais tarde.');
const limiteCodigo = limitePorIp({ max: 30, janelaMs: 15 * 60 * 1000 }, 'Muitas tentativas. Tente novamente mais tarde.');
router.post('/recuperacao/buscar', limiteBusca, buscar);
router.post('/recuperacao/enviar-codigo', enviarCodigo);
router.post('/recuperacao/verificar-codigo', limiteCodigo, verificarCodigo);
router.post('/recuperacao/redefinir-senha', limiteCodigo, redefinirSenha);

module.exports = router;
