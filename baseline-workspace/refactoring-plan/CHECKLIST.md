# Refactoring Checklist

## Quick Reference

### Before Refactoring Any File
- [ ] File has tests? If not, write tests first
- [ ] Understand current behavior (read, run, debug)
- [ ] Commit current state (clean git history)

### After Refactoring Any File
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No new linting warnings
- [ ] Manually tested happy path
- [ ] Committed with descriptive message

---

## Route → Service Extraction Checklist

For each route file:

- [ ] Create `types/<entity>.ts` with DTOs
- [ ] Create `services/<entity>.service.ts`
- [ ] Extract business logic to service
- [ ] Route only does: validate → call service → respond
- [ ] Add service unit tests
- [ ] Add route integration tests
- [ ] Update imports
- [ ] Remove dead code

---

## TypeScript Conversion Checklist

For each `.js` → `.ts` file:

- [ ] Rename file to `.ts`
- [ ] Add type imports
- [ ] Type function parameters
- [ ] Type return values
- [ ] Type local variables (only where needed)
- [ ] Fix all TypeScript errors
- [ ] Run tests

---

## Progress Tracker

### Config (Week 1)
- [ ] `config/index.ts`

### Models (Week 1)
- [ ] `models/user.ts`
- [ ] `models/order.ts`
- [ ] `models/...` (add your models)

### Middleware (Week 1)
- [ ] `middleware/auth.ts`
- [ ] `middleware/logging.ts`
- [ ] `middleware/errorHandler.ts`

### Services (Week 2-4)
| Route | Service Created | Tests | Coverage |
|-------|-----------------|-------|----------|
| users | [ ] | [ ] | __% |
| orders | [ ] | [ ] | __% |
| products | [ ] | [ ] | __% |
| ... | [ ] | [ ] | __% |

### Utils (Week 4)
- [ ] Audit complete
- [ ] Duplicates identified
- [ ] Consolidated
- [ ] Tests added

### Final (Week 5-6)
- [ ] `strict: true` enabled
- [ ] 70% coverage achieved
- [ ] CI/CD updated
- [ ] Documentation complete

---

## Commands Cheat Sheet

```bash
# TypeScript
npm run build              # Compile
npm run typecheck          # Check without emit

# Testing
npm test                   # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm test -- user.service   # Specific file

# Linting
npm run lint               # Check
npm run lint -- --fix      # Auto-fix

# Find large files
wc -l src/routes/*.ts | sort -rn

# Find duplicated code
npx jscpd src/

# Type coverage
npx type-coverage
```
