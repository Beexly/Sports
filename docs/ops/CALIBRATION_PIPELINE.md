# Calibration pipeline (settled picks → honest p → Kelly)

R&D path. Live scoring does **not** apply calibration until
`CALIBRATION_ADJUSTMENTS_ENABLED` + human MODEL_VERSION gate.

## Pipeline

```text
npm run export:settled-picks
        │  JSONL: non-seed settled picks + CLV fields
        ▼
Shin de-vig on close prices     packages/prediction-engine/src/shin-devig.ts
        │
        ▼
CLV report (fill vs fair close) packages/.../clv-capture.ts · clv.ts
        │
        ▼
Hold-out split (time-ordered)   NEVER fit calibrator on train
        │
        ▼
CenteredIsotonic (CIR)          probability-calibration.ts
  · preserves ranking vs PAVA plateaus
  · countDistinctPredictions diagnostic
        │
        ▼
ECE / Brier / reliability       same module
  · also check **selected (+EV) slice** (calibration paradox)
        │
        ▼
Fractional / portfolio Kelly    kelly.ts · edge-lab/kelly.ts
  · κ ≈ 0.25–0.30, per-bet + portfolio caps
  · CLV deflator zeros stakes until ~50 settled CLV samples
```

## Code entry points

| Step | Path |
|------|------|
| Export | `scripts/export-settled-picks-for-calibration.mjs` · `npm run export:settled-picks` |
| Shin | `shinDevig` in `packages/prediction-engine/src/shin-devig.ts` |
| PAVA | `isotonicCalibration` |
| **CIR** | `centeredIsotonicCalibration` + `countDistinctPredictions` |
| ECE/Brier | `expectedCalibrationError`, `brierDecomposition`, `reliabilityCurve` |
| Single Kelly | `packages/prediction-engine/src/kelly.ts` (κ=0.25, unit caps) |
| Portfolio Kelly | `packages/prediction-engine/src/edge-lab/kelly.ts` (`portfolioKellyStakes`) |

## Laws

1. Fit calibrator on **time hold-out only**.
2. Prefer CIR when stakes/ranks matter; PAVA OK if only bin ECE.
3. Full Kelly forbidden; fractional + hard caps.
4. Portfolio path: James–Stein edge shrink + correlation haircut + CLV deflator — do not invert Σ for Markowitz-style sizing.
5. Do not report sizing as CLV; CLV is pick-quality, not stake performance.
6. Polymarket remains compliance hold — not a calibration target.

## Offline skill/prompt compile (optional)

`scripts/dspy-gse/` — GEPA-ready Examples + metric for agent skills (not live product).
