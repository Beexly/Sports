# uncertainty-toolbox/uncertainty-toolbox

- Stars: 2,015 (MIT) — the most-starred target in this sweep
- Repo: https://github.com/uncertainty-toolbox/uncertainty-toolbox (pip: `uncertainty-toolbox`)

## 1. Vision

The standard metrics-and-visualization toolbox for **regression** uncertainty: given predictions + predicted stds + ground truth, `get_all_metrics()` returns the full battery — NLL, CRPS, calibration error, sharpness, interval coverage — plus plots, plus **isotonic-regression recalibration** (Kuleshov et al.) that remaps predicted CDFs to be average-calibrated.

## 2. The Ask

Predicted values, predicted uncertainties (stds or distributions), ground truth — on a held-out set. Pure numpy/pandas-level; test suite included.

## 3. Constraints

- License: MIT. Regression-focused by design (its sibling verified_calibration covers classification; the READMEs cross-reference each other).
- The isotonic recalibration needs enough held-out points to fit a stable CDF map — same small-n caution as always; and see the idr-calibration dossier for a 2026 warning about isotonic-distributional artifacts.
- Last push 2025-03 — stable rather than fast-moving.

## 4. GSE lens

This is the **regression half of the calibration-on-wire metric standard**, pairing with verified_calibration's classification half:

- Every regression signal's calibration row (player yards, totals, spreads-as-numbers) gets `get_all_metrics()` on the 2025 held-out slice: calibration error + sharpness + NLL + CRPS. Sharpness matters — a calibrated-but-vacuous interval ("total will be between 0 and 100") is useless, and this toolbox is one of the few that measures both.
- Its isotonic recalibration is the candidate method for NGBoost output distributions — but gated by the idr-calibration warning: check PIT uniformity *after* recalibration on the 2026 W1-4 live-check; if the PIT shows the Thomae-function artifact pattern, fall back to conformal intervals instead of trusting the remapped CDF.
- **Walk-forward**: refit the recalibration map per season on the most recent held-out slice.

## 5. Verdict

**ADOPT** — the regression calibration metric suite and the default recalibrator for distribution outputs, with the IDR artifact check as a gate. MIT.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/uncertainty-toolbox/uncertainty-toolbox
- Diagram: https://gitdiagram.com/uncertainty-toolbox/uncertainty-toolbox
- Star history: https://star-history.com/#uncertainty-toolbox/uncertainty-toolbox (2,015 stars)
- Open in browser IDE: https://github.dev/uncertainty-toolbox/uncertainty-toolbox
