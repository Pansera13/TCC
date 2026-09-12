import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb, setDb } from '../src/db/index.ts';
import { hashPassword, verifyPassword } from '../src/auth/passwords.ts';
import { login, logout, register, resolveSession } from '../src/auth/service.ts';
import { AppError } from '../src/errors.ts';

beforeEach(() => {
  setDb(createTestDb());
});

test('password hash is irreversible and verifiable', () => {
  const hash = hashPassword('segredo123');
  assert.notEqual(hash, 'segredo123');
  assert.ok(verifyPassword('segredo123', hash));
  assert.ok(!verifyPassword('errada', hash));
});

test('register succeeds with valid email and strong password', () => {
  const user = register('User@Example.com', 'segredo123');
  assert.equal(user.email, 'user@example.com');
  assert.ok(user.id > 0);
});

test('register rejects duplicate email', () => {
  register('dup@example.com', 'segredo123');
  assert.throws(() => register('dup@example.com', 'outra1234'), (e: AppError) => e.code === 'email_in_use');
});

test('register rejects weak password', () => {
  assert.throws(() => register('weak@example.com', '123'), (e: AppError) => e.code === 'weak_password');
});

test('login succeeds with valid credentials and fails otherwise', () => {
  register('login@example.com', 'segredo123');
  const { user, token } = login('login@example.com', 'segredo123');
  assert.equal(user.email, 'login@example.com');
  assert.ok(token.length > 0);
  assert.throws(() => login('login@example.com', 'errada'), (e: AppError) => e.code === 'invalid_credentials');
  assert.throws(() => login('nao@existe.com', 'segredo123'), (e: AppError) => e.code === 'invalid_credentials');
});

test('session resolves then is invalidated by logout', () => {
  register('sess@example.com', 'segredo123');
  const { token } = login('sess@example.com', 'segredo123');
  assert.ok(resolveSession(token));
  logout(token);
  assert.equal(resolveSession(token), null);
});
