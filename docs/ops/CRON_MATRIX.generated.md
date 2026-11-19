# CRON matrix (generated from vercel.json)

Generated: 2026-11-19T04:32:34.584Z

Default SoT: `apps/web/vercel.json` (the file Vercel actually reads).
Compared against: `vercel.json`.

| Path | Schedule |
|------|----------|
| `/api/cron/refresh-odds` | `*/15 * * * *` |
| `/api/cron/board-fill` | `2,17,32,47 * * * *` |
| `/api/cron/settle-picks` | `20 * * * *` |
| `/api/cron/deliver-settlement-alerts` | `15 */3 * * *` |
| `/api/cron/generate-signal-slate` | `5,20,35,50 * * * *` |
| `/api/cron/reconcile-entitlements` | `45 * * * *` |
| `/api/cron/prune-rate-limits` | `30 6 * * *` |
| `/api/cron/repair-checkout-attempts` | `50 * * * *` |
| `/api/cron/free-spine-health` | `0 */2 * * *` |
| `/api/cron/health-alert` | `*/15 * * * *` |
| `/api/cron/autonomy-cycle` | `7,22,37,52 * * * *` |
| `/api/cron/calibration-metrics` | `40 */6 * * *` |
| `/api/cron/refresh-player-stats` | `0,30 * * * *` |
| `/api/ops/daily-truth` | `5 12 * * *` |
| `/api/cron/arbiter-adjudication` | `41 * * * *` |
| `/api/cron/site-wide-workflows` | `12 0,3,6,13,16,19,22 * * *` |

**Count:** 16 scheduled routes in apps/web/vercel.json.

**DRIFT:** none — both vercel.json copies agree.

Do not hand-edit this file. Run: `node scripts/ops/cron-matrix-from-vercel.mjs`

