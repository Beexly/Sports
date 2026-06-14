# Overnight Run — 2026-06-14

**Mode:** WRITE (git proxy available, GITHUB_TOKEN absent)  
**Branch:** claude/magical-volta-4kilty  
**Commits pushed:** 2 (368f786, ec4b9e4)

## Streams Executed

### SECURITY-SWEEP (mandatory primary)
- Full scan: no hardcoded secrets, no plaintext keys, zero HIGH findings
- All 4 calibration gates default to `false` ✓
- Deploy-readiness script already checks DEV_FAKE_ADMIN at deploy time ✓
- FINDING: auth.ts and middleware.ts lacked runtime production guard

### PRICING-AUDIT (secondary)
- Cockpit routes: all admin-gated, no bypasses
- 5 hardcoded price strings found in picks/page.tsx (2) and faq/page.tsx (3)
- All prices now read from `getCurrentPricingPhase()` — drift eliminated

### KILL-SWITCH-COVERAGE (safety stream)
- content-publishing worker: INTERNAL_CALIBRATION_ONLY read at module load → not testable with stubEnv
- Refactored to per-call read → fully testable
- 5 regression tests added covering: default REFUSED, explicit REFUSED, gate-off QUEUED, empty array, id preservation

## Changes Shipped

| File | Change | Category |
|---|---|---|
| apps/web/lib/auth.ts | Runtime throw if DEV_FAKE_ADMIN=true in production | REPAIR |
| apps/web/middleware.ts | NODE_ENV !== 'production' guard on bypass path | REPAIR |
| apps/web/app/picks/page.tsx | Dynamic pricing from getCurrentPricingPhase() | IMPROVE |
| apps/web/app/faq/page.tsx | Dynamic pricing group, async component, live JSON-LD | IMPROVE |
| workers/content-publishing/src/index.ts | Per-call env read for testability | IMPROVE |
| apps/web/__tests__/content-publisher-kill-switch.test.ts | 5 kill-switch regression tests | IMPROVE |
| apps/web/__tests__/pricing-drift-guard.test.ts | CI drift detector across app/+components/ | GROW |

## Invariants Verified
- PUBLIC_PICKS_ENABLED: default false ✓
- PUBLIC_BLOG_ENABLED: default false ✓  
- PERFORMANCE_STATS_ENABLED: default false ✓
- CANONICAL_HISTORY_ENABLED: default false ✓
- No secrets in code ✓
- TypeScript: zero errors ✓

## Blocked Questions
None. All streams completed.

## Next Run Priorities
1. Add auth.ts `(user as any).role` type fix — extend NextAuth User type
2. Add worker integration test skeletons for data-refresh orchestration
3. Review pricing-drift-guard test against installed node_modules when available
