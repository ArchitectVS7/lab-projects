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
├── .env.example
├── backend/
│   ├── .dockerignore
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
│   ├── .dockerignore
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── store/
│   │   │   └── auth.ts
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Toast.tsx
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
    "express-rate-limit": "^7.2.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "prisma": "^5.10.0",
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

#### `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Why `NodeNext`**: The reference code uses `.js` extensions in all imports (e.g., `import { errorHandler } from './middleware/errorHandler.js'`). This is the correct pattern for Node.js ESM-compatible TypeScript and requires `module: "NodeNext"`.

#### `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### `frontend/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

#### `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
```

#### `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

#### `frontend/postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task Management</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `.env.example`

Template for local development outside Docker:

```env
# Backend
PORT=4000
DATABASE_URL=postgresql://taskapp:taskapp_secret@localhost:5432/taskapp?schema=public
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:4000
```

#### `backend/.dockerignore`

```
node_modules
dist
.git
*.md
.env
```

#### `frontend/.dockerignore`

```
node_modules
dist
.git
*.md
.env
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
import prisma from './lib/prisma.js';
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

// Health check -- verifies database connectivity
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
  }
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

**Why the DB check**: A `/health` endpoint that only returns `{ status: 'ok' }` without verifying database connectivity can mask production outages. Railway and other platforms use health checks to determine container readiness.

### 0.3 Lock File Generation

After creating `package.json` files, generate lock files required by `npm ci` in Dockerfiles:

```bash
cd task-management-unified/backend && npm install
cd task-management-unified/frontend && npm install
```

Commit both `package-lock.json` files to the repository. Without them, `npm ci` (used in Dockerfiles) will fail.

### 0.4 Validation Checklist -- Phase 0

```
[x] docker compose up --build starts all 3 services without errors
[x] curl http://localhost:4000/health returns { "status": "ok", ... }
[x] curl http://localhost:4000/health with DB down returns 503 { "status": "unhealthy" }
[x] PostgreSQL is reachable on localhost:5432
[x] npx prisma migrate dev (from backend/) creates tables
[x] npx prisma studio (from backend/) shows User, Project, Task, ProjectMember tables
[x] Frontend dev server (localhost:3000) loads a blank React page with Tailwind working
[x] Both package-lock.json files are committed
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
- `sameSite: 'lax'` in development, `'strict'` in production. The frontend and backend are deployed on the same domain, so cross-subdomain cookies are not needed.
- The Bearer header fallback is kept intentionally so the API can be tested with curl without needing to manage cookies manually.

---

### 1.4 Reference Implementation: `backend/src/routes/auth.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
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

### 1.7 Reference Implementation: `frontend/src/types/index.ts`

Shared TypeScript interfaces for API responses. Used across api.ts, store, and components to maintain type safety end-to-end.

```typescript
// --- User ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

// --- Project ---

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt: string;
  owner: User;
  members: ProjectMember[];
  tasks?: Task[];
  _count?: { tasks: number };
}

// --- Task ---

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  project: Pick<Project, 'id' | 'name' | 'color'>;
  assignee: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
  creator: Pick<User, 'id' | 'name'>;
}
```

**Why this matters**: The PRD specifies "TypeScript end-to-end" (Section 7.3). Without shared interfaces, the frontend degrades to `any` types on API boundaries, losing the primary benefit of TypeScript.

---

### 1.8 Reference Implementation: `frontend/src/lib/api.ts`

```typescript
import { useAuthStore } from '../store/auth';
import type { User, Task, Project, ProjectMember, TaskStatus, TaskPriority } from '../types';

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
    request<{ message: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ message: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  refresh: () =>
    request<{ message: string }>('/api/auth/refresh', { method: 'POST' }),

  updateProfile: (data: { name?: string; avatarUrl?: string | null }) =>
    request<{ user: User }>('/api/auth/profile', {
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
  status?: TaskStatus;
  priority?: TaskPriority;
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
    return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },

  getOne: (id: string) =>
    request<Task>(`/api/tasks/${id}`),

  create: (data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'project' | 'assignee' | 'creator'>>) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  bulkStatus: (taskIds: string[], status: TaskStatus) =>
    request<{ updated: number }>('/api/tasks/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ taskIds, status }),
    }),
};

// --- Projects API ---

export const projectsApi = {
  getAll: () =>
    request<Project[]>('/api/projects'),

  getOne: (id: string) =>
    request<Project>(`/api/projects/${id}`),

  create: (data: { name: string; description?: string; color?: string }) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'color'>>) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  addMember: (projectId: string, data: { email: string; role?: string }) =>
    request<ProjectMember>(`/api/projects/${projectId}/members`, {
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
- All response types use shared interfaces from `types/index.ts` instead of `any` -- this gives downstream components full type safety on API data.

---

### 1.9 Reference Implementation: `frontend/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

### 1.10 Reference Implementation: `frontend/src/App.tsx`

The App component includes session revalidation on mount (PRD 2.1.6) and uses stub page components that will be replaced in later phases.

```typescript
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import { authApi } from './lib/api';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
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

function SessionValidator({ children }: { children: React.ReactNode }) {
  const { user, setUser, clearUser } = useAuthStore();
  const [ready, setReady] = useState(!user); // If no persisted user, skip validation

  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await authApi.me();
        setUser(res.user);
        return res.user;
      } catch {
        clearUser();
        return null;
      } finally {
        setReady(true);
      }
    },
    enabled: !!user && !ready,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  if (!ready) return <LoadingSpinner />;
  return <>{children}</>;
}

export default function App() {
  return (
    <SessionValidator>
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
    </SessionValidator>
  );
}
```

**Key additions vs saas-1**: `GuestRoute` wrapper redirects authenticated users away from login/register. `SessionValidator` calls `GET /api/auth/me` on mount to revalidate persisted sessions (PRD 2.1.6), showing a loading spinner while checking so users never see a flash of authenticated content before redirect. `ProjectDetailPage` and `ProfilePage` routes added.

---

### 1.11 Phase 1 Stub Components

App.tsx imports page components from Phases 2-4. To keep the app compilable at the end of Phase 1, create minimal stubs. These will be replaced with full implementations in their respective phases.

#### `frontend/src/components/ErrorBoundary.tsx`

```typescript
import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">An unexpected error occurred.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

#### `frontend/src/components/LoadingSpinner.tsx`

```typescript
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}
```

#### `frontend/src/components/Layout.tsx` (Minimal Phase 1 version)

A minimal layout with sidebar navigation and `<Outlet />`. The full layout with user menu, active highlighting, and polish is completed in Phase 4.

```typescript
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authApi } from '../lib/api';
import { LayoutDashboard, CheckSquare, FolderKanban, LogOut } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
];

export default function Layout() {
  const location = useLocation();
  const { user, clearUser } = useAuthStore();

  const handleLogout = async () => {
    await authApi.logout();
    clearUser();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">TaskApp</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                location.pathname === to
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">{user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

#### Stub Pages (replaced in Phases 2-4)

Create minimal stubs so the app compiles. Each file exports a default component with a placeholder:

```typescript
// frontend/src/pages/DashboardPage.tsx
export default function DashboardPage() {
  return <div className="text-gray-500">Dashboard — coming in Phase 4</div>;
}

// frontend/src/pages/TasksPage.tsx
export default function TasksPage() {
  return <div className="text-gray-500">Tasks — coming in Phase 3</div>;
}

// frontend/src/pages/ProjectsPage.tsx
export default function ProjectsPage() {
  return <div className="text-gray-500">Projects — coming in Phase 2</div>;
}

// frontend/src/pages/ProjectDetailPage.tsx
export default function ProjectDetailPage() {
  return <div className="text-gray-500">Project Detail — coming in Phase 2</div>;
}

// frontend/src/pages/ProfilePage.tsx
export default function ProfilePage() {
  return <div className="text-gray-500">Profile — coming in Phase 4</div>;
}
```

**Why stubs are critical**: Without these files, Phase 1's `App.tsx` imports will fail at compile time. The full implementations in Phases 2-4 replace these stubs entirely.

---

### 1.12 Zod Validation Schemas for Phases 2-3

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

### 1.13 Validation Checklist -- Phase 1

```
Backend (curl):
  [x] POST /api/auth/register with valid data → 201, Set-Cookie header present
  [x] POST /api/auth/register with duplicate email → 409
  [x] POST /api/auth/register with weak password → 400 with Zod field errors
  [x] POST /api/auth/login with valid credentials → 200, Set-Cookie header present
  [x] POST /api/auth/login with wrong password → 401, generic error
  [x] GET /api/auth/me with valid cookie → 200, returns user (no passwordHash)
  [x] GET /api/auth/me without cookie → 401
  [x] POST /api/auth/logout → 200, Set-Cookie with maxAge=0
  [x] POST /api/auth/refresh with valid cookie → 200, new Set-Cookie
  [x] PUT /api/auth/profile with valid data → 200, updated user
  [x] PUT /api/auth/password with correct current → 200
  [x] PUT /api/auth/password with wrong current → 401

Frontend (browser):
  [x] /login page renders
  [x] /register page renders
  [x] Register → redirects to /
  [x] Login → redirects to /
  [x] Refresh page while logged in → stays on /
  [x] Navigate to /login while logged in → redirects to /
  [x] Click logout → redirects to /login
  [x] Navigate to / while logged out → redirects to /login
```

---

## Phase 2: Projects & Team Management

**Goal**: Full project CRUD, member management, project detail page with member list.

### 2.1 Backend: `backend/src/routes/projects.ts`

Implement the following endpoints. Use the Zod schemas from Section 1.12.

**Important**: All project routes require authentication. Apply the middleware at the router level:

```typescript
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
```

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
  [x] POST /api/projects → 201, auto-creates OWNER membership
  [x] GET /api/projects → returns only projects where user is member
  [x] GET /api/projects/:id → returns project with tasks, members
  [x] PUT /api/projects/:id as OWNER → 200
  [x] PUT /api/projects/:id as VIEWER → 403
  [x] DELETE /api/projects/:id as OWNER → 204
  [x] DELETE /api/projects/:id as MEMBER → 403
  [x] POST /api/projects/:id/members → 201, new member added
  [x] POST /api/projects/:id/members (duplicate) → 409
  [x] DELETE /api/projects/:id/members/:userId → 204
  [x] DELETE /api/projects/:id/members/:ownerId → 400 (cannot remove owner)

Frontend (browser):
  [x] Projects page shows grid of user's projects
  [x] Create project modal works, project appears in grid
  [x] Click project → project detail page loads
  [x] Member list displays with roles
  [x] Add member by email works (OWNER/ADMIN only)
  [x] Remove member works (OWNER/ADMIN only)
  [x] Project tasks visible in columns
```

---

## Phase 3: Tasks & Views

**Goal**: Full task CRUD, table view with inline status editing, Kanban board view, view toggle.

### 3.1 Backend: `backend/src/routes/tasks.ts`

Use the Zod schemas from Section 1.12.

**Important**: All task routes require authentication. Apply the middleware at the router level:

```typescript
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
```

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

Both views use the same React Query hooks and filter state:

```typescript
import type { TaskStatus, TaskPriority } from '../types';
import type { TaskFilters } from '../lib/api';

// --- Filter State ---
const [filters, setFilters] = useState<TaskFilters>({});

const { data: tasks, isLoading, isError, error } = useQuery({
  queryKey: ['tasks', filters],
  queryFn: () => tasksApi.getAll(filters),
});

const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: projectsApi.getAll,
});

const updateStatusMutation = useMutation({
  mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
    tasksApi.update(id, { status }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
});

const deleteMutation = useMutation({
  mutationFn: tasksApi.delete,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
});
```

#### Filter Controls

A filter bar displayed above both views. Dropdowns for:
- **Project**: filter by `projectId` (populated from user's projects)
- **Status**: filter by `status` (TODO, IN_PROGRESS, IN_REVIEW, DONE)
- **Priority**: filter by `priority` (LOW, MEDIUM, HIGH, URGENT)
- **Clear filters** button resets all filters

```typescript
<div className="flex gap-3 mb-4">
  <select value={filters.projectId || ''} onChange={(e) => setFilters(f => ({ ...f, projectId: e.target.value || undefined }))}>
    <option value="">All Projects</option>
    {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  <select value={filters.status || ''} onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as TaskStatus | undefined }))}>
    <option value="">All Statuses</option>
    <option value="TODO">To Do</option>
    <option value="IN_PROGRESS">In Progress</option>
    <option value="IN_REVIEW">In Review</option>
    <option value="DONE">Done</option>
  </select>
  {/* Priority dropdown follows same pattern */}
</div>
```

#### Table View Component

Directly adapted from saas-1's `TasksPage.tsx`:
- Full-width `<table>` with columns: Task (title + description), Status (inline `<select>`), Priority (badge), Project name, Actions (edit + delete).
- Status dropdown uses `updateStatusMutation.mutate()` on change.
- All 4 statuses in dropdown (TODO, IN_PROGRESS, IN_REVIEW, DONE).
- Show loading spinner while `isLoading`, error message when `isError`.

#### Kanban View Component

Adapted from saas-2's `ProjectDetail.tsx` Kanban, but showing all tasks (not scoped to a single project):
- 4 columns: TODO, IN_PROGRESS, IN_REVIEW, DONE.
- Each task card: title, description (2-line clamp), priority color, project name chip, assignee avatar, due date.
- Clicking a card opens the edit modal.
- Show loading spinner while `isLoading`, error message when `isError`.
- **Drag-and-drop with `@dnd-kit`**: Cards are draggable between columns. Dropping a card in a different column calls `tasksApi.bulkStatus([taskId], newStatus)` and invalidates the `['tasks']` query. Visual feedback: card elevation on grab, drop zone highlighting on hover.

`@dnd-kit` integration pattern:

```typescript
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const [activeTask, setActiveTask] = useState<Task | null>(null);

// --- Droppable Column ---
// Each column is a droppable area with its status as the id
function KanbanColumn({ status, tasks, children }: { status: TaskStatus; tasks: Task[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={clsx('flex-1 min-w-[280px] p-3 rounded-lg', isOver ? 'bg-indigo-50' : 'bg-gray-100')}
    >
      <h3 className="font-medium mb-3">{status.replace('_', ' ')} ({tasks.length})</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// --- Draggable Task Card ---
// Each card uses useDraggable with the task id
function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={clsx('bg-white p-3 rounded shadow-sm cursor-grab', isDragging && 'opacity-50 shadow-lg')}
    >
      {/* Card content: title, description, priority, project, assignee, due date */}
    </div>
  );
}

// --- DndContext Wrapper ---
function handleDragStart(event: DragStartEvent) {
  const task = tasks?.find(t => t.id === event.active.id);
  setActiveTask(task || null);
}

function handleDragEnd(event: DragEndEvent) {
  setActiveTask(null);
  const { active, over } = event;
  if (!over) return;

  const taskId = active.id as string;
  const newStatus = over.id as TaskStatus;
  const task = tasks?.find(t => t.id === taskId);

  // Only update if dropped on a different status column
  if (task && newStatus && task.status !== newStatus && STATUSES.includes(newStatus)) {
    bulkStatusMutation.mutate({ taskIds: [taskId], status: newStatus });
  }
}

// In render:
<DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
  <div className="flex gap-4 overflow-x-auto">
    {STATUSES.map(status => {
      const columnTasks = tasks?.filter(t => t.status === status) || [];
      return (
        <KanbanColumn key={status} status={status} tasks={columnTasks}>
          {columnTasks.map(task => (
            <DraggableTaskCard key={task.id} task={task} />
          ))}
        </KanbanColumn>
      );
    })}
  </div>
  <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
</DndContext>
```

**Key `@dnd-kit` details**:
- Each column uses `useDroppable` with the status value as its `id`. This is how `over.id` maps to a status.
- Each card uses `useDraggable` with the task id. The `transform` CSS is applied inline for smooth drag movement.
- `DragOverlay` provides visual feedback during drag (a floating copy of the card).
- The `handleDragEnd` checks `STATUSES.includes(newStatus)` to ensure we only update when dropped on a valid column (not another task card).

#### Task Modal

Shared between both views. Fields:
- Title, Description, Status, Priority, Project (dropdown), Assignee (dropdown -- filtered by selected project's members), Due Date (date input).
- Close on backdrop click or Escape key (`useEffect` with `keydown` listener).
- **Project dropdown filtering**: Only show projects where the current user's role is OWNER, ADMIN, or MEMBER. Exclude projects where user is VIEWER (read-only). Filter logic:

```typescript
const writableProjects = projects?.filter((p) => {
  const membership = p.members?.find((m) => m.user.id === currentUser.id);
  return membership && ['OWNER', 'ADMIN', 'MEMBER'].includes(membership.role);
}) || [];
```

- When project selection changes, reset assignee if they're not a member of the new project.

### 3.4 Validation Checklist -- Phase 3

```
Backend (curl):
  [x] POST /api/tasks → 201, creatorId set automatically
  [x] POST /api/tasks as VIEWER → 403
  [x] POST /api/tasks with assignee not in project → 400
  [x] GET /api/tasks → returns only tasks from user's projects
  [x] GET /api/tasks?status=TODO → filtered results
  [x] GET /api/tasks?creatorId=<uuid> → filtered by creator
  [x] GET /api/tasks?sortBy=priority&order=asc → sorted results
  [x] PUT /api/tasks/:id as OWNER/ADMIN → 200 (any task)
  [x] PUT /api/tasks/:id as MEMBER (own task) → 200
  [x] PUT /api/tasks/:id as MEMBER (other's task) → 403
  [x] PUT /api/tasks/:id as VIEWER → 403
  [x] DELETE /api/tasks/:id as MEMBER (own task) → 204
  [x] DELETE /api/tasks/:id as MEMBER (other's task) → 403
  [x] DELETE /api/tasks/:id as VIEWER → 403
  [x] PATCH /api/tasks/bulk-status → { updated: N }

Frontend (browser):
  [x] Table view renders with all tasks
  [x] Inline status dropdown updates task
  [x] Kanban view renders 4 columns
  [x] Drag task card to different column → status updates
  [x] View toggle switches between table and kanban
  [x] View preference persists across page refresh
  [x] Create task modal shows only writable projects (not VIEWER)
  [x] Assignee dropdown updates when project changes
  [x] Edit task pre-fills all fields
  [x] Delete task removes from list
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

### 4.3 Frontend: `Layout.tsx` (Full version -- replaces Phase 1 stub)

Enhance the Phase 1 minimal layout with:

- User menu dropdown (click to toggle): Profile (`/profile`), Logout.
- Active route highlighting now supports nested routes (e.g., `/projects/:id` highlights Projects).
- Mobile-responsive: sidebar collapses on small screens (hamburger toggle).
- Polish: transition animations on nav items, hover states.

### 4.4 Frontend: `Toast.tsx` (Error/Success Feedback)

A lightweight toast notification component for mutation feedback:

```typescript
// frontend/src/components/Toast.tsx
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={clsx(
          'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white',
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        )}>
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
```

Usage in mutations:

```typescript
const { addToast } = useToastStore();

const createMutation = useMutation({
  mutationFn: projectsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    addToast('Project created', 'success');
  },
  onError: (err: Error) => addToast(err.message, 'error'),
});
```

Add `<ToastContainer />` in `Layout.tsx` so it's always visible on authenticated pages.

### 4.5 Backend: Rate Limiting on Auth Endpoints

Apply rate limiting to auth routes to prevent brute-force attacks:

```typescript
// In backend/src/routes/auth.ts, at the top:
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to login and register
router.post('/register', authLimiter, async (req, res, next) => { ... });
router.post('/login', authLimiter, async (req, res, next) => { ... });
```

### 4.6 Backend: `prisma/seed.ts`

The seed script creates test data for development. It must be idempotent (safe to run multiple times).

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in correct order (respects foreign keys)
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123', 12);

  // Create users
  const alice = await prisma.user.create({
    data: { email: 'alice@example.com', passwordHash, name: 'Alice Johnson' },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@example.com', passwordHash, name: 'Bob Smith' },
  });

  // Create projects with members
  const projectWebsite = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website',
      color: '#6366f1',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const projectMobile = await prisma.project.create({
    data: {
      name: 'Mobile App',
      description: 'React Native mobile application',
      color: '#f59e0b',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'VIEWER' },
        ],
      },
    },
  });

  const projectApi = await prisma.project.create({
    data: {
      name: 'API Platform',
      description: 'Internal API gateway and documentation',
      color: '#10b981',
      ownerId: bob.id,
      members: {
        create: [
          { userId: bob.id, role: 'OWNER' },
          { userId: alice.id, role: 'ADMIN' },
        ],
      },
    },
  });

  // Create tasks (10 total, distributed across projects)
  const tasks = [
    { title: 'Design homepage mockup', description: 'Create wireframes and visual design', status: 'DONE' as const, priority: 'HIGH' as const, projectId: projectWebsite.id, creatorId: alice.id, assigneeId: alice.id },
    { title: 'Implement navigation', description: 'Build responsive navigation component', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, projectId: projectWebsite.id, creatorId: alice.id, assigneeId: bob.id },
    { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for deployment', status: 'TODO' as const, priority: 'URGENT' as const, projectId: projectWebsite.id, creatorId: bob.id, assigneeId: null },
    { title: 'Write unit tests', description: 'Add test coverage for core components', status: 'IN_REVIEW' as const, priority: 'MEDIUM' as const, projectId: projectWebsite.id, creatorId: bob.id, assigneeId: bob.id },
    { title: 'Design app screens', description: 'Create mobile UI designs', status: 'TODO' as const, priority: 'HIGH' as const, projectId: projectMobile.id, creatorId: alice.id, assigneeId: alice.id },
    { title: 'Set up React Native project', description: 'Initialize project with TypeScript template', status: 'DONE' as const, priority: 'HIGH' as const, projectId: projectMobile.id, creatorId: alice.id, assigneeId: alice.id },
    { title: 'Implement auth flow', description: 'Login, register, and session management', status: 'IN_PROGRESS' as const, priority: 'URGENT' as const, projectId: projectMobile.id, creatorId: alice.id, assigneeId: alice.id },
    { title: 'Define API schema', description: 'OpenAPI specification for all endpoints', status: 'DONE' as const, priority: 'HIGH' as const, projectId: projectApi.id, creatorId: bob.id, assigneeId: bob.id },
    { title: 'Implement rate limiting', description: 'Add rate limiting middleware to all routes', status: 'TODO' as const, priority: 'MEDIUM' as const, projectId: projectApi.id, creatorId: bob.id, assigneeId: alice.id },
    { title: 'Set up monitoring', description: 'Configure health checks and alerting', status: 'TODO' as const, priority: 'LOW' as const, projectId: projectApi.id, creatorId: alice.id, assigneeId: null, dueDate: new Date('2026-03-01') },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }

  console.log('Seed complete: 2 users, 3 projects, 10 tasks');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

**Seed data summary**:
- **Alice** (alice@example.com / Password123): Owns Website Redesign and Mobile App. Admin on API Platform. Sees all 3 projects.
- **Bob** (bob@example.com / Password123): Owns API Platform. Member on Website Redesign. Viewer on Mobile App. Sees all 3 projects.

### 4.7 Dockerfiles

#### `backend/Dockerfile`

**Note**: `prisma` is a production dependency (not devDependency) because the CMD runs `prisma migrate deploy` at startup.

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

### 4.8 Validation Checklist -- Phase 4

```
Dashboard:
  [x] Stats cards show correct counts
  [x] Recent tasks display with badges
  [x] Recent projects display with colors
  [x] Data matches tasks/projects pages
  [x] Loading spinner shows while data is fetching

Profile:
  [x] Profile page loads current user info
  [x] Update name works, sidebar reflects change
  [x] Change password with correct current password works
  [x] Change password with wrong current password shows error
  [x] Weak new password shows validation error

Toast Notifications:
  [x] Creating a project shows success toast
  [x] Failed mutation shows error toast
  [x] Toasts auto-dismiss after 4 seconds
  [x] Toasts are manually dismissible

Rate Limiting:
  [x] 21st login attempt within 15 minutes returns 429

Seed Data:
  [x] npx prisma db seed creates 2 users, 3 projects, 10 tasks
  [x] Running seed twice does not create duplicates (idempotent)
  [x] Can log in as alice@example.com / Password123
  [x] Can log in as bob@example.com / Password123
  [x] Alice sees 3 projects (2 owned, 1 as admin)
  [x] Bob sees 3 projects (1 owned, 1 as member, 1 as viewer)

Docker:
  [x] docker compose up --build starts all services
  [x] Full auth flow works via browser at localhost:3000
  [x] Health check returns 200

End-to-end flow:
  [x] Register new user → dashboard loads with 0 tasks
  [x] Create project → appears in projects grid, success toast shown
  [x] Create task in project → appears in table and kanban
  [x] Switch views → same tasks displayed
  [x] Change task status inline → task updates
  [x] Add member to project → member appears in detail view
  [x] Logout → redirect to login → login again → session persists
  [x] ErrorBoundary catches component errors (shows fallback, not white screen)
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
| 1 | Phase 0 | docker-compose, package.json files, schema.prisma, tsconfig files, vite config, tailwind/postcss config, index.html, index.css, .env.example, .dockerignore files, base index.ts, errorHandler.ts | Nothing |
| 2 | Phase 1 | prisma.ts, auth.ts (middleware), auth.ts (routes), types/index.ts, auth store, api.ts, main.tsx, App.tsx (with SessionValidator), ErrorBoundary, LoadingSpinner, Layout (minimal), LoginPage, RegisterPage, stub pages | Phase 0 |
| 3a | Phase 2 | projects.ts (routes), ProjectsPage, ProjectDetailPage | Phase 1 |
| 3b | Phase 3 | tasks.ts (routes), TasksPage (table + kanban + filters + modal) | Phase 1 |
| 4 | Phase 4 | DashboardPage, ProfilePage, Layout (full), Toast, seed.ts, Dockerfiles, rate limiting | Phases 2 + 3 |
| 5 | Phase 5 | Railway config, env vars | Phase 4 |

**Phases 2 and 3 can be worked in parallel** since they depend only on Phase 1 (shared auth middleware, API client, types, app shell) and not on each other.

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Cookie not sent on API requests | `credentials: 'include'` in fetch + `cors({ credentials: true })` + `sameSite: 'lax'`/`'strict'`. Reference code handles all three. |
| Prisma connection pool exhaustion in dev | Singleton pattern in `lib/prisma.ts` using `globalThis`. Reference code provided. |
| Prisma CLI missing in production Docker | `prisma` moved to `dependencies` (not `devDependencies`) so `npm ci --omit=dev` still installs it. |
| Zod errors returning 500 | `ZodError` catch in global `errorHandler`. Reference code provided. |
| Password hash exposed to frontend | `userSelect` constant excludes `passwordHash` from all queries. Used in every auth route. |
| JWT cookie name mismatch | Single `COOKIE_NAME` constant in auth middleware, used by set/clear/extract. |
| Stale session after cookie expiry | `SessionValidator` in `App.tsx` calls `GET /api/auth/me` on mount. Shows spinner while validating, redirects to login if expired. |
| assigneeId referencing non-member | Membership check before create/update. Pattern shown in Zod + route logic. |
| OWNER removal | Explicit check in `DELETE /members/:userId` prevents removing OWNER role. |
| MEMBER modifying other users' tasks | `canModifyTask()` helper checks `creatorId === userId` for MEMBER role. Reference code provided in Phase 3. |
| VIEWER creating/editing tasks | Membership role check in POST/PUT/DELETE handlers. VIEWERs excluded from task modal project dropdown on frontend. |
| Component rendering errors crash app | `ErrorBoundary` wraps entire app in `main.tsx`. Shows recovery UI instead of white screen. |
| Silent mutation failures | `Toast` notification system shows success/error feedback on all mutations. |
| Brute-force auth attacks | `express-rate-limit` applied to login/register endpoints (20 req/15 min per IP). |
| `any` types undermining TypeScript | Shared interfaces in `frontend/src/types/index.ts` used across api.ts and components. |
| Docker builds copying node_modules | `.dockerignore` files in both backend and frontend exclude `node_modules`, `dist`, `.git`. |
| Missing package-lock.json breaks Docker | Explicit `npm install` step in Phase 0 generates lock files before first Docker build. |
