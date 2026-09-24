# [0039] Aging Decline in Basketball Career Trend Prediction Based on Machine Learning and LSTM Model (arXiv:2509.25858v1)

**Citation:** Yi-chen Yao, Jerry Wang, Yi-cheng Lai, Lyn Chao-ling Chen (2025). *Aging Decline in Basketball Career Trend Prediction Based on Machine Learning and LSTM Model*. arXiv:2509.25858v1. URL: https://arxiv.org/abs/2509.25858
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 306 lines).
**Verdict:** ADAPT — the cluster-conditioned career-trajectory design (autoencoder+K-means archetyping feeding a cluster-conditioned LSTM) ports to NFL age curves for props/DFS; the fitted NBA model and its exact numbers do not transfer.

## 1. Research question
How does aging decline affect NBA player performance, and can a two-stage model — (1) autoencoder + K-means clustering to classify players into career-trend types, then (2) an LSTM conditioned on the trend type — predict individual players' future Box Plus/Minus (BPM) better than standard ML/DL baselines? The authors claim the method generalizes "in different types of sports in the field of sport analytics." (Abstract)

## 2. Dataset / schema
NBA seasonal data 1995–2023 from the Kaggle dataset "NBA history | seasonal data 1995-2023" (B. F. Aas, ref [17]). Each player-season carries 48 numerical features, combining basic box-score statistics and advanced analytics metrics; named features include Points (PTS), Rebounds (REB), Assists (AST), Box Plus/Minus (BPM), Player Efficiency Rating (PER), and True Shooting Percentage (TS). Selection: players with at least 5 complete seasons of career trend between ages 22 and 31. For modeling, 177 NBA players with complete career trends: 141 in the training set, 36 in the test set; the paper states "no data both exists in the training set and the test set to avoid data leakage." For category analysis, 222 NBA players split into star player category (23 players, 10.4%) and regular player category (199 players, 89.6%) "according to All-Star selection, award and team contribution." Missing-data handling: TS filled with the median value from similar players; counting statistics filled with forward or backward data. Input window: ages 22–28 (7-year developmental sequence); target window: ages 29–31. Dataset is public (Kaggle URL given in ref [17]). Exact star/regular labeling rubric beyond "All-Star selection, award and team contribution" not stated.

## 3. Method / model
Two-stage framework (§III, Figure 1), implemented in Python:
- **Stage 1 — career-trend classification:** input is the 7-year career trend (48 features × 7 years = 336-dimensional vectors, X ∈ ℝ^(N×7×48)). An autoencoder compresses 336 → 128 (dense layer with batch normalization and dropout rate 0.1) → 64 (dense layer with ReLU activation), producing embeddings Z ∈ ℝ^(N×64); a decoder reconstructs the input so the encoder learns career-trend features. Adam optimizer. After autoencoder training, K-means clustering on the embeddings identifies career-trend types; the optimal K is chosen by Silhouette score (Table I: K=2 → 0.16, K=3 → 0.15, K=4 → 0.12, K=5 → 0.11, K=6 → 0.10, K=7 → 0.10, K=8 → 0.09), so K=2 types were used.
- **Stage 2 — career-trend prediction:** one input is the career-trend sequence X ∈ ℝ^(7×48); a second input transforms the Stage-1 cluster assignment into a one-hot encoded vector c ∈ ℝ^K. The LSTM layer with 64 units processes the 7-year sequence into a 64-dimensional temporal feature vector, which is concatenated with the one-hot cluster vector. The combined vector passes through dense layers reducing 32 → 16 dimensions with ReLU activation; Adam optimizer with early-stopping regularization; training "converges typically before reaching the maximum 100 epochs." The output layer generates 3 values: predicted BPM at ages 29, 30, and 31.
Baselines compared: linear regression, ridge regression, random forest, SVR, last-value (predicts most recent BPM), MLP, GRU, 1D CNN, CNN+LSTM, BiLSTM, and a standard LSTM without clustering (to isolate the clustering effect).

## 4. Equations & assumptions
- Mapping: f: ℝ^(7×48) → ℝ³ such that Ŷ = f(X), where the input sequence is {x₁, x₂, …, x₇} with each xᵢ ∈ ℝ⁴⁸ the feature vector at age (21 + i), and the target sequence Y = {y₁, y₂, y₃} where yᵢ is BPM at age (28 + i). (§III.B, formula 1)
- Autoencoder reconstruction loss: L = (1/N) Σᵢ₌₁ᴺ ‖xᵢ − decoder(encoder(xᵢ))‖₂². (§III.C, formula 2)
- Stated assumptions: BPM is a sufficient summary of player performance; career trajectories cluster into a small number of archetypes discoverable by autoencoder + K-means (authors concede the silhouette score of 0.16 "reflects the limited sample size and similarity among the NBA players, but even weak clustering helps to generate promising prediction results"); the archetype label is informative for future decline conditional on individual history; age 29–31 is the decline window of interest; star vs. regular players have structurally different career trends (Figure 2).

## 5. Features / target
Features: 7-year per-player performance time series, 48 numerical features per season (PTS, REB, AST, BPM, PER, TS named; full list not enumerated) + one-hot cluster-type indicator from Stage 1. Target: BPM at ages 29, 30, 31 (three outputs). Horizon: 1–3 years ahead (predicted from the age 22–28 development sequence). The problem is framed as time-series forecasting: predict peak-period (age 29–31) BPM from the development period.

## 6. Validation design
Test-set comparison across 12 models (Table II); separate star vs. regular breakdown (Table III); individual case studies (Table IV, Figure 4); average career-trend curves by player type (Figure 3); predicted-vs-actual scatter at ages 29/30/31 (Figure 5). Metrics: test MAE and test R². Split: 141 train / 36 test players (no overlap, stated to avoid leakage). Whether the split is time-ordered or random is not stated. Baselines: linear/ridge regression, random forest, SVR, last-value, MLP, GRU, 1D CNN, CNN+LSTM, BiLSTM, standard LSTM without clustering.

## 7. Numerical results / baselines
Table II (PREDICTION PERFORMANCE COMPARISON — Test MAE / Test R²), quoted exactly:
- Proposed method: 1.42 / 0.55 (best on both)
- Random Forest: 1.48 / 0.49; SVR: 1.81 / 0.17; Last Value: 1.71 / 0.36; GRU: 1.82 / 0.23; BiLSTM: 1.84 / 0.21; Standard LSTM: 1.84 / 0.19; MLP: 1.93 / −0.01; CNN+LSTM: 1.93 / 0.03; 1D CNN: 2.14 / −0.20; Ridge Regression: 5.63 / −7.46; Linear Regression: 6.66 / −10.56.
Paper-claimed deltas: vs. random forest, the proposed method achieves 4.05% reduction in test MAE and 12.24% improvement in test R²; vs. standard LSTM, 22.83% MAE reduction and 189.47% R² improvement. (Paper's arithmetic, not independently recomputed.)
Table III (star vs. regular): Star player — standard LSTM: MAE 4.83, R² −4.15 (n=23); proposed: MAE 1.78, R² 0.23 (n=23). Regular player — standard LSTM: MAE 1.96, R² −0.07 (n=199); proposed: MAE 1.45, R² 0.39 (n=199). Paper claims the proposed method "improves significantly (Star player: 63.1%, regular player: 26.0%) than the standard LSTM model" — those percentages are the MAE reductions: (4.83−1.78)/4.83 = 63.1% and (1.96−1.45)/1.96 = 26.0% (computed from the table; consistent with the paper's claim).
Table IV (individual BPM predictions, ages 29/30/31):
- LeBron James — actual: 8.80 / 7.10 / 9.00; standard LSTM: 0.30 / 0.24 / −0.29; proposed: 7.00 / 5.89 / 5.55.
- Stephen Curry — actual: 7.70 / 6.60 / 3.90; standard LSTM: 0.04 / 0.09 / −0.57; proposed: 6.35 / 5.43 / 4.71.
- Michael Carter-Williams — actual: −4.80 / −5.55 / −6.30; standard LSTM: 0.04 / 0.01 / −0.08; proposed: −1.61 / −2.17 / −2.54.
- Lance Stephenson — actual: −1.93 / −2.37 / −2.80; standard LSTM: 0.08 / 0.09 / −0.17; proposed: −1.59 / −1.81 / −2.25.
Notably the unclustered LSTM collapses to near-zero predictions for everyone (degenerate mean-reversion), while the cluster-conditioned model preserves individual levels. Authors also note Figure 2: elite high-BPM players have different career trends than average players.

## 8. Code / data availability
Data: public — Kaggle dataset "NBA history | seasonal data 1995-2023" (B. F. Aas, https://www.kaggle.com/datasets/bendikfltaas/nba-history-seasonal-data-1995-2023). Code: none stated (method "implemented in Python language"; no repository link). Funding: National Science and Technology Council, Taiwan, grants 114-2635-E-004-001- and 114-2813-C-004-054-E.

## 9. Leakage & limitations
- Clustering-stage leakage risk: the paper asserts no train/test overlap, but it is not stated whether the autoencoder + K-means were fitted on training data only or on all 177 players. If Stage 1 saw test players' histories (let alone their targets), the clustering benefit is inflated.
- Tiny test set: 36 players. The star-category claims rest on 23 players total — the 63.1% improvement is estimated on a very small sample.
- Silhouette score of 0.16 is extremely weak clustering (the authors acknowledge it); the "two types of career trend" may be a weak, unstable partition that happens to help on this test set.
- Denominator inconsistency: 177 players have complete career trends (141 train / 36 test), but category analysis uses 222 players — the relationship between the two samples is not explained.
- Linear models' catastrophic R² (−10.56) suggests heavy-tailed targets or a small, heterogeneous test set — warrants skepticism about absolute numbers, though relative ordering across deep-learning baselines is more credible.
- BPM-only target; no uncertainty quantification; no comparison to a simple age-regression or cohort-mean baseline, which is the natural competitor for an aging-curve model (last-value is the closest).
- NBA aging structure (peak ~27, decline after 30) does not transfer to NFL positions; only the method transfers.

## 10. GSE overlap
GSE has no aging-curve work in the repo: the existing-research map (§1 corpus map, §4 gap list) covers EPA/play, calibration, market probabilities, state-space team strength — nothing on player aging curves or career-archetype modeling. This is a **genuine gap**, not a duplicate. GSE's props and DFS content would benefit from age-adjusted player projections, and the paper's core design insight — a plain sequence model collapses to the mean, but conditioning on a learned career archetype preserves individual trajectory shape — is directly portable. Relevant adjacent repo material: `2026-09-19-dk-week2/` DFS consensus/salary work and `2026-09-17/gse-lab/` EPA tables could serve as the seasonal efficiency series for an NFL version.

## 11. GSE implementation spec
1. **NFL career-archetype clustering:** on nflverse 2010–2024, build per-player seasonal efficiency time series (EPA/play, success rate, or fantasy points/game, by position); train an autoencoder + K-means exactly as the paper does (tune K by silhouette; start K=6); label archetypes descriptively (early-peak, late-bloomer, steady-decline, cliff, etc.).
2. **Conditioned forecaster:** LSTM/GRU over the pre-age-28 (or pre-season-T) series, concatenated with the one-hot archetype vector, predicting next-season efficiency — mirroring the paper's Stage 2 exactly.
3. **Use case:** age adjustments in GSE's prop projections and DFS content — e.g., a 30-year-old WR in a "cliff" archetype gets a steeper projection discount than one in a "steady" archetype. Cluster per position (WR, RB, QB, TE) to handle the NBA→NFL domain shift the paper itself flags.
4. Effort: ~2 days. Data: nflverse (in hand). Serving: batch-only (weekly projection refresh); no live-inference requirements.

## 12. Reproducible test
nflverse 2010–2022 seasons as history; predict 2023–2024 player-season efficiency (EPA/play or PPR/game) for veterans (age ≥ 27). Baselines: last-season value, unconditioned LSTM/GRU, linear age regression (the age-curve baseline the paper omitted). Metric: MAE and R² on the held-out seasons, reported overall and per archetype. Success = cluster-conditioned model beats unconditioned LSTM by a meaningful margin (paper-analogue: positive R² where the unconditioned model goes negative/flat) and beats last-value on MAE.

## 13. Acceptance / rejection gate
**Adopt** the archetype-conditioned forecaster into GSE's prop/DFS projection pipeline if, on the 2023–2024 holdout, it beats the last-value baseline on MAE for veterans **and** the archetype assignments are stable across a bootstrap re-clustering (Jaccard ≥ 0.7) — stability guards against the paper's weak-clustering/leakage risk. If archetypes are unstable or the conditioned model does not beat last-value, **reject** and keep simple age-regression adjustments.

## 14. Improvement experiment
Replace K-means-on-autoencoder with **supervised archetype discovery**: jointly train the forecaster with a differentiable clustering head (e.g., a DEC-style joint reconstruction+clustering loss, or a mixture-density output over archetypes), so archetypes are learned to minimize forecast error rather than reconstruction error. Test whether forecast-driven archetypes beat reconstruction-driven ones on the 2023–2024 holdout — the paper's two-stage design is greedy, and end-to-end training should dominate if the archetype signal is real.
