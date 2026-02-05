# Express App Refactoring Plan

## Executive Summary

**Current State:** 3,500+ lines of JavaScript with no tests, business logic in routes, and a monolithic entry point.

**Target State:** Typed, tested, layered architecture with clear separation of concerns.

**Timeline:** 6-8 weeks (part-time, alongside feature work)

**Risk Mitigation:** Incremental changes, feature flags, parallel running where possible.

---

## Prioritization Matrix

| Issue | Impact | Effort | Priority | Week |
|-------|--------|--------|----------|------|
| Add service layer | 🔴 High | 🟡 Medium | **P0** | 1-3 |
| Add TypeScript | 🔴 High | 🟡 Medium | **P0** | 1-2 |
| Split app.js | 🟡 Medium | 🟢 Low | **P1** | 1 |
| Add tests | 🔴 High | 🟡 Medium | **P1** | 2-4 |
| Dedupe utils | 🟢 Low | 🟢 Low | **P2** | 4 |

**Priority Key:**
- P0: Do first, enables other work
- P1: High value, do alongside P0
- P2: Clean up after foundation is solid

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Add TypeScript (Days 1-3)

**Why first:** Catches bugs during refactoring, enables IDE support.

**Steps:**

```bash
# Install dependencies
npm install -D typescript @types/node @types/express @types/mongoose ts-node

# Initialize config
npx tsc --init
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "allowJs": true,
    "checkJs": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Strategy:** 
1. Start with `strict: false` and `allowJs: true`
2. Rename files `.js` → `.ts` one at a time
3. Fix errors as you go
4. Enable strict mode after all files converted

**Order of conversion:**
1. `config/` (small, foundational)
2. `models/` (defines data shapes)
3. `middleware/` (small surface area)
4. `utils/` (independent)
5. `routes/` (largest, do alongside service extraction)
6. `app.js` (last)

### 1.2 Split app.js (Days 2-4)

**Current (500 lines):**
```javascript
// app.js - everything
const express = require('express');
const mongoose = require('mongoose');
// ... 500 lines of setup, routes, middleware, error handling
```

**Target structure:**
```
src/
  app.ts              # Express app setup only (~50 lines)
  server.ts           # Entry point, starts server (~20 lines)
  database.ts         # DB connection (~30 lines)
  routes/
    index.ts          # Route aggregator
  middleware/
    index.ts          # Middleware aggregator
```

**New files:**

**`src/server.ts`** (entry point):
```typescript
import { connectDatabase } from './database';
import { app } from './app';

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);
```

**`src/database.ts`**:
```typescript
import mongoose from 'mongoose';
import { config } from './config';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  console.log('Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
```

**`src/app.ts`**:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { configureMiddleware } from './middleware';
import { configureRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// App middleware
configureMiddleware(app);

// Routes
configureRoutes(app);

// Error handler (must be last)
app.use(errorHandler);
```

**`src/routes/index.ts`**:
```typescript
import { Express } from 'express';
import userRoutes from './users';
import orderRoutes from './orders';
// ... other routes

export function configureRoutes(app: Express): void {
  app.use('/api/users', userRoutes);
  app.use('/api/orders', orderRoutes);
  // ... other routes
}
```

---

## Phase 2: Service Layer (Week 2-4)

### 2.1 Create Service Layer Architecture

**Target structure:**
```
src/
  routes/           # HTTP handling only
  services/         # Business logic
  repositories/     # Data access (optional, can use models directly)
  models/           # Mongoose schemas
  types/            # Shared TypeScript interfaces
```

### 2.2 Extract Services (Prioritized by Route Complexity)

**Identify candidates:**
```bash
# Find largest route files
wc -l src/routes/*.js | sort -rn | head -10
```

**Start with top 3 most complex routes.**

### 2.3 Before/After Example

**BEFORE: `routes/users.js` (200 lines, mixed concerns)**
```javascript
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation (should be middleware)
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Business logic (should be service)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
    });
    
    const token = jwt.sign({ userId: user._id }, config.jwtSecret);
    
    // Side effect (should be service)
    await sendWelcomeEmail(user.email);
    
    res.status(201).json({ user: { id: user._id, email, name }, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

**AFTER: Separated concerns**

**`types/user.ts`:**
```typescript
export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResult {
  user: UserResponse;
  token: string;
}
```

**`services/user.service.ts`:**
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { EmailService } from './email.service';
import { CreateUserDTO, AuthResult } from '../types/user';
import { config } from '../config';

export class UserService {
  constructor(private emailService: EmailService) {}

  async register(data: CreateUserDTO): Promise<AuthResult> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
    });

    const token = jwt.sign({ userId: user._id }, config.jwtSecret);

    // Fire and forget (or queue)
    this.emailService.sendWelcome(user.email).catch(console.error);

    return {
      user: { id: user._id.toString(), email: user.email, name: user.name },
      token,
    };
  }
}

// Singleton for simple DI
export const userService = new UserService(new EmailService());
```

**`routes/users.ts`:**
```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { validateRegistration } from '../middleware/validation';

const router = Router();

router.post(
  '/register',
  validateRegistration,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

**`middleware/validation.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

export function validateRegistration(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return next(new ValidationError('Email and password required'));
  }
  
  if (password.length < 8) {
    return next(new ValidationError('Password must be at least 8 characters'));
  }
  
  next();
}
```

### 2.4 Custom Error Classes

**`src/errors/index.ts`:**
```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

**`middleware/errorHandler.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
  }

  // Default
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

---

## Phase 3: Testing (Week 3-5)

### 3.1 Setup

```bash
npm install -D jest ts-jest @types/jest supertest @types/supertest
```

**`jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 60, functions: 60, lines: 60, statements: 60 },
  },
};
```

### 3.2 Test Strategy

| Layer | Test Type | Priority | Coverage Target |
|-------|-----------|----------|-----------------|
| Services | Unit | **P0** | 80% |
| Routes | Integration | **P1** | 70% |
| Middleware | Unit | **P1** | 90% |
| Utils | Unit | **P2** | 80% |

### 3.3 Service Unit Test Example

**`services/user.service.test.ts`:**
```typescript
import { UserService } from './user.service';
import { User } from '../models/user';
import { ConflictError } from '../errors';

// Mock dependencies
jest.mock('../models/user');
jest.mock('./email.service');

describe('UserService', () => {
  let userService: UserService;
  let mockEmailService: { sendWelcome: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailService = { sendWelcome: jest.fn().mockResolvedValue(undefined) };
    userService = new UserService(mockEmailService as any);
  });

  describe('register', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create user and return token', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        email: validData.email,
        name: validData.name,
      });

      const result = await userService.register(validData);

      expect(result.user.email).toBe(validData.email);
      expect(result.token).toBeDefined();
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: validData.email })
      );
    });

    it('should throw ConflictError if email exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: validData.email });

      await expect(userService.register(validData))
        .rejects
        .toThrow(ConflictError);
    });

    it('should send welcome email after registration', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        email: validData.email,
      });

      await userService.register(validData);

      expect(mockEmailService.sendWelcome).toHaveBeenCalledWith(validData.email);
    });
  });
});
```

### 3.4 Integration Test Example

**`routes/users.test.ts`:**
```typescript
import request from 'supertest';
import { app } from '../app';
import { connectDatabase, disconnectDatabase } from '../database';

describe('POST /api/users/register', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBeDefined();
    expect(response.body.token).toBeDefined();
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({ password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## Phase 4: Cleanup (Week 5-6)

### 4.1 Deduplicate Utils

**Steps:**
1. Audit: `grep -r "function" src/utils/`
2. Identify duplicates by functionality
3. Consolidate into single source of truth
4. Update imports across codebase

**Common patterns to consolidate:**
```typescript
// src/utils/index.ts
export * from './date';
export * from './string';
export * from './validation';
export * from './async';
```

### 4.2 Enable Strict TypeScript

**Gradual strictness:**
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,        // Enable first
    "strictNullChecks": true,     // Enable second
    "strictFunctionTypes": true,  // Enable third
    "strict": true                // Enable when all pass
  }
}
```

---

## Phase 5: Documentation & Standards (Week 6-8)

### 5.1 Add Documentation

- `README.md` - Setup, running, deployment
- `CONTRIBUTING.md` - Code standards, PR process
- `docs/architecture.md` - System overview
- OpenAPI spec for routes

### 5.2 Linting & Formatting

```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

### 5.3 Pre-commit Hooks

```bash
npm install -D husky lint-staged
npx husky install
```

**`package.json`:**
```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Test coverage | 0% | 70% | `jest --coverage` |
| Type coverage | 0% | 95% | `npx type-coverage` |
| app.js lines | 500 | <50 | `wc -l` |
| Avg route file | 200 | <100 | `wc -l` |
| Duplicated code | Unknown | <3% | SonarQube/`jscpd` |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes | Incremental refactoring, one route at a time |
| Feature work blocked | Refactor 2-3 hours/day, not full days |
| Team unfamiliar with TS | Pair programming, internal lunch-n-learn |
| Regression bugs | Add tests before refactoring each module |

---

## Weekly Checklist

### Week 1
- [ ] TypeScript setup, config files converted
- [ ] app.js split into app.ts, server.ts, database.ts
- [ ] routes/index.ts aggregator created
- [ ] CI updated for TypeScript build

### Week 2
- [ ] Models converted to TypeScript
- [ ] First service extracted (highest-traffic route)
- [ ] Jest setup, first service tests written

### Week 3
- [ ] 3 more services extracted
- [ ] Custom error classes implemented
- [ ] Error handler updated

### Week 4
- [ ] All critical routes have services
- [ ] 50% test coverage achieved
- [ ] Utils deduplicated

### Week 5
- [ ] Remaining routes migrated
- [ ] 70% test coverage achieved
- [ ] Strict TypeScript enabled

### Week 6
- [ ] Documentation complete
- [ ] Linting/formatting enforced
- [ ] Team training complete
