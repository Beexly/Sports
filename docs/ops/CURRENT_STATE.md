# CURRENT_STATE

Updated: **2026-08-10** (close-out all levers pass · model **v5.2.6**)

**MAIN HEAD (repo):** see `git log -1` — Production SHA via `/api/ops/public-surface-truth`  
**SoT:** Production `/api/health` + `/api/ops/public-surface-truth` + this file

## Law (do not violate)

LIVE_BOARD=off · PERFORMANCE_STATS_ENABLED=off · PUBLISH_LEDGER=off  
oddsApiRequired=false on free path · refuse-default · CPA blocked · no auto-publish · no auto-bet  
CALIBRATION_ADJUSTMENTS_ENABLED off · CALIBRATION_AUTO_PUBLISH false · RANKING_PAUSE_APPLY default OFF  
MODEL_VERSION **v5.2.6** · ranking polarity: never edge-as-p · free-path ABSENT-only for books

## Live class (remeasure after each calib tick — do not invent)

| Metric | Approx live | Floor | Status |
|---|---|---|---|
| Eligibility n | ~339 | ≥100 | OK |
| Brier | ~0.24–0.25 | ≤0.22 | **RED** |
| ECE | ~0.05–0.06 | ≤0.05 | borderline RED |
| Murphy RES | ~0.008–0.01 | raise | improved from 0.002 |
| Independent cov | ~65% ML/SPREAD | ≫0 | OK |
| Separation (indep) | >0 | >0 | OK |
| consecutiveGreen | 0 | 3 | blocked |
| Settlement | HEALTHY | — | OK |
| Odds SLA | within (ESPN free) | — | OK |
| Money path | ready (6/6 prices) | — | OK |

**Eligibility RED is correct.** Do not claim PROVEN. Maps fix REL not RES.

## Shipped close-out spine (A–D)

| Track | Status |
|---|---|
| A trueProb persist + force reprice backfill | **Live** |
| A free independents (MLB standings, nflverse EPA, ESPN FPI, Kalshi, …) | **Live** |
| A market-anchored live p + evidence shrink (v5.2.6) | **Live** |
| A dual-objective selective (RES under Brier cap) | **Live** |
| A odds dual-path + ESPN tertiary + insert visibility | **Live** |
| A RANKING_PAUSE_APPLY | Code ready · **default OFF** |
| B Stripe checkout + webhook + prices | **Ready** · founder card smoke still required |
| B Waitlist → pricing CTA post-submit | **Live** |
| C Cron dual auth + autonomy cannot flip gates | **Confirmed** |
| C GH External Cron | Dead minutes · **Vercel SoT accepted** |
| D Pick-card rankingP + priced-into-ranking badge | **Live** |
| D Content generate-drafts | Draft-only law · archives thin |

## Founder-only remaining (cannot code away)

1. **One Checkout smoke** — sign in → /pricing → complete card (test or live)  
2. Optional: `node scripts/ops/create-founding-payment-link.mjs` → post on X / email waitlist  
3. Optional denser books: Production `THE_ODDS_API_KEY`  
4. Optional: `RANKING_PAUSE_APPLY=true` when advisory pause list looks right  
5. Optional: restore GH Actions minutes  
6. **Do not** flip PERFORMANCE_STATS / maps / AUTO_PUBLISH while RED  

## Do not

- Invent PROVEN or public ROI while eligibility RED  
- Force-settle DISPUTED scores  
- Treat conformal coverage as eligibility  
- Rebuild a second scheduler while Vercel crons are SoT  

Brier techniques SoT: [BRIER_OPTIMIZATION_TECHNIQUES.md](./BRIER_OPTIMIZATION_TECHNIQUES.md) (integrity δ, Var[P], OGD ensemble, no stretch).

See [CLOSEOUT_TRACKS_A_B_C_D.md](./CLOSEOUT_TRACKS_A_B_C_D.md) · [CLOSEOUT_STATUS_2026-08-10.md](./CLOSEOUT_STATUS_2026-08-10.md) · [FOUNDER_ONLY_CHECKLIST.md](./FOUNDER_ONLY_CHECKLIST.md)
