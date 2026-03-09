import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from './auth.js';

interface JwtPayload {
  userId: string;
}

/**
 * Non-rejecting authentication middleware.
 * Attempts to identify the user from the JWT cookie or Bearer header and
 * populates req.userId if a valid token is found. Calls next() regardless —
 * it never rejects unauthenticated requests. Used exclusively to give the
 * per-user rate limiter a stable key before the per-route authenticate runs.
 */
export const tryAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (apiKey && apiKey.startsWith('taskman_')) {
      // API key path: decode the userId prefix embedded in the key.
      // Full validation (bcrypt) is deferred to the route's authenticate middleware.
      const payload = apiKey.replace('taskman_', '');
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      const colonIndex = decoded.indexOf(':');
      if (colonIndex !== -1) {
        (req as AuthRequest).userId = decoded.substring(0, colonIndex);
        (req as AuthRequest).authMethod = 'apikey';
      }
      return next();
    }

    // JWT cookie or Bearer header path
    let token: string | null = null;
    if (req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      (req as AuthRequest).userId = payload.userId;
      (req as AuthRequest).authMethod = 'cookie';
    }
  } catch {
    // Invalid or missing token — leave req.userId unset. The rate limiter
    // will skip this request, and the real authenticate will reject it.
  }
  next();
};

export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  // Read max per-request so tests can override via RATE_LIMIT_MAX env var
  max: () => parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: AuthRequest) => {
    // Skip in test environment unless specifically enabled for testing
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITER) return true;
    // Only applies to authenticated requests — unauthenticated paths are covered
    // by auth-specific limiters (e.g. login brute-force protection)
    return !req.userId;
  },
  keyGenerator: (req: AuthRequest) => {
    return req.userId || req.ip || 'unknown';
  },
  message: { error: 'Rate limit exceeded. Maximum 300 requests per minute per user.' },
});
