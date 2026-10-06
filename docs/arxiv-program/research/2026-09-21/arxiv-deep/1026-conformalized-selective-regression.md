# 1026 Conformalized Selective Regression (arXiv:2402.16300v3)

**Citation:** Anna Sokol, Nuno Moniz, Nitesh Chawla (2024). *Conformalized Selective Regression*. arXiv:2402.16300v3. URL: https://arxiv.org/abs/2402.16300
**Full-text source:** local cache `/tmp/arxiv750-cache/fulltext/2402.16300.txt` (complete paper, all 6 sections + references).
**Ledger completed:** 2026-09-21. **Read:** full text (not abstract).
**Lane (assignment):** abstention.

## 1. Research question
Should a regression model always deliver a prediction? The authors tackle selective regression ("reject option"): how to decide when to abstain from predicting under uncertainty. Two gaps are claimed: (a) existing uncertainty proxies use conditional variance, a distribution-based quantity that ignores model-specific bias and behaves badly under heteroscedasticity; (b) there is no standard evaluation of the error-vs-coverage trade-off (AUC of the risk-coverage curve can misrank models). They propose Conformalized Selective Regression (CSR), which uses the width of a conformalized quantile-regression interval as the abstention signal, plus a normalized Euclidean-distance-to-ideal evaluation metric.

## 2. Dataset / schema
- Four primary regression datasets (sizes and feature counts not stated in the paper): **COMPAS** (Barenstein 2019 re-visit of ProPublica data), **Communities** (Redmond & Baveja 2002), **Insurance** (Lantz 2019), **LSAC** (Wightman 1998 bar-passage study).
- An additional validation set of **25 regression datasets** from Ribeiro & Moniz (2020), "Imbalanced regression and extreme value prediction."
- Splits: **70% train / 10% calibration / 20% test**. No dates (all tabular, non-time-series data). All public/academic datasets; no URLs given in the paper beyond citations.
- Point predictions for the underlying regressors come from Random Forest, XGBoost, and Quantile Neural Networks (compared model-by-model; the prediction set is held fixed across reject methods so comparisons measure rejection strategy only).

## 3. Method / model
CSR (Algorithm 1):
1. Split data into train/calibration/test.
2. Train two quantile regressors on D_train: f_l(X) for the α/2 quantile (pinball loss, penalizes overestimates) and f_u(X) for the 1−α/2 quantile (penalizes underestimates).
3. Conformity scores on calibration: A_cal = max(y_cal − f_u(X_cal), f_l(X_cal) − y_cal) for each calibration point.
4. Adaptive threshold: q̂_α = Quantile((n+1)(1−α)/n, A_cal).
5. For each test point, conformalized interval width: W_α(X_i) = f_u(X_i) − f_l(X_i) + 2q̂_α (i.e., widen both bounds by q̂_α).
6. Reject rule: if W_α(X_i) < λ, predict f(X_i); else output 'No Prediction'.
The point prediction f(X) is visualized as the interval midpoint for one-point displays. Conformalization corrects model-specific bias in the quantile fits via the calibration scores — this is the claimed advantage over raw conditional variance, which only captures distributional spread.

## 4. Equations & assumptions
Actual formulas from the paper:
- Reject rule (Eq. 1): Γ_λ(X) = f(X) if u(X) ≤ λ, reject otherwise.
- Conditional variance (Eq. 2): u(X) = Var(Y|X) = E[(Y − E(Y|X))² | X] (the baseline proxy they critique).
- Conformal set (Eq. 3): C(X_test) = {y : s(X_test, y) ≤ q̂}, with q̂ = ⌈(n+1)(1−α)⌉/n-th quantile of calibration scores.
- Coverage guarantee (Eq. 4): P{Y_{n+1} ∈ C(X_test)} ≥ 1 − α, for any joint P_XY, any n — requires **exchangeability** of calibration and test points.
- Conformity scores (Eq. 5): A_cal = max(y_cal − f_u(X_cal), f_l(X_cal) − y_cal).
- Interval width: W_α(X) = f_u(X) − f_l(X) + 2q̂_α.
- Evaluation: nMSE normalized by the maximum MSE across all models at each coverage level; rank models by Euclidean distance from the point to the ideal {nMSE = 0, Coverage = 1}.
Assumptions: exchangeability of the calibration/test data; the quantile regressors must approximate the true conditional quantiles reasonably (conformal validity holds regardless, but interval widths are uninformative if the base fits are garbage); coverage target fixed at α = 0.05 (95%) throughout experiments.

## 5. Features / target
Features/targets are dataset-specific and not listed in the paper (COMPAS recidivism scores, Communities crime rates, Insurance charges, LSAC bar passage). General framing: X_i ∈ ℝ^p continuous features, Y_i ∈ ℝ continuous target. Abstention signal is derived purely from the conformalized interval width W_α(X), not from features directly.

## 6. Validation design
- Model-by-model comparison: each base regressor (RF / XGBoost / Quantile NN) fixed, only the reject strategy varies (CSR vs. Model 1 vs. Model 2), so performance at 100% coverage is identical across methods.
- Coverage swept λ to produce 0% → 100% coverage; risk-coverage curves compared on normalized MSE.
- **Primary metric:** Euclidean distance to the ideal point {nMSE=0, Coverage=1}; also reports risk-coverage AUC (Table 1) with the explicit claim that AUC alone misranks methods.
- **Baselines:** (1) Shah et al. 2022 — "Selective regression under fairness criteria" (fairness-calibrated mean/variance, monotonic selective risk); (2) Zaoui et al. 2020 — plug-in ε-predictor with reject option (kNN variance estimation, k=10, 100 repetitions for stability).
- Second research question: restrict to "practical" high coverage {0.8, 0.85, 0.9, 0.95} and re-rank.

## 7. Numerical results / baselines
Exact numbers from the paper:
- On the 25 extra regression datasets: CSR is the top performer in **20/25 (80%)**; Model 1 best in 2/25 (8%); Model 2 best in 3/25 (12%).
- Table 1 AUC (lower = better), CSR vs Model 1 vs Model 2: Communities **0.328 / 0.505 / 0.381**; Compas **0.705 / 0.800 / 0.846**; Insurance **0.484 / 0.655 / 0.588**; Lsac **0.838 / 0.897 / 0.877**.
- At restricted high coverage levels (0.8, 0.85, 0.9, 0.95), CSR shows lower error rates than both baselines "in above 80% cases" across datasets and coverage levels.
- Figure 3 (Random Forest, nMSE vs coverage): CSR variants maintain lower nMSE than both baselines across the coverage sweep on all four datasets. (Chart read — no point values quoted in text.)
- α fixed at 0.05; data splits 70/10/20. Hyperparameters of the base regressors not stated.

## 8. Code / data availability
Source code: https://anonymous.4open.science/r/CSR_Submission-EDE6 (anonymous review link; may be dead post-publication). Datasets are cited public sources (no direct URLs).

## 9. Leakage
- Exchangeability assumption is the fragile point: NFL features drift across seasons (rule changes, roster turnover), so a calibration set from past seasons may mis-cover current data — the guarantee degrades silently.
- The 10% calibration slice is small; q̂_α estimated on few points is noisy, which the paper does not quantify.
- Reject-threshold λ is tuned on the test coverage sweep (risk-coverage curves computed on the test set) — in production the coverage level must be fixed in advance from calibration.
- Model 2 was run with fixed k=10 and 100 repetitions; its hyperparameters may not be tuned as carefully as CSR's.
- Point predictions are held fixed across methods, so the comparison isolates the reject strategy — fair, but it says nothing about whether a better point model would dominate regardless.

## Limitations
- No time-series or non-exchangeable evaluation; the paper's guarantee and results assume i.i.d. tabular data. Sports data is explicitly non-exchangeable over time.
- The proposed Euclidean-distance evaluation is a heuristic: it weights nMSE (normalized by the max over models, hence comparison-set-dependent) and coverage equally, with no cost model for wrong-vs-abstained predictions.
- α is fixed at 0.05 with no sensitivity analysis on the confidence level.
- 70/10/20 splits with only 10% for calibration — no study of calibration-size effects on interval width quality.
- Anonymous code link may not resolve; reproducibility unverified.
- No cost asymmetry: a wrong prediction and an abstention are not priced, so the "ideal point" ranking may not match a real decision problem.

## 10. GSE overlap
Existing-research map check: GSE's calibration/uncertainty stack covers CQR (Drive "CQR Research" doc), grouping loss (2210.16315), temperature/Platt/isotonic/Venn-Abers scaling, Mondrian/cross-conformal (brief topic only), and conformal WP (2208.08598). The map's gap list #4 explicitly flags **"RL / bandits for pick selection — learning-to-abstain with coverage-risk curves"** as un-covered. No existing GSE work uses the *width of a conformalized interval as a reject/abstain trigger for point predictions*. The conformal-audit Deep Research report (Drive) found GSE's cqr.ts was clamping rank to n−1 and falsely certifying 90% coverage at 83.33% — so GSE's conformal machinery is live and recently fixed, making a CSR-style layer a natural add-on rather than a from-scratch build. NOT a duplicate: the map has selective-regression-via-conformal-width nowhere.

## 11. GSE implementation spec
- Target lane: **props_dfs + abstention** — GSE publishes prop point projections (yardage totals, etc.) and DFS projections. Apply CSR: fit two quantile regressors (e.g., LightGBM quantile at α/2 and 1−α/2, α=0.10 for 90% intervals) on the existing prop projection feature set; conformalize on a recent calibration window (last 4-6 NFL weeks, ~10-20% of training rows); abstain (don't publish / don't bet) when W_α(X) ≥ λ, with λ set to hit a target coverage (e.g., 90%).
- Data: nflverse play-by-play aggregates + FTN charting features already in-repo; labels = actual prop outcomes from the predictions DB.
- Serving: quantile fits batch-fit weekly; interval width computed per slate at publish time; reject decisions logged with widths for the coverage-error curve.
- Effort: small — 1-2 days to prototype (quantile LightGBM + split-conformal wrapper), since the point-projection pipeline and feature store exist.

## 12. Reproducible test
Dataset: GSE's 2024-2025 NFL season prop projections with actuals (from the engine predictions DB + nflverse). Protocol: train quantile regressors on weeks 1-12, calibrate on weeks 13-14, test on weeks 15-18. Baseline to beat: GSE's current fixed-threshold abstention (if any) or no-abstention publishing. Metric: MAE at 90% coverage — CSR-selected 90% must beat the no-reject MAE and beat a conditional-variance (e.g., LightGBM leaf-variance or ensemble spread) reject rule at the same coverage, mirroring the paper's model-by-model design.

## 13. Acceptance / rejection gate
**Gate:** adopt CSR if, on the held-out weeks 15-18 test window, CSR's 90%-coverage MAE is ≥ 5% lower than the conditional-variance reject baseline at the same coverage, AND empirical coverage of the conformal intervals on the calibration window is within ±3 points of the nominal 90%. Reject if the width rule does not beat ensemble-spread rejection or if coverage calibration drifts >5 points (exchangeability failure).

## 14. Improvement experiment
Weight the Euclidean-distance evaluation by the actual economics: replace the paper's unweighted {nMSE=0, coverage=1} distance with an expected-profit objective — profit = (edge × stake × hit-rate) − (abstention opportunity cost) — and choose λ to maximize backtested P&L at fixed bankroll instead of minimizing distance to an abstract ideal. Additionally, make α adaptive per slate: fit α (interval confidence) on the calibration window to maximize the profit objective rather than fixing 0.05; and try Mondrian conformalization by position group (QB/RB/WR/TE props) since prop error distributions are strongly position-heterogeneous.

**Verdict: ADOPT** — the CSR recipe (quantile regressors + split-conformal interval width as the abstention trigger) ports nearly as-is onto GSE's prop/DFS point-projection pipeline and fills the map's explicit learning-to-abstain gap.
