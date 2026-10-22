// Rode com: node test/cadastro-perfil-recuperacao.test.js
// Banco simulado em memória: exercita as rotas POST /api/auth/register, GET /api/profile e PUT /api/profile/email-recuperacao.
process.env.JWT_SECRET = 'teste';
delete process.env.RECAPTCHA_SECRET;
const assert = require('assert');
const http = require('http');
const express = require('express');
const bcrypt = require('bcrypt');

const src = (p) => require.resolve('../src/' + p);
const stub = (p, exports) => { require(src(p)); require.cache[src(p)].exports = exports; };

const SENHA = 'senha-atual-123';
const hash = bcrypt.hashSync(SENHA, 4);
const usuarios = [
  { id: 1, email: 'dono@empresa.com', senha_hash: hash, tenant_id: 1, email_recuperacao: null, avatar_url: null, role: 'admin' },
  { id: 2, email: 'equipe@empresa.com', senha_hash: hash, tenant_id: 1, email_recuperacao: null, avatar_url: null, role: 'user' },
];
const notificacoes = [{ usuario_id: 1, tipo: 'cadastrar-email-recuperacao', dispensada: false, lida: false }];
let proximoId = 10;

stub('db', {
  async query(sql, p = []) {
    const s = sql.replace(/\s+/g, ' ');
    if (s.startsWith('SELECT * FROM usuarios WHERE email =')) return { rows: usuarios.filter((u) => u.email === p[0]) };
    if (s.startsWith('SELECT * FROM usuarios WHERE REGEXP_REPLACE')) return { rows: [] };
    if (s.startsWith('INSERT INTO usuarios')) {
      const id = proximoId++;
      usuarios.push({ id, email: p[3], senha_hash: p[4], email_recuperacao: p[5], tenant_id: null, role: 'admin' });
      return { rows: [{ id }] };
    }
    if (s.startsWith('UPDATE usuarios SET tenant_id')) { usuarios.find((u) => u.id === p[0]).tenant_id = p[0]; return { rows: [] }; }
    if (s.includes('avatar_url, role, email_recuperacao')) {
      const u = usuarios.find((x) => x.id === p[0]);
      return { rows: [{ ...u, conta_principal: u.tenant_id === u.id }] };
    }
    if (s.includes('senha_hash, (tenant_id = id) AS conta_principal')) {
      const u = usuarios.find((x) => x.id === p[0]);
      return { rows: [{ email: u.email, senha_hash: u.senha_hash, conta_principal: u.tenant_id === u.id }] };
    }
    if (s.startsWith('UPDATE usuarios SET email_recuperacao')) { usuarios.find((u) => u.id === p[1]).email_recuperacao = p[0]; return { rows: [] }; }
    if (s.startsWith('UPDATE notificacoes SET dispensada')) {
      notificacoes.filter((n) => n.usuario_id === p[0] && !n.dispensada).forEach((n) => { n.dispensada = true; n.lida = true; });
      return { rows: [] };
    }
    throw new Error('SQL não previsto no teste: ' + s);
  },
});
stub('middleware/auth', (req, res, next) => { req.user = { id: Number(req.headers['x-usuario']), tenant_id: 1 }; next(); });
delete process.env.RECAPTCHA_SECRET; // o db.js real carrega o .env ao ser importado pelo stub

const app = express();
app.use(express.json());
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/profile', require('../src/routes/profile'));

function chamar(servidor, metodo, rota, corpo, usuario) {
  return new Promise((resolve, reject) => {
    const dados = corpo ? JSON.stringify(corpo) : null;
    const req = http.request({
      port: servidor.address().port, method: metodo, path: rota,
      headers: { 'content-type': 'application/json', ...(usuario && { 'x-usuario': usuario }) },
    }, (res) => {
      let txt = '';
      res.on('data', (c) => (txt += c));
      res.on('end', () => resolve({ status: res.statusCode, body: txt ? JSON.parse(txt) : {} }));
    });
    req.on('error', reject);
    if (dados) req.write(dados);
    req.end();
  });
}

(async () => {
  const servidor = app.listen(0);
  try {
    const base = { nome: 'Ana', nome_empresa: 'Ana LTDA', cpf_cnpj: '123.456.789-09', email: 'ana@empresa.com', senha: '12345678' };
    const reg = (extra) => chamar(servidor, 'POST', '/api/auth/register', { ...base, ...extra });

    // --- 3.1 cadastro ---
    let r = await reg({ email_recuperacao: ' Ana.Rec@Gmail.com ', email_recuperacao_confirmacao: 'ana.rec@gmail.com' });
    assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    assert.strictEqual(usuarios.find((u) => u.email === 'ana@empresa.com').email_recuperacao, 'ana.rec@gmail.com');

    r = await reg({});
    assert.strictEqual(r.status, 400);
    r = await reg({ email_recuperacao: 'ANA@empresa.com', email_recuperacao_confirmacao: 'ana@empresa.com' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.field, 'email_recuperacao');
    r = await reg({ email_recuperacao: 'a@exemplo.com', email_recuperacao_confirmacao: 'a@exemplo.com' });
    assert.strictEqual(r.status, 400);
    r = await reg({ email_recuperacao: 'a@gmial.com', email_recuperacao_confirmacao: 'a@gmial.com' });
    assert.strictEqual(r.body.sugestao, 'gmail.com');
    r = await reg({ email_recuperacao: 'a@gmail.com', email_recuperacao_confirmacao: 'b@gmail.com' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.field, 'email_recuperacao_confirmacao');

    // mesmo e-mail de recuperação em outra conta é aceito
    r = await chamar(servidor, 'POST', '/api/auth/register', {
      ...base, email: 'bia@empresa.com', cpf_cnpj: '987.654.321-00',
      email_recuperacao: 'ana.rec@gmail.com', email_recuperacao_confirmacao: 'ana.rec@gmail.com',
    });
    assert.strictEqual(r.status, 201);

    // --- 3.2 perfil ---
    r = await chamar(servidor, 'GET', '/api/profile', null, 1);
    assert.strictEqual(r.body.conta_principal, true);
    assert.strictEqual(r.body.email_recuperacao, null);
    r = await chamar(servidor, 'GET', '/api/profile', null, 2);
    assert.strictEqual(r.body.conta_principal, false);

    const put = (usuario, corpo) => chamar(servidor, 'PUT', '/api/profile/email-recuperacao', corpo, usuario);
    const valido = { email_recuperacao: 'dono.rec@gmail.com', confirmacao: 'dono.rec@gmail.com', senha_atual: SENHA };

    r = await put(2, valido);
    assert.strictEqual(r.status, 403);

    r = await put(1, { ...valido, senha_atual: 'errada' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body.message, 'Senha atual incorreta.');
    assert.strictEqual(usuarios[0].email_recuperacao, null);

    r = await put(1, { ...valido, email_recuperacao: 'dono@empresa.com', confirmacao: 'dono@empresa.com' });
    assert.strictEqual(r.status, 400);
    r = await put(1, { ...valido, confirmacao: 'outro@gmail.com' });
    assert.strictEqual(r.status, 400);
    assert.strictEqual(notificacoes[0].dispensada, false);

    r = await put(1, valido);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(usuarios[0].email_recuperacao, 'dono.rec@gmail.com');
    assert.strictEqual(notificacoes[0].dispensada, true);
    assert.strictEqual(notificacoes[0].lida, true);

    // 5 erros seguidos de senha -> 429 (senha correta zera a contagem)
    for (let i = 0; i < 5; i++) await put(1, { ...valido, senha_atual: 'errada' });
    r = await put(1, valido);
    assert.strictEqual(r.status, 429);
    assert.ok(r.body.retry_after > 0);

    console.log('cadastro-perfil-recuperacao: ok');
  } finally {
    servidor.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
