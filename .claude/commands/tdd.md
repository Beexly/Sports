---
description: Red-Green-Refactor TDD cycle — write failing test first, then minimal code to pass
---

Drive all new feature development via test-first discipline.

## The cycle (repeat for each unit of behavior)

### RED — write a failing test
1. Identify the smallest testable behavior to add
2. Write a test that calls the function/route/component with specific inputs
3. Assert the expected output (value, error, side-effect)
4. Run the test — **it must fail** (if it passes, the test is wrong)
5. Confirm the failure message is meaningful (not a crash)

```bash
npm run test -- --watch apps/web/lib/<file>.test.ts
```

### GREEN — write minimal code to pass
1. Write the **minimum code** that makes the test pass
2. No abstractions, no generics, no future-proofing
3. Run the test — it must now pass
4. Do not modify the test to make it pass

### REFACTOR — clean without breaking
1. Remove duplication
2. Improve naming
3. Extract if a function exceeds 40 lines
4. Run tests after every change — must stay green

## GSN-specific patterns

**Testing API routes:**
```typescript
import { createRequest } from 'node-mocks-http'
// or use supertest against the Next.js handler
```

**Testing Prisma interactions:**
```typescript
import { prismaMock } from '../__mocks__/prisma'
vi.mock('@/packages/db', () => ({ prisma: prismaMock }))
```

**Testing subscription gates:**
```typescript
it('returns 403 when user is on Free tier', async () => {
  vi.mocked(getServerSession).mockResolvedValueOnce(mockFreeSession)
  const res = await GET(req)
  expect(res.status).toBe(403)
})
```

**Testing time-sensitive logic:**
```typescript
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-07-21T12:00:00Z'))
// ... test ...
vi.useRealTimers()
```

## Rules

- Never write code without a failing test first (except pure config)
- Never mock what you don't own (mock the boundary, not internals)
- One behavior per test — if a test needs multiple assertions, split it
- Test file lives next to source file: `foo.ts` → `foo.test.ts`
- Coverage target: 80% branch coverage minimum

## Commit pattern

```
git commit -m "test: <what the test verifies>"
git commit -m "feat: <minimal implementation>"
git commit -m "refactor: <cleanup>"
```
