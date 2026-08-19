# CRON matrix (generated from vercel.json)

Generated: 2026-08-18T23:31:32.217Z

Default SoT: `apps/web/vercel.json` (the file Vercel actually reads).
Compared against: `vercel.json`.

| Path | Schedule |
|------|----------|
| `/api/cron/refresh-odds` | `*/15 * * * *` |
| `/api/cron/board-fill` | `2,17,32,47 * * * *` |
| `/api/cron/settle-picks` | `20 * * * *` |
| `/api/cron/deliver-settlement-alerts` | `15 */3 * * *` |
| `/api/cron/generate-signal-slate` | `5,20,35,50 * * * *` |
| `/api/cron/generate-drafts` | `0 11 * * *` |
| `/api/cron/reconcile-entitlements` | `0 8 * * *` |
| `/api/cron/ingest-player-stats` | `0 9 * * *` |
| `/api/cron/hydrate-cold-plane` | `30 9 * * *` |
| `/api/cron/drain-ai-telemetry-recovery` | `30 * * * *` |
| `/api/cron/prune-rate-limits` | `30 6 * * *` |
| `/api/cron/repair-checkout-attempts` | `30 8 * * *` |
| `/api/cron/run-formal-receipt` | `45 9 * * *` |
| `/api/cron/jarvis-snapshot` | `15 * * * *` |
| `/api/cron/free-spine-health` | `0 */2 * * *` |
| `/api/cron/health-alert` | `*/15 * * * *` |
| `/api/cron/autonomy-cycle` | `7,22,37,52 * * * *` |
| `/api/cron/calibration-metrics` | `40 */6 * * *` |
| `/api/cron/backfill-independent-trueprob` | `10 */4 * * *` |
| `/api/cron/refresh-player-stats` | `0,30 * * * *` |

**Count:** 20 scheduled routes in apps/web/vercel.json.

**DRIFT:** none — both vercel.json copies agree.

Do not hand-edit this file. Run: `node scripts/ops/cron-matrix-from-vercel.mjs`

