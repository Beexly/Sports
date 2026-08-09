# Offline bake-off vs PROVEN floors (R&D)

## Live RED (do not invent)

| Metric | Live | Floor |
|--------|------|-------|
| n_map | ~760 | ≥100 |
| Brier | ~0.275 | ≤0.22 |
| ECE | ~0.112 | ≤0.05 |
| Murphy reliability | ~0.026 | ≤0.05 ✓ |
| Murphy **resolution** | ~0.002 | (diagnostic) |

Low **resolution** means forecasts barely separate winners from losers. Recalibration maps (Temperature, Platt MAP, hierarchical EB τ) mainly fix **reliability**; they cannot invent ranking power.

## Methods compared (offline)

Raw · Temperature · Platt MLE · Platt MAP (IRLS) · EB bins · hierarchical EB τ

## Synthetic stress

`runSyntheticFloorStressBakeoff` builds a low-resolution overconfident set (~live diagnosis). If **no** method passes floors, conclusion:

> **Engine resolution insufficient — recalibration alone will not unlock PROVEN.**

## Production policy

- `CALIBRATION_ADJUSTMENTS_ENABLED` remains **false** until founder YES after a **live** time-holdout win on canonical WIN/LOSS.
- Never lower floors to clear PROVEN.
- Never AUTO_PUBLISH while eligibility RED.
