# superlinear-ai/conformal-tights

- Stars: 118 (MIT) — pushed 2026-05-01, maintained; from Superlinear (Belgian ML consultancy)
- Repo: https://github.com/superlinear-ai/conformal-tights

## 1. Vision

**Coherent** Conformal Prediction as a scikit-learn meta-estimator: wrap *any* sklearn regressor and get conformalized quantile predictions and intervals where the quantiles are guaranteed **monotone** (no quantile crossing — the 25th percentile can never exceed the 75th), via two-level conformal calibration of absolute and relative residuals. Also ships a Darts forecaster for probabilistic time-series.

## 2. The Ask

Any sklearn regressor + a calibration split. `ConformalTightsRegressor(base_estimator).fit(X_cal, y_cal)`-style API; pure sklearn conventions.

## 3. Constraints

- License: MIT. Young package (118 stars) — smaller battle-testing than MAPIE/crepes, but the sklearn meta-estimator design means it composes with everything.
- Coherence is enforced post-hoc; the underlying quantile estimates still need to be reasonable.

## 4. GSE lens

The **quantile-interval workhorse** for per-signal rows. Opinionated:

- Quantile crossing is not a theoretical nicety — crossed quantiles produce nonsense prop bands ("25th percentile 82.5 yards, 75th percentile 79.1 yards"), which is exactly the kind of artifact that destroys trust in published numbers. Coherence should be a hard requirement on every interval GSE ships.
- This is the cleanest path to adaptive intervals on existing GSE regressors: no need to retrain quantile heads — wrap the current point regressor, conformalize residuals on the 2025 held-out slice, get coherent intervals, live-check coverage on 2026 W1-4.
- **Walk-forward**: the residual distribution is season-specific; re-conformalize per season. The two-level (absolute + relative) calibration is genuinely useful for football — relative residuals handle the scale difference between a 45-point total game and a 38-point total game.
- Pair with MAPIE when you need the exchangeability test gate; pair with crepes when you need Mondrian conditioning. This one is the interval formatter.

## 5. Verdict

**REBUILD/ADOPT** — adopt the meta-estimator pattern for interval outputs on all regression signals; the coherence guarantee is the reason. MIT.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/superlinear-ai/conformal-tights
- Diagram: https://gitdiagram.com/superlinear-ai/conformal-tights
- Star history: https://star-history.com/#superlinear-ai/conformal-tights (118 stars, growing)
- Open in browser IDE: https://github.dev/superlinear-ai/conformal-tights
