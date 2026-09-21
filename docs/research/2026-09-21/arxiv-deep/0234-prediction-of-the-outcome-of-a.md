# [0234] Prediction of the outcome of a Twenty-20 Cricket Match: A Machine Learning Approach (arXiv:2209.06346v2)

**Citation:** Singhvi, A., Shenoy, A. V., Racha, S., Tunuguntla, S. *Prediction of the outcome of a Twenty-20 Cricket Match: A Machine Learning Approach*. arXiv:2209.06346v2. URL: https://arxiv.org/abs/2209.06346
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 447 lines).
**Verdict:** ADAPT — port only the pairwise-interaction player rating model (s_ij = A + a_i − b_j) with time-decay weights and neighbor regularization into GSE's matchup-rating machinery; the cricket classifiers don't transfer.

## 1. Research question
Can T20 cricket match outcomes be predicted from player performance statistics, expert website ratings, player clusters, and an Elo-based approach, and which combination performs best?

## 2. Dataset / schema
- 5,390 T20 matches from ESPNcricinfo (international, domestic, league T20), scraped with a Python/BeautifulSoup crawler; brought down to 796 IPL matches for the classifier stage to minimize missing statistics.
- 16 features per player (batting + bowling): average runs, average 4s/6s, strike rate, not-outs, 50s/100s, matches, current/average batting position, wickets/match, economy, runs conceded, wides, balls, maiden overs, + binary target.
- Feature functions take a date parameter and only use matches played on/before that date (expanding window — no lookahead by construction).

## 3. Method / model
Three approaches: (1) raw/aggregated player stat features (352 → 44 → 22 → 2 features/instance) into AdaBoost, Decision Trees, Naïve Bayes, Random Forest, linear/non-linear SVM, each ± Bagging; variation 5 = greedy backward elimination; (2) Elo-style player ratings from pairwise batsman–bowler interactions; (3) k-means clustering (k=5) to derive batting/bowling ratings per player, then a second-stage binary classifier.

## 4. Equations & assumptions
- Pairwise interaction score: s_ij = A + a_i − b_j + ε, where a_i = batting rating of player i, b_j = bowling rating of player j, A = intercept (expected score between average players), ε = zero-mean error.
- Time-decay weight: w = (1 + t − t_min) / (1 + t_max − t_min) (rendered in text as w = (1 + t − t_max)/(1 + t_max − t_min); effectively linear recency weighting, Chessmetrics-inspired).
- Cost function: cost = Σ_{i,j} w_ij (ô_ij − o_ij)² + λ Σ_i (r_i − n_i)², where w_ij = match recency weight, ô/o = predicted/actual interaction score, n_i = recency-weighted average rating of player i's opponent neighborhood, λ = 0.7 (chosen by cross-validation).
- Ratings estimated via stochastic gradient descent.
- Score inputs from runs-above-average (RAA): strike-rate component (runs − 0.79×balls, 2011 baseline) + dismissal-avoidance component scaled by average ODI value 28.31.
- Naive Bayes "naive" independence assumption; SVM max-margin; k=5 clusters selected by 10-fold internal CV.
Stated assumptions: player ratings are relative (vs average player); pairwise interactions are independent observations; neighborhood regularization prevents divergence for thinly-observed players.

## 5. Features / target
- Features: per-player normalized stats (0–1), debutants get 0.5; Elo ratings from pairwise model; k-means cluster IDs (batting + bowling).
- Target: binary — team 1 win / team 2 win.
- Horizon: next match.

## 6. Validation design
- 10-fold cross-validation on the 796-match IPL subset for approaches 1 and 3; internal CV for cluster count.
- Approach 2 ratings validated qualitatively via scatter plots against ICC official ratings ("very strong correlation for high ratings") — no numeric correlation reported.
- ROC and precision–recall curves for approach 3 (AdaBoost max AUC).

## 7. Numerical results / baselines
Approach 1 (Table 2): best 56.63% (AdaBoost, 44 features); variation 1 (352 features) best 53.4% (Decision Trees + Bagging); variation 3 (22) ~54%; variation 4 (2) ~53.5%; backward elimination peak 59.01% (Random Forest) after dropping batting position, matches, 100s features.
Approach 2 (Table 3): best 63.05% non-linear SVM / 63.89% + Bagging / **64.62% ensemble of all classifiers** using the Elo-style ratings; Random Forest 62.70%; Decision Trees worst ~60.9%.
Approach 3: best 62% (AdaBoost, k=5 clusters); Decision Trees worst ~52%.
Paper's conclusion: the Elo-based rating approach wins; ratings correlate strongly with ICC ratings for top players.

## 8. Code / data availability
No code or data links stated; data scraped from espncricinfo.com. Acknowledgements to Prof. Mark Craven (course project).

## 9. Leakage & limitations
- 796-match subset after filtering is small; 10-fold CV on matches involving overlapping players/teams across folds — player identity leakage across folds inflates accuracy (no group-by-time split).
- Approach 2 "strong correlation with ICC ratings" reported without a number — qualitative scatter-plot validation only.
- No baseline: no "home team always wins" or betting-odds baseline, so 64.62% is uninterpretable against market efficiency.
- Backward elimination reaching 59.01% on the same data used for selection = selection bias; no held-out test.
- No uncertainty estimates anywhere; ensemble-of-everything 64.62% is the max over many configurations (multiple-comparison luck).
- Cricket-specific (T20, RAA baselines from 2011 ODI); the interaction-score construct doesn't directly map to NFL positions.

## 10. GSE overlap
Per existing-research-map.md: Elo-style team ratings are long-standing (FiveThirtyEight NFL Elo in the corpus); Glicko-2 for player ratings was deep-read in 2306.07170; GSE already has extensive matchup/EPA work. This paper is closest to **duplicate-adjacent** on "player ratings" but adds a distinct mechanism: the *pairwise interaction* formulation (batsman-vs-bowler = analogous to WR-vs-CB or QB-vs-pass-rush matchups) with opponent-neighborhood regularization and time decay — that specific matchup-pair rating math is not in the GSE corpus. Verdict ADAPT on that narrow component only.

## 11. GSE implementation spec
- Implement pairwise matchup ratings for NFL: for each WR–CB (or QB–pass-rush) matchup, model the matchup outcome (e.g., yards per route run above expected) as s_ij = A + a_i − b_j with recency weights w = (1 + t − t_min)/(1 + t_max − t_min) and neighborhood regularization λΣ(r_i − n_i)², λ≈0.7 as starting value, fit by SGD.
- Use these matchup ratings as features in the GSE prop/spread models where individual matchups matter (WR props, CB shadow coverage).
- Data: nflverse charting/player stats; expanding-window ratings recomputed weekly.
- Effort: 1–2 engineer-weeks (rating engine + feature pipeline).

## 12. Reproducible test
Dataset: nflverse 2022–2024 WR/CB charting. Build pairwise matchup ratings through Week 17 2024 with strict expanding windows. Test: predict 2024 playoff WR receiving-yards props — compare a model with matchup-rating features vs without, on MAE and ROI at closing lines. Baseline: the paper's claim = pairwise ratings beat raw stat aggregates; NFL bar = the matchup-rating features must add >1% MAE improvement or positive CLV to keep.

## 13. Acceptance / rejection gate
Accept the pairwise-rating component if, on a strictly time-ordered backtest, models using the matchup ratings beat raw-aggregate features by ≥1% MAE on player-prop-relevant targets AND the ratings show face-valid correlation with known elite matchups (e.g., top WRs rate highest, mirroring the paper's ICC-rating sanity check). Reject if the ratings don't beat simple expanding-window player averages (the mechanism adds nothing), or if SGD fails to converge stably on thin NFL matchup data — the neighborhood regularization may be insufficient for 17-game seasons.

## 14. Improvement experiment
Beyond the paper: (a) replace the paper's linear recency weight with exponential decay and tune the half-life by CV — the paper's linear weight is arbitrary; (b) the paper ignores context (pitch, weather, innings state) — for NFL, condition the intercept A on game script covariates (spread, total, dome/outdoor); (c) upgrade the paper's SGD point estimates to a Bayesian version (cf. TrueSkill/Glicko-2 uncertainty) so matchup ratings carry confidence intervals into GSE's sizing; (d) test the "debutant = 0.5/average" prior explicitly — the paper assigns average ratings to new players without validation; measure rookie-prop bias.
