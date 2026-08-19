# RES-aware calibration + Online Convex Optimization (shadow)

Updated: **2026-08-10** · **Apply OFF** · live eligibility map-free

## The refined claim

Maps **cannot invent ranking** from pure market-echo noise.  
Maps **can** raise \(\mathrm{Var}[P_{\mathrm{cal}}]=\mathrm{RES}\) when the raw model is **underconfident** (mass squeezed toward 0.5) and the true posterior is sharper — provided expansion is **outcome-fitted** under a REL guard (never free stretch).

Calibrated identity: \(\mathrm{BS} = \mathrm{UNC} - \mathrm{Var}[P]\). Minimizing Brier ⇔ maximizing RES under REL≈0.

## Modules

| Module | Role | Status |
|--------|------|--------|
| `online-beta-recalibration.ts` | OGD on \((a,b)\) for \(g=\sigma(a\cdot\mathrm{logit}\,p+b)\) under **log-loss** (convex) | Shadow |
| `fitResAwareBeta` | Grid max **val RES** s.t. REL≤0.015 + \(\lambda(a-1)^2\) | Shadow |
| `brier-ogd-ensemble.ts` | Simplex OGD on Brier for ensemble weights | Shadow |
| `adaptive-delta-hedge.ts` | Hedge experts over \(\delta\) candidates; sit-out loss≈0.25 | Shadow |
| `oco-pipeline.ts` | Full sequence: Beta → ensemble → Hedge δ → updates | Shadow |
| `online-beta-sliding-window.ts` | Trailing-window OGD + full-vs-window metrics | Shadow |
| `adaptive-delta-analysis.ts` | Hedge regret / integrity / weight concentration | Shadow |
| map bake-off | Surfaces resAware / onlineBeta / oco / sliding / hedge | Cron offline |

## Law

- Live `resolveLiveCalibrationP` stays **map-free**  
- `CALIBRATION_ADJUSTMENTS_ENABLED` / PERFORMANCE_STATS / AUTO_PUBLISH **not flipped**  
- Free stretch \(p'=0.5+k(p-0.5)\) without outcomes = **forbidden**  
- RES-cal only when holdout REL holds and RES gain is real  

## Ops surface

`mapBakeoff` on public-surface-truth:

- `resAwareSelected` / `resAwareA` / `resAwareResGain`  
- `onlineBetaA`  
- `ocoPublishedRes` / `ocoRecommendedDelta`  
- `slidingWindowA` / `slidingDeltaA` / `slidingExpansionPreferred`  
- `hedgeRecommendedDelta` / `hedgeIntegrityStatus` / `hedgeRegret`  

## Path to Brier ≤ 0.22

1. Independents + selective + pause (primary RES)  
2. Shadow RES-cal / OCO when underconfident (secondary Var[P])  
3. Integrity: \(\mathrm{BS}_\mathrm{paused}\approx\mathrm{UNC}\)  
4. GREEN×3 only on **live** eligibility floors — never on shadow alone  

See [BRIER_OPTIMIZATION_TECHNIQUES.md](./BRIER_OPTIMIZATION_TECHNIQUES.md) · [MURPHY_RES_AND_BRIER_MIN.md](./MURPHY_RES_AND_BRIER_MIN.md)
