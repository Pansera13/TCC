import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { AppError } from './errors.js';
import { authRouter } from './auth/routes.js';
import { inventoryRouter } from './inventory/routes.js';
import { nfeRouter } from './nfe/routes.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // In dev the frontend is served by Vite and proxies /api, so same-origin.
  // CORS with credentials is enabled for explicitly configured origins.
  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origins.length) {
    app.use(cors({ origin: origins, credentials: true }));
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/nfe', nfeRouter);

  // Central error handler: maps AppError to its status/code; everything else 500.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    console.error('Unexpected error:', err);
    res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno.' } });
  });

  return app;
}
