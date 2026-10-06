# Kaggle Research Destroyer — 20-Lane Corpus (2026-10-06)

Fleet research mission for the Galaxy Sports Edge (GSE) multi-sport engine.
Commissioned by Garrett Baxley 2026-10-06. Two waves, all lanes complete.

## What this is

20 research lanes covering the methods, datasets, and validation discipline
behind winning sports-prediction work on Kaggle and beyond. Every lane was
researched in depth (method, math, datasets, GSE application, implementation
spec, verdict), then adjudicated by GLM (`z-ai/glm-5.3-flash`), then
re-examined by a fresh adversarial reviewer ("wave 2") hunting for what the
first pass missed, underleveraged, or undervalued. Each report carries a
`## REVIEW PASS (adversarial, wave 2)` section with the second reviewer's
findings.

## The lanes

| # | File | Lane |
|---|------|------|
| 01 | lane-01-nfl-prediction.md | NFL prediction |
| 02 | lane-02-nba-prediction.md | NBA prediction |
| 03 | lane-03-mlb-prediction.md | MLB prediction |
| 04 | lane-04-nhl-soccer-prediction.md | NHL / soccer prediction |
| 05 | lane-05-timeseries-changepoint.md | Timeseries / changepoint |
| 06 | lane-06-conformal-uncertainty.md | Conformal prediction + uncertainty |
| 07 | lane-07-calibration.md | Calibration |
| 08 | lane-08-ensembles-stacking.md | Ensembles / stacking |
| 09 | lane-09-feature-engineering.md | Feature engineering (redux) |
| 10 | lane-10-elo-ratings.md | Elo / ratings |
| 11 | lane-11-odds-datasets.md | Odds datasets |
| 12 | lane-12-pbp-datasets.md | Play-by-play datasets |
| 13 | lane-13-tracking-data.md | Tracking data |
| 14 | lane-14-dfs-optimization.md | DFS optimization |
| 15 | lane-15-win-probability.md | Win probability |
| 16 | lane-16-expected-metrics.md | Expected metrics (xG, xERA, CPOE…) |
| 17 | lane-17-big-data-bowl.md | NFL Big Data Bowl |
| 18 | lane-18-march-madness.md | March Madness |
| 19 | lane-19-forecasting-comps.md | Forecasting competitions |
| 20 | lane-20-market-analysis.md | Market analysis |

## Lane 17 file note (dedupe guidance for builders)

Three files exist for lane 17. They carry conflicting verdicts and wiring
orders and must be merged before wiring:
- `lane-17-big-data-bowl.md` — canonical file (wave-1 + wave-2 review)
- `lane-17-big-data-bowl-direct.md` — sibling run; holds the E1–E6
  situational/emotional layer the canonical file lacks
- The wave-2 review's merge guidance: stack them, don't pick one
  (transformer = perception, two-stage = attribution). The 2025 winner is
  confirmed (Bajaj/Sandwar). The Sports Tracking Transformer never got a
  wave-1 verdict — wave 2 says ADOPT as backbone.

## Top wave-2 findings (wiring-relevant)

1. **Market contamination in Lane 2's data layer.** nflfastR's `wp`/`wpa`
   columns are computed with the Vegas spread as a covariate. Lane 9
   hard-REJECTED betting-line features in Layer 2 — wiring `wp`/`wpa` as
   features imports the market into the reasoning layer invisibly. Split
   the verdict: spread-free columns (EP, CPOE, xyac) ADOPT; spread-conditioned
   columns Layer-1-only or recomputed market-neutral.
2. **CLV needs a liquidity gate (Lane 20).** "The close is sharp" holds only
   where the close is a true-price reflection (liquid popular markets). The
   CLV tracker must be liquidity-gated or it over-trusts thin-market closes.
3. **De-vigging is pipeline step 1 (Lane 7).** The de-vig method moves
   favorites ~1.5pp — larger than the Brier gain the lane celebrates. Adopt
   Shin de-vigging before any downstream calibration.
4. **Sentiment contradiction unresolved.** Lane 8 ADAPTs sentiment as an
   ensemble leg; Lanes 2/4/9 REJECT it on the same evidence. Unified doctrine
   needed: residual-vs-closing-line gate as the shared standard. Lane 19's
   blanket "narrative is never a feature" contradicts the fleet mission that
   the human layer becomes measured Layer-2 features.
5. **Revenge-fade sign error (Lane 9).** The formula fades hardest exactly
   where the cited evidence says revenge works (within 6 days). Rebuild
   piecewise: fade distant revenge, bet with recent revenge.
6. **TE-FLEX ban contradicts current evidence (Lane 14).** The Week 3 2026
   Milly Maker winner ran two-TE construction; every top-10 lineup did.
   Downgrade the ban to default-off, per-season-validated.
7. **"Classic exploitable edge" (Lane 4) violates its own law.** The
   b2b × backup-start claim has zero closing-line residual evidence.
   Gated until it clears the residual test.
8. **Missing coverage, biggest items:** RAPTOR/DARKO (Lane 2), TimesFM-free
   alternatives TabPFN-TS for 17-game cold starts (Lane 19), MinT forecast
   reconciliation (Lane 19), multicalibration over subgroups (Lane 7),
   Statcast bat tracking public since 2024 (Lane 13), umpire called-strike
   bias (Lane 3), Sports Tracking Transformer (Lane 17), ADWIN-on-residuals
   as model-decay monitor (Lane 5), Shin de-vig (Lane 7), 538's ±100-Elo QB
   adjustment as wiring item #1 (Lane 10).

## How to use this corpus

- Reports are intake, not the finish line. Build order: research → wire →
  weight → calibrate → test → polish.
- Transfer mechanisms, never coefficients.
- Layer 1 = market line. Layer 2 = contextual reasoning — measured,
  validated features, never ad hoc overrides. Every Layer-2 feature must
  explain residual variance against the closing line or it doesn't ship.
- Emotional/situational signals ship default-off until validated.
- Point-in-time correctness is non-negotiable on every feature.

## Provenance

- Wave 1: 20 scout agents, GLM-adjudicated (`z-ai/glm-5.3-flash`).
  8 lanes (06, 07, 08, 10, 14, 16, 18, 19) were researched before the
  working GLM path existed and are NOT GLM-adjudicated — a GLM verdict
  pass is still owed on those.
- Wave 2: 20 fresh adversarial reviewers, own reasoning + web search,
  $0 API spend.
- Secret-scanned before landing. No credentials in these files.
