# [1969] Selecting Robust Features for Machine Learning Applications using Multidata Causal Discovery (arXiv:2304.05294)

**Citation:** Saranya Ganesh S., Tom Beucler, Frederick Iat-Hin Tam, Milton S. Gomez, Jakob Runge, Andreas Gerhardus (2023). *Selecting Robust Features for Machine Learning Applications using Multidata Causal Discovery*. arXiv:2304.05294. URL: https://arxiv.org/abs/2304.05294
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§1–4, Table 1, Figs. 2–3, SI methods referenced).
**Verdict:** ADAPT

## 1. Research question
When domain knowledge is limited and predictor dimensionality is huge (lags × levels × spatial averages), can causal discovery run jointly over an *ensemble* of time series (multiple realizations of the same process) produce a single set of causal drivers that makes simple ML models generalize better to unseen cases than correlation-based, XAI-based, or no feature selection?

## 2. Dataset / schema
Western Pacific tropical cyclones: 260 TC cases, 2001–2020, lifetime > 6 days to landfall; ERA5 reanalysis (25 km, 3-hourly) + IBTrACS best tracks; dimensionality reduced from spatiotemporal fields to per-case time series (Step I). Split: 150 train + 55 validation (random, 2001–2020), 55 test (recent years 2017–2020), no overlap, designed to avoid spatiotemporal correlation. Targets (1-day lead): max 10m wind (m/s), min sea-level pressure (hPa), horizontally-integrated total precipitation. Candidate predictors: environmental fields × time lags × vertical levels × area-averages (thousands of features).

## 3. Method / model
Multidata (M) causal feature selection:
1. Run causal discovery (PC₁ or PCMCI from tigramite) in *multidata mode* over the ensemble of case time series simultaneously — samples pooled across cases via a sliding-window scheme, requiring causal relationships to be stationary within each series. Only variables time-lagged w.r.t. the target are candidate predictors, so discovery reduces to removing predictors (conditionally) independent of the target given others.
2. Feed the surviving causal drivers to MLR or Random Forest.
3. Key tuning: more stringent significance thresholds α in the CI tests → fewer, more reliable features → better generalization. Assumption required: a *common causal structure* across the ensemble.
- Code: tigramite multidata functionality (GitHub, archived Zenodo doi:10.5281/zenodo.7747255); application sample code stated available.

## 4. Equations & assumptions
- CI tests: partial correlation (PC₁) / PCMCI's MCI tests; significance level α_PC as the sparsity knob.
- Metric: R² with R²=1 perfect, R²=0 one-std-dev error.
- Assumptions: common causal structure across ensemble members; within-series stationarity (for the sliding-window pooling); only lagged predictors considered (no contemporaneous discovery in this application, though the multidata machinery supports it).

## 5. Features / target
Inputs: thousands of candidate predictors (field × lag × level × area aggregates). Targets: the three TC intensity variables at 1-day lead. Feature selection *is* the method — output is the sparse causal-driver set (e.g. 31 features for max wind with M-PC₁).

## 6. Validation design
Train/validation/test split by TC case (150/55/55), test on recent years — genuinely out-of-sample cases. Baselines: non-causal MLR/RF (all features), lagged-correlation selection, random selection, XAI-based selection, and an LSTM (PyTorch, Optuna-tuned). Metric: R² on train/val/test per target. Note: splits are by case, not strictly time-ordered within the train pool, but the test set is the most recent years.

## 7. Numerical results / baselines
Table 1 R² (train / validation / test):
- Causal-MLR: Pmin 0.87(17f)/0.88/0.89; V10 wind 0.84(31f)/0.82/0.80; Precip 0.71(90f)/0.68/0.62.
- Causal-RF: 0.93(26f)/0.87/0.88; 0.89(17f)/0.81/0.78; 0.83(123f)/0.65/0.62.
- Non-causal RF (all 3978 features): train 0.93/0.88/0.75 but validation 0.77/0.74/0.65, test 0.89/0.79/0.58 — overfits; causal models match/beat it with 17–123 features.
- Lagged-correlation MLR: train up to 0.96 but validation 0.85/0.81/0.69 — "selects sets of predictors that perform very poorly in comparison, especially during validation."
- Causal MLR systematically beats the tuned LSTM on all targets ("remarkable given their simplicity"); M-PC₁ slightly beats XAI selection, with the edge largest for very sparse models (<50 features).
- M-PCMCI ≈ M-PC₁ at 6h min-lag but "drastically deteriorates" at 1-day min lag; authors note PCMCI's autocorrelation-robustness matters more for true discovery than for this prediction setting.

## 8. Code / data availability
Multidata causal discovery code in tigramite (GitHub + Zenodo 10.5281/zenodo.7747255, stated). ERA5/IBTrACS public. Application sample code stated available.

## 9. Leakage & limitations
Adversarial notes: (1) The common-causal-structure assumption across the ensemble is the load-bearing one — TCs are arguably more homogeneous than NFL teams (different schemes/coaches). If teams have different graphs, pooled discovery finds the intersection, possibly empty. (2) Only lagged predictors; contemporaneous structure ignored. (3) Test set is "recent years" but train pool includes 2001–2020 — mild temporal leakage via shared era effects, though case-splitting is the right unit. (4) Lagged correlation's failure is partly attributed to non-normal distributions — "we leave for future work" adapting CI tests; sports indicators are similarly non-normal. (5) R² gains are modest in absolute terms on the test set (e.g. wind: causal-MLR 0.80 vs non-causal-RF 0.79) — the win is sparsity + validation robustness, not a test-set blowout.

## 10. GSE overlap
Direct extension of ledgers 1962/1963 into a *prediction* pipeline — the missing link between "learn a graph" and "ship a better model". The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has no causal feature-selection work; GSE's feature stack is hand-built. The paper's ensemble-of-series design maps exactly onto team-seasons as ensemble members. Overlaps with ledger 1963's pooled-multi-team idea — this paper is the empirical proof that the pooled approach works for prediction.

## 11. GSE implementation spec
- Data: nflverse team-week panel; ensemble = team-seasons (2015–2023, ~380 members); per-member series T≈18 weeks; N≈35 indicators + engineered lags (t−1…t−3).
- Method: tigramite M-PC₁ (multidata) with target = next-week game outcome margin/cover indicator; stringent α_PC swept {0.01, 0.001}; min lag 1 week. Keep the driver set; train GSE's outcome model (logistic/GBM) on drivers only.
- Validation: train on 2015–2020 team-seasons, validate 2021–2022, test 2023–2025 — strictly by season (no case-mixing across eras).
- Baselines to beat: full-feature model, lagged-correlation selection, SHAP/XAI selection.
- Serving: quarterly driver-set refresh; the live model trains on the current driver set only.
- Effort: ~3 engineer-days (tigramite multidata is off-the-shelf; work is panel setup + α sweep).

## 12. Reproducible test
Dataset: team-week panel 2015–2025. Protocol: M-PC₁ driver selection on 2015–2020; outcome model (same GBM config) trained on drivers vs all features vs lagged-correlation top-k (k matched to driver count). Metrics: Brier + log-loss on 2021–2022 (val) and 2023–2025 (test); feature counts. Expectation per paper: driver model matches/beats all-features on val/test with far fewer features; lagged-correlation overfits train.

## 13. Acceptance / rejection gate
ADOPT multidata causal feature selection if: (a) driver-set model Brier on 2023–2025 ≤ all-features Brier (parity) or better, using ≤50% of features; (b) validation Brier strictly better than lagged-correlation selection at matched feature count (the paper's key discrimination); (c) driver sets from odd-season vs even-season ensembles have Jaccard ≥ 0.5 (common-structure assumption holds well enough). Reject if (b) fails — it would mean correlation suffices and causal machinery adds nothing — or if Jaccard < 0.4 (teams too heterogeneous for pooling; fall back to per-team discovery per ledger 1963).

## 14. Improvement experiment
Beyond the paper: *stratified* multidata discovery — run M-PC₁ separately within scheme clusters (e.g. pass-heavy vs run-heavy offenses, dome vs outdoor teams) and union the driver sets with cluster-membership interactions. Hypothesis: stratified pooling recovers scheme-specific drivers (e.g. pace matters for pass-heavy teams only) that global pooling washes out, beating both global M-PC₁ and per-team discovery on the gate's Brier metric — testable by adding the stratified variant as a fourth arm in the reproducible test.
