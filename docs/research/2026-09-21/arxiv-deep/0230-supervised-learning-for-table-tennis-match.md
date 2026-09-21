# [0230] Supervised Learning for Table Tennis Match Prediction (arXiv:2303.16776v1)

**Citation:** Chiang, Y.-H. S. & Denes, G. (2023). *Supervised Learning for Table Tennis Match Prediction*. arXiv:2303.16776v1. URL: https://arxiv.org/abs/2303.16776
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,192 lines).
**Verdict:** ADAPT — adopt the hand-crafted advantage-differential features (RANKDIFF, SA/SRA/FHA, BALANCE) and the "exclude-target-match aggregate" anti-overfit check as templates for NFL matchup feature engineering; the table-tennis domain itself is not useful.

## 1. Research question
Can standard supervised classifiers (logistic regression, random forest, SVM, MLP) predict the winner of professional table tennis singles matches from player and in-match statistics derived from automated video captures (TTNet), and which engineered features matter most (ablation study)?

## 2. Dataset / schema
- Source: automatic captures from TTNet (Voeikov et al. 2020), released by OSAI (2020, https://osai.ai/). Permission granted by OSAI team.
- Contents: Tokyo 2020 Olympics and Tischtennis-Bundesliga (German league) men's and women's singles matches.
- Size: not stated as exact match count (sample size not reported in text — a weakness). Samples with missing entries removed.
- Schema: per-rally data including ball-bounce location (9 grid cells per table half), winning shot location, forehand/backhand usage, rally length (short vs long = ≥5 shots), serve/receive outcomes, error types; player ITTF rankings at match time.
- Derived features (see §5). Each match maps to two (x, y) pairs — one from each player's perspective.

## 3. Method / model
Four scikit-learn classifiers on standardized (zero mean, unit std) features:
- Logistic regression: liblinear solver, L2 penalty, C = 1.0 (best after grid search).
- Random forest: 200 trees, max depth 80, max features 4, min samples per leaf 4.
- SVM: linear, RBF, polynomial, sigmoid kernels tried; linear kernel, C = 0.2 best.
- MLP: hidden layer size 2, max_iter 200, solver 'lbfgs', relu activation, constant learning rate.
- Hyperparameter tuning: brute-force grid search, best combo = highest accuracy on validation set under 5-fold CV.
- Two input regimes: (a) per-match feature vectors including live in-match stats; (b) aggregate features = average over all past AND future matches of the player excluding the target match (robustness/overfit check).

## 4. Equations & assumptions
Actual equations from the paper (faithfully transcribed):
- Target: y_i = {1 if P wins; −1 if P loses} (eq 1).
- RANKDIFF = {RANK_a − RANK_b for player a; RANK_b − RANK_a for player b} (eq 2); then non-linearity applied: RANKDIFF set to 0 when both players ranked over 100 (rank differences unreliable for low-ranked players).
- BALANCE = (|SA| + |SRA| + |FHA|) / 3 (eq 3).
- Logistic loss: ℓ(p) = −(1/n) Σ_i [p_i log((y_i+1)/2) + (1−p_i) log(1 − y_i/2)] (eq 4).
- Accuracy = (tp+tn)/(tp+tn+fp+fn) (eq 5); precision = tp/(tp+fp), recall = tp/(tp+fn) (eq 6); F1 = 2·precision·recall/(precision+recall) (eq 7).
Stated assumptions: no draws exist in table tennis; incomplete matches removed; missing-data samples removed; each input standardized to zero mean/unit variance; ranking reliability assumption (top ranks meaningful, >100 ranks not); derived "advantage" features: SA = SP − RP (serve minus receive win %), SRA = short-rally minus long-rally win %, FHA = forehand minus backhand win %.

## 5. Features / target
- Base features: SP (% points won on serve), RP (% on receive), LRP (% won on long rally), SRP (% on short rally), FHP (% on forehand), BHP (% on backhand), RANK (ITTF rank).
- Engineered (*): RANKDIFF (rank difference, zeroed when both >100), SA (serve advantage), SRA (short-rally advantage), FHA (forehand advantage), BALANCE (well-roundedness = mean of |SA|,|SRA|,|FHA|).
- Target: y ∈ {1, −1} (player P wins/loses). Two prediction horizons: (a) full-match features, (b) aggregate player features excluding target match (pre-match prediction analog).

## 6. Validation design
- 5-fold cross-validation; overall split 72:18:10 train:validation:test, with 10% held out as test for validating hyperparameter tuning; the 90% split 80:20 within folds for train/HP-optimization. Note: folds appear to be random (not time-ordered) — not stated as chronological.
- Metrics: accuracy and F1 on validation (with standard errors) and test sets; confusion matrices (Fig. 5); ROC curves (Fig. 7).
- Ablation: with vs. without derived features (Table 4); live vs. aggregate-excluding-target features (Table 5).

## 7. Numerical results / baselines
Table 3 (after hyperparameter tuning; validation acc ± SE, test acc/F1):
- Logistic regression: val 0.699±0.024 / F1 0.705±0.023; test acc 0.722, F1 0.706
- Random forest: val 0.677±0.032 / F1 0.688±0.033; test acc 0.667, F1 0.684
- SVM linear: val 0.696±0.029 / F1 0.690±0.035; test acc 0.639, F1 0.629
- SVM RBF: val 0.700±0.025 / F1 0.677±0.034; test acc 0.667, F1 0.600
- SVM polynomial: val 0.705±0.021 / F1 0.685±0.021; test acc 0.611, F1 0.563
- SVM sigmoid: val 0.705±0.017 / F1 0.690±0.019; test acc 0.694, F1 0.621
- MLP: val 0.696±0.019 / F1 0.708±0.020; test acc 0.694, F1 0.703
- Before tuning (Table 2): LR test acc 0.694; MLP test acc 0.583; sigmoid-SVM test acc 0.694. Tuning mattered (paper's claim).
- Feature ablation (Table 4, validation acc/F1): with derived features LR 0.699/0.705 vs without 0.631/0.668; SVM-RBF 0.700/0.677 vs 0.500/0.591; MLP 0.696/0.708 vs 0.639/0.683. All models worse without derived features.
- Exclude-target-match aggregate (Table 5, test): LR acc 0.639, RF 0.667, MLP 0.667 (acc range 61–67% across models) — comparable to live features, taken as evidence against overfitting.
- Feature importance (RF, Gini): RANKDIFF most important.

## 8. Code / data availability
None stated (no code link, no dataset download link; dataset used with OSAI permission via https://osai.ai/).

## 9. Leakage & limitations
- Severe: feature vectors include in-match statistics from the target match itself (SP, RP, rally stats observed during match i used to predict match i). The authors acknowledge this ("predicting the outcome from all these features post-match is a trivial task") and lean on feature-convergence (Fig. 4) + the aggregate check, but the headline ~70% numbers are computed on post-match features — leaky for a "prediction" claim.
- The "robustness" check averages over all past AND FUTURE matches excluding the target — future matches are lookahead leakage in a strict pre-match prediction sense; it measures player-strength encoding, not honest forecasting.
- Sample size never reported — cannot assess power, SE validity, or generalizability; a tiny test set (10%) makes test acc numbers (e.g., LR 0.722 vs MLP 0.694) statistically indistinguishable.
- CV folds are random, not time-ordered — player strength drift over the Olympics/Bundesliga season is not controlled.
- No comparison to betting odds baseline; no ROI; no calibration (only acc/F1).
- External validity to NFL: essentially nil — a two-player closed-skill sport with no draws, no lineups, no weather, no coaching. The transferable part is the feature-engineering pattern, not the models or numbers.

## 10. GSE overlap
Per existing-research-map.md: no table-tennis content in GSE's corpus; nothing to dedup. Related-but-distinct: GSE's repo has matchup-differential features (gse-lab unit matchups, coverage matchups, DVOA-style opponent adjustments) and calibration work, but no explicit "advantage differential" construction pattern (serve-vs-receive, short-vs-long-rally analogs) and no formalized "exclude-target-match aggregate" anti-overfit protocol. This is an **extension**: a reusable feature-engineering template (paired advantage differentials + BALANCE-style well-roundedness) and a validation trick worth porting.

## 11. GSE implementation spec
- Port the pattern, not the sport. NFL analogs of the engineered features: pass-vs-run EPA differential (offense balance), short-vs-long down EPA differential, home/road splits differentials, early-down vs late-down efficiency gaps; a BALANCE metric = mean of absolute differentials (team "well-roundedness" as a feature).
- Port the RANKDIFF non-linearity idea: rank/rating differences are unreliable at the tails — apply a similar saturation to Elo-difference features (clip or zero small differences between closely-rated teams, matching GSE's known Elo work).
- Port the anti-overfit protocol: for every matchup-level feature, compute it from rolling aggregates EXCLUDING the target game (leave-one-game-out aggregates) and verify model accuracy parity between in-sample-with-target and LOO aggregates — this is a cheap leakage audit GSE can add to the props/engine pipeline.
- Effort: 1 engineer-week (feature functions + LOO audit harness in the existing nflverse pipeline; no new model).

## 12. Reproducible test
Dataset: nflverse play-by-play 2021–2024, team-game level. Build the paired-differential features (pass/rush EPA diff, 1st-2nd vs 3rd-4th down EPA diff, home/road EPA diff) + BALANCE, computed as leave-one-game-out rolling aggregates (exclude target game). Target: binary game winner. Baseline: same classifier (logistic regression, sklearn, C=1.0) on the same features computed WITH the target game included (leaky) vs LOO version. Metric: 5-fold CV accuracy/F1, mirroring the paper's Tables 4–5. Success = LOO features retain ≥95% of the leaky version's accuracy (paper's robustness criterion, Table 5's 61–67% vs ~70%).

## 13. Acceptance / rejection gate
Adopt the differential-feature + LOO-audit pattern if: (a) BALANCE-style features rank in the top half of RF Gini importance on NFL data, and (b) LOO-aggregated features lose ≤5 percentage points of accuracy vs leaky features (paper's parity standard). Reject if differentials add nothing over GSE's existing EPA aggregates, or if the LOO audit reveals GSE's current matchup features are leaking target-game data.

## 14. Improvement experiment
Beyond the paper: replace hand-crafted differentials with *learned* advantage embeddings — a small neural module that takes paired situational EPA vectors (e.g., [pass EPA, rush EPA]) and learns the differential transform end-to-end, supervised by game outcome, then distill the learned transform into closed-form features for the production engine. Second: extend BALANCE to a team-level "dimensionality" score (PCA effective-rank of a team's situational EPA vector) and test whether low-dimensional (one-dimensional) teams are systematically overpriced by markets — the paper never connects well-roundedness to market pricing, which is where GSE's money is.
