# [1142] Forecasting the Future Development in Quality and Value of Professional Football Players (arXiv:2502.07528)

**Citation:** Van Arem, K.; Goes-Smit, F.; Söhl, J. (2025). *Forecasting the Future Development in Quality and Value of Professional Football Players*. Appl. Sci. 15, 8916. arXiv:2502.07528. URL: https://arxiv.org/abs/2502.07528
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2502.07528v3 [stat.AP], 27 pages).
**Verdict:** ADAPT

The one-year-ahead player-development forecasting protocol with random-forest bagging-based uncertainty quantification is directly adaptable to NFL next-season player projections with honest prediction intervals (a GSE calibration-lane asset); the SciSkill/ETV data and soccer transfer context are proprietary/out of scope.

## 1. Research question
Which explainable supervised ML model best forecasts a professional footballer's development one year ahead — both in player quality (SciSkill rating) and monetary transfer value (Estimated Transfer Value, ETV) — when judged on predictive accuracy AND explainability AND uncertainty quantification, as a practitioner (club) would require?

## 2. Dataset / schema
- Proprietary SciSports data (NOT public; "Restrictions apply... obtained from SciSports"). SciSkill and ETV models themselves are proprietary — exact reproduction impossible; authors note similar public analogues exist (Wolf et al. Elo [22]; Yang et al., McHale & Holmes for transfer fees).
- Quality problem: 80,568 male players, 3,834,539 monthly data points (avg 47.6/player ≈ 4 seasons), years 2012–2023; players filtered to >20 games and >2 years of data. 86 domain features: month of year, current SciSkill, league strength, time since last game, player characteristics, SciSkill time series, club transfer situation, quality gap to teammates. Label = SciSkill(t+1yr) − SciSkill(t).
- Value problem: 60,175 male players, 413,177 biannual (Jan/Jul) data points (avg 6.87/player ≈ 3.5 seasons), 2014–2021. 58 features (correlated ones removed): league strength, age, experience, contract, current SciSkill/ETV, position, teammate quality gaps, club transfer history. Label = ETV development one year ahead (observations sampled biannually in January and July).
- Time-based split: train ≤2020, test ≥2021 for both. 5% of players held out by provider for internal studies (stratified).

## 3. Method / model
Models compared: OLS (backward selection, p<0.0001 quality / p<0.001 value), lasso, linear mixed effects (nationality as random effect; top-20 lasso features for feasibility), CART decision tree, random forest, XGBoost, and three kNN variants (Euclidean, Mahalanobis, RReliefF-reweighted Euclidean) on a reduced time-series feature set (Dudani distance weighting; HNSW indexer). Feature selection: noise-variable importance threshold for tree models; lasso nonzeros for linear. Hyperparameters via Bayesian optimization with expanding-window time-series CV (yearly expanding windows, Figure 3). Metrics: RMSE (primary — "more strongly influenced by large errors... for superstar players") and MAE, computed on full test set, per-age, and on practitioner-relevant subgroups (SciSkill>100; ΔSciSkill>±10; ETV≥€10M; ΔETV>±€2.5M).

## 4. Equations & assumptions
Standard textbook formulations quoted, no novel equations: OLS RSS(β)=(y−Xβ)ᵀ(y−Xβ); lasso RSS+λΣ|βi|; LME yi|bi=Xiβ+Zibi+εi, εi∼N(0,σ²Λi); CART splits {X|Xj≤s},{X|Xj>s} minimizing within-split SSE. Uncertainty-quantification methods per model from literature: linear — classical prediction intervals (Neter et al.), assumptions acknowledged violated; RF — bagging-based intervals (Wager et al. 2014), "naturally arises"; kNN — min/max over large-k neighborhood. Quantile regression rejected (needs an extra model). Assumptions: transfer decisions concern one-season-ahead (1-yr horizon); young players volatile → harder; SciSkill penalty for long injury layoffs ('previous_zero_months') is a real mechanism the model should recover; nationality is a nuisance random effect.

## 5. Features / target
Quality: 86 features (see §2); target = one-year SciSkill development (difference). Value: 58 features; target = one-year ETV development. kNN variants use lagged time-series of key indicators only.

## 6. Validation design
Strictly time-ordered: train on ≤2020, test on ≥2021 (both problems). Expanding-window yearly CV for hyperparameter tuning. Evaluation sliced by age (Figure 5, 9) and by practitioner subgroups (Figures 6, 10). Baselines are the competing model classes themselves (no naive baseline reported). Out-of-sample prediction is a stated contribution (prior literature mostly in-sample).

## 7. Numerical results / baselines
Exact RMSE/MAE numbers are NOT quoted in text — all loss results are presented in figures only (Figs. 4, 5, 6, 8, 9, 10). Relative findings, quoted from text:
- Quality: "XGBoost model attains the lowest loss values of all models" on the general test set (both RMSE and MAE, Fig. 4); RF slightly better than decision tree; tree-based > linear (implies nonlinear/interaction effects); kNN-time-series worst. By age: all models best at ages 24–28; XGBoost best above age 22, RF similar below 22 (young players most practitioner-relevant). Subgroups: XGBoost best on all three (SciSkill≥100; Δ≤−10; Δ≥+10); linear models "significantly less accurately" on large decreases; kNN "significantly worse" on large increases.
- Value: RF lowest RMSE and MAE overall (Fig. 8); XGBoost and kNN only slightly higher; linear worse on MAE than RMSE (few large errors, worse on easy players). By age: no clear model distinction; young harder (volatile), old easier (smaller, declining values). Subgroups: RF and kNN lowest on high-quality (SciSkill≥100) and large-decrease (≤−€2.5M); tree-based best on large-increase (≥+€2.5M), XGBoost lowest there; RF "distinctly lower" on high-value (≥€10M) — only model capturing the peak-then-decline pattern via the 'etv' feature.
- Feature importances (min–max scaled): quality — age_years, age_years_squared, years_diff_peak_age (correlated; ≤2 selected), current 'sciskill', 'sciskill_diff_mean_team', 'previous_zero_months'; value — current 'etv', 6m/12m ETV developments, 'sciskill_diff_6m_ago', month of year (Jan vs Jul — winter-necessity vs summer-squad-building transfers; 6-month-contract free-transfer effect).
- Conclusion: RF is "the most suitable explainable ML model" overall (best value accuracy + bagging UQ + good quality accuracy), with XGBoost best for quality accuracy.
No confidence intervals or significance tests on model differences reported.

## 8. Code / data availability
Data: proprietary SciSports, restricted. Code: not stated (no link). Supplementary tables S1–S6 (feature definitions) at mdpi.com/article/10.3390/app15168916/s1.

## 9. Leakage & limitations
- **Proprietary targets**: SciSkill and ETV are black boxes; the forecasting models inherit any bias in them (e.g., ETV trained on historical transfers has selection bias — only transferred players observed).
- **>20 games / >2 years filter** biases against young and injury-prone players — exactly the groups practitioners care about; authors acknowledge.
- **Male players only**; no women's data.
- **No naive baseline** (e.g., carry-forward) — can't tell how much ML beats persistence; the naive baseline in the EPV paper (2406.00814) showed ML cut RMSE 38%, a comparison this paper omits.
- **UQ methods are literature-cited, not empirically validated**: the paper never checks whether RF bagging intervals or kNN min/max intervals actually cover at nominal rates — a calibration claim without a calibration test (directly relevant to GSE's calibration standards: do not repeat this).
- **Soccer transfer market**; NFL has no transfer fees — the value half doesn't port, only the quality-development half.

## 10. GSE overlap
GSE's corpus covers player ratings (Elo/Glicko/TrueSkill), projection models, and calibration. What is NOT covered: (a) a systematic next-season player-development forecast with honest uncertainty intervals; (b) bagging-based prediction intervals from tree ensembles (Wager et al.) applied to fantasy projections; (c) subgroup-sliced evaluation (young/breakout/decline players) as a standing evaluation protocol. This extends the projection lane with a calibration-forward methodology. Overlaps partially with 1139 (next-season prediction) but 1139 is about EPV-style possession metrics; this is about the forecasting protocol + UQ, complementary.

## 11. GSE implementation spec
Build a "next-season development forecaster" for NFL fantasy projections:
1. Target: year-N+1 fantasy points per game (or per-17) by position, using nflverse 2015–2024.
2. Features (~60–80): age, age², years-from-peak-age (position-specific peak, e.g., RB 24–26, WR 26–28), current-year FPG, 3-yr average, team quality (Pythagorean / EPA), quality gap to team (player target share vs team), games missed / months since last game (injury layoff), contract year indicator, coaching/team change indicator, draft capital.
3. Models: random forest + XGBoost + a carry-forward naive baseline (the baseline this paper omitted). Train ≤2022, test 2023–2024, expanding-window CV for tuning.
4. UQ: RF bagging intervals per Wager et al.; VALIDATE coverage empirically at 50/80/90% nominal on the test window (the calibration check the paper skipped) — this feeds GSE's calibration lane directly.
5. Evaluation sliced by age and by practitioner subgroups: rookies/2nd-year (breakout), age-29+ (decline), top-24 positional (studs), players changing teams.
Effort: ~2 weeks (feature build on nflverse + model training + calibration validation).

## 12. Reproducible test
Dataset: nflverse 2018–2024, positions QB/RB/WR/TE separately. Train ≤2021, validate 2022 (tuning), test 2023–2024. Baseline: naive carry-forward of last season's FPG. Metrics: RMSE/MAE overall + per-age + subgroup slices (2nd-year players, 30+ players, team-changers); interval coverage at 80% nominal. Success: RF/XGBoost beats carry-forward RMSE by ≥ 10% overall AND achieves 75–85% empirical coverage at 80% nominal (honest intervals, not the paper's untested claim).

## 13. Acceptance / rejection gate
ADOPT the development forecaster + its intervals into GSE's projection pipeline only if: (a) ≥10% RMSE improvement over carry-forward on 2023–2024 test for at least 3 of 4 positions, (b) empirical 80%-interval coverage within 75–85% (calibrated), and (c) subgroup slices show no catastrophic failure (RMSE on 2nd-year breakouts no worse than 1.3× overall RMSE). Otherwise keep as a research note.

## 14. Improvement experiment
Add a hierarchical (mixed-effects) age curve: instead of raw age features, fit a position-specific Bayesian aging curve first and feed the player's residual-vs-curve as the feature (partial pooling across players). Hypothesis: this separates "age-expected decline" from "true development signal" better than age² terms, especially for the volatile young-player slice where the paper's models were weakest — expect the biggest RMSE gain on players under 24.
