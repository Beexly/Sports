# THEORY-LAYER.md — Prediction-Engine Research Census (2026-08-26)

Status: UNVERIFIED for some DOIs/arXiv IDs — marked inline. No fabricated numbers.
Repo mapping refers to concepts in `falsifyBind` (e-processes), `extremization-tuner` (gamma), `recency-weighted lambda`, `mmc-contribution`, `logOddsPool`.

---

## 1. RATING SYSTEMS

### 1.1 Elo (canonical)
- Core idea: Expected score E = 1 / (1 + 10^((Rj-Ri)/400)). Update Ri += K*(S - E). Logistic-curve over rating diff.
- Canonical citation: Elo, A. E. (1978). *The Rating of Chessplayers, Past and Present* (2nd ed.). Arco. [UNVERIFIED: ISBN 978-0-668-04721-0; first ed. 1975/1978].
- Recipe: Set K=32 (FIDE) or K=20 (online); initialize 1500; update after each paired outcome (S=1/0.5/0).
- Mapping: Base baseline for any prediction engine; `falsifyBind` e-processes can treat Elo-derived probabilities as a null-model baseline to be falsified.

### 1.2 Glicko / Glicko-2
- Core idea: Each player has (μ, σ, RD) — mean skill, uncertainty, rating deviation. Update uses Bayesian posterior over paired comparisons; RD decreases with play, increases with inactivity.
- Canonical citation: Glickman, M. E. (1999). "Parameter estimation in large dynamic paired comparison experiments." *Applied Statistics*, 48, 377-394. Also Glickman & Jones (1999) Chance 12(2), 21-28. [UNVERIFIED exact page ranges; URLs at glicko.net/research/ confirmed.]
- Recipe: Initialize μ=1500, σ~350, τ=system constant (~0.5-1.2); update via Glickman formulas (approx message-passing). Glicko-2 adds volatility parameter and rating-period batches.
- Mapping: Natural partner for `recency-weighted lambda` — RD growth over inactive periods is exactly a recency-decay mechanism.

### 1.3 TrueSkill (Microsoft Bayesian factor graphs)
- Core idea: Skill s_i ~ N(μ_i, σ_i²); performance p_i = s_i + ε (noise); outcome factor compares p's. Inference via approximate message passing (EP) on factor graph.
- Canonical citation: Herbrich, R., Minka, T., Graepel, T. (2006). "TrueSkill™: A Bayesian Skill Rating System." NIPS 2006. [UNVERIFIED exact page nums; paper file f44ee263952e...PDF cited by Wikipedia.]
- Recipe: Set draw_margin ε; initialize μ=25, σ=8.33 (TrueSkill default); update via EP per match (supports >2 players and team games).
- Mapping: The factor-graph inference maps to `mmc-contribution` — each player's contribution factor can be decomposed independently in the graph.

### 1.4 Bradley-Terry model
- Core idea: Pr(i > j) = p_i / (p_i + p_j) with positive parameters p. Maximum-likelihood estimates via iterative reweighted least squares (MM algorithm).
- Canonical citation: Bradley, R. A., Terry, M. E. (1952). "Rank analysis of incomplete block designs: I. The method of paired comparisons." *Biometrika*, 39(3/4), 324-345. [DOI 10.1093/biomet/39.3-4.324 — UNVERIFIED live.]
- Recipe: Initialize p_i=1; iterate p_i = W_i / Σ_j (N_ij / (p_i + p_j)). Converges fast; can add covariates (home/field) as logistic extensions.
- Mapping: Direct input to line-building (margin -> spread conversion below) — p ratios are implied win probabilities.

### 1.5 Ordinal logistic ratings / PageRank-based ratings
- Core idea: Treat outcomes as ordered categories (win/draw/loss) with latent skill differences; ordinal logistic regression estimates skill coefficients. PageRank-style: wins are links, ratings solve eigenvector of weighted adjacency.
- Canonical citation for ordinal: McCullagh, P. (1980). "Regression models for ordinal data." *JRSS-B* 42(2), 109-142. [DOI 10.1111/j.2517-6161.1980.tb01119.x — UNVERIFIED live.] PageRank sports: Govan, A. Y. (2008) adaptations; also Colley (2001) and Massey (1997) least-squares ranking systems cited widely.
- Recipe: Ordinal: fit proportional-odds model with team ratings as linear predictors. PageRank: A_ij = 1 if i beat j; solve r = α M r + (1-α)v; α≈0.85.
- Mapping: Ordinal outputs are well-calibrated probabilities — feeds calibration layer (Section 3). PageRank eigenvalues map to `extremization-tuner` gamma: extreme eigenvalues (dominant teams) are amplified by gamma tuning.

---

## 2. MARKET-DERIVED PROBABILITY (LINE-BUILDING)

### 2.1 Mechanic: power ratings → margin → spread conversion
- Books start with power ratings (often Elo-derived or proprietary). Difference R = RA - RB predicts margin. Spread = R + home-field adjustment (NFL ~+2.5pts, NBA ~+3.5pts, varies by season). Point spread is then rounded (half-point) and adjusted for market balance / sharp action.
- Vig loading: raw implied probabilities sum >100%; overround = sum(p_implied) - 1. Typical overround: 4.5-5.5% for -110/-110 sides. De-vig: p_fair = p_raw / (1 + overround) per side.
- Canonical reference: No single canonical paper; best-practice synthesis from market microstructure literature (e.g., Sauer, R. D. 1998; Polson, N. G., & Stern, J. M. 2015). [Citations UNVERIFIED — sources noted but not pulled.]

### 2.2 Steam / CLV (Closing Line Value)
- Closing line is the sharpest available estimate of true probability (efficient-market hypothesis). Steam = rapid line movement from sharp money. Positive CLV = bet price better than no-vig closing price.
- Recipe: (1) Convert your bet odds and closing odds to implied probabilities. (2) De-vig close: normalize both sides to 100%. (3) CLV% = (p_fair_close - p_implied_bet) / p_implied_bet (approx).
- Mapping: `falsifyBind` e-process uses the closing line as the reference process — any model that consistently produces prices with negative CLV vs close gets falsified by the market.

---

## 3. ML + CALIBRATION LITERATURE

### 3.1 Gradient boosting on tabular game features
- Core finding: XGBoost / LightGBM on tabular features (rating diffs, home/away, rest days, injuries, weather proxies) reliably beat raw Elo by 2-4 pts of accuracy on typical sports datasets (UNVERIFIED exact %; literature reports vary 1-3%). Deep learning (CNN/LSTM on sequence features) often fails to beat the same tabular baseline — see negative results (Section 5).
- Canonical references: Chen, T., Guestrin, C. (2016). "XGBoost: A scalable tree boosting system." KDD. [UNVERIFIED exact arXiv ID; arXiv:1603.02754 cited by Wikipedia.]
- Recipe: Features = current ratings diffs + recency weights + venue + rest; target = binary win/draw; train XGBClassifier(logloss); evaluate Brier score (calibration) + log-loss (discrimination).

### 3.2 Calibration layers: isotonic / Platt
- Platt scaling: logistic regression on model scores (sigmoid). Isotonic: non-parametric monotonic mapping. Both improve Brier score vs uncalibrated gradient boosting on tabular data (UNVERIFIED exact Brier improvements; literature reports 0.01-0.04 Brier reduction).
- Key caveat (recent 2025-2026 literature): Platt and isotonic can *degrade* proper scoring performance for very strong modern boosting models (see arXiv 2601.19944v1 above). The calibration layer is not always a free win — must be validated on holdout.
- Recipe: Split train/calibration/test (e.g., 60/20/20). Fit XGBoost on train; calibrate on calibration set; evaluate Brier + reliability diagram on test.
- Mapping: `extremization-tuner` gamma controls how aggressively calibrated probabilities are sharpened. Isotonic fits monotonic distortion; Platt fits sigmoid — these are the two standard paths the tuner could select between.

### 3.3 Conformal prediction intervals for scores
- Core idea: Given calibration set (X_cal, y_cal), construct prediction intervals with guaranteed coverage 1-α regardless of model. For regression (score prediction): quantile of |y - f(x)| over calibration set gives interval width. For classification: set prediction = {labels: score ≥ q_threshold}.
- Canonical citation: Vovk, V., Gammerman, A., Shafer, G. (2005). *Algorithmic Learning in a Random World*. [UNVERIFIED exact edition.] More recent: Angelopoulos, A. N., Bates, S. (2021). "A gentle introduction to conformal prediction." J. Machine Learning Research survey. [DOI 10.48550/arXiv.2107.07511 — UNVERIFIED live.]
- Recipe: After training model, reserve calibration fold; compute non-conformity scores; for new point, return interval = [f(x) - q, f(x) + q] with q = (1-α)-quantile.
- Mapping: `falsifyBind` e-process + conformal intervals = falsifiable prediction with coverage guarantee. If interval fails to cover observed outcome more than α fraction over sequence, the model is falsified.

---

## 4. ENSEMBLE / AGGREGATION MATH

### 4.1 Beyond logOddsPool (our current mechanism — cited as reference)
- Linear pool (LP): p_ens = Σ w_i p_i, Σw_i=1. Preserves calibration but tends to under-confident (regression to mean).
- Logarithmic pool (LGP): p_ens ∝ Π p_i^{w_i}. Sharper, geometric-mean behavior; tends to over-confident. See Neyman, E. (2023). "The Case of Logarithmic Pooling." NeurIPS 2023. [UNVERIFIED exact paper file.] Carvalho, L. M. (2023). "Bayesian Inference for the Weights in Logarithmic Pooling." Bayesian Analysis. [DOI 10.1214/22-BA1311 — UNVERIFIED.]
- Mapping: `logOddsPool` uses log-space aggregation (log-odds sum → sigmoid) — closer to logarithmic/geometric. `extremization-tuner` gamma shifts between linear (γ→0) and sharp geometric (γ→1+).

### 4.2 Bayes model averaging (BMA)
- Core idea: Weight models by P(M_k | data) ∝ P(data | M_k) P(M_k). Posterior predictions are weighted mixture. In practice, BIC approximates evidence; weights become exp(-BIC_k/2) / Σ.
- Canonical citation: Hoeting, J. A., Madigan, D., Raftery, A. E., Volinsky, C. T. (1999). "Bayesian model averaging: a tutorial." *Statistical Science* 14(4), 382-417.
- Recipe: Train K models; compute BIC_k = -2·logLik + p·log(N); w_k = exp(-BIC_k/2) / Σ; predict = Σ w_k · f_k(x).
- Mapping: Direct mapping to ensemble layer; `mmc-contribution` decomposes model weights as individual contributions.

### 4.3 Stacking with meta-learner (Wolpert, 1992)
- Core idea: Train base learners L1...Ln; meta-learner M takes predictions of L_i as features, predicts final outcome. Prevents overfitting via cross-validated predictions (CV-stacking).
- Canonical citation: Wolpert, D. H. (1992). "Stacked generalization." *Neural Networks* 5(2), 241-259. More modern: van der Laan, M. J., Polley, E. C., Hubbard, A. E. (2007). "Super learner." *Statistical Applications in Genetics and Molecular Biology* 6(1), art. 25.
- Recipe: K-fold CV predictions from base models → meta-feature matrix → train meta-model (often logistic regression or light XGB).
- Mapping: Stacking meta-learner can be the `extremization-tuner` layer — meta-learner outputs are extremized by gamma.

### 4.4 Opinion pools theory
- Linear opinion pool (Stone, 1961): arithmetic mean of probabilities. Logarithmic opinion pool: geometric mean (log-space). Consensus/iterative pools update weights by distance to aggregate.
- Mapping to repo: Linear ↔ `falsifyBind` (conservative, well-calibrated); Logarithmic ↔ `logOddsPool`; Iterative ↔ `recency-weighted lambda` (weights updated with recency).

---

## 5. DOCUMENTED NEGATIVE RESULTS (critical — saves time)

These fancy methods FAIL to reliably beat simple Elo/spread baselines in published sports-prediction literature. We include them precisely so the engine does not waste compute repeating them.

### 5.1 Deep neural networks on small tabular sports datasets
- Finding: CNN/LSTM/deep nets trained on tabular sports features often match or slightly underperform gradient boosting (XGB/LightGBM) with the same features. Deep nets require orders of magnitude more data and overfit on small samples (n < 10k games). Source: Gao, J. et al. (2025) "Predicting sport event outcomes using deep learning" — deep networks reach ~66.3% accuracy vs tuned Elo at ~65.9% — marginal improvement, often not significant. [UNVERIFIED exact numbers; paper cited but not fully read.]
- Lesson: Do not build deep-model layer unless dataset >50k labeled games with rich sequence features.

### 5.2 Complex ensemble stacking without CV regularization
- Finding: Naive stacking (predict predictions without cross-validated meta-features) overfits badly; meta-learner learns to over-trust best base model, reducing robustness. CV-stacking (Wolpert 1992; van der Laan 2007) is required.
- Lesson: Any meta-learner must use out-of-fold predictions only.

### 5.3 Calibration methods degrading strong models
- Finding (2025-2026 literature, arXiv:2601.19944v1): Platt and isotonic can degrade Brier/proper-score performance for very well-calibrated modern boosting models. Calibration layer is not free — must be validated.
- Lesson: Include calibration layer in `extremization-tuner` but validate Brier improvement; skip if negative.

### 5.4 Over-extremized geometric opinion pools
- Finding: Logarithmic/geometric opinion pools (sharp) tend to over-confidence; linear pools tend to under-confidence. Consensus/iterative pools can diverge if initial weights are poor. Source: Neyman (2023) NeurIPS; Carvalho (2023) Bayes. Anal.
- Lesson: `extremization-tuner` gamma must be bounded (e.g., γ∈[0, 2]) with calibration check; unbounded extremization produces false precision.

### 5.5 Complex feature engineering without rating baseline
- Finding: Adding weather, travel distance, referee assignment, etc. improves prediction only marginally vs a well-tuned Elo + home-field model (often <0.5% accuracy gain, sometimes noise). Source: aggregated from literature surveys (no single definitive paper; UNVERIFIED quantitative claim).
- Lesson: Start with rating baseline (Section 1); add features iteratively and validate with `falsifyBind`.

---

## 6. MAPPING SUMMARY — REPO MODULES

| Module / Concept | Theory Mapping |
|---|---|
| `falsifyBind` (e-processes) | Falsifiable prediction framework; use Elo/spread as null process; use conformal intervals (Sec 3.3) for coverage-guaranteed intervals. |
| `extremization-tuner` (gamma) | Controls extremization between linear (γ→0, conservative) and geometric/log (γ→1+, sharp). References calibration layers (Sec 3.2) and geometric pools (Sec 4). Must be bounded (Sec 5.4). |
| `recency-weighted lambda` | Glicko RD growth over inactivity (Sec 1.2); opinion-pool weight decay (Sec 4.4); BMA weight decay (Sec 4.2). |
| `mmc-contribution` | Factor-graph contribution decomposition (TrueSkill, Sec 1.3); BMA model contributions (Sec 4.2); PageRank link weights (Sec 1.5). |
| `logOddsPool` | Logarithmic opinion pool (Sec 4.1); geometric-mean behavior; maps to sharp predictions that must be validated vs falsifiable baseline. |

---

## 7. UNVERIFIED / GAPS
- Several DOIs and arXiv IDs cited above are confirmed by web search snippets but full papers were not retrieved; treat exact page ranges and some quantitative claims as unverified.
- No exact numerical benchmark table produced from original papers (would require full retrieval and extraction); claims are qualitative synthesis from snippets.
- Negative results rely partly on aggregated survey claims rather than a single authoritative meta-analysis.

---
*File written: 2026-08-26. Path: C:/Users/Garrett/Sports/handoff/research/prediction-engines-2026-08/THEORY-LAYER.md. Not git-committed per instructions.*
