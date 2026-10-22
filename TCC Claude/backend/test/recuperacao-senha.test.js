// Rode com: node test/recuperacao-senha.test.js
// Banco e e-mail simulados: exercita as quatro rotas /api/auth/recuperacao/* e o login com a senha nova.
process.env.JWT_SECRET = 'teste';
process.env.JWT_RESET_SECRET = 'teste-reset';
const assert = require('assert');
const http = require('http');
const express = require('express');
const bcrypt = require('bcrypt');

const src = (p) => require.resolve('../src/' + p);
const stub = (p, exports) => { require(src(p)); require.cache[src(p)].exports = exports; };

const mk = (id, extra) => ({
  id, nome: `Maria ${id}`, email: `conta${id}@empresa.com`, cpf_cnpj: `000.000.000-0${id}`, senha_hash: bcrypt.hashSync('antiga-123', 4),
  tenant_id: id, ativo: true, role: 'admin', email_recuperacao: `maria${id}@gmail.com`,
  reset_code_hash: null, reset_code_expires_at: null, reset_code_tentativas: 0, ...extra,
});
const usuarios = [
  mk(1), mk(2), mk(3, { email_recuperacao: null }), mk(4, { tenant_id: 1, role: 'user' }), mk(5, { ativo: false }),
  mk(6), mk(7), mk(8),
];
const porId = (id) => usuarios.find((u) => u.id === id);

stub('db', {
  async query(sql, p = []) {
    const s = sql.replace(/\s+/g, ' ');
    if (s.startsWith('SELECT * FROM usuarios WHERE email =')) return { rows: usuarios.filter((u) => u.email === p[0].toLowerCase().trim()) };
    if (s.startsWith('SELECT * FROM usuarios WHERE LOWER(email)')) return { rows: usuarios.filter((u) => u.email === p[0].toLowerCase().trim()) };
    if (s.startsWith('SELECT * FROM usuarios WHERE REGEXP_REPLACE')) {
      return { rows: usuarios.filter((u) => u.cpf_cnpj.replace(/\D/g, '') === p[0]) };
    }
    if (s.startsWith('SELECT id, nome, tenant_id')) return { rows: [porId(p[0])].filter(Boolean).map((u) => ({ ...u })) };
    if (s.startsWith('UPDATE usuarios SET reset_code_hash = $1')) {
      Object.assign(porId(p[2]), { reset_code_hash: p[0], reset_code_expires_at: p[1], reset_code_tentativas: 0 });
      return { rows: [] };
    }
    if (s.includes('reset_code_tentativas = reset_code_tentativas + 1')) {
      const u = porId(p[0]); u.reset_code_tentativas++;
      return { rows: [{ reset_code_tentativas: u.reset_code_tentativas }] };
    }
    if (s.startsWith('UPDATE usuarios SET reset_code_hash = NULL, reset_code_expires_at = NULL, reset_code_tentativas = 0 WHERE')) {
      Object.assign(porId(p[0]), { reset_code_hash: null, reset_code_expires_at: null, reset_code_tentativas: 0 });
      return { rows: [] };
    }
    if (s.startsWith('UPDATE usuarios SET senha_hash')) {
      Object.assign(porId(p[1]), { senha_hash: p[0], reset_code_hash: null, reset_code_expires_at: null, reset_code_tentativas: 0 });
      return { rows: [] };
    }
    throw new Error('SQL não previsto no teste: ' + s);
  },
});

const emails = [];
let falharEnvio = false;
stub('services/emailService', {
  async enviarCodigoRecuperacao(para, codigo) {
    if (falharEnvio) throw new Error('Resend fora do ar');
    emails.push({ para, codigo });
  },
});

const app = express();
app.use(express.json());
app.use('/api/auth', require('../src/routes/auth'));
delete process.env.RECAPTCHA_SECRET; // o db.js real carrega o .env ao ser importado pelo stub
process.env.RESEND_API_KEY = 're_teste';

function chamar(servidor, rota, corpo) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: servidor.address().port, method: 'POST', path: rota, headers: { 'content-type': 'application/json' } }, (res) => {
      let txt = '';
      res.on('data', (c) => (txt += c));
      res.on('end', () => resolve({ status: res.statusCode, body: txt.startsWith('{') ? JSON.parse(txt) : {} }));
    });
    req.on('error', reject);
    req.end(JSON.stringify(corpo || {}));
  });
}

// Faz o "último envio" parecer antigo para liberar o reenvio sem esperar 60 s
const envelhecerEnvio = (id) => { const u = porId(id); u.reset_code_expires_at = new Date(new Date(u.reset_code_expires_at).getTime() - 61_000); };

(async () => {
  const servidor = app.listen(0);
  const R = '/api/auth/recuperacao/';
  const post = (rota, corpo) => chamar(servidor, R + rota, corpo);
  try {
    // ---------- buscar ----------
    let r = await post('buscar', { identificador: 'conta1@empresa.com' });
    assert.strictEqual(r.status, 200);
    const textoBusca = JSON.stringify(r.body);
    assert.strictEqual(r.body.nome_mascarado, 'Ma***');
    assert.strictEqual(r.body.email_mascarado, 'm***@gmail.com');
    for (const segredo of ['Maria 1', 'maria1@gmail.com', 'conta1@empresa.com']) {
      assert.ok(!textoBusca.includes(segredo), `a busca não pode conter "${segredo}"`);
    }
    assert.strictEqual(emails.length, 0, 'buscar não envia e-mail');

    r = await post('buscar', { identificador: '000.000.000-01' }); // por CPF
    assert.strictEqual(r.status, 200);
    r = await post('buscar', { identificador: 'nao@existe.com' });
    assert.strictEqual(r.status, 404);
    r = await post('buscar', { identificador: 'conta3@empresa.com' });
    assert.strictEqual(r.status, 422);
    r = await post('buscar', { identificador: 'conta4@empresa.com' });
    assert.strictEqual(r.status, 403);
    assert.strictEqual(r.body.codigo, 'conta_equipe');
    r = await post('buscar', { identificador: 'conta5@empresa.com' });
    assert.strictEqual(r.status, 403);
    assert.strictEqual(r.body.codigo, 'conta_desativada');
    r = await post('buscar', {});
    assert.strictEqual(r.status, 400);

    // atalho: gera o token de busca sem passar pelo limite de buscas por IP
    const token = async (id) => require('jsonwebtoken').sign({ id, escopo: 'recuperacao-busca' }, process.env.JWT_RESET_SECRET, { expiresIn: '10m' });

    // ---------- enviar-codigo ----------
    r = await post('enviar-codigo', { busca_token: 'lixo' });
    assert.strictEqual(r.status, 400);

    const t1 = await token(1);
    r = await post('enviar-codigo', { busca_token: t1 });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(emails.length, 1);
    assert.strictEqual(emails[0].para, 'maria1@gmail.com');
    assert.match(emails[0].codigo, /^\d{6}$/);
    assert.notStrictEqual(porId(1).reset_code_hash, emails[0].codigo, 'só o hash é guardado');
    const prazo = new Date(porId(1).reset_code_expires_at).getTime() - Date.now();
    assert.ok(prazo > 14 * 60_000 && prazo <= 15 * 60_000, 'validade de 15 minutos');
    const codigo1 = emails[0].codigo;

    // reenvio antes de 60 s
    r = await post('enviar-codigo', { busca_token: t1 });
    assert.strictEqual(r.status, 429);
    assert.ok(r.body.retry_after > 0 && r.body.retry_after <= 60);
    assert.strictEqual(emails.length, 1);

    // reenvio depois de 60 s invalida o código anterior
    envelhecerEnvio(1);
    r = await post('enviar-codigo', { busca_token: t1 });
    assert.strictEqual(r.status, 200);
    const codigo2 = emails[1].codigo;
    if (codigo1 !== codigo2) {
      r = await post('verificar-codigo', { busca_token: t1, codigo: codigo1 });
      assert.strictEqual(r.status, 400, 'o código antigo deixa de funcionar');
    }

    // ---------- verificar-codigo ----------
    r = await post('verificar-codigo', { busca_token: t1, codigo: codigo2 === '000000' ? '111111' : '000000' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.message, 'Código inválido ou expirado.');
    assert.strictEqual(r.body.tentativas_restantes, codigo1 !== codigo2 ? 3 : 4, 'conta as tentativas erradas');

    r = await post('verificar-codigo', { busca_token: t1, codigo: codigo2 });
    assert.strictEqual(r.status, 200);
    const resetToken = r.body.reset_token;

    // ---------- redefinir-senha ----------
    r = await post('redefinir-senha', { reset_token: resetToken, nova_senha: 'curta' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.message, 'Mínimo 8 caracteres.');
    r = await post('redefinir-senha', { reset_token: 'lixo', nova_senha: 'nova-senha-123' });
    assert.strictEqual(r.status, 400);
    r = await post('redefinir-senha', { reset_token: t1, nova_senha: 'nova-senha-123' }); // token do escopo errado
    assert.strictEqual(r.status, 400);

    r = await post('redefinir-senha', { reset_token: resetToken, nova_senha: 'nova-senha-123' });
    assert.strictEqual(r.status, 200);
    assert.ok(bcrypt.compareSync('nova-senha-123', porId(1).senha_hash), 'senha nova gravada com bcrypt');
    assert.strictEqual(porId(1).reset_code_hash, null);
    assert.strictEqual(porId(1).reset_code_tentativas, 0);

    // reuso do token e do código
    r = await post('redefinir-senha', { reset_token: resetToken, nova_senha: 'outra-senha-123' });
    assert.strictEqual(r.status, 400, 'token de uso único');
    r = await post('verificar-codigo', { busca_token: t1, codigo: codigo2 });
    assert.strictEqual(r.status, 400, 'código usado não vale de novo');

    // login com a senha nova (mesma verificação que o authController faz)
    const { login } = require('../src/controllers/authController');
    const resp = { code: 0, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await login({ body: { identifier: 'conta1@empresa.com', senha: 'nova-senha-123' } }, resp);
    assert.strictEqual(resp.code, 200);

    // ---------- 5 erros invalidam o código ----------
    const t6 = await token(6);
    await post('enviar-codigo', { busca_token: t6 });
    const certo6 = emails[emails.length - 1].codigo;
    const errado6 = certo6 === '123456' ? '654321' : '123456';
    for (let i = 1; i <= 5; i++) {
      r = await post('verificar-codigo', { busca_token: t6, codigo: errado6 });
      assert.strictEqual(r.body.tentativas_restantes, 5 - i);
    }
    r = await post('verificar-codigo', { busca_token: t6, codigo: certo6 });
    assert.strictEqual(r.status, 400, 'após 5 erros nem o código certo funciona');

    // ---------- código expirado ----------
    const t7 = await token(7);
    await post('enviar-codigo', { busca_token: t7 });
    const certo7 = emails[emails.length - 1].codigo;
    porId(7).reset_code_expires_at = new Date(Date.now() - 1000);
    r = await post('verificar-codigo', { busca_token: t7, codigo: certo7 });
    assert.strictEqual(r.status, 400);

    // ---------- falha no Resend: código apagado e reenvio liberado ----------
    const t8 = await token(8);
    falharEnvio = true;
    r = await post('enviar-codigo', { busca_token: t8 });
    assert.strictEqual(r.status, 502);
    assert.strictEqual(porId(8).reset_code_hash, null, 'sem código válido gravado');
    falharEnvio = false;
    r = await post('enviar-codigo', { busca_token: t8 });
    assert.strictEqual(r.status, 200, 'pode tentar de novo na hora');

    // ---------- chave do Resend ausente ----------
    const chave = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const t2 = await token(2);
    r = await post('enviar-codigo', { busca_token: t2 });
    assert.strictEqual(r.status, 503);
    assert.strictEqual(porId(2).reset_code_hash, null, 'sem chave não grava código');
    process.env.RESEND_API_KEY = chave;

    // ---------- limite de envios por conta (3 por hora) ----------
    // a conta 1 já enviou 2 códigos; o terceiro passa e o quarto é barrado
    const t1b = await token(1);
    envelhecerEnvio(1);
    // conta 1 teve o código apagado ao redefinir; força um envio novo
    r = await post('enviar-codigo', { busca_token: t1b });
    assert.strictEqual(r.status, 200);
    envelhecerEnvio(1);
    r = await post('enviar-codigo', { busca_token: t1b });
    assert.strictEqual(r.status, 429, 'quarta solicitação na hora para a mesma conta');
    assert.match(r.body.message, /Muitos códigos/);

    // ---------- limite de buscas por IP (10 por 15 min) ----------
    let barrada = null;
    for (let i = 0; i < 20 && !barrada; i++) {
      const x = await post('buscar', { identificador: 'conta1@empresa.com' });
      if (x.status === 429) barrada = x;
    }
    assert.ok(barrada, 'o excesso de buscas do mesmo IP responde 429');

    // ---------- rotas antigas não existem ----------
    for (const rota of ['forgot-password', 'verify-code', 'reset-password']) {
      const x = await chamar(servidor, '/api/auth/' + rota, {});
      assert.strictEqual(x.status, 404, rota);
    }

    console.log('recuperacao-senha: ok');
  } finally {
    servidor.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
