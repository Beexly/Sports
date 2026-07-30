# CRON_MATRIX — route × auth × vercel.json × Actions

**MAIN:** `3dfbc726` · APEX dual-scheduler audit 2026-07-30  
**Auth SoT:** `apps/web/lib/cron/authorize.ts` → `cronAuthError`  
**Runtime:** all routes `dynamic=force-dynamic` · `runtime=nodejs`

| Expected | Condition |
|----------|-----------|
| **500** | Neither `CRON_SECRET` nor `CRON_SECRET_PREVIOUS` set |
| **401** | Missing/wrong Bearer |
| **200** | Bearer matches primary or previous (handler may still refuse business logic) |

## Dual-scheduler law (APEX §I.2.7)

Every cadence touch must keep **GitHub Actions ∧ vercel.json** honest relative to each other and to this matrix. Drift is a P1 ops bug.

| Scheduler | Role today (2026-07-30) |
|-----------|-------------------------|
| **vercel.json crons** | Authoritative production schedules on sports-web |
| **`.github/workflows/external-cron.yml`** | Economy backstop: hourly settle only; refresh-odds 30m **removed** while no paid Odds key (private-repo Actions minutes); still `workflow_dispatch` for refresh-odds / settle / jarvis |

## vercel.json scheduled routes

| Route | Auth | vercel.json | Schedule | Notes |
|-------|------|-------------|----------|-------|
| `/api/cron/refresh-odds` | cronAuthError | scheduled | `*/30 * * * *` | Free mode returns 200 skip if no Odds key — no invented rows |
| `/api/cron/settle-picks` | cronAuthError | scheduled | `0 7 * * *` | Free path if no Odds key |
| `/api/cron/deliver-settlement-alerts` | cronAuthError | scheduled | `30 7 * * *` | |
| `/api/cron/generate-drafts` | cronAuthError | scheduled | `0 11 * * *` | |
| `/api/cron/reconcile-entitlements` | cronAuthError | scheduled | `0 8 * * *` | |
| `/api/cron/ingest-player-stats` | cronAuthError | scheduled | `0 9 * * *` | |
| `/api/cron/hydrate-cold-plane` | cronAuthError | scheduled | `30 9 * * *` | No Odds API |
| `/api/cron/drain-ai-telemetry-recovery` | cronAuthError | scheduled | `30 * * * *` | |
| `/api/cron/prune-rate-limits` | cronAuthError | scheduled | `30 6 * * *` | |
| `/api/cron/repair-checkout-attempts` | cronAuthError | scheduled | `30 8 * * *` | |
| `/api/cron/run-formal-receipt` | cronAuthError | scheduled | `45 9 * * *` | |
| `/api/cron/jarvis-snapshot` | cronAuthError | scheduled | `15 * * * *` | Fills Jarvis ring buffer |
| `/api/cron/free-spine-health` | cronAuthError | scheduled | `0 10 * * *` | Multi-source free spine probe |

## Paused / manual (route code may remain; schedule must not claim live)

| Route | Auth | Schedule status | Why |
|-------|------|-----------------|-----|
| `/api/cron/gamma` | cronAuthError | **PAUSED (B-0)** — removed from vercel.json @ `3dfbc726` | Polymarket Gamma **not** in `source-rights-registry.ts`. Clearance law: unregistered source cannot be cron-scheduled. Restore only after counsel-approved registry entry + dual-scheduler re-add. Exact restore string in commit message of `3dfbc726`. |
| `/api/cron/backfill-historical-games` | cronAuthError | manual-only | |
| `/api/cron/backfill-player-data` | cronAuthError | manual-only | |
| `/api/cron/backfill-team-efficiency` | cronAuthError | manual-only | |
| `/api/cron/backtest-calibration` | cronAuthError | manual-only | |
| `/api/cron/refresh-player-stats` | cronAuthError | manual-only | |

**Counts:** 19 route dirs · **13** vercel scheduled · **1** paused (gamma B-0) · free settle path · **0** unauth · **0** edge runtime

**Actions external-cron:** schedule `15 * * * *` → settle-picks only. refresh-odds job remains in file but only fires on `workflow_dispatch` or if schedule string is restored to `*/30`.

Smoke: `scripts/ops/gamma-cron-smoke.sh` still valid for auth shape when gamma is re-enabled; do not treat smoke green as rights clearance.

## Dual-scheduler verdict (this audit)

| Claim | Evidence | Verdict |
|-------|----------|---------|
| vercel.json matches live intent | gamma removed; free-spine + jarvis present | **PASS** |
| Actions not burning minutes on free-mode no-op odds | external-cron comment + no `*/30` schedule | **PASS** |
| Matrix no longer claims gamma scheduled | this file | **PASS** (was FAIL pre-audit) |
| gamma re-enable requires registry + dual touch | B-0 commit + this matrix | **DOCUMENTED** |
