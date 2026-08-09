# MODEL_VERSION v5.2.1 — Independent ranking path

## What changed (v5.2.1 quality pass)
- Ranking uses **trueProb whenever finite** (including PASS) so overpriced favorites demote — not only SPEAK|LEAN.
- Default `independentWeight` = **0.7** (less market-echo dilution).
- `factorBreakdown` persists `rankingP`, `rankingSource`, `marketFairProb`.
- Metrics load: `pIndependent` = **raw trueProb only** — never confidence-echo rankingP, never double-blend.
- Bake-off kinds: `confidence | independent_trueProb | blend_indep_conf | marketFairProb` only (**never edge-as-p**).
- `bestScore` requires **separation > 0** and **coverage ≥ 40%** of confidence n.
- Kalshi team name → abbr maps; ESPN FPI **exact** name/abbr match only.
- Public selective filter consumes `rankingP` from factorBreakdown.

## v5.2.0 base
Independents (Poisson / Elo / Kalshi / ESPN PowerIndex) wire into `OddsInput.context.independentFairValues` at process-sport time.

## What did NOT change
- Floors (Brier ≤ 0.22, ECE ≤ 0.05, Murphy R ≤ 0.05, n ≥ 100, K=3)
- AUTO_PUBLISH default false
- CALIBRATION_ADJUSTMENTS still OFF
- Free-path ABSENT-only; Odds key untouched
- Maps (Platt/Temp/Isotonic) still offline bake-off only
- Spread/TOTAL: rankingP = confidence until ATS/total independents exist (explicit)

## Why this is the PROVEN lever
Live bake-off showed confidence RES ≈ 0.002 (market-echo). Edge-as-p was a category error (negative separation). Pricing real model P raises Murphy RES without inventing skill.

## Self-correction
After new picks settle under v5.2.1:
- If selective RES on independent/blend still < 0.02 → engine resolution insufficient; need sport-specific models / new features — **not more maps**.
- Maps will not unlock PROVEN while RES≈0.

## Ops
- Score bake-off kinds: confidence | independent_trueProb | blend_indep_conf | marketFairProb
- Historical rows without independentEdge.trueProb → pIndependent null → those kinds skipped
- rankingPolarityLaw: positive_separation_required

## Founder
Promote Production to main after merge. Re-run calibration-metrics cron. Generate new slate so independents (FPI/Kalshi/Elo) price into rankingP. Odds insert SLA is separate (stale odds ≠ ranking polarity).
