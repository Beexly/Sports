# Overnight Run — Morning Summary (2026-06-10)

## What Changed

Two commits pushed to `claude/magical-volta-n8sbdm`:

### Commit 1: `fix(security+repair)` — 15 files
- **Prisma.validator removed in v5** → migrated to `satisfies` operator in `lib/correlation/load-settled-picks.ts`
- **Stale Prisma client** → ran `prisma generate` which fixed 146 TypeScript errors and restored 8+ missing exported types (`CockpitTaskStatus`, `Promotion`, `OddsMarket`, etc.)
- **tsconfig baseUrl deprecation** → added `ignoreDeprecations: "5.0"` to silence TS5101
- **Timing attack in 3 cron routes** → created `lib/cron-auth.ts` with HMAC + `timingSafeEqual()`. 9 new tests.
- **DEV_FAKE_ADMIN production bypass** → added `NODE_ENV !== "production"` guard to `lib/auth.ts`, `lib/entitlements.ts`, `middleware.ts`. 1 new test.

### Commit 2: `improve(security+dx)` — 2 files  
- **Stripe customer ID in logs** → redacted to `[REDACTED]` in webhook handler
- **Stale client prevention** → added `postinstall` hook to root `package.json` that auto-runs `prisma generate` after every install

## Test Delta
- Before: 266 files / 3244 tests / **1 failing**
- After: 268 files / 3260 tests / **0 failing**

## TypeCheck Delta
- Before: **146 errors** (+ 1 baseUrl deprecation blocking compilation)
- After: **0 errors**

---

## Top 5 Findings by Leverage

| # | Finding | Leverage | Status |
|---|---------|---------|--------|
| 1 | Stale Prisma client → 146 TS errors + test failure | 48 | **FIXED** |
| 2 | DEV_FAKE_ADMIN prod bypass (no NODE_ENV guard) | 30 | **FIXED** |
| 3 | Timing attack in cron Bearer token (3 routes) | 27 | **FIXED** |
| 4 | Next.js 14 → 13 HIGH CVEs, needs 15+ upgrade | 60 | **OPEN** |
| 5 | Admin email in cockpit API responses | 12 | OPEN (low blast, admin-only) |

---

## Blocked Questions (≤30s each, yes/no)

1. **Next.js upgrade**: Is it safe to start a Next.js 14→15 upgrade branch? The upgrade introduces RSC/Middleware API changes. (~3h work, needs regression testing)
2. **Admin email exposure**: Should admin audit trail fields (`decidedBy`, `reviewer`, `generatedBy`) use opaque user IDs instead of raw emails in cockpit routes?

---

## First 30-min Plan for Next Session

1. Run `npm run typecheck && npm run test` to confirm clean baseline still holds
2. Open a scoped investigation into Next.js 15 upgrade — identify specific API breakages in this codebase
3. If upgrade is tractable (<20 breaking changes), branch and attempt it

---

## Calibration/Safety Invariants — ALL INTACT

- `PUBLIC_PICKS_ENABLED` gate: not touched ✓
- `PUBLIC_BLOG_ENABLED` gate: not touched ✓  
- `PERFORMANCE_STATS_ENABLED` gate: not touched ✓
- `CANONICAL_HISTORY_ENABLED` gate: not touched ✓
- No `.env*` files touched ✓
- No `db:push`, `db:seed`, `db:migrate` run ✓
- Never pushed to `main` ✓
