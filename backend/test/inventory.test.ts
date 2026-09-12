import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb, setDb } from '../src/db/index.ts';
import { register } from '../src/auth/service.ts';
import {
  adjustToBalance,
  createProduct,
  findOrCreateProduct,
  getProduct,
  listMovements,
  recordMovement,
  updateProduct,
} from '../src/inventory/service.ts';
import { AppError } from '../src/errors.ts';

let userId: number;
let otherId: number;

beforeEach(() => {
  setDb(createTestDb());
  userId = register('a@example.com', 'segredo123').id;
  otherId = register('b@example.com', 'segredo123').id;
});

test('balance equals entradas - saidas +/- ajustes', () => {
  const p = createProduct(userId, { description: 'Item A' });
  recordMovement(userId, p.id, 'in', 10, 'manual');
  recordMovement(userId, p.id, 'out', 4, 'manual');
  adjustToBalance(userId, p.id, 8); // from 6 -> +2 adjust
  assert.equal(getProduct(userId, p.id).balance, 8);
});

test('movement history is chronological with type and source', () => {
  const p = createProduct(userId, { description: 'Item B' });
  recordMovement(userId, p.id, 'in', 5, 'manual');
  recordMovement(userId, p.id, 'out', 2, 'manual');
  const history = listMovements(userId, p.id);
  assert.equal(history.length, 2);
  assert.equal(history[0].type, 'in');
  assert.equal(history[1].type, 'out');
});

test('out greater than balance is rejected and leaves balance unchanged', () => {
  const p = createProduct(userId, { description: 'Item C' });
  recordMovement(userId, p.id, 'in', 3, 'manual');
  assert.throws(() => recordMovement(userId, p.id, 'out', 5, 'manual'), (e: AppError) => e.code === 'insufficient_stock');
  assert.equal(getProduct(userId, p.id).balance, 3);
});

test('matching by GTIN reuses existing product', () => {
  const created = findOrCreateProduct(userId, { description: 'Arroz', gtin: '789', quantity: 1 });
  assert.ok(created.created);
  const again = findOrCreateProduct(userId, { description: 'Arroz Diferente', gtin: '789', quantity: 1 });
  assert.ok(!again.created);
  assert.equal(again.product.id, created.product.id);
});

test('matching by normalized description when no GTIN', () => {
  const created = findOrCreateProduct(userId, { description: 'Café com Açúcar', quantity: 1 });
  const again = findOrCreateProduct(userId, { description: 'CAFE  COM   ACUCAR', quantity: 1 });
  assert.ok(!again.created);
  assert.equal(again.product.id, created.product.id);
});

test('no match creates a new product', () => {
  const a = findOrCreateProduct(userId, { description: 'Produto X', quantity: 1 });
  const b = findOrCreateProduct(userId, { description: 'Produto Y', quantity: 1 });
  assert.notEqual(a.product.id, b.product.id);
  assert.ok(b.created);
});

test('adjust records a signed difference movement', () => {
  const p = createProduct(userId, { description: 'Item D' });
  recordMovement(userId, p.id, 'in', 5, 'manual');
  adjustToBalance(userId, p.id, 2); // -3
  const adj = listMovements(userId, p.id).find((m) => m.type === 'adjust');
  assert.ok(adj);
  assert.equal(adj!.quantity, -3);
  assert.equal(getProduct(userId, p.id).balance, 2);
});

test('editing product data affects future matching', () => {
  const p = createProduct(userId, { description: 'Sabao', gtin: null });
  updateProduct(userId, p.id, { gtin: '555' });
  const match = findOrCreateProduct(userId, { description: 'Qualquer', gtin: '555', quantity: 1 });
  assert.ok(!match.created);
  assert.equal(match.product.id, p.id);
});

test('a user cannot access another user product', () => {
  const p = createProduct(otherId, { description: 'Alheio' });
  assert.throws(() => getProduct(userId, p.id), (e: AppError) => e.code === 'product_not_found');
});
