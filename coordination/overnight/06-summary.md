# Morning Synthesis — Run 1 (2026-06-01)

## What Happened

The repo arrived in a non-functional state: no `node_modules`, Prisma client not generated. This blocked all tests (vitest not found) and produced 160 TypeScript errors. That was repaired first.

With the environment functional, security sweep found a critical gap: the `DEV_FAKE_ADMIN` admin bypass flag had **no runtime production guard** despite `.env.example` documenting "bypass is ignored when NODE_ENV=production." The code didn't actually enforce that promise in any of the three codepaths.

## Top 5 Findings (by leverage)

| # | Finding | Leverage | Class | Status |
|---|---------|----------|-------|--------|
| 1 | No node_modules — entire test suite blocked | 45 | OBSERVED | **FIXED** |
| 2 | Prisma client not generated — 160 TS errors + test failure | 45 | OBSERVED | **FIXED** |
| 3 | DEV_FAKE_ADMIN bypass missing NODE_ENV production guard (3 codepaths) | 45 | OBSERVED | **FIXED** |
| 4 | CRON_SECRET undocumented in .env.example; unmonitored by Jarvis | 18 | OBSERVED | **FIXED** |
| 5 | images.domains deprecated → should be remotePatterns | 12 | OBSERVED | **FIXED** |

## Highest Risk Open Items

1. **Next.js HIGH advisory** (DoS via Image Optimizer) — `next: 9.3.4-canary.0 - 16.3.0-canary.5` range affected. Current version `^14.2.15`. Requires `npm audit fix --force` (breaking change potential). Needs manual assessment.
2. **No Content-Security-Policy header** — `next.config.mjs` has X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy but no CSP. Medium blast risk; needs design decision on script/style nonces.
3. **13 npm audit vulnerabilities** (9 moderate, 4 high) — qs, ws, postcss, vite can be fixed with `npm audit fix` (no force). Next.js + glob + eslint-config-next require `--force`.

## Changes Made This Night

| File | Change |
|------|--------|
| `apps/web/lib/auth.ts` | Added `NODE_ENV !== 'production'` guard to DEV_FAKE_ADMIN check |
| `apps/web/middleware.ts` | Added `NODE_ENV !== 'production'` guard to DEV_FAKE_ADMIN bypass |
| `apps/web/lib/entitlements.ts` | Added `NODE_ENV !== 'production'` guard to DEV_FAKE_ADMIN shortcut |
| `apps/web/next.config.mjs` | Migrated `images.domains` → `images.remotePatterns` |
| `.env.example` | Added `CRON_SECRET` documentation |
| `apps/web/lib/cockpit/jarvis-data.ts` | Added `CRON_SECRET` to Jarvis monitoring `need[]` list |
| `apps/web/__tests__/next-config-policy.test.ts` | Updated image allow-list test for remotePatterns |
| `apps/web/__tests__/middleware-contract.test.ts` | Added production guard pinning test |
| `apps/web/__tests__/entitlements-dev-admin.test.ts` | Added production guard source-level test |

## PRs Opened
None. All changes are on `claude/magical-volta-ivova`.

## Blocked Questions
None. All items were self-contained and resolvable.

## First 30-Minute Plan for G (Next Operator)
1. Review diff on `claude/magical-volta-ivova` (9 files, all tests green)
2. `npm audit fix` — apply non-breaking fixes for qs/ws/postcss/vite
3. Assess Next.js upgrade: `npm outdated` + check if 14.2.x→14.3+ is safe
4. Prototype CSP header in next.config.mjs with `script-src 'self'` baseline

## Run JSON
```json
{
  "run": 1,
  "status": "completed",
  "streams_completed": ["bootstrap", "repair", "security-sweep", "grow", "synthesis"],
  "streams_blocked": [],
  "leverage_total": 177,
  "top_priorities_next_run": [
    "npm audit fix (non-breaking: qs, ws, postcss, vite)",
    "Next.js HIGH advisory assessment and upgrade",
    "CSP Content-Security-Policy header",
    "ADR for DEV_FAKE_ADMIN production guard pattern"
  ],
  "blocked_questions": [],
  "next_action": "improve"
}
```
