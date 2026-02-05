# Refactoring Example: User Registration Route

This example shows how to extract business logic from a route file into a proper service layer.

## Before vs After

```
BEFORE (1 file, 150 lines, untestable)
──────────────────────────────────────
routes/auth.js
├── Inline validation (30 lines)
├── Business logic (60 lines)
├── Database operations (20 lines)
├── Email sending (30 lines)
└── Error handling (10 lines)


AFTER (5 files, properly separated, fully testable)
───────────────────────────────────────────────────
routes/auth.js           (30 lines)  → HTTP concerns only
validators/authValidator.js (50 lines)  → Pure validation
services/authService.js  (120 lines) → Business logic
services/emailService.js (80 lines)  → Email abstraction
utils/errors.js          (shared)    → Custom errors

tests/
├── unit/
│   ├── authValidator.test.js (20 tests)
│   └── authService.test.js   (15 tests)
└── integration/
    └── auth.test.js          (15 tests)
```

## Key Changes

### 1. Route becomes thin (30 lines)
```javascript
// BEFORE: 150 lines of mixed concerns
router.post('/register', async (req, res) => {
  // validation...
  // business logic...
  // database...
  // email...
  // error handling...
});

// AFTER: 30 lines, just HTTP glue
router.post('/register', async (req, res, next) => {
  const validation = validateRegister(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  const result = await authService.registerUser(validation.data);
  res.status(201).json(result);
});
```

### 2. Validation is pure and testable
```javascript
// Pure function - no DB, no HTTP, no side effects
function validateRegister(data) {
  const { error, value } = schema.validate(data);
  if (error) return { success: false, error: error.message };
  return { success: true, data: value };
}

// Easy to test
expect(validateRegister({ email: 'bad' }).success).toBe(false);
```

### 3. Business logic is isolated
```javascript
// Service function - can be called from anywhere
async function registerUser({ email, password, name }) {
  // All business logic here
  // Can test without HTTP context
  // Can reuse in CLI, workers, other routes
}

// Easy to test with mocks
jest.mock('../models/User');
const result = await registerUser(validInput);
expect(User.create).toHaveBeenCalledWith(...);
```

### 4. Email is non-blocking
```javascript
// BEFORE: Blocks response
await transporter.sendMail(...);
res.json(result);

// AFTER: Fire and forget
emailService.sendVerificationEmail(...)
  .catch(err => console.error(err)); // Don't fail registration if email fails
return result;
```

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `BEFORE_routes_auth.js` | Original monolithic route | 150 |
| `AFTER_routes_auth.js` | Thin HTTP layer | 30 |
| `AFTER_validators_authValidator.js` | Input validation | 50 |
| `AFTER_services_authService.js` | Business logic | 120 |
| `AFTER_services_emailService.js` | Email abstraction | 80 |
| `AFTER_tests_unit_authValidator.test.js` | Validator tests | 130 |
| `AFTER_tests_unit_authService.test.js` | Service tests | 180 |
| `AFTER_tests_integration_auth.test.js` | Route tests | 180 |

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Testability** | Need HTTP context | Unit test everything |
| **Reusability** | Locked in route | Use anywhere |
| **Readability** | 150 lines to grok | 30 lines per file |
| **Error handling** | Duplicated | Centralized |
| **Email failure** | Blocks response | Non-blocking |
| **Validation** | Scattered | Schema-based |

## How to Apply This Pattern

1. **Identify** a complex route (>50 lines)
2. **Extract validation** to `validators/{resource}Validator.js`
3. **Extract business logic** to `services/{resource}Service.js`
4. **Keep route thin**: validate → service → respond
5. **Write tests**: unit for validator/service, integration for route
6. **Repeat** for each route file

## Running Tests

```bash
# Unit tests (fast, no DB)
npm test -- tests/unit

# Integration tests (needs test DB)
npm test -- tests/integration

# All tests with coverage
npm test -- --coverage
```
