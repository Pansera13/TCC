import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../errors.js';
import { resolveSession, type User } from './service.js';

export const SESSION_COOKIE = 'session';

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/** Rejects the request unless a valid, non-expired session cookie is present. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  const user = token ? resolveSession(token) : null;
  if (!user) {
    throw unauthorized('not_authenticated', 'Faca login para continuar.');
  }
  req.user = user;
  next();
}
