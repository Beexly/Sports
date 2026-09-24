# [0597] Decoding machine learning benchmarks (arXiv:2007.14870v2)

**Citation:** Cardoso, L. F. F., Santos, V. C. A., Kawasaki Francês, R. S., Prudêncio, R. B. C. & Alves, R. C. O. (2020). *Decoding machine learning benchmarks*. arXiv:2007.14870v2. URL: https://arxiv.org/abs/2007.14870v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 551 lines).
**Verdict:** ADAPT — not for classifier benchmarking per se, but for the IRT-based model-evaluation framework: treat historical game-weeks as "items" and engine model versions as "respondents," estimate item difficulty/discrimination, and rank models by difficulty-adjusted ability instead of raw accuracy. A principled upgrade to GSE's existing engine-benchmark backtest comparisons.

## 1. Research question
Can Item Response Theory (IRT), borrowed from psychometrics, diagnose whether the OpenML-CC18 benchmark is actually a good test set for classifiers — and can it simultaneously estimate dataset difficulty and classifier ability, with Glicko-2 summarizing the results into a global ranking?

## 2. Dataset / schema
OpenML-CC18 (72 datasets mid-2018); 60 actually evaluated (11 too large for the pipeline, "Pc4" failed IRT estimation). Classifiers: 12 sklearn defaults (GaussianNB, BernoulliNB, KNN k∈{2,3,5,8}, DecisionTree, RF{3,5,default}, SVM, MLP), 120 MLPs of increasing depth 1–120 (for response diversity), plus 7 artificial classifiers (3 random, majority, minority, pessimal, optimal). 70/30 stratified splits (test capped at 500 instances for IRT estimation). Response matrix: each classifier's correct/incorrect on each test instance.

## 3. Method / model
3PL IRT model fit per dataset via R's ltm package (rpy2): instances = items, classifiers = respondents, estimating item difficulty b_i, discrimination a_i, guessing c_i, and classifier ability θ_j (Birnbaum two-step; Catsim for proficiency). True-Score = Σ_i P(correct) over items = a test-like total grade per classifier per dataset. decodIRT tool: 3 scripts (data/models → IRT parameters → analysis/ranking). Glicko-2 round-robin tournament: each dataset is a "classification period"; pairwise True-Score comparisons (1/0/0.5) update rating R, deviation RD, volatility σ; final ratings rank classifiers globally.

## 4. Equations & assumptions
3PL (1): P(U_ij=1|θ_j) = c_i + (1−c_i) / (1 + e^{−a_i(θ_j−b_i)}), with U_ij ∈ {0,1} response, θ_j ability, b_i difficulty (location), a_i discrimination (slope), c_i guessing (casual hit). 2PL drops c_i=0; 1PL drops a_i=1. Glicko-2: rating interval [R−2RD, R+2RD] ≈ 95% CI; defaults R=1500, RD=350, σ=0.06. Standard cutoffs (Adedoyin & Mokobi): difficult if b_i > 1, highly discriminating if a_i > 0.75, high guessing if c_i > 0.2.
Assumptions: unidimensional ability per classifier; items conditionally independent given ability; difficulty/discrimination constant across the respondent pool; 500-instance cap doesn't distort parameter estimates.

## 5. Features / target
Features: per-instance IRT parameters (difficulty, discrimination, guessing) estimated from classifier response matrices. Targets: classifier ability θ, True-Score per dataset, final Glicko-2 ratings.

## 6. Validation design
No holdout — descriptive/benchmark study. 60 datasets, pairwise Nemenyi/Friedman tests on rating distributions (Friedman p ≈ 9.36×10^{−80} for real classifiers). Artificial classifiers act as sanity anchors (optimal must rank first, pessimal last).

## 7. Numerical results / baselines
Of 60 datasets, 49 (81.67%) have <27% difficult instances; only 7 have >50% difficult; only ~12% of instances overall are difficult. Conversely, 31/60 datasets have ≥80% very-discriminating instances — CC18 discriminates good from bad classifiers but rarely stresses them. Difficulty and discrimination are inversely related: the hardest datasets (tic-tac-toe, credit-approval, optdigits) are the least discriminating; the most discriminating (banknote-authentication, analcatdata_authorship, texture) are easy. Glicko-2 final ratings: optimal 1732.56, MLP 1718.65, RF 1626.60, RF(5) 1606.69, RF(3) 1575.26, DecisionTree 1571.46, SVM 1569.48, KNN(3) 1554.15, GaussianNB 1530.86, KNN(2) 1528.41, KNN(5) 1526.10, BernoulliNB 1494.87, KNN(8) 1457.78, minority 1423.01 … pessimal 1270.46. All RD ≈ 30–33, all volatility ≈ 0.06–0.077 (low). MLP sits within RD range of 3rd/4th place — positions 1–4 not statistically separable (Nemenyi heatmap: top-3 don't differ from each other or from several lower classifiers).

## 8. Code / data availability
decodIRT tool: https://github.com/LucasFerraroCardoso/IRT_OpenML (Python + R). Benchmark results and analysis data linked in repo. sklearn classifiers, R ltm, Catsim, Glicko-2 implementation referenced.

## 9. Leakage & limitations
- 12 of 72 datasets excluded — coverage is 83% of CC18, biased toward smaller datasets.
- Inverse difficulty/discrimination relationship means the "best" test items for stress and for ranking are different subsets; a single benchmark can't do both.
- Negative-discrimination instances (where weak classifiers score higher) corrupt True-Scores — the paper flags them but doesn't fix them; datasets rich in such instances may be actively bad benchmarks.
- Default hyperparameters only: rankings reflect "innate ability by design," not optimized performance; hyperparameter tuning could reorder the board.
- Glicko-2 tournament treats every dataset as equal weight — no weighting by dataset size or importance.
- Nemenyi shows the top cluster isn't cleanly separable, weakening the "MLP wins" headline.

## 10. GSE overlap
Extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1), the repo's engine-benchmark lane compares models on raw accuracy / EPA / calibration, but has no difficulty-adjusted evaluation: a model that nails hard games looks the same as one padding stats on easy ones. IRT gives a principled "which games were actually hard items" decomposition and Glicko-2 gives a principled multi-model ranking — both new to the corpus.

## 11. GSE implementation spec
Build an IRT evaluation layer over the engine's backtest history: items = historical game-weeks (or individual spread/total picks), respondents = model versions (v5.2.7 and predecessors/challengers), responses = pick correct/incorrect. Fit 2PL/3PL per season; extract per-pick difficulty and discrimination; compute per-model True-Score and run the Glicko-2 round-robin across seasons to rank model versions by difficulty-adjusted ability. Use instance-difficulty metadata to (a) weight future backtests toward high-discrimination games, (b) diagnose which game types (divisional, short-rest, weather) are systematically hard items. Effort: ~1–2 engineer-weeks (Python IRT via py-irt or rpy2/ltm; Glicko-2 is a weekend).

## 12. Reproducible test
Dataset: engine picks table (3,411 picks, SPREAD/MONEYLINE/TOTAL) + at least 2 prior model versions' backtest responses on the same games. Fit 2PL per season; test 1: do difficulty parameters correlate with pregame market uncertainty (closing line vs model edge)? test 2: does the Glicko-2 ranking of model versions differ from the raw-accuracy ranking — if yes, the difficulty adjustment is telling us something raw win rate hides.

## 13. Acceptance / rejection gate
Adopt the IRT layer if (a) item difficulties show meaningful spread (not all games equally hard — check against the paper's finding that most instances are easy) AND (b) at least one model version changes rank vs raw accuracy, demonstrating the difficulty adjustment has signal. Reject if all items are near-uniform difficulty (then raw accuracy suffices) or if negative-discrimination items exceed ~10% of games (the paper's own corruption warning — fix item pool first).

## 14. Improvement experiment
The paper weights every dataset equally in the Glicko-2 tournament; weight "classification periods" by betting relevance (handle, or model edge magnitude) so the rating reflects strength where money is actually at stake. Then test whether the money-weighted ranking predicts next-season ROI better than the unweighted ranking — turning a descriptive benchmark tool into a model-selection criterion for deployment.
