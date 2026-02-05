/**
 * Unit tests for auth service
 * 
 * Run: jest tests/unit/services/authService.test.js
 */

const authService = require('../../../src/services/authService');
const User = require('../../../src/models/User');
const emailService = require('../../../src/services/emailService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/services/emailService');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('registerUser', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'John Doe',
    };

    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
      verified: false,
      createdAt: new Date(),
    };

    beforeEach(() => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue('hashed-password');
      jwt.sign.mockReturnValue('mock-jwt-token');
      emailService.sendVerificationEmail.mockResolvedValue();
    });

    it('creates a new user with hashed password', async () => {
      await authService.registerUser(validInput);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 12);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          name: 'John Doe',
          verified: false,
        })
      );
    });

    it('normalizes email to lowercase', async () => {
      await authService.registerUser({
        ...validInput,
        email: 'Test@Example.COM',
      });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    it('returns sanitized user without sensitive fields', async () => {
      const result = await authService.registerUser(validInput);

      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        verified: false,
        createdAt: expect.any(Date),
      });
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.user.verificationToken).toBeUndefined();
    });

    it('returns a JWT auth token', async () => {
      const result = await authService.registerUser(validInput);

      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'user-123', email: 'test@example.com' },
        'test-secret',
        { expiresIn: '7d' }
      );
      expect(result.token).toBe('mock-jwt-token');
    });

    it('sends verification email asynchronously', async () => {
      await authService.registerUser(validInput);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'John Doe',
        expect.any(String) // verification token
      );
    });

    it('throws EmailExistsError if email already registered', async () => {
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(authService.registerUser(validInput))
        .rejects
        .toThrow(authService.EmailExistsError);
    });

    it('does not fail if verification email fails to send', async () => {
      emailService.sendVerificationEmail.mockRejectedValue(new Error('SMTP error'));

      // Should not throw
      const result = await authService.registerUser(validInput);
      expect(result.user).toBeDefined();
    });

    it('generates unique verification token', async () => {
      await authService.registerUser(validInput);

      const createCall = User.create.mock.calls[0][0];
      expect(createCall.verificationToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('sets verification expiry to 24 hours from now', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await authService.registerUser(validInput);

      const createCall = User.create.mock.calls[0][0];
      const expectedExpiry = now + 24 * 60 * 60 * 1000;
      expect(createCall.verificationExpires.getTime()).toBe(expectedExpiry);

      jest.restoreAllMocks();
    });
  });

  describe('hashPassword', () => {
    it('hashes password with bcrypt', async () => {
      bcrypt.hash.mockResolvedValue('hashed');
      
      const result = await authService.hashPassword('password');
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
      expect(result).toBe('hashed');
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password', async () => {
      bcrypt.compare.mockResolvedValue(true);
      
      const result = await authService.verifyPassword('password', 'hash');
      
      expect(result).toBe(true);
    });

    it('returns false for non-matching password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      
      const result = await authService.verifyPassword('wrong', 'hash');
      
      expect(result).toBe(false);
    });
  });

  describe('generateVerificationToken', () => {
    it('generates a 64-character hex token', () => {
      const { token } = authService.generateVerificationToken();
      
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates an expiry date in the future', () => {
      const { expires } = authService.generateVerificationToken();
      
      expect(expires.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('sanitizeUser', () => {
    it('removes sensitive fields', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        name: 'John',
        passwordHash: 'secret',
        verificationToken: 'secret',
        verified: false,
        createdAt: new Date(),
      };

      const result = authService.sanitizeUser(user);

      expect(result.passwordHash).toBeUndefined();
      expect(result.verificationToken).toBeUndefined();
      expect(result.id).toBe('123');
      expect(result.email).toBe('test@example.com');
    });
  });
});
