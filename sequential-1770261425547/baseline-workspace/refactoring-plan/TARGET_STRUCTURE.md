# Target Project Structure

```
src/
├── server.ts                 # Entry point (20 lines)
├── app.ts                    # Express setup (50 lines)
├── database.ts               # DB connection
│
├── config/
│   └── index.ts              # Environment config
│
├── types/                    # Shared interfaces
│   ├── index.ts
│   ├── user.ts
│   ├── order.ts
│   └── common.ts
│
├── errors/                   # Custom error classes
│   └── index.ts
│
├── models/                   # Mongoose schemas
│   ├── index.ts
│   ├── user.model.ts
│   └── order.model.ts
│
├── services/                 # Business logic
│   ├── user.service.ts
│   ├── user.service.test.ts
│   ├── order.service.ts
│   └── order.service.test.ts
│
├── routes/                   # HTTP handlers only
│   ├── index.ts              # Route aggregator
│   ├── users.ts
│   ├── users.test.ts         # Integration tests
│   ├── orders.ts
│   └── orders.test.ts
│
├── middleware/
│   ├── index.ts              # Middleware aggregator
│   ├── auth.ts
│   ├── auth.test.ts
│   ├── validation.ts
│   ├── logging.ts
│   └── errorHandler.ts
│
└── utils/                    # Pure helper functions
    ├── index.ts
    ├── date.ts
    ├── date.test.ts
    ├── string.ts
    └── async.ts
```

## File Responsibilities

| Layer | Responsibility | Depends On |
|-------|----------------|------------|
| `routes/` | Parse HTTP, call service, send response | services, middleware |
| `services/` | Business logic, orchestration | models, other services |
| `models/` | Data schema, DB operations | types |
| `middleware/` | Cross-cutting concerns | services (auth only) |
| `utils/` | Pure functions, no side effects | nothing |
| `types/` | Interfaces, DTOs | nothing |
| `errors/` | Custom error classes | nothing |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case or dot notation | `user.service.ts` |
| Classes | PascalCase | `UserService` |
| Interfaces | PascalCase, no `I` prefix | `User`, `CreateUserDTO` |
| Functions | camelCase | `getUserById` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Test files | `.test.ts` suffix | `user.service.test.ts` |

## Import Order

```typescript
// 1. Node built-ins
import path from 'path';

// 2. External packages
import express from 'express';
import mongoose from 'mongoose';

// 3. Internal - absolute paths
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

// 4. Internal - relative paths
import { validateRequest } from './validation';

// 5. Types (if separate)
import type { CreateUserDTO } from '../types/user';
```
