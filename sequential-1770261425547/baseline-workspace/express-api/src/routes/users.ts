import { Router, Response } from 'express';
import { UserModel } from '../models/user';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest, User, CreateUserBody, ApiError } from '../types';

const router = Router();

// GET /users - list all users
router.get(
  '/',
  authenticate,
  (req: AuthenticatedRequest, res: Response<User[]>): void => {
    res.json(UserModel.findAll());
  }
);

// GET /users/:id - get user by id
router.get(
  '/:id',
  authenticate,
  (req: AuthenticatedRequest, res: Response<User | ApiError>): void => {
    const user = UserModel.findById(req.params.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  }
);

// POST /users - create new user
router.post(
  '/',
  authenticate,
  (req: AuthenticatedRequest<{}, User | ApiError, CreateUserBody>, res: Response<User | ApiError>): void => {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const user = UserModel.create(name, email);
    res.status(201).json(user);
  }
);

export default router;
