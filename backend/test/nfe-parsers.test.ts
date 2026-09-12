import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractAccessKey, isValidAccessKey } from '../src/nfe/accessKey.ts';
import { parseNfeXml } from '../src/nfe/xmlProvider.ts';
import { parseSefazHtml } from '../src/nfe/sefazHtmlProvider.ts';
import { parseBrNumber } from '../src/nfe/provider.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'fixtures');

test('access key validation accepts 44 digits, rejects others', () => {
  assert.ok(isValidAccessKey('4'.repeat(44)));
  assert.ok(!isValidAccessKey('4'.repeat(43)));
  assert.ok(!isValidAccessKey('4'.repeat(44) + 'a'));
});

test('extract access key from a QR URL payload', () => {
  const key = '43240612345678901234567890123456789012345678';
  assert.equal(extractAccessKey(`https://sefaz.rs.gov.br?p=${key}|2|1|1|abc`), key);
  assert.equal(extractAccessKey('sem chave aqui'), null);
});

test('parseBrNumber handles Brazilian number format', () => {
  assert.equal(parseBrNumber('1.234,56'), 1234.56);
  assert.equal(parseBrNumber('25,90'), 25.9);
  assert.equal(parseBrNumber(''), null);
});

test('XML provider extracts items, key and treats SEM GTIN as null', () => {
  const xml = readFileSync(join(fixtures, 'nfce-sample.xml'), 'utf8');
  const note = parseNfeXml(xml);
  assert.equal(note.accessKey, '35240612345678901234567890123456789012345678');
  assert.equal(note.items.length, 2);
  assert.equal(note.items[0].description, 'ARROZ TIPO 1 5KG');
  assert.equal(note.items[0].gtin, '7891234567895');
  assert.equal(note.items[0].quantity, 2);
  assert.equal(note.items[1].gtin, null);
});

test('SEFAZ HTML parser extracts items from the consultation page', () => {
  const html = readFileSync(join(fixtures, 'nfce-sample.html'), 'utf8');
  const key = '43240612345678901234567890123456789012345678';
  const note = parseSefazHtml(html, key);
  assert.equal(note.items.length, 2);
  assert.equal(note.items[0].description, 'ARROZ TIPO 1 5KG');
  assert.equal(note.items[0].quantity, 2);
  assert.equal(note.items[0].unit, 'UN');
  assert.equal(note.items[0].unitValue, 25.9);
  assert.equal(note.items[1].quantity, 3);
});
