# Express App Refactoring Plan

## Overview

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| No tests | 🔴 Critical | Medium | 1 |
| Business logic in routes | 🔴 High | High | 2 |
| 500-line app.js | 🟡 Medium | Low | 3 |
| Duplicated utils | 🟡 Medium | Low | 4 |
| No TypeScript | 🟢 Long-term | High | 5 |

**Total estimated time:** 3-5 weeks (depending on team size)

---

## Phase 1: Foundation (Week 1)

### 1.1 Add Testing Infrastructure
**Effort:** 2-3 days | **Impact:** Enables safe refactoring

```bash
npm install -D jest supertest @types/jest
```

Create basic structure:
```
tests/
  setup.js              # DB connection, env vars
  fixtures/             # Test data factories
  integration/
    routes/             # Mirror src/routes structure
  unit/
    services/           # Will exist after Phase 2
```

**jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
};
```

**Deliverable:** Testing infrastructure ready, npm test works.

---

### 1.2 Add Smoke Tests for Critical Routes
**Effort:** 2-3 days | **Impact:** Safety net before refactoring

Identify 5-10 most critical endpoints (auth, payments, core CRUD). Write integration tests:

```javascript
// tests/integration/routes/auth.test.js
const request = require('supertest');
const app = require('../../../src/app');

describe('POST /auth/login', () => {
  it('returns 200 and token for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });
    
    expect(res.status).toBe(401);
  });
});
```

**Deliverable:** Critical paths have regression tests. Target: 10-15 tests.

---

### 1.3 Slim Down app.js
**Effort:** 1 day | **Impact:** Clarity, sets pattern for rest of refactor

**Before (500 lines):**
```javascript
// app.js - everything jammed together
const express = require('express');
const app = express();

// 50 lines of middleware setup
// 100 lines of route definitions
// 200 lines of error handling
// Random helper functions
// etc.
```

**After (~80 lines):**
```javascript
// src/app.js
const express = require('express');
const { configureMiddleware } = require('./middleware');
const { configureRoutes } = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
configureMiddleware(app);

// Routes
configureRoutes(app);

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
```

```javascript
// src/middleware/index.js
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { json, urlencoded } = require('express');

function configureMiddleware(app) {
  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.use(morgan('combined'));
}

module.exports = { configureMiddleware };
```

```javascript
// src/routes/index.js
const authRoutes = require('./auth');
const userRoutes = require('./users');
const orderRoutes = require('./orders');
// ... other routes

function configureRoutes(app) {
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/orders', orderRoutes);
  // ... other routes
  
  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
}

module.exports = { configureRoutes };
```

**Deliverable:** app.js under 100 lines, clear separation.

---

## Phase 2: Service Layer Extraction (Week 2-3)

### 2.1 Create Services Directory Structure
**Effort:** 1 day | **Impact:** Sets pattern

```
src/
  services/
    index.js            # Barrel exports
    userService.js
    orderService.js
    authService.js
    emailService.js
    ... (one per domain)
```

### 2.2 Extract Business Logic (Route by Route)
**Effort:** 5-8 days | **Impact:** Core architectural improvement

Pick one route file at a time. Start with the most complex.

**Before (routes/orders.js - 250 lines):**
```javascript
router.post('/', auth, async (req, res) => {
  try {
    // Validation (30 lines)
    const { items, shippingAddress } = req.body;
    if (!items?.length) {
      return res.status(400).json({ error: 'Items required' });
    }
    // ... more validation

    // Business logic (50 lines)
    const user = await User.findById(req.user.id);
    const inventory = await Inventory.find({ sku: { $in: items.map(i => i.sku) } });
    
    for (const item of items) {
      const stock = inventory.find(i => i.sku === item.sku);
      if (!stock || stock.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock: ${item.sku}` });
      }
    }
    
    const subtotal = items.reduce((sum, item) => {
      const product = inventory.find(i => i.sku === item.sku);
      return sum + product.price * item.quantity;
    }, 0);
    
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    
    // Database operations (30 lines)
    const order = await Order.create({
      user: user._id,
      items,
      subtotal,
      tax,
      total,
      shippingAddress,
      status: 'pending',
    });
    
    // Side effects (20 lines)
    await Promise.all(items.map(item => 
      Inventory.updateOne(
        { sku: item.sku },
        { $inc: { quantity: -item.quantity } }
      )
    ));
    
    await sendEmail(user.email, 'Order Confirmation', { order });
    
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**After (routes/orders.js - 20 lines):**
```javascript
const orderService = require('../services/orderService');
const { validateCreateOrder } = require('../validators/orderValidator');

router.post('/', auth, async (req, res, next) => {
  try {
    const validation = validateCreateOrder(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const order = await orderService.createOrder(req.user.id, req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err); // Let error handler deal with it
  }
});
```

**After (services/orderService.js - 80 lines, testable):**
```javascript
const Order = require('../models/Order');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const emailService = require('./emailService');

class InsufficientStockError extends Error {
  constructor(sku) {
    super(`Insufficient stock: ${sku}`);
    this.name = 'InsufficientStockError';
    this.sku = sku;
  }
}

async function createOrder(userId, orderData) {
  const { items, shippingAddress } = orderData;
  
  // Load data
  const user = await User.findById(userId);
  const inventory = await Inventory.find({ sku: { $in: items.map(i => i.sku) } });
  
  // Check stock
  for (const item of items) {
    const stock = inventory.find(i => i.sku === item.sku);
    if (!stock || stock.quantity < item.quantity) {
      throw new InsufficientStockError(item.sku);
    }
  }
  
  // Calculate totals
  const subtotal = calculateSubtotal(items, inventory);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;
  
  // Create order
  const order = await Order.create({
    user: user._id,
    items,
    subtotal,
    tax,
    total,
    shippingAddress,
    status: 'pending',
  });
  
  // Update inventory
  await decrementInventory(items);
  
  // Send confirmation (don't await - fire and forget)
  emailService.sendOrderConfirmation(user.email, order).catch(console.error);
  
  return order;
}

function calculateSubtotal(items, inventory) {
  return items.reduce((sum, item) => {
    const product = inventory.find(i => i.sku === item.sku);
    return sum + product.price * item.quantity;
  }, 0);
}

function calculateTax(subtotal, rate = 0.08) {
  return subtotal * rate;
}

async function decrementInventory(items) {
  await Promise.all(items.map(item => 
    Inventory.updateOne(
      { sku: item.sku },
      { $inc: { quantity: -item.quantity } }
    )
  ));
}

module.exports = {
  createOrder,
  calculateSubtotal,
  calculateTax,
  InsufficientStockError,
};
```

### 2.3 Add Unit Tests for Services
**Effort:** 3-4 days | **Impact:** Real test coverage

```javascript
// tests/unit/services/orderService.test.js
const { calculateSubtotal, calculateTax } = require('../../../src/services/orderService');

describe('orderService', () => {
  describe('calculateSubtotal', () => {
    it('sums price * quantity for all items', () => {
      const items = [
        { sku: 'A', quantity: 2 },
        { sku: 'B', quantity: 1 },
      ];
      const inventory = [
        { sku: 'A', price: 10 },
        { sku: 'B', price: 25 },
      ];
      
      expect(calculateSubtotal(items, inventory)).toBe(45);
    });
  });

  describe('calculateTax', () => {
    it('applies 8% tax by default', () => {
      expect(calculateTax(100)).toBe(8);
    });

    it('accepts custom tax rate', () => {
      expect(calculateTax(100, 0.1)).toBe(10);
    });
  });
});
```

**Deliverable:** Services extracted, routes are thin, unit tests for business logic.

---

## Phase 3: Cleanup (Week 3-4)

### 3.1 Deduplicate Utils
**Effort:** 2 days | **Impact:** Reduces bugs, cleaner code

1. Audit `src/utils/` - list all functions
2. Identify duplicates (same logic, different names/files)
3. Consolidate into focused modules:

```
src/utils/
  index.js              # Barrel exports
  validation.js         # Input validation helpers
  formatting.js         # Date, currency, string formatting
  async.js              # Retry, timeout, parallelLimit
  errors.js             # Custom error classes
```

4. Update all imports
5. Delete orphaned code

### 3.2 Add Validation Layer
**Effort:** 2 days | **Impact:** Consistent input handling

Use Joi or Zod for schema validation:

```bash
npm install joi
```

```javascript
// src/validators/orderValidator.js
const Joi = require('joi');

const createOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      sku: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
    })
  ).min(1).required(),
  shippingAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().length(2).required(),
    zip: Joi.string().pattern(/^\d{5}$/).required(),
  }).required(),
});

function validateCreateOrder(data) {
  const { error, value } = createOrderSchema.validate(data);
  if (error) {
    return { success: false, error: error.details[0].message };
  }
  return { success: true, data: value };
}

module.exports = { validateCreateOrder, createOrderSchema };
```

### 3.3 Standardize Error Handling
**Effort:** 1 day | **Impact:** Consistent API responses

```javascript
// src/utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

module.exports = { AppError, NotFoundError, ValidationError, UnauthorizedError };
```

```javascript
// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  // Log error
  console.error(err);

  // Operational errors (expected)
  if (err.isOperational) {
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

  // Unknown error - don't leak details
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

module.exports = { errorHandler };
```

---

## Phase 4: TypeScript Migration (Week 4-5+)

### 4.1 Setup TypeScript (Incremental)
**Effort:** 1 day | **Impact:** Foundation for type safety

```bash
npm install -D typescript @types/node @types/express @types/mongoose
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,           // Key: allows mixed JS/TS
    "checkJs": false,          // Don't type-check JS files yet
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4.2 Migrate Files Incrementally
**Effort:** Ongoing | **Impact:** Gradual type safety

Priority order:
1. **Types/interfaces first** - Create `src/types/` with shared types
2. **Utils** - Usually pure functions, easy to type
3. **Services** - Core business logic benefits most
4. **Models** - Add Mongoose types
5. **Routes** - Last, least benefit

```typescript
// src/types/order.ts
export interface OrderItem {
  sku: string;
  quantity: number;
  price?: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  _id: string;
  user: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress: ShippingAddress;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
}
```

---

## Final Structure

```
src/
  app.js                    # ~80 lines, just wiring
  server.js                 # Entry point, starts server
  config/
    index.js                # Env-based config
    database.js             # DB connection
  middleware/
    index.js                # configureMiddleware()
    auth.js                 # JWT validation
    logging.js              # Request logging
    errorHandler.js         # Centralized error handling
  routes/
    index.js                # configureRoutes()
    auth.js                 # Thin: validate → service → respond
    users.js
    orders.js
    ...
  services/                 # NEW: Business logic lives here
    authService.js
    userService.js
    orderService.js
    emailService.js
    ...
  validators/               # NEW: Input validation schemas
    authValidator.js
    orderValidator.js
    ...
  models/
    User.js
    Order.js
    ...
  utils/
    errors.js               # Custom error classes
    validation.js           # Shared validation helpers
    formatting.js           # Date, currency helpers
  types/                    # NEW: TypeScript types (when migrated)
    index.ts
    order.ts
    user.ts

tests/
  setup.js
  fixtures/
  integration/
    routes/
  unit/
    services/
```

---

## Checklist

### Phase 1: Foundation ✓
- [ ] Jest + Supertest installed
- [ ] Test structure created
- [ ] 10-15 smoke tests for critical routes
- [ ] app.js under 100 lines
- [ ] Routes mounted via routes/index.js

### Phase 2: Services ✓
- [ ] services/ directory created
- [ ] All business logic extracted from routes
- [ ] Routes are thin (validate → service → respond)
- [ ] Unit tests for service functions
- [ ] Custom error classes used

### Phase 3: Cleanup ✓
- [ ] utils/ deduplicated and organized
- [ ] Validation layer (Joi/Zod) implemented
- [ ] Error handling standardized
- [ ] All routes use validators

### Phase 4: TypeScript ✓
- [ ] tsconfig.json with allowJs
- [ ] types/ directory with interfaces
- [ ] Utils migrated to .ts
- [ ] Services migrated to .ts
- [ ] Models typed with Mongoose generics

---

## Metrics to Track

| Metric | Before | Target |
|--------|--------|--------|
| Test coverage | 0% | >70% |
| app.js lines | 500 | <100 |
| Avg route file lines | 200 | <50 |
| Duplicated code | Unknown | 0 |
| TypeScript coverage | 0% | >80% |
