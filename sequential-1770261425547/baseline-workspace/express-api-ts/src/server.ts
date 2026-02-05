import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './middleware/auth';
import usersRouter from './routes/users';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Public routes
app.get('/health', (_req: Request, res: Response<{ status: string }>): void => {
  res.json({ status: 'ok' });
});

// Protected routes
app.use('/users', authMiddleware, usersRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response<{ error: string }>, _next: NextFunction): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
