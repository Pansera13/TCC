import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/index.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { addEntryForItem, type ItemInput } from '../inventory/service.js';
import { assertValidAccessKey } from './accessKey.js';
import type { NfeItem, NotaFiscalProvider, ParsedNote } from './provider.js';
import { parseNfeXml } from './xmlProvider.js';

function db(): DatabaseSync {
  return getDb();
}

export interface ImportPreview {
  accessKey: string;
  issuedAt: string | null;
  source: string;
  alreadyImported: boolean;
  items: NfeItem[];
}

function findExistingNote(userId: number, accessKey: string): { id: number } | undefined {
  return db()
    .prepare('SELECT id FROM imported_notes WHERE user_id = ? AND access_key = ?')
    .get(userId, accessKey) as { id: number } | undefined;
}

/**
 * Fetch a note from the given provider for review. Does NOT change stock.
 * Flags notes already imported so the caller can block re-import.
 */
export async function previewFromAccessKey(
  userId: number,
  accessKey: string,
  provider: NotaFiscalProvider,
  source: string,
): Promise<ImportPreview> {
  assertValidAccessKey(accessKey);
  const alreadyImported = Boolean(findExistingNote(userId, accessKey));
  const note = await provider.fetchByAccessKey(accessKey);
  return { accessKey, issuedAt: note.issuedAt, source, alreadyImported, items: note.items };
}

/** Build a review preview straight from an uploaded XML (no network). */
export function previewFromXml(userId: number, xml: string): ImportPreview {
  const note: ParsedNote = parseNfeXml(xml);
  const alreadyImported = Boolean(findExistingNote(userId, note.accessKey));
  return {
    accessKey: note.accessKey,
    issuedAt: note.issuedAt,
    source: 'xml',
    alreadyImported,
    items: note.items,
  };
}

export interface ConfirmInput {
  accessKey: string;
  issuedAt?: string | null;
  source: string;
  items: ItemInput[];
}

export interface ConfirmResult {
  noteId: number;
  itemsImported: number;
  productsCreated: number;
}

/**
 * Effect the stock entry for every item under a single note, idempotently.
 * The review screen may have added/edited/removed items (manual path), so the
 * items passed here are the source of truth. Runs in one transaction.
 */
export function confirmImport(userId: number, input: ConfirmInput): ConfirmResult {
  const accessKey = assertValidAccessKey(input.accessKey);
  if (!input.items?.length) {
    throw badRequest('empty_note', 'A nota nao possui itens para importar.');
  }
  if (findExistingNote(userId, accessKey)) {
    throw conflict('note_already_imported', 'Esta nota ja foi importada.');
  }

  db().exec('BEGIN');
  try {
    const noteInfo = db()
      .prepare(
        `INSERT INTO imported_notes (user_id, access_key, source, issued_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(userId, accessKey, input.source, input.issuedAt ?? null);
    const noteId = Number(noteInfo.lastInsertRowid);

    let productsCreated = 0;
    for (const item of input.items) {
      if (!item.description?.trim() || !(item.quantity > 0)) {
        throw badRequest('invalid_item', 'Item invalido: descricao e quantidade sao obrigatorias.');
      }
      const { product, created } = addEntryForItem(userId, item, noteId);
      if (created) productsCreated++;
      db()
        .prepare(
          `INSERT INTO imported_note_items
             (note_id, description, gtin, quantity, unit, unit_value, product_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          noteId,
          item.description.trim(),
          item.gtin?.trim() || null,
          item.quantity,
          (item.unit || 'UN').toUpperCase(),
          item.unitValue ?? null,
          product.id,
        );
    }
    db().exec('COMMIT');
    return { noteId, itemsImported: input.items.length, productsCreated };
  } catch (err) {
    db().exec('ROLLBACK');
    throw err;
  }
}

export function listNotes(userId: number) {
  return db()
    .prepare(
      `SELECT id, access_key AS accessKey, source, issued_at AS issuedAt, imported_at AS importedAt
         FROM imported_notes WHERE user_id = ? ORDER BY imported_at DESC`,
    )
    .all(userId);
}

export interface NoteHeader {
  id: number;
  accessKey: string;
  source: string;
  issuedAt: string | null;
  importedAt: string;
}

export function getNote(userId: number, noteId: number) {
  const note = db()
    .prepare(
      `SELECT id, access_key AS accessKey, source, issued_at AS issuedAt, imported_at AS importedAt
         FROM imported_notes WHERE user_id = ? AND id = ?`,
    )
    .get(userId, noteId) as unknown as NoteHeader | undefined;
  if (!note) throw notFound('note_not_found', 'Nota nao encontrada.');
  const items = db()
    .prepare(
      `SELECT id, description, gtin, quantity, unit, unit_value AS unitValue, product_id AS productId
         FROM imported_note_items WHERE note_id = ?`,
    )
    .all(noteId);
  return { ...note, items };
}

/** Traceability: given a movement, return the source note (if any). */
export function getMovementSource(userId: number, movementId: number) {
  const row = db()
    .prepare(
      `SELECT m.id AS movementId, m.note_id AS noteId
         FROM stock_movements m
         JOIN products p ON p.id = m.product_id
        WHERE m.id = ? AND p.user_id = ?`,
    )
    .get(movementId, userId) as { movementId: number; noteId: number | null } | undefined;
  if (!row) throw notFound('movement_not_found', 'Movimentacao nao encontrada.');
  if (!row.noteId) return { movementId, note: null };
  return { movementId, note: getNote(userId, row.noteId) };
}
