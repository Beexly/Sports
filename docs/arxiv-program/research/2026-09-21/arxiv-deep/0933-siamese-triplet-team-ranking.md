# [0933] Deep Similarity Learning for Sports Team Ranking (arXiv:2103.13736)

## Citation / full-text source

- arXiv:2103.13736 — full text: https://arxiv.org/pdf/2103.13736
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Daniel Yazbek, Jonathan Sandile Sibindi, Terence L. Van Zyl (2021). *Deep Similarity Learning for Sports Team Ranking*. arXiv:2103.13736 [cs.LG]. URL: https://arxiv.org/abs/2103.13736 (©2021 IEEE).
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
Can deep representation (similarity) learning — Siamese neural networks with contrastive/triplet loss — combined with gradient-boosted rankers (LightGBM LambdaRank, XGBoost LambdaMART pairwise) improve end-of-season team ranking prediction in the NBA and Super 15 Rugby beyond the boosters alone?

## 2. Dataset / schema
- **NBA:** 4 consecutive regular seasons 2014–2018, 2460 games/season, 30 teams. 14 box-score features per side (Table II: home/away flag, FG, FGA, 3P, 3PA, FT, FTA, OREB, DREB, AST, STL, BLK, TOV, fouls) — split into home-team and away-team sets. Train: first 3 seasons; test: 2017/18. Sources: Rugby4cast/Statbunker for rugby; basketball per Thabtah et al. 2019 / Ahmadalinezhad et al. 2019.
- **Rugby (Super 15):** seasons 2017–2020, 120 games/season, 15 teams × 16 games. 38 seasonal team statistics (Table I: tries scored/conceded splits, bonus points, halftime states, cards, conversions, penalties, tackles, lineouts, rucks, scrums). Train 2017–2019, test 2020. Draws recoded as home-team wins for embedding creation.
- Temporal split (train = first 3 seasons, test = final season) to prevent leakage; hyperparameter tuning via a 3-fold season rotation on the training seasons.

## 3. Method / model
- **Siamese network:** two identical sub-networks with shared weights; input 50 neurons (basketball) / 37 (rugby), hidden layers 70 → 20, output 1 neuron; ReLU; RMSprop (lr 0.001, momentum 0, epsilon 1e-7, discount factor 0.9); 13 epochs (validation accuracy converged at 13). Two losses: contrastive and triplet.
- **Rankers:** LightGBM with LambdaRank objective (gradients scaled by NDCG change); XGBoost pairwise ranker with log loss. Also plain LightGBM/XGBoost without SNN embeddings.
- **Tally rank:** predicted game similarity score added to a team's tally on a predicted win, subtracted on a predicted loss; tallies sorted descending → final standings (then split by conference for the NBA).
- Six models total: LightGBM, XGBoost, LightGBM(Contrastive), LightGBM(Triplet), XGBoost(Contrastive), XGBoost(Triplet).

## 4. Equations & assumptions
- Gradient boosting: F_0(x) = argmin_γ Σ_i L(y_i, γ) ...(1); pseudo-residuals r_im = −∂L(y_i, F_{m−1}(x_i))/∂F_{m−1}(x_i) ...(2); F_m(x) = F_{m−1}(x) + λ_m γ_m h_m(x) ...(3).
- Contrastive loss: J(θ) = (1−Y)(1/2)(D_{a,b})² + (Y)(1/2)(max(0, m−D_{a,b}))² ...(4), Y=0 win / 1 loss, m = dissimilarity margin; D_{a,b}(x_1,x_2) = √(Σ_k (b(x_2)_k − a(x_1)_k)²) ...(5).
- Triplet loss: J(θ) = max(D_{a,b}(a,p) − D_{a,b}(a,n) + m, 0) ...(6); anchor a, positive p (same class), negative n (different class).
- mAP = (1/N)Σ_i AP_i ...(7), AP = Σ_k TP/(TP+FP) at k ...(8); AP evaluated at k=15 per conference, mAP = average of the two (NBA); rugby uses AP only.
- Spearman: r_s = 1 − 6Σd_i²/(n(n²−1)) ...(9).
- nDCG_p = DCG_p/IDCG_p ...(10); DCG_p = Σ_i (2^{rel_i}−1)/log_2(i+1) ...(11); relevance: 15 for 1st place down to 1 for 15th.
- XGBoost pairwise log loss: F = −(1/N)Σ_i [y_i log(ŷ_i) + (1−y_i)log(1−ŷ_i)].
- Assumptions stated: future seasons cannot predict past ones (temporal split); draws ≈ home wins; embedding distances are meaningful ranking signals via tally accumulation; 13 epochs sufficient (converged).

## 5. Features / target
Inputs: raw seasonal/game box-score statistics (38 rugby, 14×2 basketball). SNN learns a 1-D similarity embedding per (team, game) input. Target for the SNN: win/loss class (contrastive pairs) or anchor/positive/negative triplets. Target for the rankers: pairwise game-outcome ranking; final evaluated output: end-of-season league standings.

## 6. Validation design
Train on first 3 seasons, test on the held-out 4th season (2017/18 NBA; 2020 Super Rugby). Baselines: naive (test season = previous season's standings) and randomized (30 random shuffles). Metrics: mAP/AP, Spearman r_s, NDCG. Hyperparameters tuned with season-rotation CV on the 3 training seasons only. Playoff-team hit rate reported as a secondary check (top-8 per conference / top-8 knockout).

## 7. Numerical results / baselines
**NBA (Table III):** Naive — mAP 0.704, r_s 0.640, NDCG 0.839. Randomized — 0.477±0.02, 0.558±0.01, 0.820±0.05. LightGBM — 0.822±0.00, 0.839±0.00, 0.979±0.00. XGBoost — 0.857±0.00, 0.900±0.00, 0.976±0.00. LightGBM(Contrastive) — 0.859±0.22, 0.876±0.13, 0.977±0.02. XGBoost(Contrastive) — 0.745±0.26, 0.751±0.13, 0.916±0.08. **LightGBM(Triplet) — 0.867±0.15, 0.870±0.11, 0.980±0.00** (claimed SOTA). XGBoost(Triplet) — 0.725±0.26, 0.675±0.14, 0.922±0.11. Playoff hits: LightGBM(Triplet) 8/8 East + 7/8 West; all six models missed Utah over Denver (attributed to the 2017/18 Jazz draft).
**Rugby (Table IV):** Naive — AP 0.462, r_s 0.532, NDCG 0.915. Randomized — 0.193±0.20, 0.525±0.02, 0.735±0.10. LightGBM — 0.381±0.08, 0.379±0.06, 0.806±0.09. XGBoost — 0.421±0.05, 0.432±0.01, 0.910±0.00. LightGBM(Contrastive) — 0.620±0.02, 0.671±0.04, 0.965±0.05. XGBoost(Contrastive) — 0.724±0.08, 0.746±0.04, 0.974±0.01. LightGBM(Triplet) — 0.686±0.02, 0.754±0.05, 0.970±0.00. **XGBoost(Triplet) — 0.921±0.04, 0.793±0.00, 0.982±0.03** (claimed SOTA; the abstract's "SNN (Triplet loss)" rugby result). Knockout hits: best model 7/8, rest 6/8, random 4/8.
- Plain LightGBM/XGBoost without SNN *lost to the naive baseline* on rugby (0.381/0.421 AP vs 0.462) — representation learning was load-bearing there. Triplet > contrastive in both sports, but the margin was "smaller than expected."
- No consistent best model across sports: LightGBM(Triplet) wins NBA, XGBoost(Triplet) wins rugby.

## 8. Code / data availability
None stated. Data from Rugby4cast, Statbunker, and the Thabtah/Ahmadalinezhad basketball datasets.

## 9. Leakage
Temporal split is correct (train = earlier seasons). Draws recoded as home wins is a label distortion, not leakage. One risk: seasonal statistics are end-of-season aggregates used to predict games *within* that season — for the test season, using full-season stats to predict that season's games leaks in-season information into "predictions." The paper predicts match outcomes for the test season from that season's final stats, so the reported numbers overstate true preseason predictive power.

## Limitations
- End-of-season aggregates predicting same-season games = in-season information leakage; not a true forecasting setup.
- Tiny training data: 3 seasons (NBA ~7,380 games but only 3 season-level ranking targets; rugby 360 games).
- Huge error bars on several cells (e.g., NBA XGBoost(Contrastive) mAP 0.745±0.26) — the SOTA claims rest on overlapping intervals.
- No consistent winner across sports; authors concede "other ranking models should be considered."
- SNN architecture choices (13 epochs, layer sizes, RMSprop settings) are ad hoc; triplet margin m value not reported.
- The tally-rank aggregation is heuristic, not learned.
- No code or data released.

## 10. GSE overlap vs existing-research-map
- Repo has extensive scalar ratings (Elo, Massey, benbbaldwin tiers, nfelo) and learning-to-rank is a *commissioned but unreturned* ML-brief topic — this paper is the first read that actually implements learning-to-rank (LambdaRank/LambdaMART) on sports data.
- Connects to 0932 (Elo-MMR): scalar Bayesian rating vs learned embedding ranking — complementary paradigms; 0931 (this wave): both argue the binary win target is impoverished (margin regression there, similarity ranking here).
- No duplication: no repo work uses Siamese/triplet embeddings for team strength.

## 11. Implementation spec (GSE adaptation)
- **NFL team embeddings via triplet loss:** build a Siamese network over team-season feature vectors (EPA/play splits, success rate, pressure rates, turnover luck — the repo's gse-lab metric families). Triplets: anchor = team A, positive = team B that A beat (or finished above), negative = team C that A lost to (or finished below), sampled across 2015–2024. Train embedding (e.g., 16-D), then use pairwise embedding distances as matchup features in the existing XGBoost/LightGBM stack. Weekly updating: re-embed with rolling 8-week form vectors.
- **Tally-rank for power rankings:** publish a weekly GSE power ranking from accumulated predicted matchup scores — a content product (site/social) as well as a model input.
- **Learning-to-rank head:** add a LambdaRank objective variant of the game-prediction model optimizing NDCG of weekly team ordering rather than per-game log-loss; compare on 2022–2025.
- Effort: 1 week for the triplet-embedding prototype on nflverse data.

## 12. Reproducible test
Dataset: nflverse 2015–2025 team-week EPA/play and efficiency features. Train triplet embeddings on 2015–2021 seasons (triplets from head-to-head results), freeze, then predict 2022–2025 game winners with a logistic model on embedding distance + spread, vs the same model on raw features. Baseline to beat: raw-feature logistic log-loss on 2022–2025. Success: embedding-augmented model improves log-loss by ≥0.008 AND the embedding-based power ranking achieves Spearman r_s ≥ 0.75 vs final regular-season standings (the paper's rugby bar) on each of 2022–2025.

## 13. Numeric gate
ADAPT confirmed if triplet-learned team embeddings improve 2022–2025 walk-forward game-prediction log-loss by ≥0.008 over raw features alone, or if the embedding power ranking hits r_s ≥ 0.75 vs final standings in ≥3 of 4 test seasons. Reject if neither — the embedding adds nothing over the existing feature stack.

## 14. Improvement experiment
Fix the paper's leakage flaw: train embeddings only on data available *before* the predicted week (rolling-window form vectors, no end-of-season aggregates). Then test whether *in-season* embedding drift (week-over-week embedding movement) predicts against-the-spread edges — i.e., teams whose embedding is improving faster than the market-implied rating. Hypothesis: embedding momentum (cosine drift over 4 weeks) identifies ≥5% ATS edge on 2022–2025 backtest. This turns a ranking paper into a market-relative signal, which the paper never attempts.

## 15. Verdict

**ADAPT** — triplet-loss Siamese embeddings for team ranking are a genuinely different paradigm from Elo-like scalar ratings and worth adapting: learn NFL team-strength embeddings from historical matchup triplets (anchor, beat-team, lost-to-team), then use embedding distances for matchup modeling and power rankings. Downgraded from ADOPT by small training data, huge error bars, and no consistent winner across the two sports.
