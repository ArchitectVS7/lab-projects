import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  success: boolean;
  user?: { id: string; email: string };
  tokens?: TokenPair;
  error?: string;
}

/**
 * Register a new user
 */
export async function register(email: string, password: string): Promise<LoginResult> {
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: 'Email already registered' };
  }

  // Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  // Generate tokens
  const tokens = await generateTokens(user.id);

  return {
    success: true,
    user: { id: user.id, email: user.email },
    tokens,
  };
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Validate password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Generate tokens
  const tokens = await generateTokens(user.id);

  return {
    success: true,
    user: { id: user.id, email: user.email },
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(refreshToken: string): Promise<LoginResult> {
  // Find token in database
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored) {
    return { success: false, error: 'Invalid refresh token' };
  }

  // Check expiration
  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return { success: false, error: 'Refresh token expired' };
  }

  // Rotate: delete old token, create new pair
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const tokens = await generateTokens(stored.userId);

  return {
    success: true,
    user: { id: stored.user.id, email: stored.user.email },
    tokens,
  };
}

/**
 * Logout - revoke refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

/**
 * Logout from all devices - revoke all refresh tokens for user
 */
export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

/**
 * Validate access token and return user ID
 */
export function validateAccessToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as { sub: string };
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Generate access + refresh token pair
 */
async function generateTokens(userId: string): Promise<TokenPair> {
  // Short-lived access token (stateless JWT)
  const accessToken = jwt.sign(
    { sub: userId },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Long-lived refresh token (stored in DB for revocation)
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}
