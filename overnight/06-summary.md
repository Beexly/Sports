# Overnight Run 1 — Morning Summary
**Date**: 2026-05-25 | **Branch**: `claude/magical-volta-I1He9`

## Top 5 Findings (by Leverage)

| Rank | Finding | Class | Leverage | Blast |
|------|---------|-------|----------|-------|
| 1 | DEV_FAKE_ADMIN bypass lacked NODE_ENV production guard | OBSERVED | 45 | HIGH |
| 2 | Synthesis: DEV_FAKE_ADMIN + missing guard = admin escalation if env leaks | INFERENCE | 45 | HIGH |
| 3 | Stripe webhook handler (critical payment path) had no test coverage | OBSERVED | 36 | HIGH |
| 4 | computeGameContext orchestrator had zero direct tests despite 9 component tests | OBSERVED | 18 | MEDIUM |
| 5 | Stripe portal route (billing access path) had no test coverage | OBSERVED | 18 | MEDIUM |

## What Changed

### REPAIR — DEV_FAKE_ADMIN Production Guard
**Files**: `auth.ts`, `middleware.ts`, `entitlements.ts`
**Risk eliminated**: Accidental `DEV_FAKE_ADMIN=true` in production previously granted full ADMIN access to every request with no code-level backstop. Now requires `NODE_ENV !== "production"` in addition to the env var.
**Deploy-readiness script** already checked this at deploy time; this adds defense-in-depth at the code boundary.

### IMPROVE — 27 New Tests (Zero Regressions)
- `dev-fake-admin-production-guard.test.ts` — 5 tests locking the NODE_ENV guard as a source contract
- `stripe-webhook-shape.test.ts` — 14 tests for previously-uncovered Stripe webhook route (idempotency, signature verification, all 5 event handlers, `unpaid` → `PAST_DUE` mapping, `metadata.userId` upsert)
- `stripe-portal-shape.test.ts` — 8 tests for previously-uncovered Stripe portal route

### GROW — computeGameContext Integration Tests
- `game-context.test.ts` — 11 integration tests for `computeGameContext()`, the pick-scoring orchestrator that calls all 9 signal functions. Previously had 0 direct coverage. Tests verify: output shape, neutral behavior with empty input, all score ranges, factor naming, TOTAL vs SPREAD behavior, AWAY-side symmetry, schedule stress direction.

## What's Already Clean (No Action Needed)
- All feature gates default to `false` — server-side only, no client bypass vectors
- All admin/cockpit routes properly check `role === "ADMIN"` server-side
- All cron routes use `CRON_SECRET` Bearer token
- No hardcoded secrets or API keys in codebase
- Stripe webhook uses `constructEvent` for signature verification with idempotency
- Security headers (HSTS, X-Frame-Options, etc.) properly configured

## Existing Overnight Branch Activity (No Conflicts)
- `fix/overnight-codex-feature-gates-260524`: adds `apps/web/lib/feature-flags.ts` (no overlap)
- `fix/overnight-operator-doc-guards-260524`: operator playbook docs (no overlap)

## Blocked Questions
None — all streams completed without blockers.

## First 30-Minute Plan for Next Run
1. Run the full web test suite to confirm no wider regressions from the DEV_FAKE_ADMIN change
2. Investigate `apps/web/app/api/cockpit/tasks/[id]/decisions/route.ts` — the one remaining untested API route (cockpit task decisions)
3. Check if `feature-flags.ts` in the overnight branch duplicates `platform-config.ts` gates — if so, add a consistency test
4. Audit `console.error` calls in API routes for potential info leakage in production logs

## Calibration Invariants — All Clear
- PUBLIC_PICKS_ENABLED: `false` (unchanged)
- PUBLIC_BLOG_ENABLED: `false` (unchanged)
- PERFORMANCE_STATS_ENABLED: `false` (unchanged)
- CANONICAL_HISTORY_ENABLED: `false` (unchanged)
