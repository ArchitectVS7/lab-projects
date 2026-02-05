/**
 * User Service Unit Tests
 * 
 * Note how easy it is to test business logic when it's
 * extracted from HTTP handlers. No supertest, no HTTP mocking.
 */

import { UserService } from './user.service';
import { User } from '../models/user';
import { ConflictError, UnauthorizedError, NotFoundError } from '../errors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../models/user');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('UserService', () => {
  let userService: UserService;
  let mockEmailService: { send: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock email service
    mockEmailService = { send: jest.fn().mockResolvedValue(undefined) };
    userService = new UserService(mockEmailService as any);

    // Default bcrypt mock
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Default jwt mock
    (jwt.sign as jest.Mock).mockReturnValue('mock-token');
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', email: 'test@example.com' });
  });

  // ===========================================================================
  // register()
  // ===========================================================================
  describe('register', () => {
    const validData = {
      email: 'Test@Example.com',
      password: 'password123',
      name: 'Test User',
    };

    const mockCreatedUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      createdAt: new Date(),
      save: jest.fn(),
    };

    it('should register a new user successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      const result = await userService.register(validData);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.token).toBe('mock-token');
    });

    it('should normalize email to lowercase', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      await userService.register(validData);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    it('should hash password before storing', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      await userService.register(validData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-password' })
      );
    });

    it('should throw ConflictError if email already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      await expect(userService.register(validData))
        .rejects
        .toThrow(ConflictError);
      
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should send welcome email after registration', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

      await userService.register(validData);

      // Wait for async email send
      await new Promise(resolve => setImmediate(resolve));

      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          template: 'welcome',
        })
      );
    });

    it('should not fail registration if email send fails', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);
      mockEmailService.send.mockRejectedValue(new Error('SMTP error'));

      // Should not throw
      const result = await userService.register(validData);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle null name', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({ ...mockCreatedUser, name: null });

      const result = await userService.register({ email: validData.email, password: validData.password });

      expect(result.user.name).toBeNull();
    });
  });

  // ===========================================================================
  // login()
  // ===========================================================================
  describe('login', () => {
    const loginData = {
      email: 'Test@Example.com',
      password: 'password123',
    };

    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      createdAt: new Date(),
      lastLoginAt: null,
      save: jest.fn(),
    };

    it('should login successfully with valid credentials', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.login(loginData);

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock-token');
    });

    it('should normalize email to lowercase', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await userService.login(loginData);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should update lastLoginAt on successful login', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await userService.login(loginData);

      expect(mockUser.lastLoginAt).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.login(loginData))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password is wrong', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.login(loginData))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should use same error message for user not found and wrong password', async () => {
      // Security: don't reveal whether email exists
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      const notFoundError = await userService.login(loginData).catch(e => e);
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      const wrongPasswordError = await userService.login(loginData).catch(e => e);

      expect(notFoundError.message).toBe(wrongPasswordError.message);
    });
  });

  // ===========================================================================
  // getById()
  // ===========================================================================
  describe('getById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getById('user-123');

      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundError if user does not exist', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(userService.getById('nonexistent'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // verifyToken()
  // ===========================================================================
  describe('verifyToken', () => {
    it('should return payload for valid token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      const result = userService.verifyToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedError for invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => userService.verifyToken('invalid-token'))
        .toThrow(UnauthorizedError);
    });
  });
});
