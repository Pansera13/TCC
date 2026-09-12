/** Application error carrying an HTTP status and a stable machine code. */
export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (code: string, msg: string) => new AppError(400, code, msg);
export const unauthorized = (code: string, msg: string) => new AppError(401, code, msg);
export const forbidden = (code: string, msg: string) => new AppError(403, code, msg);
export const notFound = (code: string, msg: string) => new AppError(404, code, msg);
export const conflict = (code: string, msg: string) => new AppError(409, code, msg);
export const serviceUnavailable = (code: string, msg: string) => new AppError(503, code, msg);
