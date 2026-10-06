
# Kats Evaluation for the GSE Engine

**Repo:** https://github.com/facebookresearch/Kats · **Docs:** https://facebookresearch.github.io/Kats · MIT license · 6,484 stars / 633 forks

## Maintenance status (verified today)

- **Not dead, but "community-maintained":** commits as recent as **Oct 1, 2026** (4 days ago), roughly monthly cadence through 2026. 59 open issues, none newer than Mar 2025 — a modest backlog, not a red flag by itself.
- **However:** PyPI is still at **0.2.0 (2022)**, setup.py still declares "Development Status :: 3 - Alpha", and the dependency pins are **four years stale**: `numpy>=1.21,<1.22`, `pandas<=1.3.5`, `statsmodels==0.12.2`, `holidays<=0.57`, `packaging<22`. This is the single biggest integration risk — a bare `pip install kats` would try to **downgrade numpy/pandas/statsmodels** in the engine environment and break everything modern (nflverse tooling, current sklearn, etc.).
- Maintainers per README: community-led (Nickolai Kniazev, Peter Shaffery). Original Meta team has moved on.

## Capability inventory (verified from repo tree + docs)

**Forecasting** (`kats/models/`): ARIMA, SARIMA, Prophet, NeuralProphet, Holt-Winters, Theta, STLF, VAR, Bayesian VAR, harmonic regression, linear/quadratic models, ML-AR, LSTM, simple heuristics — plus `ensemble/`, `globalmodel/` (neural net), `metalearner/` (self-supervised hyperparameter tuning), `nowcasting/`, `reconciliation/`.

**Detection** (`kats/detectors/`): BOCPD (Bayesian online changepoint), CUSUM, DTW-based changepoint, hourly-ratio, interval, multivariate, outlier, Prophet-based detector, robust-stat, StatSig, threshold, Mann-Kendall trend — plus `meta_learning/` (recommends detection algorithm + params for your dataset) and anomaly post-processing.

**TSFeatures**: 65 features with clear statistical definitions, built to feed ML classifiers/regressors (docs-confirmed).

**Utilities** (`kats/utils/`): `backtesters.py` (walk-forward backtesting), `emp_confidence_int.py` (empirical prediction intervals), parameter tuning utils, simulators (synthetic data + anomaly injection), decomposition, data partitioning.

## GSE capability mapping

| Kats capability | GSE use |
|---|---|
| Forecasting (Theta/ARIMA/Holt-Winters/ensemble) | Baseline models for line/odds-movement time series per game/prop |
| Changepoint (BOCPD, CUSUM) | Regime-shift detection: steam moves, injury-news shocks, line re-opens |
| Anomaly (Outlier, StatSig) | Flagging unusual market moves vs. historical behavior |
| TSFeatures (65) | Feature extraction feeding the ML layer — trend, seasonality, entropy, lumpiness stats per team/player series |
| Backtesters + empirical intervals | Walk-forward validation harness for time-series models; calibration-friendly intervals |
| Meta-learner | Auto-selecting detection/forecast configs across heterogeneous series (all 32 teams, hundreds of props) |

## Comparison vs alternatives

- **statsmodels**: rock-solid ARIMA/ETS/VAR, but no unified API, no detection, no backtesting harness. Kats' ARIMA/SARIMA are wrappers around it — no forecasting edge there.
- **Prophet standalone**: Kats' `ProphetModel` is just a wrapper. If you want Prophet, install Prophet directly.
- **Merlion (Salesforce)**: effectively dead — archived, last PyPI ~643 days ago, and a published unsafe-deserialization vuln sits on the archived HEAD. Do not touch.
- **Darts (unit8co)**: the strongest alternative for forecasting — very active (0.47.0), unified sklearn-like API, 20+ models incl. deep learning, built-in anomaly detection and `historical_forecasts` backtesting. Beats Kats on forecasting breadth and maintenance.
- **sktime**: best-maintained unified API, huge breadth (forecasting + classification + transformations). Stronger than Kats as a general framework.
- **Nixtla statsforecast**: fastest AutoARIMA/ETS/Theta implementations — best pure-statistical baselines at scale, minimal dependency weight.

**Where Kats wins:** the detection suite (BOCPD/CUSUM/DTW changepoint + meta-learning recommender) and TSFeatures have no equally convenient single-package equivalent; the one-stop-shop packaging (detect + forecast + features + backtest in one API) is genuinely convenient. **Where it loses:** forecasting is thin wrappers around other libraries; packaging/dependency hygiene is poor; deep-learning models lag Darts/neuralforecast.

## Recommendation

**Worth integrating (2–3 components), in priority order:**

1. **TSFeatures (65-feature extractor)** — highest value/effort ratio. Feeds the ML layer directly with well-defined series statistics (trend strength, seasonality, entropy, stability) for team/player/prop series. Effort: **small (days)** — mostly an adapter from GSE series → `TimeSeriesData` → feature vectors.
2. **Changepoint detection (BOCPD + CUSUM)** — purpose-built for the steam-move / injury-shock regime problem, which is core to the "timing/news before the move" edge. Effort: **small–medium** — detector + threshold calibration on historical line-move data.
3. **Backtesters + empirical prediction intervals** — a real walk-forward harness with calibration-friendly intervals, matching the engine's calibration-state discipline. Effort: **medium** — wire into the existing test/benchmark lane.

**For forecasting itself, prefer Darts or Nixtla statsforecast** over Kats' wrappers — better maintained, and Kats adds nothing over statsmodels/Prophet underneath.

**Gotchas:**
1. **Dependency pins are hostile** (`numpy<1.22`, `pandas<=1.3.5`, `statsmodels==0.12.2`). Do NOT `pip install kats` into the engine env. Integration path: vendor/extract the needed modules (`tsfeatures`, `detectors`) into the repo with the re-implementation rule, or run Kats in an isolated venv/branch and export features. (Note the Neon branch-only testing rule for any DB-adjacent work — not applicable here, this is pure compute.)
2. **Prophet weight**: Kats' Prophet support drags in the prophet package (Stan backend, heavy build). The recommended components above don't need it — skip it.
3. **Alpha status is honest**: the detectors and TSFeatures are the mature parts; treat `globalmodel`/LSTM as experimental.
4. **Point-in-time discipline**: backtesters must be fed with the as-of-fenced series (the standing point-in-time rule) — Kats won't enforce that for you.

**Sources:** [Kats repo](https://github.com/facebookresearch/Kats) (README, commit history, issues, `kats/models`, `kats/detectors`, `kats/utils`, `setup.py`, `requirements.txt`), [Kats docs](https://facebookresearch.github.io/Kats/), [library landscape comparison](https://github.com/tylsssss/time-series-research-skills/blob/HEAD/skills/time-series-code-implementation/references/library-landscape.md), [Darts](https://github.com/unit8co/darts), [Merlion PyPI](https://pypi.org/project/salesforce-merlion/), [Merlion vuln disclosure](https://github.com/zast-ai/vulnerability-reports/blob/HEAD/SalesForce/Merlion/Unauth_RCE_Chain/VULN-2_unsafe_deserialization.md).

**Bottom line:** Kats is a legitimate ADOPT for three components — TSFeatures, BOCPD/CUSUM changepoint detection, and the backtesting harness — with the dependency-pinning problem handled by vendoring rather than pip-installing. For pure forecasting, Darts or statsforecast are the better call.