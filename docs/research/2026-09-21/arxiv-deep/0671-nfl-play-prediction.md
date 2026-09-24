# [0671] NFL Play Prediction (arXiv:1601.00574)

**Citation:** Brendan Teich, Roman Lutz, Valentin Kassarnig (2016). *NFL Play Prediction*. arXiv:1601.00574. URL: https://arxiv.org/abs/1601.00574
**Ledger completed:** 2026-09-21. **Read:** full text (local cache /tmp/arxiv750-cache/fulltext/1601.00574.txt, all sections 1–9 + appendix tables 6–13).
**Verdict:** ADAPT — the "progress" measure is a down-aware continuous play-outcome target worth adopting as a complement to EPA for GSE play-level modeling; best-practice result (RBF SVM) is a weak baseline, but the feature/target design transfers.

## 1. Research question
Can the outcome of an individual NFL play be predicted from the game situation and a parsed play description, across classification and regression framings, as a foundation for real-time play-call optimisation (choose the playbook play with the highest predicted success)?

## 2. Dataset / schema
177,245 plays from all NFL games 2009–2014, extracted via the nflgame API (play-by-play JSON). Penalties, field goals, punts, sacks, fumbles and non-play strings filtered out. Features parsed from play-description strings plus API structure fields. Access: nflgame was public/open-source at the time (now superseded by nflverse). Replicable with nflverse play-by-play.

## 3. Method / model
Classification: decision trees (balanced class weights), nearest centroid, LDA (SVD / least-squares / eigenvalue with shrinkage), linear + RBF SVM (grid search over C ∈ {2^k}, k∈[−5,17], γ ∈ {2^k}, k∈[−17,4]). Regression: regression trees, RBF SVR, linear regression, PyBrain ANNs (up to 10 hidden layers × 100 units, 100 epochs, sigmoid/tanh/linear). Categorical features one-hot encoded: 12 → 77 dimensions. Imbalance handled by balanced class weighting or undersampling. ANOVA F-test for feature ranking; PCA for exploration (authors note PCA is questionable on mixed continuous/binary data).

## 4. Equations & assumptions
- F1 = 2·precision·recall/(precision+recall).
- Progress measure: progress(down, togo, gained) = 0 if down∈{3,4} and gained<togo; (gained/togo)^down if down∈{1,2} and gained<togo; 1 if gained≥togo. (Linear on 1st down, quadratic on 2nd down.)
- Assumptions: play outcome depends only on team-level features, not individual players (supported by citing McGarrity & Linnen on QB substitution); penalties invalidate the play string entirely; field-goal-range nuance on 3rd/4th down neglected (all non-conversions = 0); success = first down or touchdown only.

## 5. Features / target
12 features: team, opponent, half, time (seconds remaining in half), field position (distance to opponent end zone), down, to-go, shotgun, pass, side (left/middle/right), pass length (short/deep), QB run. Targets: success (binary, first down or TD; 70% failure / 30% success imbalance), yards (continuous), progress (new continuous measure, Section 5).

## 6. Validation design
No explicit train/test split stated in the excerpted text — appears to be train-on-full or cross-validated on the 177,245-play corpus (methodological weakness; no time-ordered split described). Baselines compared across methods on shared targets. Metrics: accuracy, precision, recall, F1 for classification; MAE, RMSE for regression. Tables report best configuration per method.

## 7. Numerical results / baselines
Success classification: RBF SVM best — accuracy 66.65%, precision 67.62%, recall 63.75%, F1 65.63% (at C=2^1, γ=2^−17). SVD LDA: 66.91%/67.20%/65.05%/66.11%. Decision tree (1 rule: togo ≤ 7.5): 69.2% accuracy but precision 47.9%, recall 50.0%. Nearest centroid: ~50.7% — random. Neural nets on imbalanced data collapsed to majority class (accuracy ~70.5%, recall ~0). Yards regression: RBF SVR MAE 5.207 yds, RMSE 8.977 yds (best); others MAE 5.49–5.78. Progress regression: RBF SVR MAE 0.1351, RMSE 0.2332 (best); linear regression 0.1412/0.2283; regression trees 0.1424/0.2131; NN 0.1575/0.2449. ANOVA F-test: togo 16146.92 (highest), down 6690.42, pass 2927.44; team=NE 48.01 vs team=MIA 0.00005 — million-fold spread, suggesting some teams far more predictable than others.

## 8. Code / data availability
GitHub: https://www.github.com/romanlutz/NFLPlayPrediction. Built on scikit-learn, PyBrain, nflgame. Code available; data via nflgame API (deprecated, use nflverse).

## 9. Leakage & limitations
No time-ordered train/test split described — likely in-sample or shuffled evaluation, risking overfit and leaking era-specific tendencies into "predictions". Team one-hot features (32 teams) let the model memorise team identity rather than generalise — the million-fold ANOVA spread for team=NE vs team=MIA is memorisation, not insight. No opponent-strength adjustment beyond identity dummies. Filtered out sacks/fumbles/punts/FGs — the highest-leverage plays — so the model never sees them. Progress measure is ad hoc (quadratic penalty on 2nd down asserted, not fitted). Precision ceiling 67.6% is too low for real play-calling use, as authors concede. PyBrain ANNs under-tuned (100 epochs, no rebalancing).

## 10. GSE overlap
Existing-research-map covers EPA, success rate, and play-level metrics in the engine-benchmark lane; no ledger found for this paper. The "progress" target is NOT in the map — it is a new down-aware continuous play-value measure distinct from EPA (EPA needs a win-probability model; progress needs only down/distance). Extension, not duplicate.

## 11. GSE implementation spec
Adopt progress as a secondary play-level target alongside EPA in GSE's play-by-play models: compute progress for every nflverse play 2009–2025, train gradient-boosted regression (XGBoost/LightGBM, replacing the paper's SVR) with team-strength features (Elo/EPA-based, NOT one-hot identities) + tracking-derived features (NGS separation, pass rush time). Train time-ordered (train ≤2022, validate 2023, test 2024–2025). Compare progress-RMSE vs EPA-RMSE as predictors of next-play and drive-outcome value. Effort: ~3–5 days.

## 12. Reproducible test
Dataset: nflverse play-by-play 2015–2024, plays filtered as in paper. Metric: MAE/RMSE of progress on time-ordered 2024 holdout. Baseline to beat: paper's RBF SVR (MAE 0.1351, RMSE 0.2332) — a modern GBM with Elo features should beat RMSE < 0.21; if not, the target is noisier than claimed.

## 13. Acceptance / rejection gate
Adopt progress as a GSE feature if the GBM test RMSE beats 0.22 on the 2024 holdout AND progress adds incremental R² over EPA in a drive-points regression; otherwise keep EPA only.

## 14. Improvement experiment
Replace the asserted quadratic down-penalty with a fitted parametric family progress = (gained/togo)^f(down), fitting f(1), f(2) on data by minimising correlation with next-drive points — and test whether a learned exponent beats both the paper's (1, 2) and EPA at predicting drive continuation.
