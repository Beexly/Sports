# OPEN_LEDGER — GSE drain status

**Updated:** 2026-07-30 · **IDLE** after #254  
**MAIN:** `8d0b34e` (`fix(frontier): A++ audit… (#254)`)  
**Law:** oddsApiRequired=false · LIVE_BOARD off · refuse-default · measurement > narrative  
**score_self:** **A++** (evidence: audits below + CI green on merge)

## Classification key

| Class | Meaning |
|-------|---------|
| A | Agent can finish now |
| B | Founder env/secret only |
| C | Correctly gated / parked |

## Class A

| ID | Item | Status |
|----|------|--------|
| A1 | Dual-secret util + cronAuthError | **DONE** #251 |
| A2 | /api/cron/gamma + vercel + oddsApiRequired:false | **DONE** #249+#251 |
| A3 | Board classifyBoardState / honest empty | **DONE** #251+#254 |
| A4 | Own-feed values refuse path | **DONE** #251 |
| A5 | evaluateUnifiedPrefire before public FIRE | **DONE** #251 |
| A6 | sameMethodOrRefuse / method tag density + continuous CLV | **DONE** #251+#254 |
| A7 | CREDENTIALS_CHECKLIST + smoke scripts | **DONE** #251 |
| A8 | rights SPDX export + durable archive/council/BH | **DONE** #250+#251 |
| A9 | CI smoke scripts | **DONE** #251 |
| A10 | Routes refuse-default | **DONE** #251 |
| A11 | CI Postgres health (`pg_isready -U sports`) | **DONE** #254 (closed draft #153) |
| A12 | timingSafeHashEqual strict hex/length | **DONE** #254 (closed draft #154) |
| A13 | AI Council DESTROY in CI + vitest package root | **DONE** #254 |
| A14 | methodTag all providers + archive continuous CLV | **DONE** #254 |

**class_A_remaining = 0** · agent **IDLE**

### Non-A residuals (not agent-actionable)

| Hit | Class | Why |
|-----|-------|-----|
| LIVE_BOARD / PUBLISH_LEDGER / SLATE_OPENING_REVEAL | C | Founder gate — all **off** |
| canPublishPicks: false hardcodes | C | Correct refuse-default |
| CODE_READY hydration stubs / optical CV | C | Catalog honesty / CV **PARKED** |
| Phase C remeasure CODE_READY | C | Founder + paid Odds |
| TODO(governed-receipts) | C | Ledger writer cascade |
| Jarvis not-wired seats | C | Registry honesty |
| #226 HEOS | C | Founder YES |
| Open #247 frontier publicFire | C/dup | Overlaps #251 publicFire |
| Open #248 own-feed / self-CLV | C/dup | Overlaps #251+#254 density |

## Class B — founder env/secrets

| Env | Where |
|-----|-------|
| `CRON_SECRET` (+ optional `CRON_SECRET_PREVIOUS`) | Vercel Production |
| `DATABASE_URL` / `DIRECT_URL` | Neon + Vercel |
| Upstash Redis (optional) | Upstash + Vercel |
| Stripe live keys | Stripe + Vercel |
| `THE_ODDS_API_KEY` | Optional enrichment only — never free-path required |
| `CLOSING_ARCHIVE_PATH` | Optional durable archive path on Vercel/FS |

## Class C — parked / founder YES only

| Item | Status |
|------|--------|
| LIVE_BOARD | **off** |
| PUBLISH_LEDGER | **off** |
| SLATE_OPENING_REVEAL_ENABLED | **off** |
| canPublishPicks | **false** |
| #226 HEOS | founder YES |
| Phase C (5b) | founder + paid Odds |
| Overlay CV | **PARKED** |
| Poly1305 / CF Access / SPIFFE | closed digression |

## Forbidden

Fake ROI · sportsbook CPA · Pedersen=ZK/PQ · Odds API on free critical path · flip gates without YES

## Frontier A++ audits (committed)

- `docs/ops/audit/FRONTIER_AUDIT_20260730T001645Z.md` — boardClass, initial tags, council CI  
- `docs/ops/audit/FRONTIER_AUDIT_20260730T002800Z.md` — aggregate all-tagged, archive continuous CLV, provider density  
