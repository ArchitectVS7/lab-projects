import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

const COOKIE_NAME = 'auth_token';

export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export const generateToken = (userId: string): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as string & jwt.SignOptions['expiresIn'];
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn }
  );
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
  res.cookie(COOKIE_NAME, '', { ...getCookieOptions(), maxAge: 0 });
};

const extractToken = (req: Request): string | null => {
  // 1. Try HTTP-only cookie (primary -- PRD 7.1: tokens in HTTP-only cookies only)
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // 2. Fallback to Authorization header in dev only (for curl/Postman testing)
  if (process.env.NODE_ENV !== 'production') {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
  }
  return null;
};

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};
