# Overnight Run — Morning Summary (Run 1)

**Date:** 2026-06-12  |  **Branch:** `claude/magical-volta-6wcpd8`  |  **Mode:** WRITE

---

## What Changed

### Repair
| # | Change | Impact |
|---|--------|--------|
| 1 | Added `"ignoreDeprecations":"5.0"` to 7 package/worker tsconfigs for TypeScript 6.0 compatibility | TypeScript 6.0 global was silently breaking all worker typechecks |
| 2 | Added `"types":["node"]` to pick-generation worker tsconfig | `process`/`console` were unresolved in TS6 |
| 3 | Generated Prisma client (`db:generate`) — was missing | 3 test files referenced non-existent `@prisma/client` exports |
| 4 | Added `/cockpit` to `PROTECTED_ROUTES` in `middleware.ts` | Unauthenticated browsers could reach the cockpit shell before layout auth ran |
| 5 | Extended `middleware-contract.test.ts` to assert `/cockpit` protection | Prevents regression of the above |

### Grow
| # | Change | Value |
|---|--------|-------|
| 6 | `scripts/guardrails/dep-audit.mjs` — production CVE scanner | Blocks CI if production-critical CVE introduced; warns (non-blocking) for dev-only |
| 7 | CI `dep-audit` job wired into `ci.yml` | Runs on every push/PR to `main` and `claude/*` branches |
| 8 | `human-performance/readiness.test.ts` — 25 tests | Pins trust invariant: zero live biomechanics capabilities; covers `buildOutputBehavior`, `confidenceLabel`, constants |

---

## Test Counts
| Metric | Before | After |
|--------|--------|-------|
| Test files | 335 | 336 |
| Total tests | 4346 | 4371 |
| TypeScript errors | 10+ | 0 |
| Lint errors | 0 | 0 |

---

## Top 5 Findings (by Leverage)

1. **TypeScript 6.0 deprecation errors (Leverage=36)** — 7 tsconfigs blocked under global TS6.  
   Fixed: `ignoreDeprecations:"5.0"` across all CommonJS packages/workers.

2. **npm CVEs — Next.js 14 advisories (Leverage=24)** — 4 HIGH, fix requires Next.js 16.  
   Blocked: needs G sign-off for major version upgrade.

3. **Missing Prisma client generation (Leverage=18)** — silent test failures.  
   Fixed: `db:generate` run, added to CI (already present).

4. **/cockpit lacking middleware cookie gate (Leverage=18)** — defense-in-depth gap.  
   Fixed: added to `PROTECTED_ROUTES`; regression test added.

5. **human-performance/readiness.ts untested (Leverage=18)** — trust invariants unprotected.  
   Fixed: 25-test suite added.

---

## Blocked Questions (≤5, Yes/No, ≤30s to answer)

**Q1:** Upgrade Next.js 14→16 + vitest 2→4? (fixes all current CVEs, requires dedicated testing)  
→ `Yes` / `No` / `Partial (vitest only)`

**Q2:** Bump CI Node.js from 20 to 22 LTS to match local dev environment?  
→ `Keep 20` / `Upgrade to 22`

---

## Synthesis Finding

**Causal chain:** The `moduleResolution:"node"` deprecations, missing `@types/node` in pick-gen,
and the missing Prisma client all stem from the same root cause: **no `npm install` had run in
this environment**, so all TypeScript tooling fell through to the global tsc 6.0.2. A single
`npm ci` in CI prevents all three failure modes simultaneously — which the CI workflow already
enforces. The overnight fix ensures the codebase is also clean against the newer compiler so
the upgrade path is smooth.

---

## First 30-Minute Plan for Next Run

1. (If Q1=Yes) Plan Next.js 16 + vitest 4 upgrade: pin changes, run full test matrix, validate middleware compat
2. (If Q1=No) Pick the next highest-leverage untested module: `lib/fantasy/dfs-optimizer.ts` (no test, used in DFS slate)
3. Verify pushed commits show CI green on GitHub
