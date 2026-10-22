// Envio de e-mail pela API HTTP do Resend.
// Sem domínio verificado, o Resend só entrega ao e-mail da própria conta Resend e exige EMAIL_FROM=onboarding@resend.dev.
const axios = require('axios');

async function enviarEmail({ para, assunto, html, texto }) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    const err = new Error('O envio de e-mail não está disponível.');
    err.codigo = 'SEM_CHAVE';
    throw err;
  }
  await axios.post(
    'https://api.resend.com/emails',
    { from: process.env.EMAIL_FROM || 'onboarding@resend.dev', to: [para], subject: assunto, html, text: texto },
    { headers: { Authorization: `Bearer ${chave}` }, timeout: 10000 }
  );
}

async function enviarCodigoRecuperacao(para, codigo) {
  await enviarEmail({
    para,
    assunto: 'Seu código de recuperação de senha',
    texto: `Seu código de recuperação é ${codigo}. Ele vale por 15 minutos. Se você não pediu, ignore este e-mail.`,
    html: `<p>Seu código de recuperação é:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${codigo}</p><p>Ele vale por 15 minutos. Se você não pediu, ignore este e-mail.</p>`,
  });
}

module.exports = { enviarEmail, enviarCodigoRecuperacao };
