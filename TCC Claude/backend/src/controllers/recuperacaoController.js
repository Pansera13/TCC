// Recuperação de senha por código enviado ao e-mail de recuperação (conta principal).
// Fluxo: buscar -> enviar-codigo -> verificar-codigo -> redefinir-senha (design.md D3 a D7).
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const User = require('../models/User');
const { verifyRecaptcha } = require('./authController');
const { enviarCodigoRecuperacao } = require('../services/emailService');
const { criarLimite, ipDe } = require('../middleware/limiteRequisicoes');

const VALIDADE_CODIGO_MS = 15 * 60 * 1000;
const INTERVALO_REENVIO_S = 60;
const MAX_TENTATIVAS = 5;
const HORA_MS = 60 * 60 * 1000;

const enviosPorConta = criarLimite({ max: 3, janelaMs: HORA_MS });
const enviosPorIp = criarLimite({ max: 10, janelaMs: HORA_MS });

const segredo = () => process.env.JWT_RESET_SECRET || `${process.env.JWT_SECRET}-reset`;

function assinar(payload) {
  return jwt.sign(payload, segredo(), { expiresIn: '10m' });
}

function lerToken(token, escopo) {
  try {
    const dados = jwt.verify(String(token || ''), segredo());
    return dados.escopo === escopo ? dados : null;
  } catch {
    return null;
  }
}

const hashCodigo = (id, codigo) => crypto.createHmac('sha256', segredo()).update(`${id}:${codigo}`).digest('hex');
const impressao = (hash) => String(hash).slice(0, 16);

function igual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function mascararNome(nome) {
  return `${String(nome || '').trim().slice(0, 2)}***`;
}

function mascararEmail(email) {
  const [local, dominio] = String(email).split('@');
  return `${local.slice(0, 1)}***@${dominio}`;
}

// Devolve { status, body } quando a conta não pode recuperar a senha, ou null se pode
function semSaida(conta) {
  if (conta.tenant_id !== conta.id) {
    return { status: 403, body: { codigo: 'conta_equipe', message: 'Esta conta é de equipe. Peça ao administrador da sua empresa para redefinir a sua senha.' } };
  }
  if (!conta.ativo) {
    return { status: 403, body: { codigo: 'conta_desativada', message: 'Esta conta está desativada. Fale com o administrador.' } };
  }
  if (!conta.email_recuperacao) {
    return { status: 422, body: { codigo: 'sem_email', message: 'Esta conta não tem e-mail de recuperação cadastrado. Procure o suporte.' } };
  }
  return null;
}

async function carregarConta(id) {
  const { rows } = await db.query(
    `SELECT id, nome, tenant_id, ativo, email_recuperacao, reset_code_hash, reset_code_expires_at, reset_code_tentativas
     FROM usuarios WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

const apagarCodigo = (id) =>
  db.query('UPDATE usuarios SET reset_code_hash = NULL, reset_code_expires_at = NULL, reset_code_tentativas = 0 WHERE id = $1', [id]);

async function buscar(req, res) {
  try {
    const { identificador, recaptchaToken } = req.body;
    if (!identificador || !String(identificador).trim()) {
      return res.status(400).json({ message: 'Informe o e-mail de login ou o CPF/CNPJ.' });
    }
    if (process.env.RECAPTCHA_SECRET) {
      if (!recaptchaToken || !(await verifyRecaptcha(recaptchaToken))) {
        return res.status(400).json({ message: 'Verificação de CAPTCHA falhou.' });
      }
    }

    const valor = String(identificador).trim();
    const digitos = valor.replace(/\D/g, '');
    let conta = null;
    if (valor.includes('@')) conta = await User.findByEmail(valor);
    else if (digitos.length === 11 || digitos.length === 14) conta = await User.findByCpfCnpj(valor);
    if (!conta) return res.status(404).json({ codigo: 'nao_encontrada', message: 'Conta não encontrada.' });

    const completa = await carregarConta(conta.id);
    const bloqueio = semSaida(completa);
    if (bloqueio) return res.status(bloqueio.status).json(bloqueio.body);

    return res.json({
      busca_token: assinar({ id: completa.id, escopo: 'recuperacao-busca' }),
      nome_mascarado: mascararNome(completa.nome),
      email_mascarado: mascararEmail(completa.email_recuperacao),
    });
  } catch (err) {
    console.error('recuperacao/buscar error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

function recusar429(res, segundos, message) {
  res.set('Retry-After', String(segundos));
  return res.status(429).json({ message, retry_after: segundos });
}

async function enviarCodigo(req, res) {
  try {
    const dados = lerToken(req.body.busca_token, 'recuperacao-busca');
    if (!dados) return res.status(400).json({ message: 'A busca expirou. Comece de novo.' });
    const conta = await carregarConta(dados.id);
    if (!conta) return res.status(404).json({ codigo: 'nao_encontrada', message: 'Conta não encontrada.' });
    const bloqueio = semSaida(conta);
    if (bloqueio) return res.status(bloqueio.status).json(bloqueio.body);

    // 60 s entre envios (o instante do último envio é o prazo menos 15 min)
    if (conta.reset_code_expires_at) {
      const ultimoEnvio = new Date(conta.reset_code_expires_at).getTime() - VALIDADE_CODIGO_MS;
      const espera = Math.ceil((ultimoEnvio + INTERVALO_REENVIO_S * 1000 - Date.now()) / 1000);
      if (espera > 0) return recusar429(res, espera, `Aguarde ${espera} segundos para reenviar o código.`);
    }
    const ip = ipDe(req);
    const esperaConta = enviosPorConta.restante(String(conta.id));
    const esperaIp = enviosPorIp.restante(ip);
    if (esperaConta > 0 || esperaIp > 0) {
      return recusar429(res, Math.max(esperaConta, esperaIp), 'Muitos códigos solicitados. Tente novamente mais tarde.');
    }
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ message: 'O envio de e-mail não está disponível no momento.' });
    }

    const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await db.query(
      'UPDATE usuarios SET reset_code_hash = $1, reset_code_expires_at = $2, reset_code_tentativas = 0 WHERE id = $3',
      [hashCodigo(conta.id, codigo), new Date(Date.now() + VALIDADE_CODIGO_MS), conta.id]
    );
    try {
      await enviarCodigoRecuperacao(conta.email_recuperacao, codigo);
    } catch (err) {
      console.error('recuperacao/enviar-codigo: falha no envio:', err.message);
      await apagarCodigo(conta.id); // não deixa código válido gravado nem consome o reenvio
      return res.status(502).json({ message: 'Não foi possível enviar o e-mail agora. Tente novamente.' });
    }
    enviosPorConta.registrar(String(conta.id));
    enviosPorIp.registrar(ip);
    return res.json({ message: 'Código enviado.', reenvio_em: INTERVALO_REENVIO_S });
  } catch (err) {
    console.error('recuperacao/enviar-codigo error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function verificarCodigo(req, res) {
  try {
    const dados = lerToken(req.body.busca_token, 'recuperacao-busca');
    if (!dados) return res.status(400).json({ message: 'A busca expirou. Comece de novo.' });
    const conta = await carregarConta(dados.id);
    if (!conta || semSaida(conta)) return res.status(400).json({ message: 'Código inválido ou expirado.' });

    const codigo = String(req.body.codigo ?? '').trim();
    const vigente = conta.reset_code_hash && conta.reset_code_expires_at && new Date(conta.reset_code_expires_at) > new Date();
    if (!vigente) return res.status(400).json({ message: 'Código inválido ou expirado.', tentativas_restantes: 0 });

    if (!/^\d{6}$/.test(codigo) || !igual(hashCodigo(conta.id, codigo), conta.reset_code_hash)) {
      const { rows } = await db.query(
        'UPDATE usuarios SET reset_code_tentativas = reset_code_tentativas + 1 WHERE id = $1 RETURNING reset_code_tentativas',
        [conta.id]
      );
      const restantes = Math.max(0, MAX_TENTATIVAS - rows[0].reset_code_tentativas);
      if (restantes === 0) await apagarCodigo(conta.id);
      return res.status(400).json({ message: 'Código inválido ou expirado.', tentativas_restantes: restantes });
    }

    return res.json({ reset_token: assinar({ id: conta.id, escopo: 'recuperacao-redefinir', imp: impressao(conta.reset_code_hash) }) });
  } catch (err) {
    console.error('recuperacao/verificar-codigo error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function redefinirSenha(req, res) {
  try {
    const dados = lerToken(req.body.reset_token, 'recuperacao-redefinir');
    if (!dados) return res.status(400).json({ message: 'Link expirado ou já usado. Comece de novo.' });
    const nova = String(req.body.nova_senha ?? '');
    if (nova.length < 8) return res.status(400).json({ message: 'Mínimo 8 caracteres.', field: 'nova_senha' });

    const conta = await carregarConta(dados.id);
    const vigente = conta?.reset_code_hash && conta.reset_code_expires_at && new Date(conta.reset_code_expires_at) > new Date();
    // A impressão do hash faz o token valer uma única vez: após redefinir, o código é apagado
    if (!conta || semSaida(conta) || !vigente || impressao(conta.reset_code_hash) !== dados.imp) {
      return res.status(400).json({ message: 'Link expirado ou já usado. Comece de novo.' });
    }

    const senha_hash = await bcrypt.hash(nova, 12);
    await db.query(
      'UPDATE usuarios SET senha_hash = $1, reset_code_hash = NULL, reset_code_expires_at = NULL, reset_code_tentativas = 0 WHERE id = $2',
      [senha_hash, conta.id]
    );
    return res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('recuperacao/redefinir-senha error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { buscar, enviarCodigo, verificarCodigo, redefinirSenha };
