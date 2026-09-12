import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from './migrations.js';

let db: DatabaseSync | null = null;

/**
 * Opens (once) the SQLite database. Path comes from DATABASE_FILE, defaulting
 * to ./data/dev.db. Use ':memory:' for tests. Foreign keys are enforced and
 * pending migrations are applied on first open.
 */
export function getDb(): DatabaseSync {
  if (db) return db;
  const file = process.env.DATABASE_FILE ?? 'data/dev.db';
  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true });
  }
  db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

/** Create a fresh in-memory database with migrations applied (for tests). */
export function createTestDb(): DatabaseSync {
  const mem = new DatabaseSync(':memory:');
  mem.exec('PRAGMA foreign_keys = ON;');
  migrate(mem);
  return mem;
}

/** Reset the module-level singleton (used by tests that swap the connection). */
export function setDb(instance: DatabaseSync | null): void {
  db = instance;
}
