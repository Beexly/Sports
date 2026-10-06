# aangelopoulos/conformal-prediction

- Stars: 1,095 (MIT) — Anastasios Angelopoulos (Berkeley), companion to "A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification" (arXiv 2107.07511)
- Repo: https://github.com/aangelopoulos/conformal-prediction

## 1. Vision

The easiest on-ramp to conformal prediction: runnable notebooks applying it to real problems with state-of-the-art models — ImageNet prediction sets, **conformalized quantile regression (CQR) for regression**, multi-label classification. Raw model outputs are bundled so you can experiment without training anything.

## 2. The Ask

Nothing to install beyond a conda env — it's a tutorial repo, not a library. Bring your own model outputs to adapt the templates.

## 3. Constraints

- License: MIT. Educational, not maintained as software (notebooks).
- Teaches split-conformal and CQR correctly, but doesn't package them.

## 4. GSE lens

**Method reference, not code to wire.** Two things worth lifting for the calibration-on-wire spec:

- The **CQR notebook** (medical-expenditure regression with gradient boosting) is the closest public template to GSE's prop/total problem: quantile regressors + conformalized residuals = adaptive intervals that widen where the model is uncertain. If GSE's quantile heads are built, this is the recipe for their intervals — though `conformal-tights` packages the same idea better (see that dossier).
- The repo's framing discipline is worth copying into GSE docs: coverage guarantees stated up front, exchangeability named as the load-bearing assumption. Every calibration row should state its assumption the same way — it makes the walk-forward recalibrate-per-season rule self-evident.

## 5. Verdict

**REBUILD** — study the CQR template, implement via conformal-tights/MAPIE; don't wire notebooks. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/aangelopoulos/conformal-prediction
- Diagram: https://gitdiagram.com/aangelopoulos/conformal-prediction
- Star history: https://star-history.com/#aangelopoulos/conformal-prediction (1,095 stars)
- Open in browser IDE: https://github.dev/aangelopoulos/conformal-prediction
