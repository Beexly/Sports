# FOUNDER_ONLY_CHECKLIST

No soft language. Check only when done in Production.

## Credentials (Vercel Production + Neon / Stripe / Upstash)

- [ ] `CRON_SECRET` set in Vercel Production
- [ ] `CRON_SECRET_PREVIOUS` set only during rotation (optional otherwise)
- [ ] `DATABASE_URL` points at Neon Production
- [ ] `DIRECT_URL` points at Neon direct (migrations)
- [ ] Upstash Redis env set if multi-instance online store is required
- [ ] Stripe live keys set (`STRIPE_SECRET_KEY` / webhook secret per go-live checklist)
- [ ] `gamma-cron-smoke.sh` against Production HOST: **401** then **200**

## Explicit YES only (default remains OFF / refuse)

- [ ] Explicit YES: **LIVE_BOARD** on
- [ ] Explicit YES: **PUBLISH_LEDGER** on
- [ ] Explicit YES: **SLATE_OPENING_REVEAL** / reveal path on
- [ ] Explicit YES: merge / land **#226 HEOS**
- [ ] **Phase C (5b)** remeasure after real Odds/gamma path (not a silent flip)

## Optional enrichment (never free-path required)

- [ ] `THE_ODDS_API_KEY` for `/api/cron/refresh-odds` enrichment only
- [ ] `CLOSING_ARCHIVE_PATH` if durable archive path needed beyond default store

## Forbidden until YES + measurement

- Public ROI / guaranteed edge claims
- Sportsbook CPA
- Pedersen as ZK/PQ
- Odds API required on free Gamma/own-feed path
