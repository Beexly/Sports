---
modelVersion: v5.2.7
status: IMPLEMENTED
date: 2026-08-22
author: grok skellam ATS ranking wire
supersedes: v5.2.6
---

# CalibrationProposal — Skellam ATS cover on SPREAD rankingP (v5.2.6 → v5.2.7)

## Decision

Bump `MODEL_VERSION` to **v5.2.7** to price an independent Skellam cover probability into **spread ranking only** for Poisson-valid sports (soccer / hockey / baseball).

1. TeamGameLog rates still produce Dixon–Coles (soccer) or Poisson (hockey/baseball) moneyline independents.
2. The same λ plus the posted home spread emit `{ source: "skellam_cover" }` — 2-way cover probs, push mass dropped and renormalised (same bridge as dropping draws on moneyline Poisson).
3. `scoreSpreadPick` runs the existing v5.2.1 ranking law (`deriveRankingProbability`, independentWeight 0.7, rank on any trueProb) against **only** `skellam_cover` rows.
4. Moneyline ranking **ignores** `skellam_cover` so ATS cover is never treated as P(win).
5. Heuristic **confidence composite is unchanged**. Edge SPEAK/LEAN remains the glass-box claim.

## What this is — and is NOT

This is a **ranking discrimination** change for soccer/hockey/baseball spreads. It is not NFL (Stern key-number mixture stays a separate module). It does not flip `CALIBRATION_ADJUSTMENTS_ENABLED`, `PUBLIC_PICKS`, or `FORCE_NO_BET_IF_STALE`. Spreads on basketball/NFL still rank by confidence.

## Evidence

- `skellamCoverFairValue` two-way sums to 1; null on bad sport / degenerate λ.
- Spread picks: confidence stable vs no-independent baseline; rankingScore moves when skellam_cover is present; rankingSource is not `confidence`.
- Moneyline picks: adding only `skellam_cover` does not create an Independent Edge factor.

## Gates still OFF

- `CALIBRATION_ADJUSTMENTS_ENABLED` — off
- `CALIBRATION_AUTO_PUBLISH` — false
- `PUBLIC_PICKS` / `FORCE_NO_BET_IF_STALE` — founder pair
