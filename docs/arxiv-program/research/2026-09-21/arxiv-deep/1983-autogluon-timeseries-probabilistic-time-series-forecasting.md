# [1983] AutoGluon-TimeSeries: AutoML for Probabilistic Time Series Forecasting (arXiv:2308.05566)

**Citation:** Oleksandr Shchur, Caner Turkmen, Nick Erickson, Huibin Shen, Alexander Shirkov, Tony Hu, Yuyang Wang (2023). *AutoGluon-TimeSeries: AutoML for Probabilistic Time Series Forecasting*. arXiv:2308.05566. URL: https://arxiv.org/abs/2308.05566
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADOPT — open-source AutoML for probabilistic time-series forecasting with quantile outputs; directly matches GSE's need for win-probability distributions and drives the engine's interval forecasts with near-direct reuse.

## 1. Research question
Can the AutoGluon design philosophy (diverse model zoo + automatic ensembling under a time budget) be extended from tabular data to time series, producing an AutoML system that outputs accurate point AND quantile forecasts with 3 lines of code, and does it beat both classical statistical ensembles and deep-learning forecasters on public benchmarks?

## 2. Dataset / schema
29 benchmark datasets from the Monash Forecasting Repository via GluonTS (includes M1, M3, M4 competition data, Electricity, Pedestrian Counts, etc.); filtered to datasets with more than a single time series and fewer than 15M total time steps. Mix of small (M1/M3), few-long-series (Electricity), and many-medium-series (M4) regimes. All public. Dataset statistics in paper Table 8.

## 3. Method / model
`TimeSeriesPredictor` with presets (best_quality used in benchmarks; presets fixed a priori, not tuned on benchmark):
- **Model zoo (3 families):** (a) statistical: AutoETS, AutoARIMA, AutoTheta (StatsForecast); (b) deep learning: DeepAR, PatchTST, Temporal Fusion Transformer (GluonTS/PyTorch); (c) tabular: DirectTabular / RecursiveTabular — convert the TS task to tabular regression (recursive or direct multi-step) wrapped around AutoGluon-Tabular + MLForecast; plus Naive/SeasonalNaive baselines.
- **Validation:** time-series cross-validation (Hyndman & Athanasopoulos) generating out-of-fold predictions.
- **Ensemble:** forward (greedy) selection over models, weights tuned to optimize the chosen eval metric (wQL or MASE) on OOF predictions; sparse final ensemble.
- **Optional HPO** on selected models; user can declare known-future covariates vs past-only covariates; predicts mean + arbitrary quantile levels (e.g., 0.1/0.5/0.9) for `prediction_length` steps ahead.
- `time_limit` controls the fit budget (4h in benchmarks).

## 4. Equations & assumptions
No equations stated. Metrics: mean weighted quantile loss (wQL) for probabilistic accuracy; MASE for point accuracy vs naive baseline. Ensemble weights w_m tuned on OOF predictions. Assumptions (stated/implicit): greedy forward selection yields a near-optimal sparse ensemble; diversity across statistical/DL/tabular families is complementary; presets fixed a priori generalize across datasets.

## 5. Features / target
Input: univariate or panel time series with optional static features and time-varying covariates (declared known-future or past-only). Target: next `prediction_length` steps — point (mean) forecast + quantile forecasts at user-specified levels.

## 6. Validation design
29 Monash datasets; time-series CV (rolling-origin, temporally ordered). Baselines: StatEnsemble (statistical ensemble), AutoPyTorch-Forecasting (deep-learning NAS-based AutoML, Deng et al. 2022), DeepAR, TFT, AutoETS, AutoARIMA, AutoTheta, plus Seasonal Naive reference. All methods ≤4h training (DeepAR/TFT with early stopping). Metrics: MASE (point), wQL (probabilistic); per-dataset errors rescaled to [0,1] for averaging; win rate vs Seasonal Naive baseline. Evaluation harness + scripts open-sourced.

## 7. Numerical results / baselines
- **Point (MASE, Table 3):** AutoGluon champion on 19/29 datasets; avg rank 2.08; avg rescaled error 0.073; win rate vs Seasonal Naive 100.0%; 0 failures. Next: StatEnsemble avg rank 3.12 / rescaled error 0.238 (3 failures); AutoPyTorch avg rank 4.12 / 0.257; DeepAR avg rank 5.08 / 0.434; TFT avg rank 6.12 / 0.635 (worst of the deep methods).
- **Probabilistic (wQL, Table 4):** AutoGluon champion 19/29; avg rank 1.80; avg rescaled error 0.086; win rate vs baseline 100.0%; 0 failures. StatEnsemble avg rank 3.36 / 0.330; DeepAR 4.08 / 0.455; TFT 4.24 / 0.487.
- Paper claims it "often even improv[es] upon the best-in-hindsight combination of prior methods" (i.e., beats the oracle combination of baselines on some datasets).

## 8. Code / data availability
Code: https://github.com/autogluon/autogluon (TimeSeries module). "Full configuration details and the scripts for reproducing all experiments" provided (Table 6 hyperparameter presets). Datasets: Monash repository via GluonTS (public).

## 9. Leakage & limitations
- Adversarial notes: (1) NFL team-week series are SHORT (17-18 games/season, few seasons of stable regime) — the benchmark's strength comes from datasets with many series or long histories; a 32-team × ~20-season panel may favor the tabular family over DL members, and cold-start teams/regimes are untested. (2) Benchmark datasets are not sports data; no test of abrupt regime shifts (rule changes, QB injuries). (3) Presets are fixed a priori — good for honesty, but GSE would still need to verify preset choice on NFL data rather than assume best_quality transfers. (4) wQL optimization is quantile-calibration-adjacent but not a substitute for GSE's conformal calibration layer — ensemble quantiles can still be miscalibrated. (5) Same Amazon author team as 2003.06505 evaluating their own system; methodology disclosed, code open, so auditable. (6) 4h fits are heavy for weekly in-season refresh — DirectTabular/RecursiveTabular members alone may suffice in-season.

## 10. GSE overlap
No time-series AutoML exists in the corpus: the ML brief lists state-space/TFT as commissioned topics, Lopez/Baumer state-space (1701.05976) was read, and conformal WP (2208.08598) covers intervals — but nothing automates forecaster selection/ensembling. This is a new capability (automated probabilistic forecaster), complementary to the calibration lane (its quantile outputs feed CQR/isotonic calibration). The tabular family inside AG-TS (DirectTabular) directly connects to ledger 1982's stacking recipe.

## 11. GSE implementation spec
- **Use case:** team-strength / points-scored-allowed trajectory forecasting: panel of 32 teams × weekly offensive/defensive EPA, success rate, market-implied ratings. Targets: next-week team EPA distributions (quantiles 0.1/0.5/0.9), which feed the margin/total models as features.
- **Build:** `TimeSeriesPredictor(prediction_length=1..4, target=..., known_covariates_names=['is_home','rest_days','spread'])`; static features = team; past-only covariates = injuries/EPA lags. Run best_quality with `time_limit=14400` once per offseason; in-season use a reduced preset (statistical + tabular members only) with 30-min budget.
- **Calibration bridge:** take AG-TS quantile forecasts and recalibrate with GSE's existing CQR/isotonic code on rolling-origin OOF outputs.
- **Serving:** weekly batch job Tuesday mornings; outputs written to the engine feature store.
- **Effort:** 2-4 days (panel construction + covariate plumbing + calibration bridge); CPU-only for the reduced preset.

## 12. Reproducible test
Dataset: nflverse weekly team EPA (offense/defense, 2009–2025). Target: next-week offensive EPA per team. Protocol: rolling-origin — train ≤2021 seasons, validate 2022 (tune ensemble weights), test 2023–2025. Metric: wQL at quantiles {0.1,0.5,0.9} + MASE. Baselines: (a) GSE's current team-strength forecaster (or naive carry-forward), (b) single best family member (e.g., DirectTabular alone), (c) SeasonalNaive sanity check.

## 13. Acceptance / rejection gate
**ADOPT if:** AG-TS wQL on 2023–2025 is ≥5% lower (relative) than the best single-family baseline AND the full fit costs ≤100 CPU-hours. **REJECT if:** wQL improvement <5% relative, or quantile coverage on the test window deviates >3pp from nominal at any reported level after recalibration (miscalibrated probabilistic output is worse than useless for Kelly sizing), or weekly refit exceeds the Tuesday-morning batch window.

## 14. Improvement experiment
Add a market-aware ensemble member: a forecaster whose features include the betting market's implied team strength (de-vigged spread/total) as a known-future covariate. Hypothesis: the market encodes information (injuries, sharp action) that pure box-score histories miss; the greedy forward-selection should upweight this member. Success: ensemble wQL improves ≥3% relative vs the no-market variant on the held-out window — and measure how much of the gain survives CQR recalibration.
