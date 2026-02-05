import { Router, Response } from 'express';
import { UserModel } from '../models/user';
import { AuthRequest, User, CreateUserBody, UserParams, ApiError } from '../types';

const router = Router();

// GET /users - list all users
router.get('/', (req: AuthRequest, res: Response<User[]>): void => {
  const users = UserModel.findAll();
  res.json(users);
});

// POST /users - create a new user
router.post(
  '/',
  (req: AuthRequest<{}, User | ApiError, CreateUserBody>, res: Response<User | ApiError>): void => {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const user = UserModel.create(name, email);
    res.status(201).json(user);
  }
);

// GET /users/:id - get user by id
router.get(
  '/:id',
  (req: AuthRequest<UserParams>, res: Response<User | ApiError>): void => {
    const user = UserModel.findById(req.params.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  }
);

export default router;
