# CRON_MATRIX — route × auth × vercel.json

**Pass 3** · MAIN lineage post-harden · Law: dual-secret · refuse-default · oddsApiRequired=false on free path

Auth SoT: `apps/web/lib/cron/authorize.ts` → `cronAuthError`
- unset `CRON_SECRET` (+ no previous) → **500** `{ error: "CRON_SECRET not configured" }`
- bad/missing Bearer → **401** `{ error: "Unauthorized" }`
- primary or `CRON_SECRET_PREVIOUS` match → proceed

All routes: `dynamic = "force-dynamic"` · `runtime = "nodejs"` (timingSafeEqual + secrets)

| Route | Methods | cronAuthError | force-dynamic | nodejs | vercel.json | Schedule |
|-------|---------|---------------|---------------|--------|-------------|----------|
| `/api/cron/backfill-historical-games` | GET | YES | YES | YES | manual-only | — |
| `/api/cron/backfill-player-data` | GET | YES | YES | YES | manual-only | — |
| `/api/cron/backfill-team-efficiency` | GET | YES | YES | YES | manual-only | — |
| `/api/cron/backtest-calibration` | GET | YES | YES | YES | manual-only | — |
| `/api/cron/deliver-settlement-alerts` | GET | YES | YES | YES | scheduled | 30 7 * * * |
| `/api/cron/drain-ai-telemetry-recovery` | GET | YES | YES | YES | scheduled | 30 * * * * |
| `/api/cron/gamma` | GET,POST | YES | YES | YES | scheduled | */30 * * * * |
| `/api/cron/generate-drafts` | GET | YES | YES | YES | scheduled | 0 11 * * * |
| `/api/cron/hydrate-cold-plane` | GET | YES | YES | YES | scheduled | 30 9 * * * |
| `/api/cron/ingest-player-stats` | GET | YES | YES | YES | scheduled | 0 9 * * * |
| `/api/cron/jarvis-snapshot` | GET | YES | YES | YES | manual-only | — |
| `/api/cron/prune-rate-limits` | GET | YES | YES | YES | scheduled | 30 6 * * * |
| `/api/cron/reconcile-entitlements` | GET | YES | YES | YES | scheduled | 0 8 * * * |
| `/api/cron/refresh-odds` | GET | YES | YES | YES | scheduled | */30 * * * * |
| `/api/cron/refresh-player-stats` | GET | YES | YES | YES | manual-only | — |
| `/api/cron/repair-checkout-attempts` | GET | YES | YES | YES | scheduled | 30 8 * * * |
| `/api/cron/run-formal-receipt` | GET | YES | YES | YES | scheduled | 45 9 * * * |
| `/api/cron/settle-picks` | GET | YES | YES | YES | scheduled | 0 7 * * * |

## Manual-only (intentional — not on Vercel schedule)

- `/api/cron/backfill-historical-games`
- `/api/cron/backfill-player-data`
- `/api/cron/backfill-team-efficiency`
- `/api/cron/backtest-calibration`
- `/api/cron/jarvis-snapshot`
- `/api/cron/refresh-player-stats`

## Smokes

- `scripts/ops/gamma-cron-smoke.sh` — 401 then 200 against HOST
- `scripts/ops/credentials-smoke.mjs` — env presence (no secret echo)

## Free-path note

- `/api/cron/gamma` — `oddsApiRequired: false` (Polymarket Gamma)
- `/api/cron/refresh-odds` — optional Odds API enrichment only
