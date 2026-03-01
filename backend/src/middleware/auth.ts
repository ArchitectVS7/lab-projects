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
 * Returns { plainKey, keyHash, keyLookupHash }
 *   - plainKey:      shown ONCE to the user, never stored
 *   - keyHash:       bcrypt hash stored for verification
 *   - keyLookupHash: SHA-256 of plainKey stored in plaintext for O(1) DB lookup,
 *                    eliminating the N+1 findMany + bcrypt loop
 */
export async function generateApiKey(userId: string): Promise<{ plainKey: string; keyHash: string; keyLookupHash: string }> {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const plainKey = `taskman_${Buffer.from(`${userId}:${randomPart}`).toString('base64')}`;
  const keyHash = await bcrypt.hash(plainKey, 10);
  const keyLookupHash = crypto.createHash('sha256').update(plainKey).digest('hex');
  return { plainKey, keyHash, keyLookupHash };
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
      // Compute the lookup hash from the presented key so we can fetch exactly
      // one record from the DB — no N+1 findMany, no bcrypt loop over all user keys.
      const keyLookupHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyLookupHash },
      });

      // Always run bcrypt.compare to avoid short-circuit timing differences.
      // If no record was found, compare against a dummy hash so response time
      // is indistinguishable from a real key that simply doesn't match.
      const dummyHash = '$2a$10$dummyhashfortimingnormalizationXXXXXXXXXXXXXXXXXXXXXXX';
      const hashToCompare = keyRecord?.keyHash ?? dummyHash;
      const matched = await bcrypt.compare(apiKey, hashToCompare);

      if (!keyRecord || !matched) {
        return next(new AppError('Invalid API key', 401));
      }

      req.userId = keyRecord.userId;
      req.authMethod = 'apikey';

      // Update lastUsedAt in background (non-blocking)
      prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch((err) => console.error('[auth] Failed to update API key lastUsedAt:', err));

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
