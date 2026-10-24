const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../db');
const bcrypt = require('bcrypt');
const { criarLimite } = require('../middleware/limiteRequisicoes');
const { validarEmailRecuperacao, normalizar } = require('../utils/emailRecuperacao');
const { permissoesDoCargo } = require('../utils/permissoes');

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
  const { rows } = await db.query(
    'SELECT avatar_url, role, email_recuperacao, (tenant_id = id) AS conta_principal FROM usuarios WHERE id = $1',
    [req.user.id]
  );
  const u = rows[0];
  const role = u?.role || null;
  return res.json({
    avatar_url: u?.avatar_url || null,
    role,
    email_recuperacao: u?.email_recuperacao || null,
    conta_principal: !!u?.conta_principal,
    permissoes: role ? permissoesDoCargo(role) : [],
  });
});

// Senha errada ao trocar o e-mail de recuperação: 5 erros a cada 15 min por usuário
const errosSenha = criarLimite({ max: 5, janelaMs: 15 * 60 * 1000 });

router.put('/email-recuperacao', async (req, res) => {
  try {
    const { email_recuperacao, confirmacao, senha_atual } = req.body;
    const { rows } = await db.query(
      'SELECT email, senha_hash, (tenant_id = id) AS conta_principal FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    const conta = rows[0];
    if (!conta) return res.status(404).json({ message: 'Conta não encontrada.' });
    if (!conta.conta_principal) {
      return res.status(403).json({ message: 'Somente o dono da conta pode alterar o e-mail de recuperação.' });
    }

    const espera = errosSenha.restante(req.user.id);
    if (espera > 0) {
      res.set('Retry-After', String(espera));
      return res.status(429).json({ message: `Muitas tentativas. Tente novamente em ${espera} segundos.`, retry_after: espera });
    }

    if (!senha_atual) return res.status(400).json({ message: 'Informe a senha atual.', field: 'senha_atual' });
    if (!(await bcrypt.compare(String(senha_atual), conta.senha_hash))) {
      errosSenha.registrar(req.user.id);
      return res.status(400).json({ message: 'Senha atual incorreta.', field: 'senha_atual' });
    }
    errosSenha.limpar(req.user.id);

    if (normalizar(email_recuperacao) !== normalizar(confirmacao)) {
      return res.status(400).json({ message: 'Os e-mails de recuperação não coincidem.', field: 'confirmacao' });
    }
    const validacao = validarEmailRecuperacao(email_recuperacao, conta.email);
    if (!validacao.ok) {
      return res.status(400).json({ message: validacao.message, field: 'email_recuperacao', sugestao: validacao.sugestao });
    }

    await db.query('UPDATE usuarios SET email_recuperacao = $1 WHERE id = $2', [validacao.email, req.user.id]);
    // Resolve o aviso "Cadastre seu e-mail de recuperação", se existir (a tabela pode não existir em ambientes antigos)
    await db.query(
      `UPDATE notificacoes SET dispensada = true, lida = true
       WHERE usuario_id = $1 AND tipo = 'cadastrar-email-recuperacao' AND dispensada = false`,
      [req.user.id]
    );
    return res.json({ message: 'E-mail de recuperação atualizado.', email_recuperacao: validacao.email });
  } catch (err) {
    console.error('email-recuperacao error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

module.exports = router;
