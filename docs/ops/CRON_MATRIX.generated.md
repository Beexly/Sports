# CRON matrix (generated from vercel.json)

Generated: 2026-08-08T02:22:44.821Z

| Path | Schedule |
|------|----------|
| `/api/cron/refresh-odds` | `*/30 * * * *` |
| `/api/cron/settle-picks` | `20 * * * *` |
| `/api/cron/deliver-settlement-alerts` | `15 */3 * * *` |
| `/api/cron/generate-drafts` | `0 11 * * *` |
| `/api/cron/reconcile-entitlements` | `0 8 * * *` |
| `/api/cron/ingest-player-stats` | `0 9 * * *` |
| `/api/cron/hydrate-cold-plane` | `30 9 * * *` |
| `/api/cron/drain-ai-telemetry-recovery` | `30 * * * *` |
| `/api/cron/prune-rate-limits` | `30 6 * * *` |
| `/api/cron/repair-checkout-attempts` | `30 8 * * *` |
| `/api/cron/run-formal-receipt` | `45 9 * * *` |
| `/api/cron/jarvis-snapshot` | `15 * * * *` |
| `/api/cron/free-spine-health` | `10,40 * * * *` |
| `/api/cron/health-alert` | `*/15 * * * *` |
| `/api/cron/autonomy-cycle` | `7,22,37,52 * * * *` |
| `/api/cron/refresh-player-stats` | `0,30 * * * *` |
| `/api/cron/calibration-metrics` | `40 */6 * * *` |
| `/api/cron/generate-drafts` | `0 23 * * *` |

**Count:** 18 scheduled routes in vercel.json.

Do not hand-edit this file. Run: `node scripts/ops/cron-matrix-from-vercel.mjs`

Hobby plan may under-fire high-cadence paths — **GitHub External Cron**
(`external-cron.yml`) is the primary sub-daily heartbeat for free-spine / settle / autonomy.
Vercel schedules are the daily/backstop layer.

## Free-spine SLA contract

- Path: `/api/cron/free-spine-health`
- Vercel: `10,40 * * * *`
- GH Actions: `5 */2 * * *` (every 2h)
- Durable free-spine SLA: **120 minutes** (I8)
