# Explore: Murphy decomposition components

## Live production (do not invent)
| Component | ≈ value | Verdict |
|-----------|---------|---------|
| Brier | 0.275 | Fails floor ≤0.22 |
| REL reliability | 0.026 | Moderate miscalibration |
| **RES resolution** | **0.002** | **Near zero — blocking PROVEN** |
| UNC uncertainty | 0.250 | Base-rate dominated |

## Identity
Raw Brier = mean\((p-y)^2\).  
Binned: Brier ≈ REL − RES + UNC (gap = within-bin variance).

## What to work
1. **RES** — selective publish, better features, drop dead groups  
2. **REL** — only after RES moves: Platt IRLS / Temp / Isotonic  
3. Never lower floors to greenwash UNC/REL

Code: `probability-calibration.ts` `brierDecomposition` · `murphy-components-explore.ts`
