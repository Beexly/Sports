# Calibration uncertainty stack (internal)

```
Binary p → Temp / Platt / PAVA / EB-τ → Brier·ECE·Murphy(R, resolution, uncertainty) → eligibility
          → stationary-bootstrap bands (internal)
          → optional conformal abstain (flag OFF)
Numeric y → QRF quantiles → optional CQR intervals (props/margins) — not PROVEN path
```

| Use in sports | Skip for |
|---------------|----------|
| Spread / total / prop **numeric** intervals | Binary side calibration (use Platt/Temp/PAVA) |
| Adaptive-width uncertainty on maps | PROVEN eligibility (still Brier/ECE on **p**) |
| Input to CQR | Request-path heavy forests without caching |

## Stationary bootstrap
Mean block ≈ 14 (days/events). Resample contiguous geometric blocks with wrap.
Use for: map grid CI, Brier CI. Not for public ROI.

## Conformal
- **Map CI** ≠ conformal coverage
- **ACI abstain** = show/set size only (`CONFORMAL_ABSTAIN_ENABLED` default false)
- Split-conformal residual sets = outcome coverage, optional R&D

## EB-τ hierarchical
`u_g ~ N(0,τ²)`, τ̂ moment match clamp [0.05, 2]. Unknown g → u=0.

## Binary vs numeric product split

```
Binary sides: Raw → Temp | Platt IRLS | Isotonic PAVA/CIR | EB-τ
              → Brier / ECE / Murphy → eligibility (PROVEN path)
Numeric lines: Quantile model (e.g. QRF) → CQR intervals (coverage product layer)
Conformal abstain / CQR: flags default OFF; not PROVEN unlocks
```

| Prefer isotonic PAVA/CIR | Prefer Platt / temperature |
|--------------------------|----------------------------|
| Odd reliability shape | Small N, need strong regularization |
| Ranking OK, levels wrong | Need smooth global rescale only |

### CQR API (TypeScript)
`conformalQuantile`, `cqrInterval` in `apps/web/lib/calibration/cqr.ts`.
Wire only behind an explicit numeric-interval flag later — never on public binary board by default.
