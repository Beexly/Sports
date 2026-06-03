# APEX Overnight Operator — STATE.md

## Run 1 — 2026-06-03

| Field | Value |
|---|---|
| Mode | WRITE |
| Branch | claude/magical-volta-IZmcH |
| Start | 07:05 UTC |
| Status | completed |
| TypeScript errors at start | 0 (after `prisma generate`) |
| TypeScript errors at end | 0 |
| Lint errors at start | FAIL (workers missing lint scripts) |
| Lint errors at end | 0 |
| Tests at start | 1899/1899 (169 files) |
| Tests at end | 1903/1903 (170 files) |

## Bootstrap findings

- Branch `claude/magical-volta-IZmcH` exists and is clean
- Prisma client was stale in fresh container (schema has CockpitTask, Promotion, Journal models added since last generate)
- Running `prisma generate` cleared all TS errors
- `npm run lint` was failing: workers (content-publishing, data-refresh, pick-generation) had no `lint` script and npm 10 auto-propagates workspace run commands

## Actions taken

### REPAIR
1. Ran `prisma generate` — clears all TS errors (not committed; this is a runtime fix)
2. Added `lint` scripts to all three worker packages (maps to `tsc --noEmit`)
3. Fixed root `npm run lint` — now propagates cleanly to all workspaces

### IMPROVE
1. Added `prepare: "prisma generate"` to `packages/db/package.json` — auto-runs on `npm install` / `npm ci`, ensuring fresh containers never have stale types
2. Added `ignoreDeprecations: "5.0"` to `workers/content-publishing/tsconfig.json` and `workers/data-refresh/tsconfig.json` — suppresses TS 5.x era deprecation of `moduleResolution: node`

### GROW
1. Added `apps/web/__tests__/prisma-schema-contract.test.ts` — runtime canary that verifies recently-added Prisma enums (CockpitTask, Promotion, ModelJournalEntry, OddsMarket) are exported at runtime. Fails immediately with a clear error message if `prisma generate` hasn't been run after a schema change.

## Calibration gates verified
- PUBLIC_PICKS_ENABLED: not modified
- PUBLIC_BLOG_ENABLED: not modified
- PERFORMANCE_STATS_ENABLED: not modified
- CANONICAL_HISTORY_ENABLED: not modified

## Security scan
- No hardcoded secrets found
- Admin routes all gate on `session.user.role === "ADMIN"`
- Cron routes protected by `CRON_SECRET`
- Dev state route returns 404 in production
- No .env files committed

## Next run priorities
1. Add `lint` scripts to packages (data-ingestion, db, prediction-engine, etc.) for symmetry with workers
2. Upgrade vitest 2.x → 4.x (CRITICAL CVE) — requires manual testing to avoid breaking 1903 tests
3. Add `ignoreDeprecations: "5.0"` to all package tsconfigs (currently only in workers)
4. Consider adding tests for `ingestion-pipeline` package (currently 0 tests)
