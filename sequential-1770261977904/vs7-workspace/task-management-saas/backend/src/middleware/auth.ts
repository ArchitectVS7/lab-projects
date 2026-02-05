import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

// Cookie configuration
export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

// Generate JWT token
export const generateToken = (userId: string): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as jwt.Secret,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
};

// Set auth cookie
export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('auth_token', token, getCookieOptions());
};

// Clear auth cookie
export const clearAuthCookie = (res: Response): void => {
  res.cookie('auth_token', '', {
    ...getCookieOptions(),
    maxAge: 0,
  });
};

// Verify token from cookie or Authorization header
export const verifyToken = (req: Request): JwtPayload | null => {
  // First try cookie
  let token = req.cookies?.auth_token;

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET as jwt.Secret) as JwtPayload;
  } catch {
    return null;
  }
};

// Auth middleware - requires authentication
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const payload = verifyToken(req);

  if (!payload) {
    next(new AppError('Authentication required', 401));
    return;
  }

  req.userId = payload.userId;
  next();
};

// Optional auth middleware - attaches user if authenticated but doesn't require it
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const payload = verifyToken(req);

  if (payload) {
    req.userId = payload.userId;
  }

  next();
};
