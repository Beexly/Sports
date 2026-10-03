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
| `/api/cron/free-spine-health` | After multi-sport free score probe (every 2h) |
| `/api/cron/refresh-player-stats` | After nflverse weekly-stats primary ingest ok (every 30m) |
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


## Free-spine heartbeat (operator)

Production free-spine is the multi-sport free score probe. Auth is `CRON_SECRET`
(Bearer). **Do not invent secrets** — paste Production value only in a private shell.

```bash
# Negative (must 401 when CRON_SECRET is configured)
curl -sS -o /tmp/fs-noauth.json -w "%{http_code}\n" \
  "https://www.galaxysportsedge.com/api/cron/free-spine-health"
# expect: 401 + {"error":"Unauthorized"}

# Positive (founder-only — secret never committed)
export CRON_SECRET='…Production CRON_SECRET…'
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/cron/free-spine-health" | python3 -m json.tool | head -80
# expect: ok:true, path:"free-spine-health", ingestionRun.status:"SUCCESS"
# optional: nflverseCurrency.ok true for stats season floor

# Health should leave pure-ingestion degraded within SLA (240m)
curl -sS "https://www.galaxysportsedge.com/api/health" | python3 -m json.tool | head -40
```

### Why SUCCESS can go stale with secret configured

| Cause | Symptom | Fix |
|-------|---------|-----|
| CRON_SECRET mismatch (Vercel env ≠ what you curl) | Cron 401 in Vercel logs; manual curl with old secret 401 | Rotate / set Production `CRON_SECRET`, redeploy, re-smoke |
| `THE_ODDS_API_KEY` present but deactivated | settle-picks takes paid path (fails closed), free-score SUCCESS never written | Delete Production Odds key → free path; free-spine still independent |
| free-spine timeout / all sports hard-fail | `ingestionRun.status:"FAILED"` or no row | Inspect free-spine JSON `live[].errors`; Sentry if DSN set |
| Only free-spine stamped SUCCESS historically | 2h cadence; one miss → warn, two misses → stale | refresh-player-stats now also stamps SUCCESS on nflverse primary ok |

Automated dual-check (never prints secret):

```bash
CRON_SECRET=… BASE_URL=https://www.galaxysportsedge.com \
  node scripts/ops/verify-cron-secret.mjs
```
