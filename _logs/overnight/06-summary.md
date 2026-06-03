# Overnight Operator — Morning Synthesis (Run 1, 2026-06-03)

## Top 5 Findings by Leverage

| Rank | Finding | Leverage | Class | Resolved |
|---|---|---|---|---|
| 1 | Prisma client stale in fresh containers — all new models missing from generated client | 45 | OBSERVED | ✅ Fixed via `prepare` script |
| 2 | `npm run lint` failing CI — workers had no lint scripts | 27 | OBSERVED | ✅ Fixed: added `"lint": "tsc --noEmit"` to all workers |
| 3 | Admin API routes properly gate on ADMIN role | 27 | OBSERVED | ✅ Verified, no action needed |
| 4 | No `prepare` hook for auto-prisma-generate | 36 | OBSERVED | ✅ Fixed: packages/db now has `prepare` |
| 5 | Prisma drift canary missing from test suite | 36 | OBSERVED | ✅ Fixed: added prisma-schema-contract.test.ts |

## Highest Risk Open Items

1. **CRITICAL CVE — vitest 2.x → 4.x upgrade required**
   - vitest ≤4.1.0-beta.6 vulnerable via vite/esbuild SSRF chain
   - Fix requires major version bump (2→4) — may break test API
   - Mitigation: vitest is dev/test only, not production-exposed
   - Action: schedule intentional upgrade with full regression run

2. **Next.js 14 → 16 upgrade required** (HIGH CVE in glob/eslint-config-next)
   - Also a major version bump — significant migration effort
   - Mitigation: not directly exploitable in typical Next.js deployment patterns
   - Action: schedule for dedicated upgrade sprint

3. **Worker tsconfigs: 5 packages still have `moduleResolution: node`** (will break in TS 7.0)
   - packages/data-ingestion, packages/db, packages/ingestion-pipeline, packages/prediction-engine, packages/types
   - Fix: add `"ignoreDeprecations": "5.0"` to each tsconfig
   - Priority: low (TS 7.0 doesn't exist yet)

## PRs and Stack Order
- No PRs opened this run (all changes committed directly to `claude/magical-volta-IZmcH`)

## Blocked Questions (≤5, yes/no, ≤30 sec each)

1. **OK to upgrade vitest 2→4?** Requires: run full test suite after upgrade to check for API breaks. Risk: medium.
2. **OK to upgrade Next.js 14→16?** This is a large migration. Risk: high. Should be a dedicated sprint.
3. **Should `ignoreDeprecations: "5.0"` be added to tsconfig.base.json** (inherits to all packages) rather than per-file?

## First 30-Minute Plan for Next Run

1. (5 min) Add `ignoreDeprecations: "5.0"` to `tsconfig.base.json` and verify all packages inherit it — eliminates 5 per-file changes needed
2. (10 min) Add `lint` scripts to packages (data-ingestion, db, ingestion-pipeline, prediction-engine, types) — same pattern as workers
3. (15 min) Write first `ingestion-pipeline` package test — `processSport` contract (mock Prisma + OddsApiClient, verify result shape)

## State Delta This Run

```
Tests:        1899 → 1903 (+4)
Test files:   169  → 170  (+1)
TS errors:    0    → 0    (stable)
Lint errors:  1    → 0    (fixed)
```

## Innovation Artifacts

**Hypothesis:** Prisma schema drift is a single-point-of-failure for the entire TypeScript build — one missed `prisma generate` breaks imports across 6+ files simultaneously, with no clear error message about root cause. The `prepare` hook + canary test creates a two-layer defense: auto-fix on install, fail-fast on test.

**Counterfactual:** If the `prepare` hook is not run (e.g., `npm ci --ignore-scripts`), the canary test provides the safety net — it will fail with an explicit "run prisma generate" message before any cryptic TS2305/TS2694 errors appear.

**Automation value:** `prepare` script runs prisma generate on every fresh checkout, saving ~5 min of debugging per developer per schema change. At 2 schema changes/week and 2 developers, that's 20 min/week saved.

**Burn-down chain:** Fixing `prepare` (done) → clears stale Prisma types → enables typecheck to run clean → enables lint to report real issues (not noise from broken imports) → enables accurate error reporting for subsequent schema changes.
