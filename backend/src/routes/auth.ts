import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  authenticate,
  AuthRequest,
  generateToken,
  generateApiKey,
  setAuthCookie,
  clearAuthCookie,
} from '../middleware/auth.js';
import { requirePlan, PlanRequest } from '../middleware/planEnforcement.js';

const router = Router();

// Rate limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMITER,
});

// --- Zod Schemas ---

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a digit'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a digit'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a digit'),
});

// Standard user select (never return passwordHash)
const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// --- Routes ---

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 required: true
 *               password:
 *                 type: string
 *                 required: true
 *               name:
 *                 type: string
 *                 required: true
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Abuse prevention: capture registration fingerprint (IP + User-Agent hash)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';
    const fingerprint = crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex');

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        registrationFingerprint: fingerprint,
        registrationIp: ip,
      },
      select: userSelect,
    });

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    res.status(201).json({ message: 'Registration successful', user, token });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 required: true
 *               password:
 *                 type: string
 *                 required: true
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const userWithHash = await prisma.user.findUnique({ where: { email: data.email } });
    if (!userWithHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(data.password, userWithHash.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken(userWithHash.id);
    setAuthCookie(res, token);

    const user = await prisma.user.findUnique({
      where: { id: userWithHash.id },
      select: userSelect,
    });

    res.json({ message: 'Login successful', user, token });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'Logout successful' });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        ...userSelect,
        plan: true,
        emailVerified: true,
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/refresh', authenticate, (req: AuthRequest, res: Response) => {
  const token = generateToken(req.userId!);
  setAuthCookie(res, token);
  res.json({ message: 'Token refreshed', token });
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: userSelect,
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/password:
 *   put:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 required: true
 *               newPassword:
 *                 type: string
 *                 required: true
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put('/password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// --- API Key Management ---

const createApiKeySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
});

/**
 * @swagger
 * /api/auth/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 required: true
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 lastUsedAt:
 *                   type: string
 *                   format: date-time
 *                 key:
 *                   type: string
 */
router.post('/api-keys', authenticate, requirePlan('PRO', 'TEAM'), async (req: PlanRequest, res: Response, next: NextFunction) => {
  try {
    const data = createApiKeySchema.parse(req.body);
    const { plainKey, keyHash } = await generateApiKey(req.userId!);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.userId!,
        name: data.name,
        keyHash,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    // Return the plaintext key only on creation
    res.status(201).json({ ...apiKey, key: plainKey });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/api-keys:
 *   get:
 *     summary: List user's API keys
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiKey'
 */
router.get('/api-keys', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(keys);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       204:
 *         description: API key revoked successfully
 */
router.delete('/api-keys/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const key = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!key) {
      throw new AppError('API key not found', 404);
    }

    if (key.userId !== req.userId) {
      throw new AppError('You can only revoke your own API keys', 403);
    }

    await prisma.apiKey.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// --- Password Reset Helpers ---

function buildResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: sans-serif; background: #f9fafb; padding: 40px 0; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 40px;">
    <h1 style="font-size: 22px; color: #111827; margin-top: 0;">Reset your password</h1>
    <p style="color: #374151; font-size: 15px;">Hi ${name},</p>
    <p style="color: #374151; font-size: 15px;">We received a request to reset your TaskMan password. Click the button below to choose a new password.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block;">Reset password</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">TaskMan · If the button doesn't work, copy this link: <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
  </div>
</body>
</html>`;
}

let _resend: Resend | null = null;
function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new AppError('Email service not configured', 500);
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// --- Password Reset Routes ---

router.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${plainToken}`;

      try {
        const resend = getResendClient();
        const emailFrom = process.env.EMAIL_FROM || 'TaskMan <noreply@taskman.app>';
        await resend.emails.send({
          from: emailFrom,
          to: user.email,
          subject: 'Reset your TaskMan password',
          html: buildResetEmailHtml(user.name, resetUrl),
        });
      } catch (emailErr) {
        console.error('Failed to send password reset email:', emailErr);
      }
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

router.get('/validate-reset-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      throw new AppError('Reset token is invalid or has expired', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash } });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new AppError('Reset token is invalid or has expired', 400);
    }

    res.json({ valid: true });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: tokenHash } });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new AppError('Reset token is invalid or has expired', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
});

export default router;
