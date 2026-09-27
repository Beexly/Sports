# [1534] Prediction of Football Player Value using Bayesian Ensemble Approach (arXiv:2206.13246)

**Citation:** Hansoo Lee, Bayu Adhi Tama, Meeyoung Cha (2022). *Prediction of Football Player Value using Bayesian Ensemble Approach*. arXiv:2206.13246. URL: https://arxiv.org/abs/2206.13246
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** REJECT — the "Bayesian" content is only hyperparameter search (TPE/Optuna) for a transfer-fee regression; no Bayesian forecasting, no probabilistic model, and the transfer-fee target has no mapping to GSE's picks or projections.

## 1. Research question
What factors drive professional soccer players' transfer-market values, and can a hyperparameter-optimized gradient-boosting model predict them accurately from video-game ability ratings (SOFIFA) plus match-record stats (WhoScored)? A case study for club recruiting economics, not a forecasting paper.

## 2. Dataset / schema
2,720 players from the 20 top-division European clubs (teams ranked 1st–4th in each of the five major leagues: EPL, La Liga, Bundesliga, Ligue 1, Serie A) in the 2021–2022 UEFA Champions League. Sources: 2022 SOFIFA dataset (sofifa.com — ~55 ability attributes, positions, demographics, wage/release-clause/monetary fields) merged with 2021–2022 WhoScored big-five league data (club goal points, win/draw/loss rates, standings; player goals/assists/cards/appearances). Final feature set: paper states 124 features used in SHAP analysis; the extraction section lists 72 attributes (52 ability, 5 demographic, 7 profile, 4 ability+profile, 2 monetary, 2 position, 3 goal-point, 4 win-rate, 1 club ranking, 8 club match-record, 13 player match-record). Ground truth: SOFIFA market value (average value figure not extractable from the text). Preprocessing: position dummy encoding, nationality grouped to 5 continents, height/weight unit conversion + BMI, standard noise handling/merging.

## 3. Method / model
LightGBM regressor with hyperparameter optimization via Tree-structured Parzen Estimator (TPE) Bayesian optimization using Optuna; two TPE variants (independent TPE, multivariate TPE) × pruning on/off. Baselines: linear regression, lasso, elastic net, kernel ridge regression, GBDT, and unoptimized LightGBM. 10-fold cross-validation, RMSE/MAE. SHAP values for feature importance/effects on the best model (I-TPE LightGBM). Hyperparameter search spaces quoted as recommended ranges, e.g., learning rate [0,1] default 0.1; n_estimators [50,3000] default 100. 100 training repetitions per result for reliability.

## 4. Equations & assumptions
No model equations stated in the paper — it describes Bayesian optimization qualitatively (SMBO: surrogate model maps hyperparameters to objective-score probabilities; TPE surrogate) and cites Optuna. "No equations stated" for the LightGBM/TPE/SHAP machinery itself. Assumptions (implicit): SOFIFA market values are valid ground truth for transfer value; 2022 cross-section generalizes; video-game ability ratings proxy real ability; release clause and wage are legitimate predictors rather than leakage-adjacent price signals (see §9).

## 5. Features / target
Inputs: 124 SOFIFA + WhoScored features (ability ratings, Overall, Potential, BOV/best-position overall, wage, release clause, age, BMI, position dummies, club goal difference/goals, club win rate/points, player goals/assists/cards, etc.). Target: player's market value (transfer fee proxy, in the SOFIFA monetary unit). Horizon: none — single cross-section, not a forecast over time.

## 6. Validation design
10-fold cross-validation on the 2,720-player cross-section; RMSE and MAE. Baselines: 4 regularized/linear regressors + GBDT + default LightGBM, each under three HPO conditions (default, I-TPE, M-TPE). No time-ordered split (data is a single season snapshot); no holdout transfer-fee realization test (predicts listed market value, not actual future fees).

## 7. Numerical results / baselines
Paper's claims (quoted): best validation RMSE 716.38 (I-TPE LightGBM) vs 949.94 (GBDT best). Optimized LightGBM "approximately 3.8, 1.4, and 1.8 times on average compared to the regression baseline models, GBDT, and LightGBM model in terms of RMSE"; also "3.8 times and 6.6 times better than the linear and regularization regression model in terms of RMSE and MAE, respectively" (paper's phrasing conflates the two groupings). I-TPE LightGBM ~1.8× better than unoptimized GBM on both RMSE and MAE; M-TPE: unpruned beats pruned on MAE, less significant on RMSE; I-TPE improvement more remarkable than M-TPE. SHAP top features: 'Overall', 'Release_Clause', 'Age', 'BOV'. Correlation ≥0.4 features: Release_Clause (0.96 — highest), Wage, Overall, Potential, Best Composure [sic], Short Passing, Curve, Long Passing, Ball Control, Vision, Total Stats, Base Stats, BOV, PAS, DRI, Total Movement, Total Power, Goal Acquisition, Goal Difference, Winning Points, Win, IR.

## 8. Code / data availability
None stated — no code link, no dataset link in the extracted text (SOFIFA/WhoScored scraped).

## 9. Leakage & limitations
Adversarial notes: (1) 'Release_Clause' (r=0.96 with target) and 'Wage' are near-price variables — predicting market value from the release clause is borderline tautological, inflating accuracy. (2) Cross-sectional design: predicts listed values, not realized future transfer fees — no true forecasting validation. (3) The "Bayesian" in the title is Bayesian optimization for hyperparameters, a generic MLOps step, not Bayesian inference/forecasting; contributes nothing to probabilistic sports prediction. (4) SOFIFA values are video-game estimates, not market transactions. (5) No NFL/soccer-match-outcome applicability: features are soccer video-game ratings; target (transfer fee) is irrelevant to win probability, spreads, totals, or fantasy scoring. (6) Small effective sample (2,720 players, one season).

## 10. GSE overlap
Existing-research map: no transfer-fee or player-valuation modeling anywhere in the corpus; the DFS lane covers salaries and projections, but this paper's target (transfer fees) and features (FIFA game ratings) touch neither. TPE/Optuna hyperparameter tuning is standard tooling, not a research finding. This is not a duplicate — it is simply off-mission: nothing to extend, nothing to adopt.

## 11. GSE implementation spec
Not applicable — REJECT. No build recommended. (If GSE ever wanted a player-valuation model, the portable fragment would be "Optuna TPE for GBM tuning + SHAP audit," which is standard practice requiring no paper.)

## 12. Reproducible test
Not applicable — REJECT. No test proposed; the paper's own validation (cross-sectional market-value RMSE) has no GSE analogue.

## 13. Acceptance / rejection gate
REJECTED at the gate: the paper contains no Bayesian forecasting model, no state-space or probabilistic component, and its target (soccer transfer fees) is outside GSE's prediction mandate. It fails the lane's "implementable forecasting value" criterion regardless of its reported RMSE gains.

## 14. Improvement experiment
Not applicable — REJECT. (For the record: a genuinely useful follow-up would predict realized future transfer fees with time-ordered splits and exclude price-adjacent features like release clause; even then it would serve a club-recruiting product, not GSE.)
