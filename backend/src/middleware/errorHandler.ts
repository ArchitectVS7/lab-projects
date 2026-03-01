import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    console.error('Error:', err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Unexpected server error — include requestId so support can correlate logs
  const requestId = (res.locals.requestId as string) || 'unknown';
  console.error(`[${requestId}] Unhandled error:`, err);
  return res.status(500).json({ error: 'Internal server error', requestId });
};
