const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../db');

router.use(authMiddleware);

router.put('/', async (req, res) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
  await pool.execute('UPDATE usuarios SET nome = ? WHERE id = ?', [nome.trim(), req.user.id]);
  return res.json({ message: 'Nome atualizado.', nome: nome.trim() });
});

module.exports = router;
