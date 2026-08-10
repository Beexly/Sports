# CURRENT_STATE

Updated: **2026-08-10** (sliding OGD + Hedge analysis + Brier steps · model **v5.2.6**)

**MAIN HEAD (repo):** production SHA via `/api/ops/public-surface-truth`  
**SoT:** Production `/api/health` + `/api/ops/public-surface-truth` + this file

## Law (do not violate)

LIVE_BOARD=off · PERFORMANCE_STATS_ENABLED=off · PUBLISH_LEDGER=off  
oddsApiRequired=false on free path · refuse-default · CPA blocked · no auto-publish · no auto-bet  
CALIBRATION_ADJUSTMENTS_ENABLED off · CALIBRATION_AUTO_PUBLISH false  
RANKING_PAUSE_APPLY durable ON (MLB ML+SPREAD founder-yes) · env default OFF  
MODEL_VERSION **v5.2.6** · ranking polarity: never edge-as-p · free-path ABSENT-only for books

## Live class (remeasure after each calib tick — do not invent)

| Metric | Approx live | Floor | Status |
|---|---|---|---|
| Eligibility n | ~339 | ≥100 | OK |
| Brier | **0.2478** | ≤0.22 | **RED** |
| ECE | **0.0357** | ≤0.05 | GREEN |
| Murphy RES | **0.0048** | need ~0.03 | thin |
| Independent cov | ~65% ML/SPREAD | ≫0 | OK |
| consecutiveGreen | 0 | 3 | blocked |
| Settlement | HEALTHY | — | OK |
| Odds SLA | within | — | OK |
| Money path | ready (6/6) | — | OK |
| Selective | ON δ=0.08 | — | OK |
| Pause apply | durable 2 groups (MLB ML+SPREAD) | — | OK |
| mapBakeoff | prefer_parametric · plateau~98% · T≈1.21 | apply OFF | OK |

**Eligibility RED is correct.** Do not claim PROVEN.

## Calibration R&D — UI steps

| Step | Status |
|------|--------|
| Online Gradient Descent for calibration | **Shipped** — Beta OGD, Brier-OGD ensemble, Hedge δ, OCO pipeline, sliding-window OGD + metrics analysis |
| Explore Isotonic Regression | **Shipped** — prefer_parametric (do not apply) |
| Analyze sliding window OGD metrics | **Shipped** — `analyzeSlidingWindowOgd` + bake-off surface |
| Explore Hedge adaptive delta logic | **Shipped** — `analyzeAdaptiveDeltaHedge` integrity/regret |
| Clarify Brier score improvement steps | **Shipped** — [BRIER_IMPROVEMENT_STEPS.md](./BRIER_IMPROVEMENT_STEPS.md) |

Shadow only. Next `calibration-metrics` tick fills `resAware*` / `onlineBeta*` / `oco*` / `sliding*` / `hedge*` on ops surface.

## Brier path (short)

1. Independents + selective + pause (primary RES)  
2. Accumulate settles under that filter  
3. Shadow RES-cal / OCO only if underconfident + REL guard  
4. Maps last; never free stretch  

## Remaining (honest)

### Engineering (agent can do)
1. Confirm OCO/sliding/hedge fields non-null after next calib cron (`40 */6 * * *`)  
2. Keep independent-priced settles under selective + pause  
3. Optional densify trueProb on thin sport|market cells  
4. Residual pause list may include MLS keys not yet in durable — expand only with founder YES  

### Founder-only (cannot code away)
1. **One Checkout smoke** — largest external/revenue lever  
2. Optional `THE_ODDS_API_KEY` for denser books  
3. Optional expand durable pause to remaining dead groups (MLS if still dead)  
4. **Do not** flip PERFORMANCE_STATS / maps / AUTO_PUBLISH while Brier RED  

### Closed / do not reopen
- Dual-path odds + ESPN tertiary  
- trueProb backfill + market-anchor  
- Integrity δ + segmented Murphy  
- Cron dual auth · autonomy cannot flip gates  
- Waitlist → pricing CTA  
- Isotonic apply · free stretch  

Docs: [BRIER_IMPROVEMENT_STEPS.md](./BRIER_IMPROVEMENT_STEPS.md) · [SLIDING_WINDOW_OGD.md](./SLIDING_WINDOW_OGD.md) · [HEDGE_ADAPTIVE_DELTA.md](./HEDGE_ADAPTIVE_DELTA.md) · [RES_CALIBRATION_AND_OCO.md](./RES_CALIBRATION_AND_OCO.md)
