# 1801 Moving from Machine Learning to Statistics: Expected Points in American Football (arXiv:2409.04889v1)

**Citation:** Ryan S. Brill, Ryan Yee, Sameer K. Deshpande, Abraham J. Wyner (2024). *Moving from Machine Learning to Statistics: the case of Expected Points in American football*. arXiv:2409.04889v1. URL: https://arxiv.org/abs/2409.04889v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML). Code: https://github.com/snoopryan123/expected_points_nfl

## 1. Research question

Expected points (EP) is the foundational value function of football analytics, but the dominant ML estimators (XGBoost on play-by-play) ignore four statistical problems: selection/size bias from team quality, overfitting artifacts, no uncertainty quantification, and the strong dependence structure of observational football data (all plays in a drive share one outcome). Can statistically principled EP models fix all four without losing ML accuracy?

## 2. Dataset / schema

- **491,993 NFL plays, 73,514 drives, 39,083 epochs, 2010–2022** via nflFastR.
- Covariates: yardline, down, yards to go, half-seconds remaining, era, timeouts remaining (both teams), score differential, pre-game point spread relative to possessing team, drive outcome.
- Drive outcome y: 5 outcomes — TD (7), FG (3), no score (0), opp. safety (−2), opp. TD (−7). Each epoch averages 1.88 drives; 10% of epochs have ≥4 drives.

## 3. Method / model

EP(x) = Σ_k pts(k)·P(y=k|x) (eq 1), multinomial over 5 drive outcomes. Three fixes: (1) **team-quality adjustment** — include pre-game point spread as covariate, evaluate at spread 0 for context-neutral EP; (2) **dependency structure** — averaged-subsample model (M=100 fits, one play per drive, averaged) approximated by weighted log-loss with w_ij = 1/N_i (inverse plays in drive); (3) **catalytic prior** — shrink XGBoost toward multinomial logistic regression by augmenting training with M=500,000 synthetic game-states imputed from the logistic model, synthetic weight fraction φ of observed weight (Algorithm 1). Uncertainty via cluster bootstrap (resample drives), B=100.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- EP: EP(x) = Σ_k pts(k)·P(y=k|x). (1)
- Multinomial: log(P(y_ij=k|x_ij)/P(y_ij=No Score|x_ij)) = f_k(x_ij). (2)
- Weighted log-loss: argmin_p {−Σ_i Σ_j w_ij Σ_k 1(y_i=k)·log p(k|x_ij)}, w_ij = 1/N_i. (9–10)
- Test rmse: rmse(EP̂,D_test) = (1/M_test)Σ_m sqrt((1/N_drives)Σ_iΣ_j I_mij(EP̂(x_ij)−pts(y_i))²). (13)
- Test log-loss and 95% prediction-set coverage covg defined analogously (15–16); bootstrap coverage bootcovg (17).

Assumptions stated: drive EP preferred over epoch EP (larger effective sample size, outcome more immediate); point spread is an adequate team-quality proxy; cluster bootstrap captures sampling uncertainty; catalytic synthetic data from the logistic prior is a valid smoother.

## 5. Features / target

Features: full game-state vector + pre-game spread. Target: 5-class drive outcome → EP. Evaluation: rmse, log-loss, 95% prediction-set marginal coverage, all on M_test=100 one-play-per-drive test subsamples (mimicking the live use case).

## 6. Validation design

25% of drives held out as test; training split 50/50 by drives for hyperparameter tuning (grid search on validation log-loss); evaluation de-noised over 100 test subsamples with standard errors; cluster vs i.i.d. bootstrap comparison.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly (±2·SE):

- **Selection bias:** good teams (spread < −3) run 32% of plays vs 26% for bad teams (spread > +3); good teams average 0.7 more points per drive — unadjusted EP overestimates average-team EP.
- **Table 1 (accuracy):** weighted XGBoost — rmse 2.593±0.0017, logloss 0.7506±0.0006, coverage 0.834±0.0004; averaged-subsampled — 2.593±0.0017, 0.7521±0.0006, 0.841±0.0004; unweighted — 2.618±0.0014, 0.7670±0.0005, 0.861±0.0004. Dependency-aware models are slightly but significantly more accurate; all point-estimate prediction sets undercover (~83–86% vs 95% nominal).
- **Table 2 (bootstrap coverage):** weighted+cluster 0.956±0.016, subsampled+cluster 0.957±0.016, unweighted+i.i.d. 0.963±0.013 — bootstrapping restores nominal coverage; sampling uncertainty, not mis-specification, was the main culprit.
- **Table 3:** multinomial XGBoost rmse 2.593 vs regression XGBoost 2.598 — outcome-probability modeling beats direct regression.
- **Table 4:** multinomial logistic regression logloss 0.7584±0.0006, rmse 2.601±0.0017 vs XGBoost 0.7506/2.593 — the smooth model is less accurate (the bias-variance trade-off).
- **Catalytic prior:** M=500,000 synthetic points; accuracy degrades linearly in φ; φ=1 (equal synthetic/observed weight) is the smallest φ that eliminates overfitting artifacts (EP monotonic in spread restored).
- **2022 evaluation:** KC offense > Buffalo > rest (significant); Mahomes > Allen, Tua > rest; most other CIs overlap — e.g., Lamar Jackson (4th) not significantly > Dak Prescott (12th).

## 8. Code / data availability

Full code on GitHub (linked above); nflFastR data public. Fully reproducible.

## 9. Leakage & limitations

- **No pre-game win-probability or spread/total prediction:** EP is a value function, not a game-outcome model; the paper never converts to win probability or tests against markets.
- **Point spread as team quality is crude:** the authors admit richer offensive/defensive quality measures would be better; using the market's spread inside the model creates circularity if the model is later compared to the market.
- **Catalytic prior trades accuracy for smoothness linearly** — φ must be tuned, and φ=1 was chosen by visual inspection, not a criterion.
- **Cluster bootstrap with B=100** is coarse for tail uncertainty.
- **Drive EP vs epoch EP:** the turnover-field-position argument for epochs is dismissed because EPA (not EP) is the application — reasonable but debatable for fourth-down decisions.

## 10. GSE overlap

**This is the most directly GSE-relevant paper in the wave.** EPA/EP underpins GSE's spread and totals modeling, and the corpus has no ledger dissecting EP estimation itself — ledgers use EPA as an input feature, never auditing its construction. The four findings map 1:1 onto GSE risks: (1) size bias — any GSE model trained on play-level data without team-quality adjustment inherits good-team tilt; (2) dependency structure — GSE's training rows are not independent; the 1/N_i weighting is a drop-in fix; (3) undercovered uncertainty — GSE's EPA-based confidence statements need cluster bootstrap, not point estimates; (4) catalytic prior — a principled way to smooth GSE's GBM artifacts (cf. the corpus's overfitting concerns). Complements 1795 (shrinkage) and 1796 (calibration intervals) methodologically.

## 11. GSE implementation spec

1. **Audit GSE's EPA pipeline** against the four issues: add team-quality covariates (or spread) with evaluation at neutral; reweight training rows by 1/(plays in drive); cluster-bootstrap (by drive) all EPA confidence intervals shown publicly.
2. **Catalytic smoothing:** fit GSE's current EPA GBM as target, a penalized multinomial logistic model as prior, M=500k synthetic states, tune φ on held-out log-loss; ship only if artifacts (non-monotonicity in spread/yardline) vanish without >0.5% log-loss degradation.
3. Cost: ~1 week (pipeline exists; mostly refit + bootstrap).

## 12. Reproducible test

Dataset: nflverse 2010–2024. Replicate Table 1 on 2023–2024 holdout: unweighted vs 1/N_i-weighted vs catalytic XGBoost on log-loss/rmse/coverage. Then downstream: does the fixed EPA improve GSE's spread-model MAE vs the market? Success gate below.

## 13. Acceptance / rejection gate

**Adopt the full package (quality adjustment + 1/N_i weighting + cluster bootstrap) if** the weighted model beats unweighted on 2023–2024 log-loss and bootstrap CIs achieve ≥93% coverage; **adopt the catalytic prior only if** it removes monotonicity artifacts at <0.5% log-loss cost. **Reject** any component that fails its gate — the paper's own results show gains are small but significant, so demand significance, not vibes.

## 14. Improvement experiment

**Catalytic prior with a market-informed prior model:** instead of shrinking toward plain logistic regression, shrink GSE's EPA model toward a prior built from *market-implied* expectations (spread/total-implied scoring rates by game-state). Hypothesis: the market prior carries real information the logistic model lacks, so the accuracy cost of smoothing shrinks or reverses. Test: catalytic-with-market-prior vs catalytic-with-logistic-prior vs raw on 2023–2024 log-loss; success = market-prior version matches raw accuracy while eliminating artifacts. If it works, GSE gets a smoothed EPA that is also market-consistent — directly tightening spread/total residuals.

**Verdict:** ADAPT
