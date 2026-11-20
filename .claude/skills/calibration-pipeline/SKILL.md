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
5. Size stakes with `sizeAfterCalibration` (`packages/prediction-engine/src/calibration-kelly-bridge.ts`), `portfolioKellyStakes` (`packages/prediction-engine/src/edge-lab/kelly.ts`) × `clvDeflator` (zeros out until >= 50 settled CLV samples), and estimation-uncertainty-shrunk Kelly (`bakerMcHaleShrunkKelly` in `packages/prediction-engine/src/calibration/conformal-copula-kelly.ts` / `baker_mchale_shrunk_kelly` in `evaluation/frozen/score_walkforward_calibration_v1.py`).
6. Benchmark candidate transforms along the immutable Python walk-forward ladder (`evaluation/frozen/score_walkforward_calibration_v1.py`, `configs/ablation_ladder/*.json`, `scripts/calibration/run_frozen_ablation_ladder.py`, `scripts/calibration/evaluate_streams_15p_to_15x_joint_ablation.py`) before changing active parameters.

## Guardrails
- Prefer CIR over step-function PAVA when ranking or Kelly sizing; full Kelly is forbidden — always use fractional Kelly (κ ≈ 0.25–0.30) × `clvDeflator`.
- Never report Kelly stake sizing as CLV, never wire live sizing without `CALIBRATION_ADJUSTMENTS_ENABLED`, and exclude Polymarket (compliance hold).
- Never modify `evaluation/frozen/` scoring equations when running ablations; log OOS Brier, Log-Loss, ECE, Equal-Mass ECE, and null holds verbatim.
- Reference documentation: `docs/ops/CALIBRATION_PIPELINE.md`.

## Verification & Done
```powershell
npm run calibration:offline
npm run agent:eval
python scripts/calibration/run_frozen_ablation_ladder.py
python tests/verify_out_of_sample_calibration.py --enforce-gate
```
Done when `npm run calibration:offline` (`failed: []`), `npm run agent:eval`, `run_frozen_ablation_ladder.py`, and `--enforce-gate` exit `0` with time-ordered OOS validation.
