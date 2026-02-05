/**
 * Authentication middleware
 * 
 * Extracts and validates JWT from Authorization header.
 * Attaches user payload to request for downstream handlers.
 */

import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { UnauthorizedError } from '../errors';
import { JwtPayload } from '../types/user';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Require valid JWT token
 */
export function requireAuth(
  req: Express.Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = userService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth - attaches user if token present, continues otherwise
 */
export function optionalAuth(
  req: Express.Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = userService.verifyToken(token);
    } catch {
      // Invalid token, but auth is optional - continue without user
    }
  }

  next();
}
