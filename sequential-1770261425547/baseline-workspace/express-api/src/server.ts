import express, { Request, Response } from 'express';
import usersRouter from './routes/users';
import { generateToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/users', usersRouter);

// Health check
app.get('/', (req: Request, res: Response<{ status: string }>): void => {
  res.json({ status: 'ok' });
});

// Dev endpoint to get a test token
app.post('/auth/token', (req: Request, res: Response<{ token: string }>): void => {
  const token = generateToken('test-user');
  res.json({ token });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
