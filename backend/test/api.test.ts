import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createTestDb, setDb } from '../src/db/index.ts';
import { createApp } from '../src/app.ts';
import { setSefazProvider } from '../src/nfe/routes.ts';
import { SefazHtmlProvider } from '../src/nfe/sefazHtmlProvider.ts';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'fixtures', 'nfce-sample.html'), 'utf8');
const KEY = '43240612345678901234567890123456789012345678';

let server: Server;
let base: string;
let cookie = '';

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(() => {
  setDb(createTestDb());
  // SEFAZ provider backed by the saved HTML fixture (no network).
  setSefazProvider(new SefazHtmlProvider(async () => html));
  server = createApp().listen(0);
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

after(() => {
  server.close();
});

test('full flow: register -> login -> scan -> review -> confirm -> balances', async () => {
  assert.equal((await req('POST', '/api/auth/register', { email: 'e2e@example.com', password: 'segredo123' })).status, 201);
  assert.equal((await req('POST', '/api/auth/login', { email: 'e2e@example.com', password: 'segredo123' })).status, 200);

  const preview = await req('POST', '/api/nfe/preview', { code: KEY });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.preview.items.length, 2);
  assert.equal(preview.body.preview.alreadyImported, false);

  const confirm = await req('POST', '/api/nfe/confirm', {
    accessKey: preview.body.preview.accessKey,
    source: 'sefaz',
    items: preview.body.preview.items,
  });
  assert.equal(confirm.status, 201);
  assert.equal(confirm.body.result.itemsImported, 2);

  const products = await req('GET', '/api/inventory/products');
  assert.equal(products.status, 200);
  const arroz = products.body.products.find((p: any) => p.description === 'ARROZ TIPO 1 5KG');
  assert.equal(arroz.balance, 2);
});

test('re-import of same note is blocked over HTTP', async () => {
  const dup = await req('POST', '/api/nfe/confirm', {
    accessKey: KEY,
    source: 'sefaz',
    items: [{ description: 'ARROZ TIPO 1 5KG', quantity: 2, unit: 'UN' }],
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'note_already_imported');
});

test('unauthenticated request is rejected', async () => {
  const saved = cookie;
  cookie = '';
  const res = await req('GET', '/api/inventory/products');
  assert.equal(res.status, 401);
  cookie = saved;
});
