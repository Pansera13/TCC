import type { DatabaseSync } from 'node:sqlite';

export interface Migration {
  id: string;
  up: string;
  down: string;
}

// Ordered migrations. Each `up` is applied once; `down` reverses it.
// SQL is written for SQLite (dev/test). The schema is intentionally portable
// so it can be recreated on PostgreSQL for production (see design.md).
export const migrations: Migration[] = [
  {
    id: '001_users',
    up: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
    down: `DROP TABLE users;`,
  },
  {
    id: '002_products',
    up: `
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        description_normalized TEXT NOT NULL,
        gtin TEXT,
        unit TEXT NOT NULL DEFAULT 'UN',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_products_user_gtin ON products (user_id, gtin);
      CREATE INDEX idx_products_user_desc ON products (user_id, description_normalized);
    `,
    down: `DROP TABLE products;`,
  },
  {
    id: '003_stock_movements',
    up: `
      CREATE TABLE stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
        quantity REAL NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('nfe', 'manual')),
        note_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_movements_product ON stock_movements (product_id, created_at);
    `,
    down: `DROP TABLE stock_movements;`,
  },
  {
    id: '004_imported_notes',
    up: `
      CREATE TABLE imported_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        access_key TEXT NOT NULL,
        source TEXT NOT NULL,
        issued_at TEXT,
        imported_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, access_key)
      );
      CREATE TABLE imported_note_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        gtin TEXT,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'UN',
        unit_value REAL,
        product_id INTEGER,
        FOREIGN KEY (note_id) REFERENCES imported_notes(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );
    `,
    down: `DROP TABLE imported_note_items; DROP TABLE imported_notes;`,
  },
  {
    id: '005_sessions',
    up: `
      CREATE TABLE sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `,
    down: `DROP TABLE sessions;`,
  },
];

function ensureMigrationsTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function appliedIds(db: DatabaseSync): Set<string> {
  ensureMigrationsTable(db);
  const rows = db.prepare('SELECT id FROM _migrations').all() as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

/** Apply all pending migrations in order. Returns the ids that were applied. */
export function migrate(db: DatabaseSync): string[] {
  const done = appliedIds(db);
  const applied: string[] = [];
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.up);
      db.prepare('INSERT INTO _migrations (id) VALUES (?)').run(m.id);
      db.exec('COMMIT');
      applied.push(m.id);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  return applied;
}

/** Roll back the most recently applied migration. Returns its id, or null if none. */
export function rollbackLast(db: DatabaseSync): string | null {
  const done = appliedIds(db);
  for (let i = migrations.length - 1; i >= 0; i--) {
    const m = migrations[i];
    if (!done.has(m.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.down);
      db.prepare('DELETE FROM _migrations WHERE id = ?').run(m.id);
      db.exec('COMMIT');
      return m.id;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  return null;
}
