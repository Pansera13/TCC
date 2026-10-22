// Rode com: node test/notificacoes.test.js
// Banco simulado: confere o isolamento por usuário nas três rotas de /api/notificacoes.
process.env.JWT_SECRET = 'teste';
const assert = require('assert');
const http = require('http');
const express = require('express');

const src = (p) => require.resolve('../src/' + p);
const stub = (p, exports) => { require(src(p)); require.cache[src(p)].exports = exports; };

const notificacoes = [
  { id: 1, usuario_id: 1, tipo: 'cadastrar-email-recuperacao', titulo: 'A', texto: 'a', acao: 'abrir-email-recuperacao', lida: false, dispensada: false, criado_em: new Date(1000) },
  { id: 2, usuario_id: 1, tipo: 'outro', titulo: 'B', texto: 'b', acao: null, lida: true, dispensada: false, criado_em: new Date(2000) },
  { id: 3, usuario_id: 2, tipo: 'cadastrar-email-recuperacao', titulo: 'C', texto: 'c', acao: null, lida: false, dispensada: false, criado_em: new Date(1500) },
];

stub('db', {
  async query(sql, p = []) {
    const s = sql.replace(/\s+/g, ' ');
    if (s.startsWith('SELECT id, tipo')) {
      const rows = notificacoes.filter((n) => n.usuario_id === p[0] && !n.dispensada).sort((a, b) => b.criado_em - a.criado_em);
      return { rows };
    }
    if (s.startsWith('UPDATE notificacoes SET lida = true')) {
      const alvo = notificacoes.filter((n) => n.usuario_id === p[0] && !n.lida && !n.dispensada);
      alvo.forEach((n) => { n.lida = true; });
      return { rows: [], rowCount: alvo.length };
    }
    if (s.startsWith('UPDATE notificacoes SET dispensada = true')) {
      const n = notificacoes.find((x) => x.id === p[0] && x.usuario_id === p[1] && !x.dispensada);
      if (n) { n.dispensada = true; n.lida = true; }
      return { rows: [], rowCount: n ? 1 : 0 };
    }
    throw new Error('SQL não previsto no teste: ' + s);
  },
});
stub('middleware/auth', (req, res, next) => { req.user = { id: Number(req.headers['x-usuario']) }; next(); });

const app = express();
app.use(express.json());
app.use('/api/notificacoes', require('../src/routes/notificacoes'));

function chamar(servidor, metodo, rota, usuario) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: servidor.address().port, method: metodo, path: rota, headers: { 'x-usuario': usuario } }, (res) => {
      let txt = '';
      res.on('data', (c) => (txt += c));
      res.on('end', () => resolve({ status: res.statusCode, body: txt.startsWith('{') ? JSON.parse(txt) : {} }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const servidor = app.listen(0);
  try {
    let r = await chamar(servidor, 'GET', '/api/notificacoes', 1);
    assert.deepStrictEqual(r.body.itens.map((n) => n.id), [2, 1], 'só as do usuário, da mais recente para a mais antiga');
    assert.strictEqual(r.body.nao_lidas, 1);

    // conta sem notificações (ex.: conta de equipe) recebe lista vazia
    r = await chamar(servidor, 'GET', '/api/notificacoes', 9);
    assert.deepStrictEqual(r.body, { itens: [], nao_lidas: 0 });

    // marcar como lidas zera o contador sem remover itens, e não mexe nas dos outros
    r = await chamar(servidor, 'POST', '/api/notificacoes/marcar-lidas', 1);
    assert.strictEqual(r.body.nao_lidas, 0);
    r = await chamar(servidor, 'GET', '/api/notificacoes', 1);
    assert.strictEqual(r.body.itens.length, 2);
    assert.strictEqual(r.body.nao_lidas, 0);
    assert.strictEqual(notificacoes[2].lida, false, 'a notificação do usuário 2 não foi alterada');

    // dispensar notificação alheia -> 404 e nada muda
    r = await chamar(servidor, 'POST', '/api/notificacoes/3/dispensar', 1);
    assert.strictEqual(r.status, 404);
    assert.strictEqual(notificacoes[2].dispensada, false);
    r = await chamar(servidor, 'POST', '/api/notificacoes/abc/dispensar', 1);
    assert.strictEqual(r.status, 404);

    // dispensar a própria remove da lista
    r = await chamar(servidor, 'POST', '/api/notificacoes/1/dispensar', 1);
    assert.strictEqual(r.status, 200);
    r = await chamar(servidor, 'GET', '/api/notificacoes', 1);
    assert.deepStrictEqual(r.body.itens.map((n) => n.id), [2]);
    r = await chamar(servidor, 'POST', '/api/notificacoes/1/dispensar', 1);
    assert.strictEqual(r.status, 404, 'já dispensada');

    console.log('notificacoes: ok');
  } finally {
    servidor.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
