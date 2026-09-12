import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Password hashing uses scrypt from node:crypto: a strong, memory-hard KDF that
// needs no native module (keeps the project runnable cross-platform without a
// compile step). Same security class as argon2/bcrypt for this use. Stored
// format: scrypt$<N>$<saltHex>$<hashHex>.
const N = 16384; // CPU/memory cost
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const cost = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  const actual = scryptSync(password, salt, expected.length, { N: cost });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
