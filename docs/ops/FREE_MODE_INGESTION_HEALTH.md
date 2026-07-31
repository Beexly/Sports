# Free-mode ingestion health

**Updated:** 2026-07-31  
**Related:** Launch Readiness Audit (ingestion dead since 2026-07-25T23:00:24Z)

## Problem

`/api/health` defines ingestion health as a recent `IngestionRun` with `status = SUCCESS`.

When `THE_ODDS_API_KEY` was intentionally deactivated (~2026-07-25):

- `/api/cron/refresh-odds` returned `200 { skipped: "no-odds-key" }` and wrote **zero** `IngestionRun` rows.
- `free-spine-health` only wrote a process-local cache.
- Free score persist / free settlement updated `Game` rows but never created SUCCESS runs.

Result: `lastSuccess` frozen at 2026-07-25 → `status: degraded` for 5+ days even though free settlement was the intentional path.

## Fix

Free path now records durable `IngestionRun` rows:

| Writer | When |
|--------|------|
| `recordFreeIngestionRun()` (`apps/web/lib/data-sources/free-ingestion-run.ts`) | Shared helper |
| `/api/cron/free-spine-health` | After multi-sport free score probe |
| `persistFreeScores()` | After free score stamp cycle (also used by settle-picks free path) |

`oddsInserted` may be `0`. The health probe does not require odds rows — only a recent SUCCESS `completedAt`.

## What this does **not** do

- Does not re-enable or require a paid Odds key.
- Does not invent games or scores.
- Does not flip `LIVE_BOARD`, `PUBLISH_LEDGER`, `PUBLIC_PICKS_ENABLED`, or `PERFORMANCE_STATS_ENABLED`.
- Does not change the public `/api/health` response shape.

## Verify after deploy

1. Trigger free-spine-health (or wait for the daily cron):
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://www.galaxysportsedge.com/api/cron/free-spine-health
   ```
2. Confirm response includes `ingestionRun: { id, status: "SUCCESS", completedAt }`.
3. Hit `/api/health` — ingestion `lastSuccessAt` should be within the freshness SLA and overall status should leave pure ingestion-driven degraded (settlement may still need a free settle backfill pass).
4. Trigger settle-picks for commenced-pick backlog:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://www.galaxysportsedge.com/api/cron/settle-picks
   ```
