---
name: calibration-pipeline
description: Settled picks -> time hold-out -> CIR -> selected-slice ECE -> fractional/portfolio Kelly. R&D only until CALIBRATION_ADJUSTMENTS_ENABLED.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*), Bash(npx vitest*)
---

# Calibration pipeline (GSE)

## Purpose
Turn settled non-seed picks into calibrated probabilities and survival-sized stakes. Strictly R&D until `CALIBRATION_ADJUSTMENTS_ENABLED` is enabled alongside `MODEL_VERSION` promotion approval.

## Sequence & Code Paths
1. Export: `npm run export:settled-picks` (`scripts/export-settled-picks-for-calibration.mjs`, requires `DATABASE_URL`).
2. Chronological hold-out split: `timeHoldoutSplit` (`packages/prediction-engine/src/probability-calibration.ts`) — preserve timestamp order, never random-shuffle across time.
3. Fit `centeredIsotonicCalibration` (CIR) on train fold; score strictly on out-of-sample test fold (`calibration-map.ts`, `probability-calibration.ts`).
4. Report signed `selectedSliceEce` (paradox gap on +EV selected slice vs full population).
5. Size stakes with `sizeAfterCalibration` (`packages/prediction-engine/src/calibration-kelly-bridge.ts`) and `portfolioKellyStakes` (`packages/prediction-engine/src/edge-lab/kelly.ts`) × `clvDeflator` (zeros out until >= 50 settled CLV samples).

## Guardrails
- Prefer CIR over step-function PAVA when ranking or Kelly sizing; full Kelly is forbidden — always use fractional Kelly (κ ≈ 0.25–0.30) × `clvDeflator`.
- Never report Kelly stake sizing as CLV, never wire live sizing without `CALIBRATION_ADJUSTMENTS_ENABLED`, and exclude Polymarket (compliance hold).
- Reference documentation: `docs/ops/CALIBRATION_PIPELINE.md`.

## Verification & Done
```powershell
npm run calibration:offline
npm run agent:eval
```
Done when `npm run calibration:offline` (`failed: []`) and `npm run agent:eval` exit `0` with time-ordered OOS validation.
