# p-lambda/verified_calibration

- Stars: 155 (MIT) — companion to Kumar, Liang, Ma, "Verified Uncertainty Calibration" (NeurIPS 2019)
- Repo: https://github.com/p-lambda/verified_calibration (pip: `uncertainty-calibration`)

## 1. Vision

Two things most calibration code gets wrong, fixed: (1) ECE "plugin" estimators are biased, especially at small n — this library estimates calibration error more accurately; (2) it puts **bootstrap confidence intervals around the calibration error itself**, so you know whether your measured miscalibration is real or noise. Plus a Platt-scaling variant ("PlattBinnerMarginalCalibrator") for recalibration.

## 2. The Ask

Predicted probabilities + labels on a held-out set. Bootstrap resampling for the CIs (cheap — it's just resampling the held-out arrays).

## 3. Constraints

- License: MIT. Pushed 2022-11 — paper-code, not a living library, but the math is stable and the API is tiny.
- Focuses on classification; for regression use uncertainty-toolbox instead (the README says so itself).
- Bootstrap CIs widen honestly at small n — that is the feature, not a bug.

## 4. GSE lens

This is the **single most important method for calibration-on-wire**, because the standing rule has a known weakness: per-signal rows with tiny samples. GSE's current rows (train 2022-24 | eval 2025 | metric | n | 2026 W1-4 live-check) report a metric and an n — but a bare ECE number at small n is noise, and Garrett's contamination rule already shows how a bad fit poisons downstream trust. The play:

- Every per-signal calibration row computes ECE **with bootstrap CIs** via this library. If the CI straddles zero, the signal is not calibrated — it is *unmeasured* — and no adjustment ships on it.
- Use its Platt-binner calibrator as the default per-signal map for small-n signals (Platt is a 2-parameter sigmoid; far less overfit-prone than isotonic at small n).
- For the refusal problem: refusal thresholds should be set on the **lower bound of the calibrated-confidence CI**, not the point estimate. "Refuse when even the optimistic end of the calibration interval says edge < X." That gives the honest-INVALID-vs-predict decision a historical, statistical base instead of a vibes threshold.

## 5. Verdict

**ADOPT** — the ECE-with-bootstrap-CIs metric and Platt-binner recalibrator become the per-signal-row standard. MIT.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/p-lambda/verified_calibration
- Diagram: https://gitdiagram.com/p-lambda/verified_calibration
- Star history: https://star-history.com/#p-lambda/verified_calibration (155 stars)
- Open in browser IDE: https://github.dev/p-lambda/verified_calibration
