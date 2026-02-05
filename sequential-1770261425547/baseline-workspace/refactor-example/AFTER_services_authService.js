/**
 * AFTER: services/authService.js
 * 
 * Pure business logic - testable without HTTP context
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('./emailService');
const { AppError } = require('../utils/errors');

const SALT_ROUNDS = 12;
const VERIFICATION_EXPIRY_HOURS = 24;
const JWT_EXPIRY = '7d';

/**
 * Custom error for duplicate email registration
 */
class EmailExistsError extends AppError {
  constructor(email) {
    super('Email already registered', 409, 'EMAIL_EXISTS');
    this.email = email;
  }
}

/**
 * Register a new user account
 * 
 * @param {object} input - Validated registration data
 * @param {string} input.email - User's email
 * @param {string} input.password - Plain text password
 * @param {string} input.name - User's display name
 * @returns {Promise<{ user: object, token: string }>}
 * @throws {EmailExistsError} If email is already registered
 */
async function registerUser({ email, password, name }) {
  const normalizedEmail = email.toLowerCase();

  // Check for existing user
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new EmailExistsError(normalizedEmail);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate verification token
  const { token: verificationToken, expires: verificationExpires } = 
    generateVerificationToken();

  // Create user
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: name.trim(),
    verified: false,
    verificationToken,
    verificationExpires,
  });

  // Generate auth token
  const authToken = generateAuthToken(user);

  // Send verification email (non-blocking)
  emailService.sendVerificationEmail(user.email, user.name, verificationToken)
    .catch(err => console.error('Failed to send verification email:', err));

  return {
    user: sanitizeUser(user),
    token: authToken,
  };
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a verification token and expiry
 * @returns {{ token: string, expires: Date }}
 */
function generateVerificationToken() {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expires: new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000),
  };
}

/**
 * Generate a JWT auth token
 * @param {object} user - User document
 * @returns {string} JWT token
 */
function generateAuthToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Remove sensitive fields from user object
 * @param {object} user - User document
 * @returns {object} Sanitized user
 */
function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    verified: user.verified,
    createdAt: user.createdAt,
  };
}

module.exports = {
  registerUser,
  hashPassword,
  verifyPassword,
  generateVerificationToken,
  generateAuthToken,
  sanitizeUser,
  EmailExistsError,
};
