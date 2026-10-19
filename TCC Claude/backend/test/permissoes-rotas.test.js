// Confere a matriz de permissões nas rotas. Rode com: node test/permissoes-rotas.test.js
// Não usa o banco: o auth define o cargo pelo cabeçalho x-cargo e os controllers respondem 200 fixo,
// então só o encadeamento rota -> exigePermissao é exercitado.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste';
const assert = require('assert');
const express = require('express');

const src = (p) => require.resolve('../src/' + p);
const stub = (p, exports) => { require(src(p)); require.cache[src(p)].exports = exports; };

stub('middleware/auth', (req, res, next) => { req.user = { id: 1, role: req.headers['x-cargo'], tenant_id: 1 }; next(); });
const ok = (req, res) => res.json({ ok: true });
stub('controllers/userController', { listUsers: ok, createUser: ok, updateUserRole: ok, toggleUserStatus: ok, deleteUser: ok });
stub('controllers/productController', { createProduct: ok, updateProduct: ok, deleteProduct: ok, withdrawProduct: ok, listProducts: ok });
stub('controllers/barcodeController', { getBarcodeProduct: ok });
stub('controllers/reportController', { getReport: ok });
stub('controllers/movementController', { listMovements: ok, listMovementUsers: ok });

const app = express();
app.use(express.json());
app.use('/api/users', require('../src/routes/users'));
app.use('/api/products', require('../src/routes/products'));
app.use('/api/nfe', require('../src/routes/nfe'));
app.use('/api/reports', require('../src/routes/reports'));
app.use('/api/movements', require('../src/routes/movements'));

// [método, rota, cargo mínimo]
const ROTAS = [
  ['GET', '/api/products', 'user'],
  ['POST', '/api/products/1/withdraw', 'user'],
  ['GET', '/api/movements', 'user'],
  ['GET', '/api/movements/users', 'user'],
  ['POST', '/api/products', 'socio'],
  ['PUT', '/api/products/1', 'socio'],
  ['GET', '/api/products/barcode/7891000100103', 'socio'],
  ['GET', '/api/reports', 'socio'],
  ['GET', '/api/users', 'socio'],
  ['POST', '/api/users', 'socio'],
  ['PUT', '/api/users/2/status', 'socio'],
  ['DELETE', '/api/products/1', 'admin'],
  ['PUT', '/api/users/2/role', 'admin'],
  ['DELETE', '/api/users/2', 'admin'],
  // POST /api/nfe/xml (socio): sem arquivo, quem tem permissão chega ao handler e recebe 400; sem permissão, 403
];
const NIVEL = { user: 1, socio: 2, admin: 3 };

(async () => {
  const srv = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${srv.address().port}`;
  const chamar = async (metodo, rota, cargo) => (await fetch(base + rota, { method: metodo, headers: { 'x-cargo': cargo, 'content-type': 'application/json' }, body: metodo === 'GET' || metodo === 'DELETE' ? undefined : '{}' })).status;

  let total = 0;
  for (const [metodo, rota, minimo] of ROTAS) {
    for (const cargo of Object.keys(NIVEL)) {
      const esperado = NIVEL[cargo] >= NIVEL[minimo] ? 200 : 403;
      const status = await chamar(metodo, rota, cargo);
      assert.strictEqual(status, esperado, `${metodo} ${rota} como ${cargo}: esperado ${esperado}, veio ${status}`);
      total++;
    }
  }
  // Importar NF-e: Funcionário 403; Sócio e Administrador passam do filtro de permissão (400 por falta de arquivo)
  for (const [cargo, esperado] of [['user', 403], ['socio', 400], ['admin', 400]]) {
    const status = await chamar('POST', '/api/nfe/xml', cargo);
    assert.strictEqual(status, esperado, `POST /api/nfe/xml como ${cargo}: esperado ${esperado}, veio ${status}`);
    total++;
  }
  // Cargo desconhecido não tem nenhuma permissão
  assert.strictEqual(await chamar('GET', '/api/products', 'fantasma'), 403);
  total++;

  console.log(`${total} verificações passaram (rota x cargo).`);
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
