'use strict';
// Testes unitários do barcodeService com axios mockado.
// Execute: node test-barcode.js
// Pode ser removido após os testes.

const path = require('path');

// ── Injeta mock do axios antes de carregar o serviço ──────────────
const axiosMock = { get: null };
const axiosId = require.resolve('axios');
require.cache[axiosId] = {
  id: axiosId, filename: axiosId, loaded: true,
  parent: null, children: [], path: path.dirname(axiosId),
  exports: axiosMock,
};

const svcId = require.resolve('./src/services/barcodeService');

/** Recarrega o módulo (e o cache interno) para cada teste */
function reloadService() {
  delete require.cache[svcId];
  return require('./src/services/barcodeService');
}

let pass = 0, fail = 0;

async function test(nome, tokenFake, mockGet, verificar) {
  const tokenAnterior = process.env.COSMOS_TOKEN;
  process.env.COSMOS_TOKEN = tokenFake;
  axiosMock.get = mockGet;

  const { lookupBarcode } = reloadService();
  let err = null, result = null;
  try { result = await lookupBarcode('7891234567890'); }
  catch (e) { err = e; }

  process.env.COSMOS_TOKEN = tokenAnterior;

  const ok = verificar(err, result);
  if (ok) { console.log(`  ✓  ${nome}`); pass++; }
  else {
    console.error(`  ✗  ${nome}`);
    console.error(`     err=${err?.message ?? 'null'}  result=${JSON.stringify(result)}`);
    fail++;
  }
}

(async () => {
  console.log('\n=== barcodeService — testes com mock ===\n');

  // 1. Cosmos retorna produto → usa Cosmos, não chama OFF
  await test(
    'Cosmos OK → retorna produto da Cosmos (OFF não é chamado)',
    'fake-token',
    async (url) => {
      if (url.includes('cosmos')) return { status: 200, data: { description: 'Arroz Branco 1kg', brand: { name: 'Tio João' }, gtins_by_ncm: [{ ncm: { description: 'Cereais', code: '10063011' } }], thumbnail: null } };
      throw new Error('OFF não deveria ser chamado quando Cosmos responde com sucesso');
    },
    (err, res) => !err && res?.nome === 'Arroz Branco 1kg' && res?.fonte === 'cosmos' && res?.ncm === '10063011'
  );

  // 2. Cosmos 429 → cai no OFF
  await test(
    'Cosmos 429 → fallback para Open Food Facts',
    'fake-token',
    async (url) => {
      if (url.includes('cosmos')) return { status: 429, data: null };
      return { status: 200, data: { status: 1, product: { product_name: 'Leite Condensado', brands: 'Nestlé', categories_tags: ['pt:laticinios'], image_front_url: null } } };
    },
    (err, res) => !err && res?.nome === 'Leite Condensado' && res?.fonte === 'openfoodfacts'
  );

  // 3. Cosmos 401 → cai no OFF
  await test(
    'Cosmos 401 (token inválido) → fallback para Open Food Facts',
    'token-invalido',
    async (url) => {
      if (url.includes('cosmos')) return { status: 401, data: null };
      return { status: 200, data: { status: 1, product: { product_name: 'Produto OFF', brands: 'Marca', categories_tags: [], image_front_url: null } } };
    },
    (err, res) => !err && res?.fonte === 'openfoodfacts'
  );

  // 4. Cosmos 500 → cai no OFF
  await test(
    'Cosmos 500 (erro de servidor) → fallback para Open Food Facts',
    'fake-token',
    async (url) => {
      if (url.includes('cosmos')) return { status: 500, data: null };
      return { status: 200, data: { status: 1, product: { product_name: 'Produto OFF', brands: '', categories_tags: [], image_front_url: null } } };
    },
    (err, res) => !err && res?.fonte === 'openfoodfacts'
  );

  // 5. Sem token → apenas OFF (Cosmos não é chamada)
  await test(
    'Sem COSMOS_TOKEN → apenas Open Food Facts',
    '',
    async (url) => {
      if (url.includes('cosmos')) throw new Error('Cosmos não deveria ser chamada sem token');
      return { status: 200, data: { status: 1, product: { product_name: 'Produto OFF', brands: 'B', categories_tags: [], image_front_url: null } } };
    },
    (err, res) => !err && res?.fonte === 'openfoodfacts'
  );

  // 6. Nenhuma fonte encontrou → null, sem erro
  await test(
    'Produto não encontrado em nenhuma fonte → null (sem erro)',
    'fake-token',
    async (url) => {
      if (url.includes('cosmos')) return { status: 404, data: null };
      return { status: 200, data: { status: 0 } };
    },
    (err, res) => !err && res === null
  );

  // 7. Ambas as fontes falham por rede → erro 429
  await test(
    'Cosmos timeout + OFF timeout → erro 429 para o usuário',
    'fake-token',
    async () => { const e = new Error('timeout'); e.code = 'ETIMEDOUT'; throw e; },
    (err, res) => err?.status === 429 && res === null
  );

  // 8. Cosmos falha temporária, OFF definitivo "não encontrado" → null sem erro, sem cache
  await test(
    'Cosmos timeout + OFF não encontrou (definitivo) → null sem erro',
    'fake-token',
    async (url) => {
      if (url.includes('cosmos')) { const e = new Error('timeout'); e.code = 'ETIMEDOUT'; throw e; }
      return { status: 200, data: { status: 0 } }; // OFF: produto não existe
    },
    (err, res) => !err && res === null
  );

  console.log(`\nResultado: ${pass} ✓  ${fail} ✗\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
