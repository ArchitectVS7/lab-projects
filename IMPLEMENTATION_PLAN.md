# Implementation Plan: Unified Task Management Platform

## Reference: [PRD.md](./PRD.md)
## Date: 2026-02-05

---

## Overview

This plan is divided into 5 phases. Each phase produces a **vertically testable slice** -- something that can be validated end-to-end before moving on. Phases 0-1 establish the critical foundation that every subsequent phase depends on, so they include **complete reference implementations** (not pseudocode) for every file that downstream code will import.

### Phase Dependency Graph

```
Phase 0: Scaffold & Data Layer
    |
Phase 1: Auth Foundation  (Critical Path -- reference code provided)
    |
    +-- Phase 2: Projects & Teams
    |
    +-- Phase 3: Tasks & Views   (can start in parallel with Phase 2)
    |
Phase 4: Dashboard, Profile, Polish, Deploy
```

### Validation Strategy

Each phase has a **Validation Checklist** at the end. Every item in the checklist should pass before starting the next phase. Validation is manual for MVP (curl + browser), but the checklists are structured so they can be converted to integration tests later.

---

## Phase 0: Project Scaffold & Data Layer

**Goal**: Empty project that boots, connects to PostgreSQL, runs migrations, and responds to `/health`.

### 0.1 Directory Structure

Create the unified project at `/task-management-unified/`:

```
task-management-unified/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   └── routes/
│   │       ├── auth.ts
│   │       ├── projects.ts
│   │       └── tasks.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── store/
│   │   │   └── auth.ts
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── DashboardPage.tsx
│   │       ├── TasksPage.tsx
│   │       ├── ProjectsPage.tsx
│   │       ├── ProjectDetailPage.tsx
│   │       └── ProfilePage.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── Dockerfile
└── docker-compose.yml
```

### 0.2 Files to Create

#### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: unified-postgres
    environment:
      POSTGRES_USER: taskapp
      POSTGRES_PASSWORD: taskapp_secret
      POSTGRES_DB: taskapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskapp -d taskapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: unified-backend
    environment:
      PORT: 4000
      DATABASE_URL: postgresql://taskapp:taskapp_secret@postgres:5432/taskapp?schema=public
      JWT_SECRET: dev-jwt-secret-change-in-production
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: http://localhost:3000
      NODE_ENV: development
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: unified-frontend
    environment:
      VITE_API_URL: http://localhost:4000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### `backend/package.json`

```json
{
  "name": "unified-task-management-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.11.24",
    "prisma": "^5.10.0",
    "tsx": "^4.7.1",
    "typescript": "^5.4.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### `frontend/package.json`

```json
{
  "name": "unified-task-management-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "@tanstack/react-query": "^5.28.4",
    "zustand": "^4.5.2",
    "date-fns": "^3.4.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.358.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.4.2",
    "vite": "^5.1.6"
  }
}
```

#### `backend/prisma/schema.prisma`

Use the exact schema from PRD Section 3.1 (already finalized). No changes.

#### `backend/src/index.ts` (Minimal -- health check only)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

export default app;
```

### 0.3 Validation Checklist -- Phase 0

```
[ ] docker compose up --build starts all 3 services without errors
[ ] curl http://localhost:4000/health returns { "status": "ok", ... }
[ ] PostgreSQL is reachable on localhost:5432
[ ] npx prisma migrate dev (from backend/) creates tables
[ ] npx prisma studio (from backend/) shows User, Project, Task, ProjectMember tables
[ ] Frontend dev server (localhost:3000) loads a blank React page
```

---

## Phase 1: Auth Foundation (Critical Path)

**Goal**: Register, login, logout, session refresh, and protected routes working end-to-end. This is the critical path -- every other feature depends on these files. Complete reference implementations are provided below so that nothing needs to be reverse-engineered during Phases 2-4.

### 1.1 Reference Implementation: `backend/src/lib/prisma.ts`

This is the singleton Prisma client. Every route file imports from here.

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

**Why this matters**: Without the globalThis singleton, Prisma creates a new connection pool on every hot-reload during development, eventually exhausting PostgreSQL's connection limit.

---

### 1.2 Reference Implementation: `backend/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err.message);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
};
```

**Why this matters**: ZodError handling must be in the global error handler. If a Zod parse fails in a route, the error propagates here and returns a structured 400 with field-level messages. Without this, Zod errors become 500s.

---

### 1.3 Reference Implementation: `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

const COOKIE_NAME = 'auth_token';

export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
  res.cookie(COOKIE_NAME, '', { ...getCookieOptions(), maxAge: 0 });
};

const extractToken = (req: Request): string | null => {
  // 1. Try HTTP-only cookie (primary)
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // 2. Fallback to Authorization header (for curl/Postman testing)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};
```

**Critical details**:
- Cookie name `auth_token` must match exactly between `setAuthCookie`, `clearAuthCookie`, and `extractToken`.
- `sameSite: 'lax'` in development allows the cookie to be sent on same-site navigations. In production with separate frontend/backend subdomains on Railway, this may need to be `'none'` (which requires `secure: true`).
- The Bearer header fallback is kept intentionally so the API can be tested with curl without needing to manage cookies manually.

---

### 1.4 Reference Implementation: `backend/src/routes/auth.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  authenticate,
  AuthRequest,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from '../middleware/auth.js';

const router = Router();

// --- Zod Schemas ---

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a digit'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a digit'),
});

// Standard user select (never return passwordHash)
const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const;

// --- Routes ---

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, name: data.name },
      select: userSelect,
    });

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    res.status(201).json({ message: 'Registration successful', user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'Logout successful' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: userSelect,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, (req: AuthRequest, res: Response) => {
  const token = generateToken(req.userId!);
  setAuthCookie(res, token);
  res.json({ message: 'Token refreshed' });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: userSelect,
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Why every route is shown**: Auth is the one area where a subtle mistake (wrong cookie config, missing `next(error)`, returning passwordHash) breaks everything downstream. Showing the complete file eliminates guesswork.

---

### 1.5 Reference Implementation: `backend/src/index.ts` (Updated with auth routes)

Add auth route registration to the Phase 0 index.ts:

```typescript
// After other imports:
import authRoutes from './routes/auth.js';

// After cookieParser():
app.use('/api/auth', authRoutes);
```

---

### 1.6 Reference Implementation: `frontend/src/store/auth.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

**Key difference from saas-1**: No `token` field. The JWT lives exclusively in the HTTP-only cookie. The Zustand store only persists the user object for instant UI hydration on page reload. `GET /api/auth/me` revalidates the session on app mount.

---

### 1.7 Reference Implementation: `frontend/src/lib/api.ts`

```typescript
import { useAuthStore } from '../store/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// --- Core fetch wrapper ---

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    useAuthStore.getState().clearUser();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// --- Auth API ---

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ message: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ message: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: any }>('/api/auth/me'),

  refresh: () =>
    request<{ message: string }>('/api/auth/refresh', { method: 'POST' }),

  updateProfile: (data: { name?: string; avatarUrl?: string | null }) =>
    request<{ user: any }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// --- Tasks API ---

export interface TaskFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  creatorId?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const tasksApi = {
  getAll: (filters?: TaskFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    const qs = params.toString();
    return request<any[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },

  getOne: (id: string) =>
    request<any>(`/api/tasks/${id}`),

  create: (data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
  }) =>
    request<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, any>) =>
    request<any>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  bulkStatus: (taskIds: string[], status: string) =>
    request<{ updated: number }>('/api/tasks/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ taskIds, status }),
    }),
};

// --- Projects API ---

export const projectsApi = {
  getAll: () =>
    request<any[]>('/api/projects'),

  getOne: (id: string) =>
    request<any>(`/api/projects/${id}`),

  create: (data: { name: string; description?: string; color?: string }) =>
    request<any>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, any>) =>
    request<any>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  addMember: (projectId: string, data: { email: string; role?: string }) =>
    request<any>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeMember: (projectId: string, userId: string) =>
    request<void>(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),
};
```

**Critical details**:
- `credentials: 'include'` on every request -- this is what makes cookies work cross-origin.
- The 401 interceptor calls `clearUser()` (not `logout()`) to avoid a circular API call.
- Uses native `fetch` instead of Axios. React Query wraps these functions, so Axios adds no value here. One fewer dependency.

---

### 1.8 Reference Implementation: `frontend/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

### 1.9 Reference Implementation: `frontend/src/App.tsx`

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
```

**Key additions vs saas-1**: `GuestRoute` wrapper redirects authenticated users away from login/register. `ProjectDetailPage` and `ProfilePage` routes added.

---

### 1.10 Zod Validation Schemas for Phases 2-3

These schemas are used in the backend route files. Defining them here ensures consistency across phases.

#### Project Schemas (used in Phase 2)

```typescript
// backend/src/routes/projects.ts will import zod and define:

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});
```

#### Task Schemas (used in Phase 3)

```typescript
// backend/src/routes/tasks.ts will import zod and define:

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

const bulkStatusSchema = z.object({
  taskIds: z.array(z.string().uuid()),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
});
```

---

### 1.11 Validation Checklist -- Phase 1

```
Backend (curl):
  [ ] POST /api/auth/register with valid data → 201, Set-Cookie header present
  [ ] POST /api/auth/register with duplicate email → 409
  [ ] POST /api/auth/register with weak password → 400 with Zod field errors
  [ ] POST /api/auth/login with valid credentials → 200, Set-Cookie header present
  [ ] POST /api/auth/login with wrong password → 401, generic error
  [ ] GET /api/auth/me with valid cookie → 200, returns user (no passwordHash)
  [ ] GET /api/auth/me without cookie → 401
  [ ] POST /api/auth/logout → 200, Set-Cookie with maxAge=0
  [ ] POST /api/auth/refresh with valid cookie → 200, new Set-Cookie
  [ ] PUT /api/auth/profile with valid data → 200, updated user
  [ ] PUT /api/auth/password with correct current → 200
  [ ] PUT /api/auth/password with wrong current → 401

Frontend (browser):
  [ ] /login page renders
  [ ] /register page renders
  [ ] Register → redirects to /
  [ ] Login → redirects to /
  [ ] Refresh page while logged in → stays on /
  [ ] Navigate to /login while logged in → redirects to /
  [ ] Click logout → redirects to /login
  [ ] Navigate to / while logged out → redirects to /login
```

---

## Phase 2: Projects & Team Management

**Goal**: Full project CRUD, member management, project detail page with member list.

### 2.1 Backend: `backend/src/routes/projects.ts`

Implement the following endpoints. Use the Zod schemas from Section 1.10. Reference the saas-2 implementation for the query patterns (membership-scoped queries, role checks).

| Endpoint | Key Logic |
|----------|-----------|
| `GET /` | `findMany` where user is owner OR member. Include owner, members with user, `_count.tasks`. Order by `createdAt desc`. |
| `GET /:id` | `findFirst` with same OR condition. Include owner, members.user, tasks.assignee, tasks.creator, `_count.tasks`. |
| `POST /` | Validate with `createProjectSchema`. Create project + auto-create `ProjectMember` with role=OWNER in a single Prisma create. |
| `PUT /:id` | Check membership role is OWNER or ADMIN. Validate with `updateProjectSchema`. |
| `DELETE /:id` | Check `ownerId === req.userId`. Cascade handles tasks and members. Return 204. |
| `POST /:id/members` | Check requester is OWNER or ADMIN. Find target user by email. Check not already a member. Create ProjectMember. |
| `DELETE /:id/members/:userId` | Check requester is OWNER or ADMIN. Cannot remove OWNER. Delete ProjectMember. Return 204. |

**Authorization helper** (reuse across projects.ts and tasks.ts):

```typescript
async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}
```

### 2.2 Backend Integration

Update `backend/src/index.ts`:

```typescript
import projectRoutes from './routes/projects.js';
// ...
app.use('/api/projects', projectRoutes);
```

### 2.3 Frontend: `ProjectsPage.tsx`

| Element | Behavior |
|---------|----------|
| Header | "Projects" title + "New Project" button |
| Grid | Responsive 1/2/3 columns. Each card: color bar, name, description (truncated), task count badge, member count. Click → navigate to `/projects/:id`. |
| Create/Edit Modal | Name (required), description (textarea), color picker (10 preset swatches). Submit → `projectsApi.create()` or `.update()`, invalidate `['projects']`. |
| Delete | Trash icon on card. Confirmation dialog. `projectsApi.delete()`, invalidate `['projects']`. |

React Query pattern:

```typescript
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: projectsApi.getAll,
});

const createMutation = useMutation({
  mutationFn: projectsApi.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
});
```

### 2.4 Frontend: `ProjectDetailPage.tsx`

| Section | Content |
|---------|---------|
| Header | Back link to `/projects`, color swatch, name, description |
| Members Panel | List of members with role badge. Add member form (email + role dropdown) visible to OWNER/ADMIN. Remove button with confirmation. |
| Tasks Section | Kanban-style columns (TODO, IN_PROGRESS, IN_REVIEW, DONE) showing project tasks. Task cards with title, priority, assignee, due date. |

React Query pattern:

```typescript
const { data: project } = useQuery({
  queryKey: ['projects', id],
  queryFn: () => projectsApi.getOne(id!),
  enabled: !!id,
});
```

### 2.5 Validation Checklist -- Phase 2

```
Backend (curl):
  [ ] POST /api/projects → 201, auto-creates OWNER membership
  [ ] GET /api/projects → returns only projects where user is member
  [ ] GET /api/projects/:id → returns project with tasks, members
  [ ] PUT /api/projects/:id as OWNER → 200
  [ ] PUT /api/projects/:id as VIEWER → 403
  [ ] DELETE /api/projects/:id as OWNER → 204
  [ ] DELETE /api/projects/:id as MEMBER → 403
  [ ] POST /api/projects/:id/members → 201, new member added
  [ ] POST /api/projects/:id/members (duplicate) → 409
  [ ] DELETE /api/projects/:id/members/:userId → 204
  [ ] DELETE /api/projects/:id/members/:ownerId → 400 (cannot remove owner)

Frontend (browser):
  [ ] Projects page shows grid of user's projects
  [ ] Create project modal works, project appears in grid
  [ ] Click project → project detail page loads
  [ ] Member list displays with roles
  [ ] Add member by email works (OWNER/ADMIN only)
  [ ] Remove member works (OWNER/ADMIN only)
  [ ] Project tasks visible in columns
```

---

## Phase 3: Tasks & Views

**Goal**: Full task CRUD, table view with inline status editing, Kanban board view, view toggle.

### 3.1 Backend: `backend/src/routes/tasks.ts`

Use the Zod schemas from Section 1.10. Reference the saas-2 implementation for authorization patterns.

| Endpoint | Key Logic |
|----------|-----------|
| `GET /` | Get all projectIds where user is a member. `findMany` with optional filters (projectId, status, priority, assigneeId, **creatorId**), configurable `orderBy`. Include project, assignee, creator. |
| `GET /:id` | `findUnique` + verify project membership. Include project, assignee, creator. |
| `POST /` | Validate with `createTaskSchema`. Check project membership (**must be OWNER, ADMIN, or MEMBER -- not VIEWER**). If `assigneeId`, verify assignee is also a member. Set `creatorId` to `req.userId`. |
| `PUT /:id` | Validate with `updateTaskSchema`. **Role-based authorization** (see below). If changing assignee, verify. |
| `DELETE /:id` | **Role-based authorization** (see below). Return 204. |
| `PATCH /bulk-status` | Validate with `bulkStatusSchema`. Verify membership for each task's project. **Same role logic as PUT** per task. `updateMany`. Return `{ updated: count }`. |

**Important**: The `PATCH /bulk-status` route must be registered BEFORE `GET /:id`, otherwise Express will try to match `bulk-status` as an `:id` parameter.

#### Task Authorization Model (PRD 2.5.4 / 2.5.5)

Task update and delete enforce role + ownership rules. This is the key authorization helper for tasks:

```typescript
// Determines if user can modify a task based on their project role and task ownership
function canModifyTask(
  membership: { role: string } | null,
  task: { creatorId: string },
  userId: string
): boolean {
  if (!membership) return false;
  // OWNER and ADMIN can modify any task in the project
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  // MEMBER can only modify tasks they created
  if (membership.role === 'MEMBER' && task.creatorId === userId) return true;
  // VIEWER cannot modify tasks
  return false;
}
```

| Role | Update own tasks | Update others' tasks | Delete own tasks | Delete others' tasks |
|------|-----------------|---------------------|-----------------|---------------------|
| OWNER | Yes | Yes | Yes | Yes |
| ADMIN | Yes | Yes | Yes | Yes |
| MEMBER | Yes | No (403) | Yes | No (403) |
| VIEWER | No (403) | No (403) | No (403) | No (403) |

### 3.2 Backend Integration

Update `backend/src/index.ts`:

```typescript
import taskRoutes from './routes/tasks.js';
// ...
app.use('/api/tasks', taskRoutes);
```

### 3.3 Frontend: `TasksPage.tsx`

This page contains two sub-views behind a toggle.

#### View Toggle State

```typescript
const [viewMode, setViewMode] = useState<'table' | 'kanban'>(
  () => (localStorage.getItem('task-view-mode') as 'table' | 'kanban') || 'table'
);

useEffect(() => {
  localStorage.setItem('task-view-mode', viewMode);
}, [viewMode]);
```

#### Shared Data Layer

Both views use the same React Query hooks:

```typescript
const { data: tasks, isLoading } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => tasksApi.getAll(),
});

const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: projectsApi.getAll,
});

const updateStatusMutation = useMutation({
  mutationFn: ({ id, status }: { id: string; status: string }) =>
    tasksApi.update(id, { status }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
});

const deleteMutation = useMutation({
  mutationFn: tasksApi.delete,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
});
```

#### Table View Component

Directly adapted from saas-1's `TasksPage.tsx`:
- Full-width `<table>` with columns: Task (title + description), Status (inline `<select>`), Priority (badge), Project name, Actions (edit + delete).
- Status dropdown uses `updateStatusMutation.mutate()` on change.
- All 4 statuses in dropdown (TODO, IN_PROGRESS, IN_REVIEW, DONE).

#### Kanban View Component

Adapted from saas-2's `ProjectDetail.tsx` Kanban, but showing all tasks (not scoped to a single project):
- 4 columns: TODO, IN_PROGRESS, IN_REVIEW, DONE.
- Each task card: title, description (2-line clamp), priority color, project name chip, assignee avatar, due date.
- Clicking a card opens the edit modal.
- **Drag-and-drop with `@dnd-kit`**: Cards are draggable between columns. Dropping a card in a different column calls `tasksApi.bulkStatus([taskId], newStatus)` and invalidates the `['tasks']` query. Visual feedback: card elevation on grab, drop zone highlighting on hover.

`@dnd-kit` integration pattern:

```typescript
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const taskId = active.id as string;
  const newStatus = over.id as string; // column id = status value

  if (taskId && newStatus) {
    bulkStatusMutation.mutate({ taskIds: [taskId], status: newStatus });
  }
}
```

#### Task Modal

Shared between both views. Fields:
- Title, Description, Status, Priority, Project (dropdown), Assignee (dropdown -- filtered by selected project's members), Due Date (date input).
- **Project dropdown filtering**: Only show projects where the current user's role is OWNER, ADMIN, or MEMBER. Exclude projects where user is VIEWER (read-only). Filter logic:

```typescript
const writableProjects = projects?.filter((p: any) => {
  const membership = p.members?.find((m: any) => m.user.id === currentUser.id);
  return membership && ['OWNER', 'ADMIN', 'MEMBER'].includes(membership.role);
}) || [];
```

- When project selection changes, reset assignee if they're not a member of the new project.

### 3.4 Validation Checklist -- Phase 3

```
Backend (curl):
  [ ] POST /api/tasks → 201, creatorId set automatically
  [ ] POST /api/tasks as VIEWER → 403
  [ ] POST /api/tasks with assignee not in project → 400
  [ ] GET /api/tasks → returns only tasks from user's projects
  [ ] GET /api/tasks?status=TODO → filtered results
  [ ] GET /api/tasks?creatorId=<uuid> → filtered by creator
  [ ] GET /api/tasks?sortBy=priority&order=asc → sorted results
  [ ] PUT /api/tasks/:id as OWNER/ADMIN → 200 (any task)
  [ ] PUT /api/tasks/:id as MEMBER (own task) → 200
  [ ] PUT /api/tasks/:id as MEMBER (other's task) → 403
  [ ] PUT /api/tasks/:id as VIEWER → 403
  [ ] DELETE /api/tasks/:id as MEMBER (own task) → 204
  [ ] DELETE /api/tasks/:id as MEMBER (other's task) → 403
  [ ] DELETE /api/tasks/:id as VIEWER → 403
  [ ] PATCH /api/tasks/bulk-status → { updated: N }

Frontend (browser):
  [ ] Table view renders with all tasks
  [ ] Inline status dropdown updates task
  [ ] Kanban view renders 4 columns
  [ ] Drag task card to different column → status updates
  [ ] View toggle switches between table and kanban
  [ ] View preference persists across page refresh
  [ ] Create task modal shows only writable projects (not VIEWER)
  [ ] Assignee dropdown updates when project changes
  [ ] Edit task pre-fills all fields
  [ ] Delete task removes from list
```

---

## Phase 4: Dashboard, Profile, Seed Data, Polish

**Goal**: Dashboard statistics, profile management page, seed data, and deployment readiness.

### 4.1 Frontend: `DashboardPage.tsx`

Adapted from saas-1's `DashboardPage.tsx`:

- Fetches `tasks` and `projects` via React Query (same query keys as TasksPage -- no duplicate requests due to cache).
- **Stats cards** (4 cards in a row):
  - Total Tasks: `tasks.length`
  - Completed: `tasks.filter(t => t.status === 'DONE').length`
  - In Progress: `tasks.filter(t => t.status === 'IN_PROGRESS').length`
  - Urgent: `tasks.filter(t => t.priority === 'URGENT').length`
- **Recent Tasks**: Grid of 5 most recent, with status and priority badges.
- **Projects sidebar**: 5 most recent projects with color dot and task count.

### 4.2 Frontend: `ProfilePage.tsx`

Two sections:

1. **Profile Info**: Name + Avatar URL fields. Submit → `authApi.updateProfile()`, update Zustand store with new user data.
2. **Change Password**: Current password + New password + Confirm new password. Client-side check that new === confirm. Submit → `authApi.changePassword()`.

### 4.3 Frontend: `Layout.tsx`

Adapted from saas-1's Layout:

- Sidebar with nav links: Dashboard (`/`), Tasks (`/tasks`), Projects (`/projects`).
- Active route highlighting via `useLocation()`.
- User section at bottom: avatar initial circle + name.
- User menu (click to toggle): Profile (`/profile`), Logout.
- `<Outlet />` for nested route content.

### 4.4 Backend: `prisma/seed.ts`

Use the exact pattern from saas-1's seed script. Adjustments:
- Password changed to `Password123` to pass the new validation rules (uppercase + lowercase + digit).
- All other data (users, projects, members, tasks) stays the same.

### 4.5 Dockerfiles

#### `backend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma/
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

#### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD serve -s dist -l tcp://0.0.0.0:$PORT
```

### 4.6 Validation Checklist -- Phase 4

```
Dashboard:
  [ ] Stats cards show correct counts
  [ ] Recent tasks display with badges
  [ ] Recent projects display with colors
  [ ] Data matches tasks/projects pages

Profile:
  [ ] Profile page loads current user info
  [ ] Update name works, sidebar reflects change
  [ ] Change password with correct current password works
  [ ] Change password with wrong current password shows error
  [ ] Weak new password shows validation error

Seed Data:
  [ ] npx prisma db seed creates 2 users, 3 projects, 10 tasks
  [ ] Can log in as alice@example.com / Password123
  [ ] Can log in as bob@example.com / Password123
  [ ] Alice sees 3 projects (2 owned, 1 member)
  [ ] Bob sees 3 projects (1 owned, 2 member)

Docker:
  [ ] docker compose up --build starts all services
  [ ] Full auth flow works via browser at localhost:3000
  [ ] Health check returns 200

End-to-end flow:
  [ ] Register new user → dashboard loads with 0 tasks
  [ ] Create project → appears in projects grid
  [ ] Create task in project → appears in table and kanban
  [ ] Switch views → same tasks displayed
  [ ] Change task status inline → task updates
  [ ] Add member to project → member appears in detail view
  [ ] Logout → redirect to login → login again → session persists
```

---

## Phase 5: Railway Deployment

**Goal**: Deploy to Railway with PostgreSQL, backend, and frontend services.

### 5.1 Railway Setup

1. Create Railway project with 3 services:
   - **PostgreSQL plugin** (provisioned by Railway)
   - **Backend** (linked to `backend/` directory, uses `Dockerfile`)
   - **Frontend** (linked to `frontend/` directory, uses `Dockerfile`)

2. Environment variables for **Backend**:
   - `DATABASE_URL` → from Railway PostgreSQL plugin (auto-injected)
   - `JWT_SECRET` → strong random string (generate with `openssl rand -base64 32`)
   - `JWT_EXPIRES_IN` → `7d`
   - `CORS_ORIGIN` → frontend Railway URL (e.g. `https://unified-frontend-production.up.railway.app`)
   - `NODE_ENV` → `production`
   - `PORT` → `4000` (Railway injects `$PORT` automatically, but explicit is safer)

3. Environment variables for **Frontend**:
   - `VITE_API_URL` → backend Railway URL (e.g. `https://unified-backend-production.up.railway.app`)

4. Cookie `sameSite` consideration:
   - If frontend and backend are on different Railway subdomains, `sameSite` must be `'none'` and `secure` must be `true`.
   - If using a custom domain where both share the same parent domain, `sameSite: 'strict'` works.
   - The reference auth.ts implementation handles this via the `NODE_ENV` check, but may need to be adjusted to `'none'` for Railway's default subdomain setup.

### 5.2 Validation Checklist -- Phase 5

```
[ ] Backend health check responds on Railway URL
[ ] Frontend loads on Railway URL
[ ] Register works end-to-end
[ ] Login sets cookie, redirects to dashboard
[ ] Tasks and projects CRUD work
[ ] Page refresh maintains session
[ ] Logout clears session
```

---

## Summary: Build Order

| Order | Phase | Files | Depends On |
|-------|-------|-------|------------|
| 1 | Phase 0 | docker-compose, package.json files, schema.prisma, tsconfig, vite config, tailwind config, base index.ts, errorHandler.ts | Nothing |
| 2 | Phase 1 | prisma.ts, auth.ts (middleware), auth.ts (routes), auth store, api.ts, main.tsx, App.tsx, LoginPage, RegisterPage | Phase 0 |
| 3a | Phase 2 | projects.ts (routes), ProjectsPage, ProjectDetailPage | Phase 1 |
| 3b | Phase 3 | tasks.ts (routes), TasksPage (table + kanban + modal) | Phase 1 |
| 4 | Phase 4 | DashboardPage, ProfilePage, Layout, seed.ts, Dockerfiles | Phases 2 + 3 |
| 5 | Phase 5 | Railway config, env vars, cookie sameSite adjustment | Phase 4 |

**Phases 2 and 3 can be worked in parallel** since they depend only on Phase 1 (shared auth middleware, API client, app shell) and not on each other.

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Cookie not sent cross-origin | `credentials: 'include'` in fetch + `cors({ credentials: true })` + correct `sameSite`/`secure`. Reference code handles all three. |
| Prisma connection pool exhaustion in dev | Singleton pattern in `lib/prisma.ts` using `globalThis`. Reference code provided. |
| Zod errors returning 500 | `ZodError` catch in global `errorHandler`. Reference code provided. |
| Password hash exposed to frontend | `userSelect` constant excludes `passwordHash` from all queries. Used in every auth route. |
| JWT cookie name mismatch | Single `COOKIE_NAME` constant in auth middleware, used by set/clear/extract. |
| assigneeId referencing non-member | Membership check before create/update. Pattern shown in Zod + route logic. |
| OWNER removal | Explicit check in `DELETE /members/:userId` prevents removing OWNER role. |
| MEMBER modifying other users' tasks | `canModifyTask()` helper checks `creatorId === userId` for MEMBER role. Reference code provided in Phase 3. |
| VIEWER creating/editing tasks | Membership role check in POST/PUT/DELETE handlers. VIEWERs excluded from task modal project dropdown on frontend. |
