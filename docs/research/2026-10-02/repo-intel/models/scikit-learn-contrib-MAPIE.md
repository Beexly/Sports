# scikit-learn-contrib/MAPIE

- Stars: 1,599 (BSD-3-Clause) — pushed 2026-09-30, i.e. actively maintained
- Repo: https://github.com/scikit-learn-contrib/MAPIE (pip/conda: `mapie`)
- Part of the scikit-learn-contrib ecosystem; 2026 additions: risk control, **exchangeability tests**, adaptive conformal methods.

## 1. Vision

Model-agnostic prediction intervals / prediction sets with **finite-sample coverage guarantees**, for regression, classification, and time series — wrap any sklearn/TF/PyTorch model, conformalize on a calibration set, get intervals guaranteed to contain the truth with probability 1-alpha under exchangeability. Now also does risk control (guarantees on recall/precision-style metrics) and ships exchangeability tests that tell you whether the method is even legitimately applicable to your data.

## 2. The Ask

A fitted regressor/classifier + a held-out **conformalization dataset** (the same held-out slice the calibration-on-wire rule already demands). Works on one machine; cross-conformal variants trade compute for data efficiency.

## 3. Constraints

- License: BSD-3-Clause — commercial-safe.
- The coverage guarantee rests on **exchangeability** between calibration and deployment data. Seasonal regime shift breaks it — hence the new exchangeability tests, which should be run as a gate.
- API went through a v1 breaking change (2025); pin the version.

## 4. GSE lens

This is the conformal complement to the probability-calibration library (probkit/probmetrics). Where probmetrics fixes "the 62% means 62%", MAPIE answers "give me the interval that contains the true total 90% of the time" — exactly what player-prop and game-total outputs need before anything is publishable.

- **Per-signal rows**: MAPIE's `MapieRegressor`/`MapieClassifier` slots into the calibration row as the interval method: fit on 2022-24, conformalize on 2025, live-check empirical coverage on 2026 W1-4. Coverage on W1-4 is itself a calibration metric for the row.
- **What it does that the t10-conformal track should steal**: the **exchangeability tests** — run them on the 2026 W1-4 live-check slice before trusting any conformal interval. If the test rejects exchangeability between 2025-calibration and 2026-live, the interval is void and the signal gets re-conformalized on recent data. This is the walk-forward discipline made automatic.
- **Recalibrate per season, not one global map**: conformal quantiles are fit on the calibration slice; a 2026 map must be conformalized on 2026-ish data (2025 season at the oldest). Cheap to recompute.
- For classification pick outputs, prediction *sets* ("the winner is in {A,B} with 90% confidence") are a natural honest-INVALID alternative: empty or oversized sets = refuse.

## 5. Verdict

**ADOPT** — the interval/set engine for all regression and classification outputs; adopt the exchangeability test as a live-check gate. BSD-3-Clause.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/scikit-learn-contrib/MAPIE
- Diagram: https://gitdiagram.com/scikit-learn-contrib/MAPIE
- Star history: https://star-history.com/#scikit-learn-contrib/MAPIE (1,599 stars, active)
- Open in browser IDE: https://github.dev/scikit-learn-contrib/MAPIE
