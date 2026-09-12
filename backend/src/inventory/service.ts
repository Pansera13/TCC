import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/index.js';
import { badRequest, notFound } from '../errors.js';

export interface Product {
  id: number;
  description: string;
  gtin: string | null;
  unit: string;
  balance: number;
}

export interface Movement {
  id: number;
  productId: number;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  source: 'nfe' | 'manual';
  noteId: number | null;
  createdAt: string;
}

export interface ItemInput {
  description: string;
  gtin?: string | null;
  quantity: number;
  unit?: string;
  unitValue?: number | null;
}

function db(): DatabaseSync {
  return getDb();
}

/** Normalize a description for matching: uppercase, no accents, collapsed spaces. */
export function normalizeDescription(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const BALANCE_EXPR = `
  COALESCE((
    SELECT SUM(CASE m.type
                 WHEN 'in' THEN m.quantity
                 WHEN 'out' THEN -m.quantity
                 ELSE m.quantity END)
      FROM stock_movements m WHERE m.product_id = p.id
  ), 0)
`;

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    description: r.description,
    gtin: r.gtin ?? null,
    unit: r.unit,
    balance: r.balance,
  };
}

export function listProducts(userId: number): Product[] {
  const rows = db()
    .prepare(
      `SELECT p.id, p.description, p.gtin, p.unit, ${BALANCE_EXPR} AS balance
         FROM products p WHERE p.user_id = ? ORDER BY p.description`,
    )
    .all(userId);
  return rows.map(rowToProduct);
}

export function getProduct(userId: number, id: number): Product {
  const row = db()
    .prepare(
      `SELECT p.id, p.description, p.gtin, p.unit, ${BALANCE_EXPR} AS balance
         FROM products p WHERE p.user_id = ? AND p.id = ?`,
    )
    .get(userId, id);
  if (!row) throw notFound('product_not_found', 'Produto nao encontrado.');
  return rowToProduct(row);
}

export function getBalance(userId: number, id: number): number {
  return getProduct(userId, id).balance;
}

export function createProduct(
  userId: number,
  input: { description: string; gtin?: string | null; unit?: string },
): Product {
  const description = input.description.trim();
  if (!description) throw badRequest('invalid_product', 'A descricao e obrigatoria.');
  const gtin = input.gtin?.trim() || null;
  const unit = (input.unit || 'UN').trim().toUpperCase();
  const info = db()
    .prepare(
      `INSERT INTO products (user_id, description, description_normalized, gtin, unit)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, description, normalizeDescription(description), gtin, unit);
  return getProduct(userId, Number(info.lastInsertRowid));
}

export function updateProduct(
  userId: number,
  id: number,
  input: { description?: string; gtin?: string | null; unit?: string },
): Product {
  const current = getProduct(userId, id);
  const description = input.description?.trim() || current.description;
  const gtin = input.gtin === undefined ? current.gtin : input.gtin?.trim() || null;
  const unit = (input.unit?.trim().toUpperCase() || current.unit);
  db()
    .prepare(
      `UPDATE products SET description = ?, description_normalized = ?, gtin = ?, unit = ?
        WHERE user_id = ? AND id = ?`,
    )
    .run(description, normalizeDescription(description), gtin, unit, userId, id);
  return getProduct(userId, id);
}

function assertOwnedProduct(userId: number, productId: number): void {
  const owned = db()
    .prepare('SELECT 1 FROM products WHERE id = ? AND user_id = ?')
    .get(productId, userId);
  if (!owned) throw notFound('product_not_found', 'Produto nao encontrado.');
}

/**
 * Record a stock movement. For 'out', rejects quantities greater than the
 * current balance (never lets balance go negative). `quantity` for 'in'/'out'
 * must be positive; for 'adjust' it is the signed delta to apply.
 */
export function recordMovement(
  userId: number,
  productId: number,
  type: Movement['type'],
  quantity: number,
  source: Movement['source'],
  noteId: number | null = null,
): Movement {
  assertOwnedProduct(userId, productId);
  if (type !== 'adjust' && quantity <= 0) {
    throw badRequest('invalid_quantity', 'A quantidade deve ser positiva.');
  }
  if (type === 'out') {
    const balance = getBalance(userId, productId);
    if (quantity > balance) {
      throw badRequest(
        'insufficient_stock',
        `Saldo insuficiente. Disponivel: ${balance}.`,
      );
    }
  }
  const info = db()
    .prepare(
      `INSERT INTO stock_movements (product_id, type, quantity, source, note_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(productId, type, quantity, source, noteId);
  return db()
    .prepare(
      `SELECT id, product_id AS productId, type, quantity, source, note_id AS noteId, created_at AS createdAt
         FROM stock_movements WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as unknown as Movement;
}

export function listMovements(userId: number, productId: number): Movement[] {
  assertOwnedProduct(userId, productId);
  return db()
    .prepare(
      `SELECT id, product_id AS productId, type, quantity, source, note_id AS noteId, created_at AS createdAt
         FROM stock_movements WHERE product_id = ? ORDER BY created_at, id`,
    )
    .all(productId) as unknown as Movement[];
}

/** Adjust a product to a target balance, recording the signed difference. */
export function adjustToBalance(userId: number, productId: number, targetBalance: number): Movement {
  if (targetBalance < 0) throw badRequest('invalid_balance', 'O saldo nao pode ser negativo.');
  const current = getBalance(userId, productId);
  const delta = targetBalance - current;
  return recordMovement(userId, productId, 'adjust', delta, 'manual', null);
}

/**
 * Find an existing product by GTIN (preferred) or normalized description,
 * creating a new one when there is no match. Scoped to the user's catalog.
 */
export function findOrCreateProduct(userId: number, item: ItemInput): { product: Product; created: boolean } {
  const gtin = item.gtin?.trim() || null;
  if (gtin) {
    const byGtin = db()
      .prepare('SELECT id FROM products WHERE user_id = ? AND gtin = ?')
      .get(userId, gtin) as { id: number } | undefined;
    if (byGtin) return { product: getProduct(userId, byGtin.id), created: false };
  }
  const norm = normalizeDescription(item.description);
  const byDesc = db()
    .prepare('SELECT id FROM products WHERE user_id = ? AND description_normalized = ?')
    .get(userId, norm) as { id: number } | undefined;
  if (byDesc) return { product: getProduct(userId, byDesc.id), created: false };

  const product = createProduct(userId, {
    description: item.description,
    gtin,
    unit: item.unit,
  });
  return { product, created: true };
}

/** Match/create the product for an imported item and record the stock entry. */
export function addEntryForItem(
  userId: number,
  item: ItemInput,
  noteId: number | null,
): { product: Product; created: boolean } {
  const { product, created } = findOrCreateProduct(userId, item);
  recordMovement(userId, product.id, 'in', item.quantity, noteId ? 'nfe' : 'manual', noteId);
  return { product: getProduct(userId, product.id), created };
}
