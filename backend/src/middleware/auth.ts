import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  userId?: string;
  authMethod?: 'cookie' | 'apikey';
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
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export const generateToken = (userId: string): string => {
  const expiresIn = (process.env.JWT_SECRET ? process.env.JWT_EXPIRES_IN || '7d' : '7d') as string & jwt.SignOptions['expiresIn'];
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

/**
 * Generate a new API key for a user.
 * Format: taskman_<base64(userId:randomHex)>
 * Returns { plainKey, keyHash } -- plainKey shown ONCE, keyHash stored.
 */
export async function generateApiKey(userId: string): Promise<{ plainKey: string; keyHash: string }> {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const plainKey = `taskman_${Buffer.from(`${userId}:${randomPart}`).toString('base64')}`;
  const keyHash = await bcrypt.hash(plainKey, 10);
  return { plainKey, keyHash };
}

/**
 * Decode an API key to extract the userId prefix.
 */
function decodeApiKeyUserId(apiKey: string): string | null {
  try {
    const payload = apiKey.replace('taskman_', '');
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;
    return decoded.substring(0, colonIndex);
  } catch {
    return null;
  }
}

const extractToken = (req: Request): string | null => {
  // 1. Try HTTP-only cookie (primary)
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // 2. Fallback to Authorization header (needed for mobile browsers that
  //    may not send cross-origin cookies reliably due to ITP / SameSite issues)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // Path 1: API key authentication
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey && apiKey.startsWith('taskman_')) {
    try {
      const userId = decodeApiKeyUserId(apiKey);
      if (!userId) {
        return next(new AppError('Invalid API key', 401));
      }

      const keys = await prisma.apiKey.findMany({
        where: { userId },
      });

      let matched = false;
      let matchedKeyId: string | null = null;
      for (const key of keys) {
        if (await bcrypt.compare(apiKey, key.keyHash)) {
          matched = true;
          matchedKeyId = key.id;
          break;
        }
      }

      if (!matched) {
        return next(new AppError('Invalid API key', 401));
      }

      req.userId = userId;
      req.authMethod = 'apikey';

      // Update lastUsedAt in background (non-blocking)
      if (matchedKeyId) {
        prisma.apiKey.update({
          where: { id: matchedKeyId },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});
      }

      return next();
    } catch {
      return next(new AppError('Invalid API key', 401));
    }
  }

  // Path 2: JWT cookie/bearer authentication
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.userId = payload.userId;
    req.authMethod = 'cookie';
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};
