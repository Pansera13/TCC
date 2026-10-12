const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { queryNfe } = require('../services/nfeService');

router.use(authMiddleware);

router.get('/:chave', async (req, res) => {
  try {
    const produtos = await queryNfe(req.params.chave);
    return res.json({ produtos });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
});

module.exports = router;
