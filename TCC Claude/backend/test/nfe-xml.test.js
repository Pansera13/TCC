// Teste da rota POST /api/nfe/xml. Rode com: node test/nfe-xml.test.js
// Usa o auth real para o caso sem token (401) e um auth falso para os demais (evita depender do banco).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const express = require('express');

const authPath = require.resolve('../src/middleware/auth');
const realAuth = require(authPath);
const routerPath = require.resolve('../src/routes/nfe');

function load(auth) {
  require.cache[authPath].exports = auth;
  delete require.cache[routerPath];
  const app = express();
  app.use('/api/nfe', require(routerPath));
  app.use((err, req, res, next) => res.status(500).json({ message: 'Erro interno no servidor.' })); // eslint-disable-line no-unused-vars
  return new Promise(r => { const s = app.listen(0, () => r(s)); });
}

const lerArq = (n) => fs.readFileSync(path.join(__dirname, n));
async function enviar(base, conteudo, nome, tipo) {
  const fd = new FormData();
  if (conteudo !== null) fd.append('arquivo', new Blob([conteudo], { type: tipo }), nome);
  const res = await fetch(`${base}/api/nfe/xml`, { method: 'POST', body: fd });
  return { status: res.status, body: await res.json() };
}

(async () => {
  let ok = 0;
  const check = (nome, cond, extra) => { assert.ok(cond, `${nome} -> ${JSON.stringify(extra)}`); ok++; console.log('OK  ', nome); };

  // Sem token: auth real
  let srv = await load(realAuth);
  let base = `http://127.0.0.1:${srv.address().port}`;
  let r = await enviar(base, lerArq('nfe-exemplo.xml'), 'a.xml', 'text/xml');
  check('sem token => 401', r.status === 401, r);
  srv.close();

  srv = await load((req, res, next) => { req.user = { id: 1, role: req.headers['x-cargo'] || 'socio' }; next(); });
  base = `http://127.0.0.1:${srv.address().port}`;

  r = await enviar(base, lerArq('nfe-exemplo.xml'), 'a.xml', 'text/xml');
  check('XML válido, 3 produtos', r.status === 200 && r.body.produtos.length === 3 && r.body.produtos[0].nome === 'Arroz Exemplo 5kg' && r.body.produtos[0].quantidade === 10, r);

  r = await enviar(base, lerArq('nfe-um-produto.xml'), 'a.xml', 'application/xml');
  check('XML com 1 produto (<det> único)', r.status === 200 && r.body.produtos.length === 1, r);

  r = await enviar(base, lerArq('nfe-namespace-prefixo.xml'), 'a.xml', 'text/xml');
  check('XML com prefixo de namespace', r.status === 200 && r.body.produtos.length === 2 && r.body.produtos[0].unidade === 'CX', r);

  r = await enviar(base, 'texto qualquer', 'a.txt', 'text/plain');
  check('arquivo não XML => 400', r.status === 400 && /xml/i.test(r.body.message), r);

  r = await enviar(base, lerArq('invalido.xml'), 'a.xml', 'text/xml');
  check('XML malformado => 400', r.status === 400 && /XML válido/.test(r.body.message), r);

  r = await enviar(base, lerArq('outro-tipo.xml'), 'a.xml', 'text/xml');
  check('XML de outro tipo => 422', r.status === 422 && r.body.message === 'Formato de NF-e não reconhecido.', r);

  r = await enviar(base, lerArq('sem-produtos.xml'), 'a.xml', 'text/xml');
  check('NF-e sem produtos => 422', r.status === 422 && /Nenhum produto/.test(r.body.message), r);

  r = await enviar(base, Buffer.alloc(2.2 * 1024 * 1024, 'a'), 'grande.xml', 'text/xml');
  check('arquivo > 2 MB => 400', r.status === 400 && /2 MB/.test(r.body.message), r);

  r = await enviar(base, null);
  check('sem arquivo => 400', r.status === 400 && /Nenhum arquivo/.test(r.body.message), r);

  const semPerm = await fetch(`${base}/api/nfe/xml`, { method: 'POST', headers: { 'x-cargo': 'user' }, body: new FormData() });
  check('Funcionário sem permissão => 403', semPerm.status === 403, semPerm.status);

  srv.close();
  console.log(`\n${ok} testes passaram.`);
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
