/**
 * AFTER: Clean route handlers
 * 
 * Each handler does exactly 3 things:
 * 1. Extract data from request
 * 2. Call service method
 * 3. Send response
 * 
 * Benefits:
 * - Easy to read and understand
 * - Easy to test with supertest
 * - Business logic changes don't touch routes
 * - Consistent error handling via middleware
 */

import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { RegisterUserDTO, LoginDTO } from '../types/user';

const router = Router();

/**
 * POST /api/users/register
 * Register a new user
 */
router.post(
  '/register',
  validateRegistration,
  async (req: Request<{}, {}, RegisterUserDTO>, res: Response, next: NextFunction) => {
    try {
      const result = await userService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users/login
 * Authenticate user
 */
router.post(
  '/login',
  validateLogin,
  async (req: Request<{}, {}, LoginDTO>, res: Response, next: NextFunction) => {
    try {
      const result = await userService.login(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(req.user!.userId);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
