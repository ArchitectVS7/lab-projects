# Service Extraction: Before & After

## File Structure Comparison

### Before (1 file, 150 lines)
```
routes/
  users.js         # Everything: validation, auth, business logic, DB, HTTP
```

### After (8 files, ~250 lines total, but separated concerns)
```
types/
  user.ts          # 30 lines - Type definitions
errors/
  index.ts         # 40 lines - Custom error classes
services/
  user.service.ts  # 120 lines - Business logic
  email.service.ts # 20 lines - Email abstraction
middleware/
  validation.ts    # 60 lines - Request validation
  auth.ts          # 50 lines - JWT authentication
  errorHandler.ts  # 60 lines - Error handling
routes/
  users.ts         # 60 lines - HTTP handlers only
```

## Code Comparison

### Route Handler: Before (45 lines)
```javascript
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation (15 lines)
    if (!email) { return res.status(400).json({...}); }
    if (!password) { return res.status(400).json({...}); }
    // ... more validation
    
    // Business logic (20 lines)
    const existingUser = await User.findOne({...});
    if (existingUser) { return res.status(409).json({...}); }
    const hashedPassword = await bcrypt.hash(...);
    const user = await User.create({...});
    const token = jwt.sign({...});
    await sendWelcomeEmail(...);
    
    // Response (5 lines)
    res.status(201).json({...});
  } catch (error) {
    res.status(500).json({...});
  }
});
```

### Route Handler: After (10 lines)
```typescript
router.post(
  '/register',
  validateRegistration,  // Validation is middleware
  async (req, res, next) => {
    try {
      const result = await userService.register(req.body);  // Business logic is service
      res.status(201).json(result);
    } catch (error) {
      next(error);  // Errors handled by middleware
    }
  }
);
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Route file size** | 150 lines | 60 lines |
| **Responsibilities per file** | 5+ | 1 |
| **Unit testable** | ❌ Requires HTTP mocking | ✅ Pure function calls |
| **Reusable logic** | ❌ Trapped in route | ✅ Call from anywhere |
| **Error handling** | Inconsistent, duplicated | Centralized, consistent |
| **Type safety** | None | Full TypeScript |

## Testing Comparison

### Before: Testing requires HTTP
```javascript
// Must spin up server, make HTTP requests
const response = await request(app)
  .post('/api/users/register')
  .send({ email: 'test@example.com', password: 'password123' });

expect(response.status).toBe(201);
```

### After: Unit test business logic directly
```typescript
// No HTTP, just call the function
const result = await userService.register({
  email: 'test@example.com',
  password: 'password123',
});

expect(result.user.email).toBe('test@example.com');
```

### Test Count Comparison

| Test Type | Before | After |
|-----------|--------|-------|
| Service unit tests | 0 | 15 |
| Middleware unit tests | 0 | 8 |
| Integration tests | 3 (slow) | 3 (same) |
| **Total** | 3 | 26 |
| **Execution time** | ~2s | ~0.3s |

## Reusability Example

### Before: Logic trapped in HTTP handler
```javascript
// Want to register user from CLI? Too bad.
// Want to register from a cron job? Copy-paste the logic.
// Want to register from a WebSocket handler? Copy-paste again.
```

### After: Call service from anywhere
```typescript
// From route
router.post('/register', async (req, res, next) => {
  const result = await userService.register(req.body);
  res.json(result);
});

// From CLI
const result = await userService.register({
  email: args.email,
  password: args.password,
});
console.log('Created user:', result.user.id);

// From WebSocket
socket.on('register', async (data) => {
  const result = await userService.register(data);
  socket.emit('registered', result);
});

// From test
const result = await userService.register(testData);
expect(result.user.email).toBe(testData.email);
```

## Error Handling Comparison

### Before: Inconsistent, repeated
```javascript
// In route 1
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
}

// In route 2
} catch (error) {
  res.status(500).json({ message: 'Internal error' });
}

// In route 3
} catch (error) {
  res.status(500).send('Error');
}
```

### After: Consistent, centralized
```typescript
// Service throws semantic errors
throw new ConflictError('Email already registered');
throw new UnauthorizedError('Invalid credentials');
throw new NotFoundError('User');

// Single error handler catches all
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message }
    });
  }
  // ... handle other errors
});
```

## When NOT to Extract

Keep it simple for:
- ✅ Tiny apps (<5 routes)
- ✅ Prototypes / MVPs
- ✅ One-off scripts

Extract when:
- ✅ Multiple routes share logic
- ✅ You need to test business logic
- ✅ Logic needs to be called from non-HTTP contexts
- ✅ Team is growing
- ✅ App is in production long-term
