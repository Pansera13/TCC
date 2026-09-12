import { badRequest } from '../errors.js';

/** A NF-e/NFC-e access key is exactly 44 numeric digits. */
export function isValidAccessKey(key: string): boolean {
  return /^\d{44}$/.test(key);
}

/** Strip spaces/punctuation and return the 44-digit key, or null if not found. */
export function extractAccessKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 44) return digits;
  // NFC-e QR payloads embed the key in a URL param (e.g. ?p=4412...|2|1|...).
  const match = raw.match(/(\d{44})/);
  return match ? match[1] : null;
}

export function assertValidAccessKey(key: string): string {
  if (!isValidAccessKey(key)) {
    throw badRequest('invalid_access_key', 'Chave de acesso invalida (esperado 44 digitos).');
  }
  return key;
}

/** UF (state) code = first two digits of the access key. */
export function ufFromAccessKey(key: string): string {
  return key.slice(0, 2);
}
