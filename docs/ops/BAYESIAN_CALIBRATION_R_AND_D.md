# Bayesian Calibration R&D (not production)

**Status:** Offline research only.  
**Eligibility / PROVEN:** still driven by **frequentist live maps** (Brier, ECE, Murphy reliability) from `calibration-metrics` + `CalibrationEligibility`.  
**Do not** set `CALIBRATION_ADJUSTMENTS_ENABLED` from this workstream without a versioned holdout bake-off win + founder policy.

## Options considered

| Method | Idea | Pros | Cons |
|--------|------|------|------|
| Hierarchical Beta–Binomial bins | Shrink bin rates toward global/base-rate with strength ν | Stable sparse bins; interpretable | Bin edges arbitrary; not a continuous map |
| Empirical Bayes ν | Moment/EB fit of shrink strength | Few knobs; data-driven ν | Sensitive to binning |
| Bayesian / MAP Platt | `sigmoid(A·logit(p)+B)` with Gaussian prior on A,B | Continuous; regularized | Misspecified if p not true prob |
| Hierarchical logistic | Global A,B + group intercepts (sport\|market) | Pooling across groups | Needs more data; easy to overclaim |
| Temperature scaling | Single T on logit | Simple baseline | Limited flexibility |
| Isotonic (PAVA) | Monotone map | Flexible, common in prod paths | Can overfit small n; already gated behind adjustments |

## Decision (recorded)

1. **Production eligibility stays frequentist** on live canonical WIN/LOSS maps until a bake-off wins holdout Brier/ECE (and Murphy reliability) vs current Raw/Temperature/Platt/isotonic baselines.
2. **Bayesian tools live under** `apps/web/lib/calibration/bayes-bins.ts`, `platt-map.ts`, `offline-bakeoff.ts` for R&D artifacts only.
3. **Apply path remains OFF** — no swap of production confidence maps, no auto `CALIBRATION_PUBLISHED`.
4. Optional later: versioned bake-off artifact → if MAP Platt or EB bins dominate on time-holdout, open a **separate** PR to propose adjustments activation under existing MODEL_VERSION ceremony.

## How to run bake-off

- Cron/ops can compute samples the same way as calibration-metrics (canonical learning-eligible).
- Call `runOfflineBakeoff(samplesChrono)` and write to durable/internal artifact — never public surfaces.
- Compare methods on **test** slice only.

## Integrity

- No fabricated ROI / PROVEN claims from R&D numbers.
- Demo cockpit N≈120 is not a publish sample.
- ACI (`CONFORMAL_ABSTAIN_ENABLED`) is show/abstain only — **not** a publish gate.
