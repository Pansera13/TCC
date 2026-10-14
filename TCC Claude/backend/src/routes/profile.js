const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../db');

router.use(authMiddleware);

router.put('/', async (req, res) => {
  const { nome, avatar_url } = req.body;

  if (nome !== undefined) {
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    await db.query('UPDATE usuarios SET nome = $1 WHERE id = $2', [nome.trim(), req.user.id]);
  }

  if (avatar_url !== undefined) {
    const value = avatar_url === null ? null : String(avatar_url).slice(0, 2 * 1024 * 1024);
    await db.query('UPDATE usuarios SET avatar_url = $1 WHERE id = $2', [value, req.user.id]);
  }

  return res.json({ message: 'Perfil atualizado.', nome: nome?.trim(), avatar_url });
});

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT avatar_url FROM usuarios WHERE id = $1', [req.user.id]);
  return res.json({ avatar_url: rows[0]?.avatar_url || null });
});

module.exports = router;
