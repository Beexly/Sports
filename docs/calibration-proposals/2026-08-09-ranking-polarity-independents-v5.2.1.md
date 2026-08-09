---
modelVersion: v5.2.1
status: IMPLEMENTED
date: 2026-08-09
author: ranking signal quality pass (principal build agent)
supersedes: v5.2.0
---

# CalibrationProposal — ranking polarity + independent model P (v5.2.0 → v5.2.1)

## Decision

Bump `MODEL_VERSION` to **v5.2.1** for the end-to-end ranking-signal quality pass:

1. **Never treat edge as a win probability** in proven-path bake-off (category error fixed in metrics path; enforced in loaders).
2. **Ranking uses `trueProb` whenever finite** (including PASS) so overpriced favorites demote; default blend weight 0.7.
3. Persist `rankingP`, `rankingSource`, `marketFairProb` on `factorBreakdown`.
4. Honest metrics load: `pIndependent` = raw `trueProb` only (never confidence-echo rankingP).
5. Independent fill: ESPN PowerIndex logistic, Kalshi team maps, Poisson, Elo (null-safe).
6. FPI team lookup exact-only (no substring fuzzy match).
7. Public selective filter consumes `rankingP`.

Heuristic **confidence weights / composite formula are unchanged**. Edge SPEAK/LEAN remains the glass-box edge claim. Maps, AUTO_PUBLISH, floors unchanged.

## What this is — and is NOT

This is a **ranking discrimination** change (Murphy RES lever), not a claim of PROVEN skill and not a map activation. Live eligibility floors (Brier ≤ 0.22, ECE ≤ 0.05, Murphy R ≤ 0.05, n ≥ 100, GREEN×K) are **unchanged**. Performance surfaces stay dark until eligibility GREEN + publish policy.

## Evidence — unit + polarity

- Bake-off kinds: confidence | independent_trueProb | blend_indep_conf | marketFairProb only.
- `bestScore` requires separation > 0 and coverage ≥ 40% of confidence n.
- Tests: ranking-prob, espn-powerindex, scoring-independent-edge, proven-path-engine polarity, proven-path-rows load honesty, Kalshi abbr maps, FPI exact lookup.
- Live pre-promote: conf sep ≈ −0.005, edge-as-p sep ≈ −0.14 (root cause of inverted bestScore under old bake-off).

## Gates still OFF

- `CALIBRATION_ADJUSTMENTS_ENABLED` — off
- `CALIBRATION_AUTO_PUBLISH` — false
- Conformal/ACI abstain — off
- Free-path ABSENT-only; Odds key untouched

## Founder follow-up

1. Promote Production to main after merge.
2. Re-run calibration-metrics cron (rebuild proven-path plan under polarity law).
3. Generate slate so new picks carry priced rankingP + independents.
4. Odds insert SLA is separate (stale odds ≠ ranking polarity).
