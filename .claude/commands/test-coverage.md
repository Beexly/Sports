---
description: Analyze test coverage and generate tests to reach 80%+ on uncovered paths
---

Measure current coverage, identify gaps, and generate targeted tests.

## Step 1: Measure

```bash
cd /workspace/sports && npm run test -- --coverage --coverageReporters=json-summary 2>/dev/null
# or per-workspace:
npx vitest run --coverage --reporter=verbose
```

Parse `coverage/coverage-summary.json` to find files below 80% branch coverage.

## Step 2: Triage (worst-first)

List files sorted by branch coverage ascending. For each file below 80%:
- List untested exported functions
- List uncovered branches (if/else, switch arms, ternary)
- List missing error scenarios (thrown exceptions, rejected promises)

## Step 3: Generate tests (priority order)

1. **Primary happy path** — the successful execution of the core function
2. **Error conditions** — invalid input, API failure, DB error, network timeout
3. **Boundary cases** — empty arrays, null/undefined, 0, max values
4. **Branch-specific** — each `if` arm that's missing coverage

Naming convention:
```typescript
it('returns 400 when odds API response is missing required fields', async () => { ... })
it('voIds pick when game postponed after settlement window', async () => { ... })
```

## Step 4: GSN critical coverage gaps (from audit)

These paths have HIGH business risk and need tests:

| File | Missing coverage |
|---|---|
| `packages/ingestion-pipeline/src/settle-sport.ts:92–126` | Postponed/cancelled game VOID path |
| `apps/web/lib/watchlist/alert-dispatch.ts` | Alert dispatch to real email/push |
| `apps/web/lib/api-auth/hash.ts` | Timing-safe comparison correctness |
| `apps/web/lib/stripe.ts` | Idempotency key on checkout creation |
| `apps/web/middleware.ts` | Auth enforcement on `/api/` routes |
| `apps/web/lib/calibration/compute.ts` | Per-decile ECE calculation |
| `apps/web/lib/content-generator.ts` | Prompt injection fencing |

## Step 5: Verify

Run tests after each new test file:
```bash
npm run test -- <new-test-file>
```

Re-measure coverage to confirm improvement. Target: all critical files ≥ 80% branch coverage.

## Rules

- Tests must use real fixtures or mocked real-shaped data — no fabricated stats
- Never use `any` in test files
- One assertion per `it()` block where possible
- Use `vi.spyOn` not `vi.mock` for partial mocks
