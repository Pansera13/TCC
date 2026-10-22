// Notificações do usuário autenticado. Todas as consultas filtram por req.user.id.
const db = require('../db');

async function listar(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT id, tipo, titulo, texto, acao, lida, criado_em FROM notificacoes
       WHERE usuario_id = $1 AND dispensada = false ORDER BY criado_em DESC, id DESC`,
      [req.user.id]
    );
    return res.json({ itens: rows, nao_lidas: rows.filter((n) => !n.lida).length });
  } catch (err) {
    console.error('notificacoes/listar error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function marcarLidas(req, res) {
  try {
    await db.query('UPDATE notificacoes SET lida = true WHERE usuario_id = $1 AND lida = false AND dispensada = false', [req.user.id]);
    return res.json({ nao_lidas: 0 });
  } catch (err) {
    console.error('notificacoes/marcar-lidas error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function dispensar(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).json({ message: 'Notificação não encontrada.' });
    const { rowCount } = await db.query(
      'UPDATE notificacoes SET dispensada = true, lida = true WHERE id = $1 AND usuario_id = $2 AND dispensada = false',
      [id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Notificação não encontrada.' });
    return res.json({ message: 'Notificação dispensada.' });
  } catch (err) {
    console.error('notificacoes/dispensar error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listar, marcarLidas, dispensar };
