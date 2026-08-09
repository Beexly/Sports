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

## Tangent logistic = Newton–IRLS / Laplace (not a separate product)

"Tangent logistic" is the local quadratic approximation used by Newton steps on the logistic log-likelihood (IRLS). At the MAP, the same Hessian **H = X′WX + Σ⁻¹** is the **Laplace** posterior precision:

- MAP point: mode of posterior (production candidate only after bake-off)
- Laplace: local Gaussian around MAP for **internal** predictive uncertainty
- **Do not** market Laplace intervals as ROI or edge certainty

Code: `fitPlattIrls` / `fitPlattMapFull` / `plattPredictiveMean` in `apps/web/lib/calibration/platt-map.ts`.

## Hierarchical ridge intercepts

`fitPlattMapHierarchical`: shared (A,B) + per-group `u_g` with ridge prior. Use only in offline bake-offs vs global MAP. Does not touch eligibility floors.

## Hierarchical model (fixed groups + EB τ only)

```
Global:
  A = β₁ ~ Normal(mean=1, var=1)   # mild rescale of logit score
  B = β₀ ~ Normal(mean=0, var=1)   # mild shift
Group:
  u_g ~ Normal(0, τ²)
  τ ~ EmpiricalBayes (moment or Laplace marginal); clamp [0.05, 2.0]
  # optional offline hyperprior only: τ ~ HalfNormal(1) — not used in prod path
Non-centered (sampling notation only):
  z_g ~ Normal(0,1), u_g = τ * z_g
Score:
  s = logit(clip(p_raw))
  P(y=1) = sigmoid(A * s + B + u_g)
Fit:
  MAP via IRLS/Newton; optional Laplace at mode
  Time-holdout on canonical WIN/LOSS only
```

### Dirichlet process clustering — R&D only, **not in production path**

Do **not** implement DP mixture clustering of groups in prod. Production eligibility stays frequentist floors. Hierarchical work uses **fixed** `sport|market` keys + **EB τ** only.

### Code
- `hierarchical-eb-tau.ts` — `fitEmpiricalBayesTau`, `fitTauFromLaplaceGroupMaps`, clamp
- `platt-map.ts` — `fitPlattMapHierarchical` returns `{ global, groupIntercept, tau, tauMethod }`
