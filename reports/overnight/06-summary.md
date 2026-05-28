# Overnight Run 1 — Morning Summary (2026-05-28)

## Run Status: COMPLETED ✅

**Branch**: `claude/magical-volta-bIyZe`  
**Duration**: ~14 min  
**Tests**: 1801 → 1807 passing | 1 failing → 0 failing

---

## Top 5 Findings (by leverage)

| # | Title | Class | Blast | Leverage | Action Taken |
|---|---|---|---|---|---|
| 1 | No raw secrets in source tree | OBSERVED | LOW | 135 | Confirmed clean |
| 2 | All admin/cockpit routes gated | OBSERVED | LOW | 81 | Confirmed clean |
| 3 | `prisma-compat-check.mjs` guardrail added | OBSERVED | LOW | 81 | **Implemented** |
| 4 | `Prisma.validator` crash repaired | OBSERVED | HIGH | 72 | **Fixed** |
| 5 | Prisma v4→v5 migration gap synthesis | INFERENCE | MEDIUM | 72 | Documented |

---

## What Changed

### Repair (✅ Complete)
**`apps/web/lib/correlation/load-settled-picks.ts`**  
`Prisma.validator<Prisma.PickSelect>()({...})` was called at module-load time.  
`Prisma.validator` was **removed in Prisma v5** — `Prisma.validator` is `undefined`, so calling it throws `TypeError: Prisma.validator is not a function`.  
**Fix**: Import `Prisma` as a type only (`import type { Prisma }`), replace the call with `as const` object literal.  
**Result**: `correlation-load-settled-picks.test.ts` — 4 tests restored from failure to pass.

### Grow (✅ Complete)
**`scripts/guardrails/prisma-compat-check.mjs`** (new)  
AST-free grep scanner that fails CI on any `Prisma.validator<` or `Prisma.raw\`` usage.  
Wired into `npm run guardrails` chain and `npm run guard:prisma-compat`.  
**Test**: New case in `apps/web/__tests__/guardrails.test.ts` — runs the script as a subprocess and asserts exit 0.

### Improve (✅ Complete)
**`package.json`**: Added `guard:prisma-compat` shortcut + wired into `guardrails` chain.

---

## Open Risk Items

1. **npm audit: Next.js 14.2.35 in advisory range** (SUSPECTED)  
   Advisory ranges for Next.js CVEs include `9.3.4-canary.0 - 16.3.0-canary.5`. Range may over-report since 14.2.35 is a recent patch release. Manual CVE verification needed before upgrading.

2. **`settle-picks` cron is a no-op stub** (INFERENCE)  
   The actual settlement loop runs in the long-running worker. The Vercel cron is documented as a placeholder. Porting settlement to cron context is a future focused pass.

3. **Prisma v4→v5 migration audit incomplete** (INFERENCE)  
   `Prisma.validator` was one deprecated API. Others (`Prisma.raw`, `new Prisma.Decimal`, `findFirst` null-assertion changes) may exist — check the commit that bumped Prisma to v5.

---

## Blocked Questions (≤5, yes/no)

1. Does Next.js 14.2.35 actually patch GHSA-9g9p-9gw9-jx7f (DoS via Image Optimizer), or is the npm audit correct that 14.2.35 is still vulnerable? (Yes/No + changelog link)

---

## Next 30-Minute Plan

1. Check git log for Prisma v5 upgrade commit; audit all changed files for other deprecated API patterns  
2. Run `npm audit --json` and cross-reference each Next.js CVE ID against 14.2.35 release notes  
3. Investigate the `settle-picks` cron port — read the worker's settlement loop and write a scoped implementation plan

---

## Calibration Check ✅

- `PUBLIC_PICKS_ENABLED`: false (unchanged)  
- `PUBLIC_BLOG_ENABLED`: false (unchanged)  
- `PERFORMANCE_STATS_ENABLED`: false (unchanged)  
- `CANONICAL_HISTORY_ENABLED`: false (unchanged)  
- No gate invariants touched.
