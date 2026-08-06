# CURRENT_STATE

Updated: 2026-08-06 (Grok autonomous session)

**MAIN HEAD (repo):** `addbec0` — orbit waves 3–7 (#286)  
**Production deploy SHA:** `addbec09877f67f22903484eb23941b3e846ad4a` (matches #286)  
**Open ship PR:** [#289](https://github.com/Beexly/Sports/pull/289) — settlement RCA+STP + placebo integrity + autonomy kernel (see branch `grok/settlement-rca-stp-integrity`)

**SoT:** Production `/api/health` + `/api/board/state` + this file (docs lag is a bug — treat probes as ground truth)

## Production truth (probed 2026-08-06 ~02:36Z)

| Surface | State |
|--------|--------|
| `/api/health` overall | **healthy** (ok:true) — DB + ingestion ok |
| Database | healthy |
| Ingestion | healthy — last success ~148m age at probe (within SLA at time of check) |
| **Settlement** | **UNAVAILABLE / CRITICAL** — "critically behind on commenced picks" |
| Board | **SUPPRESSED_STALE** — openPicks=0, refusePublicFire=true, draftOnly=true, honestEmpty=true |
| Proof slate | unavailable (hard dep on settlement) |

## Law (do not violate)

LIVE_BOARD=off · PUBLIC_PICKS_ENABLED=off · PERFORMANCE_STATS_ENABLED=off · PUBLISH_LEDGER=off  
oddsApiRequired=false on free path · refuse-default · CPA blocked · no auto-publish · no auto-bet

## P0 right now

1. **Settlement backlog** — free-path settle-picks + free-spine; after #289 deploy use `free.rca` / `free.stp` / burn rate.
2. Land **#289** once CI green (lint unused-var fixed; autonomy + learning modules added).
3. Keep public gates closed until settled sample + healthy settlement + non-stale board.

## Autonomy (new)

- Pure kernel: `apps/web/lib/autonomy/operating-kernel.ts` — P0/P1 plan from probes; never flips gates.
- Learning loop: `apps/web/lib/autonomy/settlement-learning.ts` — grades → samples; no silent MODEL_VERSION apply.
- Health-alert cron returns `autonomy` plan (severity, queues, honesty, revenue readiness).

## Explicit founder YES only

LIVE_BOARD · PUBLISH_LEDGER · public picks · PERFORMANCE_STATS · Phase C · historical-eval #226

## Do not

- Redeploy from unreviewed HEAD without green CI
- Force-settle DISPUTED scores
- Treat skipped PG integration suites as proven without disposable Postgres job
- Update this file from memory without a fresh `/api/health` probe
