# [0284] Deep Learning and Transfer Learning Architectures for English Premier League Player Performance Forecasting (arXiv:2405.02412v1)

**Citation:** Frees, D., Ravella, P., & Zhang, C. (Stanford) (2024). *Deep Learning and Transfer Learning Architectures for English Premier League Player Performance Forecasting*. arXiv:2405.02412v1. URL: https://arxiv.org/abs/2405.02412v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1468 lines).
**Verdict:** ADAPT — the CNN-on-recent-form forecasting architecture ports directly to NFL fantasy/prop projections; the headline transfer (1D CNN on a points-only window + matchup difficulty) is simple enough to implement cheaply, and the Spearman-ranking result supports rank-based prop/fantasy selection.

## 1. Research question
Can a custom 1D convolutional neural network forecast upcoming-gameweek Fantasy Premier League (FPL) points for individual players better than Ridge regression, LightGBM, and prior LSTM work — and does longform news text (The Guardian, via a Longformer) carry additional predictive signal?

## 2. Dataset / schema
- Tabular: vaastav/Fantasy-Premier-League scrape, EPL 2020-21 and 2021-22 seasons; benched (0-minute) players dropped (otherwise near-trivial 0-point predictions inflate scores).
- Features per gameweek window: goals_scored, assists, total_points, minutes, influence/creativity/threat, ict_index, saves, bps, goals_conceded, clean_sheets, difficulty_gap, upcoming match difficulty d (engineered from official team difficulty ratings).
- Split player-by-player (no leakage): ~60% train / 25% val / 15% test; stratified on skill (avg_score). Sizes e.g. MID train 6753 / val 2993 / test 1839; GK train 1272 / val 558 / test 429.
- Windows w weeks; for CNN the full w×f window is retained; baselines use sliding averages.
- Transfer: per player, 3 most recent Guardian articles pre-kickoff (avg ≈950 articles/player, stdev ≈900); first 512 words each + tabular window reworded as sentence, tokenized to 4096 tokens for Longformer regression, output sigmoid scaled to [−5, 24] FPL range.

## 3. Method / model
- Baselines: Ridge regression and LightGBM, tuned by iterative grid search with stratified 5-fold CV (LightGBM optimum: 50 trees, depth 3, L2=10, 7 leaves, min 70 obs/leaf — CV aggressively favored simple trees).
- CNN: custom 1D CNN in TensorFlow — one 1D conv layer, flattened, concatenated with upcoming match difficulty d, one dense hidden layer, output layer; Adam optimizer, early stopping (patience 20), ElasticNet (L1+L2) regularization on conv and dense weights. Eleven architecture iterations via grid search (top-10 averaged lowest val MSE per iteration).
- Transfer: Longformer (AllenAI, sliding-window attention) sequence regression on text+tabular, trained 25 epochs on A100 (4–7 h per position model; 2021-22 season only due to compute).
- Separate models per position (GK/DEF/MID/FWD) because FPL scoring differs by position.

## 4. Equations & assumptions
Loss: J_CNN = (1/B)·Σ(y−ŷ)² + λ₁(‖C‖₁+‖W¹‖₁) + λ₂(‖C‖₂²+‖W¹‖²₂), C = conv weights, W¹ = dense weights.
Gradient boosting target: Θ_m = argmin_Θ Σ(−g_im − T(x_i;Θ))²; ensemble f_M(x) = η·Σ_m T(x;Θ_m).
Ranking metric: generalized Spearman ρ_s with tie handling (FPL points are integers).
Stated assumptions: (1) player-wise splits prevent leakage; (2) dropping 0-minute players is required to avoid trivial scores; (3) the scaled-sigmoid regression head on the Longformer is acknowledged as a "not ideal" hack; (4) hyperparameter search over non-CV splits risks overfitting to validation — the authors flag that validation sometimes beats training and that grid search "overfits" the validation set via early stopping.

## 5. Features / target
- Features: past w weeks of per-gameweek player stats; only upcoming-match difficulty d is external.
- Target: next-gameweek FPL points (real-valued regression); ranking proxy via Spearman correlation.

## 6. Validation design
- Player-wise train/val/test, consistent splits across all runs; stratified on avg_score; CV for baselines.
- Validation anomalies acknowledged: train/val/test difficulties unequal (skill stratification imperfect with ~few players per position); authors propose CV + better stratification (e.g., stratify on week-to-week average point difference).
- Iterative CNN grid search across 11 architecture versions (v6→v11: upper bound on val MSE −50%, average −20%).

## 7. Numerical results / baselines
Holdout test MSE:
| Model | GK | DEF | MID | FWD | AVG |
| Ridge | 6.46 | 7.20 | 6.08 | 7.19 | 6.73 |
| LightGBM | 6.22 | 7.24 | 6.11 | 7.28 | 6.71 |
| CNN | 5.08 | 5.87 | 6.16 | 6.22 | 5.83 |
| Transfer (Longformer) | 8.22 | 9.66 | 8.40 | 10.12 | 9.10 |
CNN ≈13% better average MSE than best baseline (LightGBM), and ≈30% better than prior best LSTM in literature (different seasons, same data source). Optimal CNN windows: GK 6 wks (1 feature: points-only), DEF 9 (1), MID 3 (2: points + ?), FWD 9 (1) — i.e., past points + matchup difficulty sufficed; ict_index and minutes did not help the CNN.
Spearman ρ (holdout rankings): CNN 0.70 GK / 0.57 DEF / 0.58 MID / 0.62 FWD vs Ridge/LightGBM 0.40–0.53 — CNN clearly best at ranking.
Negative finding: Guardian news text carries no usable signal — transfer model worse than all baselines on every position.
Baseline feature importance: minutes, difficulty_gap, influence/creativity/threat, total_points; LightGBM GK values saves; goals_scored coefficient for forwards flips sign (goal-scoring not independent week-to-week).
Outlier failure: worst CNN errors on 21-point blowups (hat tricks + bonus); model refuses to predict outliers — systematically regresses to the typical 0–3 range.
Code: https://github.com/danielfrees/mlpremier

## 8. Code / data availability
Code released: https://github.com/danielfrees/mlpremier. Data: public vaastav/Fantasy-Premier-League repo + Guardian scrape (not bundled).

## 9. Leakage & limitations
- Split-difficulty imbalance: player-wise splits with small player counts make train/val/test task-difficulty unequal — the authors themselves report validation sometimes beating training and warn the noisiness makes accuracy estimates noisy; validation-overfitting via early stopping is admitted.
- No CV for the CNN (compute limits) — hyperparameter selection reliability is weaker than for the baselines.
- Transfer experiment design flaws: hacked regression head on a classifier, limited tuning, only one season, uncurated article quality (many stale/irrelevant articles) — the "news has no signal" conclusion is weak evidence.
- Soccer FPL points ≠ NFL fantasy points: different scoring, roles, and season lengths; transfer is architectural, not weights.
- Points-only windows outperformed richer features for the CNN — suggests the CNN is largely an adaptive exponential smoother, not a rich pattern extractor (learned filters ~near-zero, no consistent longitudinal pattern per Appendix A).

## 10. GSE overlap
Per existing-research-map: NFL player-projection coverage includes nflverse-based baselines and metric work, but no deep-learning player-forecasting architecture and no 1D-CNN-on-recent-form forecasting study. This paper FILLS a method gap: it is the only corpus entry evaluating a tuned 1D CNN vs LightGBM for week-ahead individual player fantasy-point forecasting with a ranking (Spearman) evaluation. Caveat: the win is over a small, soccer-specific dataset; the architecture is trivially portable and cheap to test against GSE's existing NFL projections. Does not duplicate the NFL fantasy lane — it upgrades the candidate-model list.

## 11. GSE implementation spec
- Port: 1D-CNN forecaster for NFL week-ahead fantasy points (PPR), per position group (QB/RB/WR/TE): input = past w weeks of fantasy points (+ matchup difficulty from spread/total), single 1D conv layer → flatten → concat matchup difficulty → one dense layer → scalar output; MSE + ElasticNet loss, Adam, early stopping, player-wise splits.
- Compare head-to-head vs GSE's current NFL projection baseline and vs LightGBM on the same features; evaluate both MSE and Spearman rank correlation (the paper's key insight: ranking quality matters more than MSE for fantasy/prop selection).
- Effort: half-day to implement in the lab given existing nflverse weeklies; training is CPU-cheap (authors trained on an M3 Max).

## 12. Reproducible test
- Dataset: nflverse 2020–2025 weekly player fantasy points (PPR), position groups QB/RB/WR/TE; drop zero-snap weeks (mirrors the paper's benched-player drop).
- Splits: player-wise, stratified on per-player mean fantasy points; 60/25/15.
- Models: Ridge, LightGBM, 1D-CNN (paper architecture), evaluated on holdout MSE and Spearman ρ.
- Baseline: existing GSE NFL projection (current engine fantasy-points output).

## 13. Acceptance / rejection gate
Adopt the 1D-CNN as a candidate NFL player projector if it beats the current engine's fantasy-points MSE by ≥5% on holdout AND Spearman ρ ≥ 0.55 in at least two position groups. If it merely ties LightGBM or fails to beat the current engine, reject and keep the paper as a reference for the "points-only + matchup difficulty" feature-minimal baseline (the paper's finding that simple recent-form windows suffice is itself a useful prior).

## 14. Improvement experiment
Direct Spearman optimization: the authors propose training directly for ranking via convex-hull projection differentiable sorting (Blondel et al. 2020) instead of MSE — run that variant for NFL DFS/prop applications where only rank order matters, and test whether a rank-optimized model beats the MSE-optimized CNN on top-decile hit rate (fraction of predicted top-10 players finishing in the actual top-10).
