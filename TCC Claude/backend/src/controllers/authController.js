const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { validarEmailRecuperacao, normalizar } = require('../utils/emailRecuperacao');
const { permissoesDoCargo } = require('../utils/permissoes');

async function verifyRecaptcha(token) {
  const response = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
  );
  return response.data.success;
}

async function register(req, res) {
  try {
    const { nome, nome_empresa, cpf_cnpj, email, senha, email_recuperacao, email_recuperacao_confirmacao, recaptchaToken } = req.body;
    const recaptchaEnabled = !!process.env.RECAPTCHA_SECRET;

    if (!nome || !nome_empresa || !cpf_cnpj || !email || !senha || (recaptchaEnabled && !recaptchaToken)) {
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    if (normalizar(email_recuperacao) !== normalizar(email_recuperacao_confirmacao)) {
      return res.status(400).json({ message: 'Os e-mails de recuperação não coincidem.', field: 'email_recuperacao_confirmacao' });
    }
    const recuperacao = validarEmailRecuperacao(email_recuperacao, email);
    if (!recuperacao.ok) {
      return res.status(400).json({ message: recuperacao.message, field: 'email_recuperacao', sugestao: recuperacao.sugestao });
    }

    if (recaptchaEnabled) {
      const captchaOk = await verifyRecaptcha(recaptchaToken);
      if (!captchaOk) {
        return res.status(400).json({ message: 'Verificação de CAPTCHA falhou.' });
      }
    }

    const emailExists = await User.findByEmail(email);
    if (emailExists) {
      return res.status(409).json({ message: 'Este e-mail já está cadastrado.', field: 'email' });
    }

    const cpfCnpjExists = await User.findByCpfCnpj(cpf_cnpj);
    if (cpfCnpjExists) {
      return res.status(409).json({ message: 'Este CPF/CNPJ já está cadastrado.', field: 'cpf_cnpj' });
    }

    const senha_hash = await bcrypt.hash(senha, 12);
    await User.create({ nome, nome_empresa, cpf_cnpj, email, senha_hash, email_recuperacao: recuperacao.email });

    return res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function login(req, res) {
  try {
    const { identifier, senha } = req.body;

    if (!identifier || !senha) {
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    const user = await User.findByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }

    const senhaOk = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaOk) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }

    if (!user.ativo) {
      return res.status(403).json({ message: 'Conta desativada. Entre em contato com o administrador.' });
    }

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, role: user.role || 'admin', tenant_id: user.tenant_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const role = user.role || 'admin';
    return res.status(200).json({
      token,
      nome: user.nome,
      role,
      id: user.id,
      avatar_url: user.avatar_url || null,
      permissoes: permissoesDoCargo(role),
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { register, login, verifyRecaptcha };
