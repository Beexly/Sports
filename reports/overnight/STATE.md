# APEX Overnight Run — STATE

| Field | Value |
|---|---|
| Run | 1 |
| Mode | WRITE (via MCP GitHub push) |
| Branch | claude/magical-volta-bIyZe |
| Start | 2026-05-28T07:01:00Z |
| End | 2026-05-28T07:15:00Z |
| Status | completed |

## Streams

| Stream | Status | Result |
|---|---|---|
| security-sweep | COMPLETED | No raw secrets. All admin/cockpit routes gated. Cron routes use CRON_SECRET. |
| test-repair | COMPLETED | Fixed `correlation-load-settled-picks.test.ts` — `Prisma.validator` runtime crash |
| grow-guardrail | COMPLETED | Added `prisma-compat-check.mjs` guardrail + test |

## Gate Invariants

- `PUBLIC_PICKS_ENABLED` — default `false` ✅
- `PUBLIC_BLOG_ENABLED` — default `false` ✅  
- `PERFORMANCE_STATS_ENABLED` — default `false` ✅
- `CANONICAL_HISTORY_ENABLED` — default `false` ✅

All calibration gates intact.
