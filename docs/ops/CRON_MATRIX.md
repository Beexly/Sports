# CRON_MATRIX — route × auth × vercel.json

**MAIN:** `1e007c3` · Pass 4 canonical  
**Auth SoT:** `apps/web/lib/cron/authorize.ts` → `cronAuthError`  
**Runtime:** all routes `dynamic=force-dynamic` · `runtime=nodejs`

| Expected | Condition |
|----------|-----------|
| **500** | Neither `CRON_SECRET` nor `CRON_SECRET_PREVIOUS` set |
| **401** | Missing/wrong Bearer |
| **200** | Bearer matches primary or previous (handler may still refuse business logic) |

| Route | Auth | vercel.json | Schedule | Expected 401 | Expected 200 (auth OK) |
|-------|------|-------------|----------|--------------|------------------------|
| `/api/cron/backfill-historical-games` | cronAuthError | manual-only | — | bad/missing Bearer | authorized GET |
| `/api/cron/backfill-player-data` | cronAuthError | manual-only | — | bad/missing Bearer | authorized GET |
| `/api/cron/backfill-team-efficiency` | cronAuthError | manual-only | — | bad/missing Bearer | authorized GET |
| `/api/cron/backtest-calibration` | cronAuthError | manual-only | — | bad/missing Bearer | authorized GET |
| `/api/cron/deliver-settlement-alerts` | cronAuthError | scheduled | `30 7 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/drain-ai-telemetry-recovery` | cronAuthError | scheduled | `30 * * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/gamma` | cronAuthError | **PAUSED (B-0)** | _unscheduled_ | bad/missing Bearer | authorized GET/POST · oddsApiRequired=false |
| `/api/cron/generate-drafts` | cronAuthError | scheduled | `0 11 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/hydrate-cold-plane` | cronAuthError | scheduled | `30 9 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/ingest-player-stats` | cronAuthError | scheduled | `0 9 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/jarvis-snapshot` | cronAuthError | scheduled | `15 * * * *` | bad/missing Bearer | authorized GET · fills Jarvis ring buffer |
| `/api/cron/prune-rate-limits` | cronAuthError | scheduled | `30 6 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/reconcile-entitlements` | cronAuthError | scheduled | `0 8 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/refresh-odds` | cronAuthError | scheduled | `*/30 * * * *` | bad/missing Bearer | authorized GET · Odds optional |
| `/api/cron/refresh-player-stats` | cronAuthError | manual-only | — | bad/missing Bearer | authorized GET |
| `/api/cron/repair-checkout-attempts` | cronAuthError | scheduled | `30 8 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/run-formal-receipt` | cronAuthError | scheduled | `45 9 * * *` | bad/missing Bearer | authorized GET |
| `/api/cron/settle-picks` | cronAuthError | scheduled | `0 7 * * *` | bad/missing Bearer | authorized GET · free path if no Odds key · paid if key set |

**Counts:** 18 routes · 13 scheduled (incl. jarvis-snapshot) · free settle path · **0 unauth** · **0 edge runtime**

Smoke: `scripts/ops/gamma-cron-smoke.sh` (401 then 200).

> **gamma is intentionally unscheduled.** Removed from `vercel.json` in `3dfbc726` (B-0): the Polymarket Gamma API is not present in `source-rights-registry.ts`, and clearance-engine law requires `checkClearance()` to pass before any extraction job. Route code is left intact on purpose. Re-enable requires a counsel-approved registry entry permitting storage + commercial_display (or the narrower intents actually used) ÔÇö not just re-adding the cron. Restore string is recorded verbatim in the `3dfbc726` commit body.

| /api/cron/free-spine-health | 0 10 * * * | CRON_SECRET | 401/200 | Multi-source free spine probe |
