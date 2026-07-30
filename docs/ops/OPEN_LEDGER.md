# OPEN_LEDGER — GSE drain status

**Updated:** 2026-07-29 · finish-all autonomous drain  
**MAIN:** `3ed6a3c` (#251 squash)  
**Law:** oddsApiRequired=false · LIVE_BOARD off · refuse-default

## Classification key

| Class | Meaning |
|-------|---------|
| A | Agent can finish now |
| B | Founder env/secret only |
| C | Correctly gated / parked |

## Class A — **count = 0**

| ID | Item | Status |
|----|------|--------|
| A1 | Dual-secret util + cronAuthError | **MAIN** #251 |
| A2 | /api/cron/gamma + vercel + oddsApiRequired:false | **MAIN** #249 + #251 smoke |
| A3 | Board classifyBoardState / honest empty | **MAIN** #251 |
| A4 | Own-feed values refuse path | **MAIN** #251 |
| A5 | evaluateUnifiedPrefire before public FIRE | **MAIN** #251 (gate-consumer publicFire) |
| A6 | sameMethodOrRefuse / method tag on receipts | **MAIN** #251 |
| A7 | CREDENTIALS_CHECKLIST + smoke scripts | **MAIN** #251 |
| A8 | rights SPDX export classifier | **MAIN** #251 |
| A8b | Durable archive / AI Council / BH-FDR | **MAIN** #250 |
| A9 | CI smoke scripts | **MAIN** gamma + credentials smokes |
| A10 | Routes refuse-default (empty eligible) | **MAIN** own/values + boardClass + prefire |

CODE_READY labels on optical CV, hydrate stub runners, and hydrate-force multi-instance rows are **intentional honest status** (not silent debt) — Class C / multi-instance ops.

## Class B — founder env/secrets

| Item | Where |
|------|-------|
| `CRON_SECRET` (+ optional `CRON_SECRET_PREVIOUS`) | Vercel Production env |
| `DATABASE_URL` / `DIRECT_URL` | Neon + Vercel |
| Upstash Redis (optional online) | Upstash + Vercel |
| Stripe live keys | Stripe + Vercel |
| `THE_ODDS_API_KEY` | Optional enrichment only — never required for Gamma free path |

Smoke (after secrets set):

```bash
HOST=https://$HOST ./scripts/ops/gamma-cron-smoke.sh
HOST=https://$HOST CRON_SECRET=… ./scripts/ops/gamma-cron-smoke.sh
node scripts/ops/credentials-smoke.mjs
```

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

## Stranded open PRs (not class A unless re-scoped)

#248 own-feed density (partially landed via #251 values path) · #247 rebase debt · #226 founder · older draft stacks #154–#52

## Completion gate

- [x] class A = 0  
- [x] Cron dual-ready + gamma authorized path  
- [x] Board honest empty  
- [x] Own-feed refuse  
- [x] Prefire before selective public fire  
- [x] CREDENTIALS_CHECKLIST.md  
- [x] Founder-only list below  

**next = IDLE**
