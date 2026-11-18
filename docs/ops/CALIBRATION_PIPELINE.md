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
Hold-out split (time-ordered)   timeHoldoutSplit — NEVER fit on test
        │
        ▼
CenteredIsotonic (CIR)          probability-calibration.ts
  · preserves ranking vs PAVA plateaus
  · countDistinctPredictions diagnostic
        │
        ▼
ECE / Brier / reliability       same module
  · selectedSliceEce on **selected (+EV) slice** (calibration paradox)
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
| Time hold-out | `timeHoldoutSplit` |
| Selected-slice ECE | `selectedSliceEce` |
| Offline dry-run | `npm run calibration:offline` |
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

## Offline calibration dry-run (no DB)

```bash
npm run calibration:offline
```

Uses `scripts/calibration-offline/data/synthetic-settled.jsonl` when no export is present.
Asserts package exports + CIR≥PAVA distinct counts + reports paradox gap and CLV deflator gate.

## CIR → Kelly bridge

```text
timeHoldoutSplit(samples)
        │
        ▼
centeredIsotonicCalibration(train)
        │
        ▼
sizeAfterCalibration({ train, sizeRows, rhoClv, settledCount })
        │  · applyCalibrator
        │  · portfolioKellyStakes (≥3 rows) or fractionalKellyStake
        │  · clvDeflator self-disarm
        ▼
stakes[]  (0 until CLV floor)
```

Import: `sizeAfterCalibration`, `portfolioKellyStakes` from `@sports/prediction-engine`.

## Mathematical Guardrails & Arithmetic Audit (2026-11-18)

1. **Hit-Rate Break-Even (`52.38%` at `-110`) vs Net Closing Line Value (`CLV`):** `110 / 210 = 52.381%` is the two-way break-even *outcome win rate* at standard `-110` vig, not expected `CLV` (`arXiv:2608.11505` Pitcan, `2609.06739` Dmochowski, `2303.06021` Walsh & Joshi, `2602.09982` Beuoy, `1710.02824` Kaunitz et al.). Beating a closing price by a smaller fraction than the bookmaker overround (`~4.55%`) can leave net EV negative even at a `>52.4%` beat-close rate; genuine economic edge requires margin-free net CLV `E[p_close_fair * d_offered - 1] > 0` and positive Kelly log-wealth Bayes factors.
2. **Binary Isotonic / CIR Degrees of Freedom (`df = K` steps):** Maximizing `countDistinctPredictions` without complexity control increases binary isotonic effective degrees of freedom `K` and in-sample optimism `2 * K * p_bar * (1 - p_bar) / n` (`arXiv:2607.27301` Rossellini, Barber, Ren & Soloff; `2610.31258` Biegert et al.). Shrink CIR outputs toward a smooth parametric logistic/Beta curve when `K / n` is elevated.
3. **Conformal Coverage Is Not Conditional Kelly Edge:** `1 - alpha` marginal conformal interval coverage does not establish positive conditional log-wealth growth (`arXiv:2608.01494` Ryan); size zero or shrink positions whenever calibrated mean excess edge over fair close does not clear execution and correlation drag.
4. **Fisher-z LCB `clvDeflator`, Effective Sample Size & Non-Gaussian Drawdown:** At small sample sizes (`n = 25` implies binomial `SE = 10%`; `n = 50` implies Fisher-z `SE = 0.146`), raw `rhoClv` exhibits wide sampling noise (`arXiv:2607.27544` Ulrich, `2501.03938` Jacquier et al.). Production sizing must gate on the one-sided Fisher-z lower confidence bound (`tanh(atanh(rho) - z_alpha / sqrt(n - 3))`) and adjust drawdown limits for discrete non-Gaussian tail magnification above continuous Brownian bounds (`arXiv:2608.00127` Landolfi).
5. **Out-of-Loop Search Deflation & Martingale Falsification:** Deflated Sharpe, MinervaScore, GT-Score, IS/WFA/OOS admission gates, and prior-anchored e-value tests must be applied strictly *out-of-loop* against martingale sign-flip placebos (`arXiv:2611.14539` Gencay, `2604.15531` Nikolopoulos, `2610.07701` Zheng, `2608.23808` Santoni et al., `2602.00080` Sheppert, `2603.09219` Pham et al., `2611.15456` Xu, Liu & Sutherland).


