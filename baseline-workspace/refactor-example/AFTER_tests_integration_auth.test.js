/**
 * Integration tests for auth routes
 * 
 * Run: jest tests/integration/routes/auth.test.js
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const User = require('../../../src/models/User');

// Mock email service to avoid sending real emails
jest.mock('../../../src/services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(),
}));

describe('POST /auth/register', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});
  });

  describe('successful registration', () => {
    it('returns 201 with user and token', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123',
          name: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        verified: false,
      });
      expect(res.body.user.id).toBeDefined();
      expect(res.body.token).toBeDefined();
    });

    it('creates user in database', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'dbuser@example.com',
          password: 'Password123',
          name: 'DB User',
        });

      const user = await User.findOne({ email: 'dbuser@example.com' });
      expect(user).not.toBeNull();
      expect(user.name).toBe('DB User');
    });

    it('stores hashed password, not plain text', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'secure@example.com',
          password: 'Password123',
          name: 'Secure User',
        });

      const user = await User.findOne({ email: 'secure@example.com' });
      expect(user.passwordHash).not.toBe('Password123');
      expect(user.passwordHash).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
    });

    it('normalizes email to lowercase', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'UPPERCASE@EXAMPLE.COM',
          password: 'Password123',
          name: 'Test User',
        });

      const user = await User.findOne({ email: 'uppercase@example.com' });
      expect(user).not.toBeNull();
    });

    it('does not return sensitive fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'safe@example.com',
          password: 'Password123',
          name: 'Safe User',
        });

      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.verificationToken).toBeUndefined();
    });
  });

  describe('validation errors', () => {
    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          password: 'Password123',
          name: 'No Email',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123',
          name: 'Bad Email',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    it('returns 400 for weak password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          name: 'Weak Password',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'noname@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('duplicate email', () => {
    beforeEach(async () => {
      // Create existing user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123',
          name: 'Existing User',
        });
    });

    it('returns 409 for duplicate email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password456',
          name: 'Duplicate User',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });

    it('treats email as case-insensitive', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'EXISTING@EXAMPLE.COM',
          password: 'Password456',
          name: 'Duplicate User',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('edge cases', () => {
    it('strips extra fields from request', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'Password123',
          name: 'Admin',
          admin: true,
          role: 'superuser',
        });

      expect(res.status).toBe(201);
      
      const user = await User.findOne({ email: 'admin@example.com' });
      expect(user.admin).toBeUndefined();
      expect(user.role).toBeUndefined();
    });

    it('handles concurrent registration attempts', async () => {
      const email = 'concurrent@example.com';
      
      const results = await Promise.all([
        request(app).post('/auth/register').send({
          email,
          password: 'Password123',
          name: 'User 1',
        }),
        request(app).post('/auth/register').send({
          email,
          password: 'Password456',
          name: 'User 2',
        }),
      ]);

      const successes = results.filter(r => r.status === 201);
      const conflicts = results.filter(r => r.status === 409);

      expect(successes.length).toBe(1);
      expect(conflicts.length).toBe(1);
    });
  });
});
