/**
 * Validation middleware
 * 
 * Validates request data before it reaches the route handler.
 * Keeps validation logic separate and reusable.
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate registration request body
 */
export function validateRegistration(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body;
  const errors: string[] = [];

  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (typeof email !== 'string') {
    errors.push('Email must be a string');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('Invalid email format');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (errors.length > 0) {
    return next(new ValidationError(errors.join(', ')));
  }

  next();
}

/**
 * Validate login request body
 */
export function validateLogin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { email, password } = req.body;
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return next(new ValidationError(errors.join(', ')));
  }

  next();
}
