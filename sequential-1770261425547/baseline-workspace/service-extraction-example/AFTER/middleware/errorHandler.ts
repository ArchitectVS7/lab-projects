/**
 * Global error handler middleware
 * 
 * Catches all errors and returns consistent JSON responses.
 * Must be registered last in middleware chain.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    ...[key: string]: unknown;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  // Log error (in production, use proper logging service)
  console.error(`[${req.method} ${req.path}]`, err);

  // Handle known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
    return;
  }

  // Default: Internal server error
  // Don't leak error details in production
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  });
}
