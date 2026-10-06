# FilippoMB/Ensemble-Conformalized-Quantile-Regression

- Stars: 104 (MIT) — official code for Jensen, Bianchi, Anfinsen, "Ensemble Conformalized Quantile Regression for Probabilistic Time Series Forecasting" (IEEE TNNLS 2022)
- Repo: https://github.com/FilippoMB/Ensemble-Conformalized-Quantile-Regression

## 1. Vision

Post-hoc uncertainty for **time-series** forecasts: train an ensemble of quantile regressors (LSTM, TCN, random forest — any base model), then conformalize the ensemble's quantile predictions to get prediction intervals with valid coverage for sequential data.

## 2. The Ask

A time-ordered dataset + any regression base models + a calibration window. Notebook tutorial walks through preprocessing and base-model comparison.

## 3. Constraints

- License: MIT. Paper-code (pushed 2025-03), notebook-driven, not a packaged library.
- Time-series conformal coverage assumes the future looks like the calibration window — regime shifts (rule changes, new offensive schemes) degrade it; no built-in drift test (unlike MAPIE's exchangeability tests).

## 4. GSE lens

Relevant to exactly one GSE problem: **in-season sequential forecasting** — e.g., rest-of-season projections updated weekly, where each week's forecast conditions on the last. The ensemble-of-quantiles + conformalization recipe is sound, but for GSE's purposes the moving parts (LSTM/TCN base models) are overkill versus the walk-forward discipline already in place. The takeaway to steal: conformalize on a **rolling calibration window** (last N weeks), not a fixed 2025 slice, for anything updated weekly in-season. For the weekly-refreshed signals, the 2026 W1-4 live-check should itself become the rolling window as the season progresses.

## 5. Verdict

**REBUILD** — don't wire the paper code; lift the rolling-window conformalization pattern for weekly-updated signals. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/FilippoMB/Ensemble-Conformalized-Quantile-Regression
- Diagram: https://gitdiagram.com/FilippoMB/Ensemble-Conformalized-Quantile-Regression
- Star history: https://star-history.com/#FilippoMB/Ensemble-Conformalized-Quantile-Regression (104 stars)
- Open in browser IDE: https://github.dev/FilippoMB/Ensemble-Conformalized-Quantile-Regression
