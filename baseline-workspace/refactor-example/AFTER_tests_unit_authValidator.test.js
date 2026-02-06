/**
 * Unit tests for auth validator
 * 
 * Run: jest tests/unit/validators/authValidator.test.js
 */

const { validateRegister } = require('../../../src/validators/authValidator');

describe('validateRegister', () => {
  const validInput = {
    email: 'test@example.com',
    password: 'Password123',
    name: 'John Doe',
  };

  describe('valid input', () => {
    it('accepts valid registration data', () => {
      const result = validateRegister(validInput);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validInput);
    });

    it('trims whitespace from name', () => {
      const result = validateRegister({
        ...validInput,
        name: '  John Doe  ',
      });
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Doe');
    });

    it('strips unknown fields', () => {
      const result = validateRegister({
        ...validInput,
        admin: true,
        role: 'superuser',
      });
      
      expect(result.success).toBe(true);
      expect(result.data.admin).toBeUndefined();
      expect(result.data.role).toBeUndefined();
    });
  });

  describe('email validation', () => {
    it('rejects missing email', () => {
      const result = validateRegister({
        password: 'Password123',
        name: 'John',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('rejects invalid email format', () => {
      const result = validateRegister({
        ...validInput,
        email: 'not-an-email',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('rejects email without domain', () => {
      const result = validateRegister({
        ...validInput,
        email: 'test@',
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('rejects missing password', () => {
      const result = validateRegister({
        email: 'test@example.com',
        name: 'John',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('rejects password shorter than 8 characters', () => {
      const result = validateRegister({
        ...validInput,
        password: 'Pass1',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('rejects password without uppercase letter', () => {
      const result = validateRegister({
        ...validInput,
        password: 'password123',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('rejects password without number', () => {
      const result = validateRegister({
        ...validInput,
        password: 'PasswordABC',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('number');
    });

    it('accepts strong password', () => {
      const result = validateRegister({
        ...validInput,
        password: 'MyStr0ngP@ssword!',
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('rejects missing name', () => {
      const result = validateRegister({
        email: 'test@example.com',
        password: 'Password123',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('rejects name shorter than 2 characters', () => {
      const result = validateRegister({
        ...validInput,
        name: 'A',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('2 characters');
    });

    it('rejects name longer than 50 characters', () => {
      const result = validateRegister({
        ...validInput,
        name: 'A'.repeat(51),
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('50 characters');
    });

    it('accepts name with spaces', () => {
      const result = validateRegister({
        ...validInput,
        name: 'John Michael Doe',
      });
      
      expect(result.success).toBe(true);
    });
  });
});
