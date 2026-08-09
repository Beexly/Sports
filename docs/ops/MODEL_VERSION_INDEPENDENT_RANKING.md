# MODEL_VERSION v5.2.0 — Independent ranking path

## What changed
Independents (Poisson from real TeamGameLog rates, Elo from chronological results, optional Kalshi) are wired into `OddsInput.context.independentFairValues` at process-sport time.

When edge-engine returns **SPEAK** or **LEAN** with finite `trueProb`:
- `rankingScore` / `rankingP` = blend(confidence, trueProb) (default 50/50)
- `independentEdge.priced = true`
- `factorBreakdown.fairProbability` = rankingP
- Generation sort + selective publish prefer rankingScore over confidence

When independents absent or PASS:
- `rankingScore = confidence` (no regression)

## What did NOT change
- Floors (Brier ≤ 0.22, ECE ≤ 0.05, Murphy R ≤ 0.05, n ≥ 100, K=3)
- AUTO_PUBLISH default false
- CALIBRATION_ADJUSTMENTS still OFF
- Free-path ABSENT-only; Odds key untouched
- Maps (Platt/Temp/Isotonic) still offline bake-off only

## Why this is the PROVEN lever
Live bake-off showed confidence RES ≈ 0.002 (market-echo). Edge/blend already higher. Pricing independents is the documented MODEL_VERSION step that can raise Murphy RES without inventing skill.

## Self-correction
After new picks settle under v5.2.0:
- If selective RES on independent/blend still < 0.02 → engine resolution insufficient; need sport-specific models / new features — **not more maps**.
- Maps will not unlock PROVEN while RES≈0.

## Ops
- Score bake-off kinds: confidence | edgeScore | blend_conf_edge | independent_trueProb | blend_indep_conf
- Historical rows without factorBreakdown.independentEdge → pIndependent null → those kinds skipped
- New published picks carry priced fairProbability for bake-off after settle

## Founder
0–1 actions: promote Production deploy after green CI on main. No env ceremony for Poisson when rates come from validated TeamGameLog (assert skipped for validated path only).
