# CRON_MATRIX — pointer (GENERATED_SOT_ONLY)

**Do not hand-edit schedules in this file.**

| SoT | Path |
|-----|------|
| Vercel schedules | `vercel.json` → `crons` |
| Generated table | [`CRON_MATRIX.generated.md`](./CRON_MATRIX.generated.md) |
| Sub-daily heartbeat | `.github/workflows/external-cron.yml` |

```bash
node scripts/ops/cron-matrix-from-vercel.mjs          # regenerate
node scripts/ops/cron-matrix-from-vercel.mjs --check  # CI / preflight
```

## Auth contract (stable)

| Expected | Condition |
|----------|-----------|
| **500** | Neither `CRON_SECRET` nor `CRON_SECRET_PREVIOUS` set |
| **401** | Missing/wrong Bearer |
| **200** | Bearer matches primary or previous (handler may still refuse business logic) |

Auth SoT: `apps/web/lib/cron/authorize.ts` → `cronAuthError`  
Runtime: all routes `dynamic=force-dynamic` · `runtime=nodejs`

## Cadence truth (2026-08-08)

| Job | Primary (Vercel) | Backstop (GH External Cron) |
|-----|------------------|-----------------------------|
| free-spine-health | `10,40 * * * *` (every 30m) | `5 */2 * * *` (every 2h) |
| settle-picks | `20 * * * *` | hourly `:15` |
| autonomy-cycle | `7,22,37,52 * * * *` (~15m) | hourly `:22` |
| calibration-metrics | `40 */6 * * *` | manual / autonomy re-fire when EXECUTE |
| refresh-odds | `*/30 * * * *` | — |
| health-alert | `*/15 * * * *` | — |

**I8:** free-spine durable SLA = **120 minutes**. Vercel 30m + GH 2h keep age under SLA.

## Reliability metrics path

| Cron | Writes | Used by |
|------|--------|---------|
| `calibration-metrics` | versioned cal maps + Brier/ECE/reliability bins | cockpit `/cockpit/calibration`, path-to-verified (via facts) |
| `settle-picks` | graded WIN/LOSS rows (sample fuel) | calibration load query |
| `free-spine-health` | durable free-spine snap age | I8 / launch gates |
| `health-alert` | probe classification | autonomy observation |

## Manual-only routes

Routes under `app/api/cron/*` **not** in `vercel.json` are manual / workflow_dispatch only (e.g. backfill, backtest-calibration). Do not re-add without ops decision.

Smoke: `scripts/ops/gamma-cron-smoke.sh` (401 then 200) where applicable.

> **gamma** is intentionally unscheduled (rights registry). Do not re-enable without counsel-approved clearance.
