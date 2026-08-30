# Isotonic + log-loss optimization (2026-08-10)

**Apply OFF.** `CALIBRATION_ADJUSTMENTS_ENABLED` stays false. Maps fix REL/NLL, not RES.

## What shipped

| Module | Role |
|---|---|
| `packages/prediction-engine/src/log-loss-optimize.ts` | Newton temperature on NLL, diagnoseLogLoss, holdoutLogLoss |
| `packages/prediction-engine/src/isotonic-debug.ts` | PAVA/CIR plateaus, ranking preservation, in-sample rec |
| `packages/prediction-engine/src/temperature-scaling.ts` | Log-spaced grid fit (NLL) |
| `apps/web/lib/calibration/calibration-map-bakeoff.ts` | Holdout bake-off + CV select + iso debug + NLL temp |
| `apps/web/lib/ops/map-bakeoff-durable.ts` | Persist + ops summary |
| public-surface-truth | `mapBakeoff` compact surface |

## Techniques

1. **Isotonic PAVA** — monotone CEP; plateaus can collapse ranking → use CIR when collapse high  
2. **Temperature (Newton NLL)** — global soften/sharpen; primary log-loss lever for overconfidence  
3. **Platt / Beta** — parametric; better small-n  
4. **CV selectCalibrator** — OOF equal-mass ECE + noise bar (not log-loss objective)  
5. **Holdout bake-off** — bestByBrier + bestByLogLoss reported separately  

## Debugging checklist

1. Run `calibration-metrics` → artifact `calibration-map-bakeoff.json`  
2. Read `mapBakeoff` on public-surface-truth  
3. If `isotonicRecommendation=prefer_parametric` → trust Temp/Platt  
4. If plateauCollapseRate high → CIR or parametric  
5. If bestByLogLoss improves but RES≈0 → **do not apply** — raise ranking first  

## Law

- Never flip PERFORMANCE_STATS / maps while eligibility Brier RED  
- Live eligibility p stays map-free (`live-calibration-p.ts`)  
- PROVEN still needs floors + streak + publish  
