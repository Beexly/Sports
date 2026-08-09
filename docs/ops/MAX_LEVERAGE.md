# Maximum leverage — GSE universe (no soft deferrals)

Single founder surface. **Code is ready.** Operator clicks recover money and activate free path.

**Full-session map (2026-08-09):** see [`SESSION_LEVERAGE_ATLAS_2026-08-09.md`](./SESSION_LEVERAGE_ATLAS_2026-08-09.md) — ranking + free spine + content + B2B + credits + Machina + research harvest. Do not hyperfixate.

## Money recovery (do first)

| # | Action | Proof |
|---|--------|-------|
| 1 | **Redeploy Production → main HEAD** (SHA lag blocks every ship) | ops truth `deployment.sha` matches main |
| 2 | **Delete** Production `THE_ODDS_API_KEY` if dead (absent, not deactivated) **or** keep signal board | `settle-picks` → `"path":"free"` when absent |
| 3 | Stripe www webhook includes **`checkout.session.expired`** + matching `STRIPE_WEBHOOK_SECRET` | Recent Deliveries 2xx |
| 4 | On checkout 409 → `reconcile-entitlements` cron | Entitlement appears |
| 5 | Credits claims (Neon/Vercel/AI/Azure) — see CREDITS.md | Env wired after claim |
| 6 | Waitlist open: `GSE_WAITLIST_GATE_ENABLED=false` if gated | `/waitlist` accepts leads |

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
| calibration-metrics | (scheduled) | Eligibility / Murphy RES |
| generate-drafts | (scheduled) | Signal slate under rankingP |

## Distribution (zero auth)

| Surface | URL |
|---------|-----|
| Edge Index badge | `/embed/edge-index/[gameId]` |
| How to embed | `/edge-index` |
| Public tools math | `/tools` (line movement + parlay + CLV) |
| B2B signals | `GET /api/v1/signals` + `x-api-key` |

## Content free wire

```
# Optional curated sports RSS (sports-skills harvest) when you have not set NEWS_RSS_FEEDS:
NEWS_RSS_USE_CURATED_DEFAULTS=true
# Or paste curatedNewsRssEnvString() into NEWS_RSS_FEEDS
```

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
- No edge-as-p · no floor relax · no inventing free book lines  

## Merge stack (today)

Main: #391–#408 ranking/independents/cal R&D. Open: **#409** surfaces + multi-domain leverage; **#370** jynx cost; honesty PRs #371/#372 review only.
