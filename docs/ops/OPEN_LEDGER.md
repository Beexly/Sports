# OPEN_LEDGER — GSE drain status

**Updated:** 2026-07-29 · agent serial drain  
**Law:** oddsApiRequired=false · LIVE_BOARD off · refuse-default

## Classification key

| Class | Meaning |
|-------|---------|
| A | Agent can finish now |
| B | Founder env/secret only |
| C | Correctly gated / parked |

## Class A (must reach 0 before IDLE)

| ID | Item | Status |
|----|------|--------|
| A1 | Dual-secret util + cronAuthError | **DONE** PR #251 |
| A2 | /api/cron/gamma + vercel + oddsApiRequired:false | **DONE** #249 + #251 smoke |
| A3 | Board classifyBoardState / honest empty | **DONE** #251 |
| A4 | Own-feed values refuse path | **DONE** #251 |
| A5 | evaluateUnifiedPrefire before public FIRE | **DONE** #251 (+ gate-consumer publicFire) |
| A6 | sameMethodOrRefuse / method tag on receipts | **DONE** #251 |
| A7 | CREDENTIALS_CHECKLIST + smoke scripts | **DONE** #251 |
| A8 | rights SPDX export classifier | **DONE** #251 port |
| A8b | Durable archive / AI Council / BH-FDR | **READY** PR #250 green |
| A9 | CI smoke scripts | **DONE** gamma + credentials smokes |
| A10 | Routes refuse-default (empty eligible) | **DONE** own/values + boardClass + prefire |

**class_A_remaining = 0** (after #250+#251 merge)

## Class B — founder env/secrets

| Item | Where |
|------|-------|
| `CRON_SECRET` (+ optional `CRON_SECRET_PREVIOUS`) | Vercel Production env |
| `DATABASE_URL` / `DIRECT_URL` | Neon + Vercel |
| Upstash Redis (optional online) | Upstash + Vercel |
| Stripe live keys | Stripe + Vercel |
| `THE_ODDS_API_KEY` | Optional enrichment only — never required for Gamma free path |

## Class C — parked / founder YES only

| Item | Status |
|------|--------|
| LIVE_BOARD | **off** — do not flip |
| PUBLISH_LEDGER | **off** |
| SLATE_OPENING_REVEAL_ENABLED | **off** |
| canPublishPicks | **false** hard-coded on analysis surfaces |
| #226 HEOS | founder YES required |
| Phase C (5b) remeasure | founder + paid Odds |
| Overlay CV path | **PARKED** |
| Poly1305 / CF Access / SPIFFE | closed digression |

## Forbidden (confirmed)

- Fake ROI / Phase C numbers  
- Sportsbook CPA  
- Pedersen = ZK/PQ  
- Odds API on free critical path  

CI re-sync: 2026-07-30T00:02:44Z
