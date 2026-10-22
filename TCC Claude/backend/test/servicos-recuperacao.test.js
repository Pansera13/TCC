// Rode com: node test/servicos-recuperacao.test.js
// Cobre o emailService (axios simulado), o limitador e a presença das variáveis no .env.example.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  // --- emailService ---
  const { enviarEmail } = require('../src/services/emailService');
  const original = axios.post;
  let chamada;

  delete process.env.RESEND_API_KEY;
  await assert.rejects(() => enviarEmail({ para: 'a@gmail.com', assunto: 'x', texto: 'y' }), (e) => e.codigo === 'SEM_CHAVE');

  process.env.RESEND_API_KEY = 're_teste';
  process.env.EMAIL_FROM = 'onboarding@resend.dev';
  axios.post = async (url, corpo, cfg) => { chamada = { url, corpo, cfg }; return { data: {} }; };
  await enviarEmail({ para: 'a@gmail.com', assunto: 'Oi', texto: 'y' });
  assert.strictEqual(chamada.url, 'https://api.resend.com/emails');
  assert.deepStrictEqual(chamada.corpo.to, ['a@gmail.com']);
  assert.strictEqual(chamada.corpo.from, 'onboarding@resend.dev');
  assert.strictEqual(chamada.cfg.headers.Authorization, 'Bearer re_teste');
  assert.strictEqual(chamada.cfg.timeout, 10000);

  axios.post = async () => { throw new Error('falhou'); };
  await assert.rejects(() => enviarEmail({ para: 'a@gmail.com', assunto: 'Oi', texto: 'y' }), /falhou/);
  axios.post = original;

  // --- limitador ---
  const { criarLimite } = require('../src/middleware/limiteRequisicoes');
  const lim = criarLimite({ max: 3, janelaMs: 1000 });
  const t0 = 10_000;
  for (let i = 0; i < 3; i++) { assert.strictEqual(lim.restante('ip', t0), 0); lim.registrar('ip', t0); }
  assert.ok(lim.restante('ip', t0 + 100) > 0, 'a 4ª chamada na janela deve ser barrada');
  assert.strictEqual(lim.restante('outro', t0 + 100), 0, 'outra chave não é afetada');
  assert.strictEqual(lim.restante('ip', t0 + 1001), 0, 'passada a janela volta a passar');

  // --- .env.example ---
  const exemplo = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
  assert.match(exemplo, /^RESEND_API_KEY=/m);
  assert.match(exemplo, /^EMAIL_FROM=/m);

  console.log('servicos-recuperacao: ok');
})().catch((e) => { console.error(e); process.exit(1); });
