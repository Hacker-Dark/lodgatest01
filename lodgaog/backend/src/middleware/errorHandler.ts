import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('Express central error boundary caught:', err);

  const status = err.status || 500;
  const message = err.message || 'An unexpected server error occurred. Please try again.';
  
  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
  });
}
