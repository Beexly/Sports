# Real-time data hydration strategies (GSE)

**Code:** `packages/stats-api/src/hydration/*`  
**API:** `GET /api/gse/v1/hydration/strategies` · `POST /api/gse/v1/hydration/plan`

## Law
1. **PIT `asOf`** is the read contract — hydration never rewrites history silently  
2. **Stale → refuse** (null / 403 / selective no-bet) — never fabricate  
3. **SSE is projection**, not source of truth  
4. **Paid only when free cannot cover** (odds)  
5. **LIVE_BOARD** stream fanout stays founder-gated  

## Strategy menu

| Strategy | When | GSE fit |
|----------|------|---------|
| `batch_snapshot` | Versioned dumps | nflverse, MoneyPuck, openfootball |
| `ttl_cache_poll` | Free APIs | Open-Meteo, ESPN, OpenF1, balldontlie |
| `cron_delta` | Incremental windows | refresh-odds */30, player stats |
| `event_push` | Webhooks | Stripe entitlements (done); future settle |
| `sse_stream` | Client live UI | Cockpit after LIVE_BOARD |
| `write_through` | SoR + memory | Target for `/values` hot path |
| `read_repair` | Miss fill | Single weather/player |
| `feast_materialize` | Feature online store | feature-store Feast path |
| `hybrid_hot_cold` | Odds hot + model cold | Core edge e = p − q |

## Recommended production topology

```
[cron / webhook] → Prisma SoR → write_through → NflverseMemoryStore
                                      ↓
                         GET /values?asOf=  (PIT)
                                      ↓
                         optional SSE projection (LIVE_BOARD on)
```

Hot plane (odds): `cron_delta` + dynamic freshness (existing `freshness-schedule.ts`).  
Cold plane (stats): `batch_snapshot` post-slate.  
Join at decision time with **dual asOf** (quote time vs feature time).

## Cadence matrix
See `CADENCE_MATRIX` in code — longest metric-id prefix wins.

## What not to do
- Poll pbp on every API request  
- Use CDN-cached odds as “fresh” without `last_update`  
- Stream without SoR  
- Hydrate research HF datasets into public commercial values  
