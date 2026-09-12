import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wrap an async route so rejected promises reach Express's error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
