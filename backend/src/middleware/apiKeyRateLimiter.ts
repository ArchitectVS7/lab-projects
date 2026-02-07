import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth.js';

export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: AuthRequest) => {
    // Only apply to API key auth, skip for cookie-based auth
    if (process.env.NODE_ENV === 'test') return true;
    return req.authMethod !== 'apikey';
  },
  keyGenerator: (req: AuthRequest) => {
    return req.userId || req.ip || 'unknown';
  },
  message: { error: 'API key rate limit exceeded. Maximum 1000 requests per hour.' },
});
