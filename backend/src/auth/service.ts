import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db/index.js';
import { badRequest, conflict, unauthorized } from '../errors.js';
import { hashPassword, verifyPassword } from './passwords.js';

export interface User {
  id: number;
  email: string;
}

// A session expires after this many minutes of inactivity.
export const SESSION_IDLE_MINUTES = 60 * 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function db(): DatabaseSync {
  return getDb();
}

export function register(email: string, password: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    throw badRequest('invalid_email', 'Informe um e-mail valido.');
  }
  if (password.length < 8) {
    throw badRequest('weak_password', 'A senha deve ter ao menos 8 caracteres.');
  }
  const existing = db().prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    // Generic message: do not leak that this specific email exists beyond "in use".
    throw conflict('email_in_use', 'Este e-mail ja esta em uso.');
  }
  const info = db()
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(normalizedEmail, hashPassword(password));
  return { id: Number(info.lastInsertRowid), email: normalizedEmail };
}

/** Verify credentials and create a session. Returns the opaque session token. */
export function login(email: string, password: string): { user: User; token: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const row = db()
    .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(normalizedEmail) as { id: number; email: string; password_hash: string } | undefined;
  // Generic error regardless of whether the email exists.
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw unauthorized('invalid_credentials', 'E-mail ou senha incorretos.');
  }
  const token = randomBytes(32).toString('hex');
  db().prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, row.id);
  return { user: { id: row.id, email: row.email }, token };
}

export function logout(token: string): void {
  db().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Resolve a session token to a user, enforcing idle expiration and refreshing
 * last_seen_at. Returns null when the token is missing or expired.
 */
export function resolveSession(token: string): User | null {
  const row = db()
    .prepare(
      `SELECT s.user_id AS userId, u.email AS email,
              (julianday('now') - julianday(s.last_seen_at)) * 24 * 60 AS idleMinutes
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .get(token) as { userId: number; email: string; idleMinutes: number } | undefined;
  if (!row) return null;
  if (row.idleMinutes > SESSION_IDLE_MINUTES) {
    db().prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  db().prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE token = ?").run(token);
  return { id: row.userId, email: row.email };
}
