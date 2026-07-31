# Maximum leverage — GSE universe (no soft deferrals)

Single founder surface. **Code is ready.** Operator clicks recover money and activate free path.

## Money recovery (do first)

| # | Action | Proof |
|---|--------|-------|
| 1 | **Delete** Production `THE_ODDS_API_KEY` (absent, not deactivated) | `settle-picks` → `"path":"free"` |
| 2 | Stripe www webhook includes **`checkout.session.expired`** + matching `STRIPE_WEBHOOK_SECRET` | Recent Deliveries 2xx |
| 3 | On checkout 409 → `reconcile-entitlements` cron | Entitlement appears |
| 4 | Credits claims (Neon/Vercel/AI) — see CREDITS.md | Env wired after claim |

```bash
# Local law + cron matrix (no secrets)
npm run orbit:unlock-smoke

# Production (you supply CRON_SECRET — never invent)
ORBIT_SMOKE_BASE=https://www.galaxysportsedge.com CRON_SECRET=… npm run orbit:unlock-smoke -- --prod
```

## Always-on free capacity (scheduled)

| Cron | Schedule | Why |
|------|----------|-----|
| settle-picks | every 3h | Free path when key blank |
| free-spine-health | 10:00 UTC | Free ingest probes |
| health-alert | every 15m | Pages when degraded (needs WEBHOOK optional) |
| refresh-player-stats | :00,:30 | nflverse free stats |
| reconcile-entitlements | 08:00 | Stripe recovery |
| repair-checkout-attempts | 08:30 | CheckoutAttempt hygiene |

## Distribution (zero auth)

| Surface | URL |
|---------|-----|
| Edge Index badge | `/embed/edge-index/[gameId]` |
| How to embed | `/edge-index` |

## R&D labels (after volume)

```bash
npm run export:settled-picks   # needs DATABASE_URL
npm run calibration:offline    # CIR vs PAVA + paradox + CLV gate
npm run dspy:gse               # skill metric GEPA-ready
npm run orbit:integrity:full   # full extract seal
```

## Explicit non-actions (HARD NON-GOAL)

- No Polymarket feature work · no LIVE_BOARD without founder YES  
- No full Kelly · no CIR live without `CALIBRATION_ADJUSTMENTS_ENABLED`  
- No webhook/outbox rewrite · no gamma without counsel · no GPU foundation train  

## Merge stack (orbit)

`#281` CIR → `#282` holdout → `#283` Session2 → `#284` embed → **this wave** crons+path-select+unlock-smoke
