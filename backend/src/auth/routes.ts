import { Router } from 'express';
import { z } from 'zod';
import { badRequest } from '../errors.js';
import { login, logout, register, SESSION_IDLE_MINUTES } from './service.js';
import { requireAuth, SESSION_COOKIE } from './middleware.js';

const credentials = z.object({
  email: z.string(),
  password: z.string(),
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_IDLE_MINUTES * 60 * 1000,
    path: '/',
  };
}

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'E-mail e senha sao obrigatorios.');
  const user = register(parsed.data.email, parsed.data.password);
  res.status(201).json({ user });
});

authRouter.post('/login', (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'E-mail e senha sao obrigatorios.');
  const { user, token } = login(parsed.data.email, parsed.data.password);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  res.json({ user });
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) logout(token);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
