# Calibration map apply matrix (always default OFF)

| Map | Bootstrap CI | Apply |
|-----|--------------|-------|
| Temperature | optional | **OFF** until holdout floors |
| Platt IRLS | optional | **OFF** |
| Isotonic PAVA | recommended on tails | **OFF** |
| Hierarchical EB-τ | optional | **OFF** |

## Uncertainty (internal only)
| Method | Idea |
|--------|------|
| Binomial / Beta per PAVA block | Wilson on block wins/n — simple; ignores data-driven block choice |
| Bootstrap | Resample train, refit, percentile band of p_cal(s) — more honest |
| Conformal on top | Coverage sets ≠ CI on the map |

**Never** market intervals as ROI or “verified edge.”

## Bake-off order
Raw → Temperature → Platt IRLS → Isotonic PAVA/CIR → hierarchical EB-τ  
Metrics: Brier · ECE · Murphy R · Resolution · Uncertainty · log loss  

Eligibility = frequentist on **shown** p.  
`CALIBRATION_ADJUSTMENTS` only after holdout passes floors + founder flag.
