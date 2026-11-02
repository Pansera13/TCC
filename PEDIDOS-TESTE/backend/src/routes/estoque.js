const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getProdutos } = require('../services/estoqueService');

// GET /estoque/produtos - proxy para a API do TCC Claude
router.get('/produtos', auth, async (_req, res) => {
  try {
    const produtos = await getProdutos();
    return res.json(produtos);
  } catch (err) {
    return res.status(503).json({ message: 'Serviço de estoque indisponível.', detalhe: err.message });
  }
});

module.exports = router;
