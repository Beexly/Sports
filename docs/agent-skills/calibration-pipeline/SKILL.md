---
name: calibration-pipeline
description: Settled picks → time hold-out → CIR → selected-slice ECE → fractional/portfolio Kelly. R&D only until CALIBRATION_ADJUSTMENTS_ENABLED.
---

# Calibration pipeline (GSE)

## Purpose
Turn settled non-seed picks into honest probabilities and survival-sized stakes.
**Not live** until `CALIBRATION_ADJUSTMENTS_ENABLED` + human MODEL_VERSION gate.

## Path
1. `npm run export:settled-picks` (needs real DATABASE_URL)
2. Time hold-out only — `timeHoldoutSplit` (never random shuffle)
3. Fit `centeredIsotonicCalibration` on train; score on test
4. Report `selectedSliceEce` (calibration paradox on +EV slice)
5. Size with fractional/portfolio Kelly + `clvDeflator` (zeros until ~50 CLV samples)

## Code
| Piece | Path |
|-------|------|
| Export | `scripts/export-settled-picks-for-calibration.mjs` |
| CIR / hold-out / paradox | `packages/prediction-engine/src/probability-calibration.ts` |
| Portfolio Kelly | `packages/prediction-engine/src/edge-lab/kelly.ts` |
| Offline dry-run | `npm run calibration:offline` |
| Doc | `docs/ops/CALIBRATION_PIPELINE.md` |

## Laws
- Prefer CIR when ranks/stakes matter; PAVA OK for bin ECE only
- Full Kelly forbidden
- Do not report sizing as CLV
- Do not wire into live scoring without the gate
- Polymarket is not a calibration target (compliance hold)

## Commands
```bash
npm run export:settled-picks
npm run calibration:offline
npm run agent:eval
```

## CIR → Kelly bridge
- `sizeAfterCalibration` in `calibration-kelly-bridge.ts`
- Fit CIR on train → calibrate size rows → portfolio/fractional Kelly × CLV deflator
- Export: package barrel `@sports/prediction-engine`
- Portfolio: `portfolioKellyStakes` (also exported from barrel — Session 2)

