const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');

async function verifyRecaptcha(token) {
  const response = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
  );
  return response.data.success;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendResetEmail(email, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: '"StockFlow" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: 'Código de recuperação de senha — StockFlow',
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto">
        <h2 style="color:#7C3AED">StockFlow</h2>
        <p>Seu código de recuperação de senha é:</p>
        <h1 style="letter-spacing:8px;color:#E879F9">${code}</h1>
        <p style="color:#666;font-size:13px">Este código expira em 15 minutos.</p>
      </div>
    `,
  });
}

async function register(req, res) {
  try {
    const { nome, nome_empresa, cpf_cnpj, email, senha, recaptchaToken } = req.body;

    if (!nome || !nome_empresa || !cpf_cnpj || !email || !senha || !recaptchaToken) {
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    const captchaOk = await verifyRecaptcha(recaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ message: 'Verificação de CAPTCHA falhou.' });
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
    await User.create({ nome, nome_empresa, cpf_cnpj, email, senha_hash });

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

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({ token, nome: user.nome });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email, cpf_cnpj, recaptchaToken } = req.body;

    if (!email || !cpf_cnpj || !recaptchaToken) {
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    const captchaOk = await verifyRecaptcha(recaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ message: 'Verificação de CAPTCHA falhou.' });
    }

    const user = await User.findByEmail(email);
    if (user) {
      const userCpfDigits = user.cpf_cnpj.replace(/\D/g, '');
      const inputDigits = cpf_cnpj.replace(/\D/g, '');
      if (userCpfDigits === inputDigits) {
        const code = generateCode();
        const hash = await bcrypt.hash(code, 10);
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        await User.updateResetCode(user.id, hash, expires);
        await sendResetEmail(user.email, code).catch(() => {});
      }
    }

    return res.status(200).json({ message: 'Se os dados estiverem corretos, um código foi enviado.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function verifyCode(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const user = await User.findByEmail(email);
    if (!user || !user.reset_code_hash || !user.reset_code_expires_at) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    if (new Date() > new Date(user.reset_code_expires_at)) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    const codeOk = await bcrypt.compare(String(code), user.reset_code_hash);
    if (!codeOk) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    const resetToken = jwt.sign(
      { id: user.id, scope: 'reset-password' },
      process.env.JWT_RESET_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({ resetToken });
  } catch (err) {
    console.error('verifyCode error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { resetToken, novaSenha } = req.body;

    if (!resetToken || !novaSenha) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
    } catch {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    if (payload.scope !== 'reset-password') {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }

    const senha_hash = await bcrypt.hash(novaSenha, 12);
    await User.updatePassword(payload.id, senha_hash);

    return res.status(200).json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { register, login, forgotPassword, verifyCode, resetPassword };
