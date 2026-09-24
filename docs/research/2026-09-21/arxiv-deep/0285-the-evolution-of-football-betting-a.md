# [0285] The Evolution of Football Betting: A Machine Learning Approach to Match Outcome Forecasting and Bookmaker Odds Estimation (arXiv:2403.16282v1)

**Citation:** Mandadapu, P. (Deloitte, Dallas) (2024). *The Evolution of Football Betting: A Machine Learning Approach to Match Outcome Forecasting and Bookmaker Odds Estimation*. arXiv:2403.16282v1. URL: https://arxiv.org/abs/2403.16282v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract; capped at 100KB on body, conclusions/references fully captured).
**Verdict:** ADAPT — a descriptive industry history + ML benchmark paper; the usable asset is its feature-importance finding (xG/xGA/SCA/GCA dominate match-outcome prediction) and the draw-prediction difficulty quantification, which inform GSE feature prioritization.

## 1. Research question
Can ML models (Random Forest, SVM, KNN, XGBoost) forecast Premier League 1x2 match outcomes from historical team stats, which features matter most, and can model forecasts be used to "recreate" bookmaker odds-setting?

## 2. Dataset / schema
- fbref.com scrape, EPL 2021-22 and 2022-23 seasons; 9 data sections (scores, shooting, goalkeeping, passing, ...), 34 stats per section selected → 1520 rows × 52 columns.
- Encoding: venue home=1/away=0, team/opponent integers, result W=1/D=0/L=2; last matchweek of 2022-23 replaced with season-long team averages (target leakage concern, see §9).

## 3. Method / model
- Models: Random Forest, SVM, KNN, XGBoost via sklearn.
- Feature selection: RFE vs algorithm-specific selectors vs correlation-based subsets.
- Splits: 2-season, 1-season, and 10-matchweek (recent) partitions; grid/randomized hyperparameter search.
- No model equations stated beyond standard classifier formulations and the odds identity (Odds = 1/P, overround discussion).

## 4. Equations & assumptions
Odds = 1/P where P is implied probability; overround/vig = Σ(1/odds) − 1. Results mapped W→1, D→0, L→2. Standard accuracy/precision/recall/F1 from sklearn; no novel equations.
Assumptions: fbref scrape is complete/accurate; team/opponent integer encoding is treated as learnable structure by the models (a methodological smell — tree models can memorize team IDs).

## 5. Features / target
- Features: 34 per-section stats × 9 sections (incl. expected goals xG, expected goals against xGA, shot-creating actions SCA, goal-creating actions GCA).
- Target: 1x2 match outcome (3-class classification).

## 6. Validation design
- Temporal splits: full 2-season, 1-season, recent 10 matchweeks. Matchweek-38 forecasts produced from models.
- Feature-subset ablations (all-features vs RFE vs correlation). No probabilistic metrics (no log-loss/Brier) — accuracy only, which is a weakness for betting applications.

## 7. Numerical results / baselines
| Model | 2-season acc | 1-season acc | 10-matchweek acc |
| Random Forest | 0.6495 | 0.6733 | 0.4773 |
| SVM | 0.66 | 0.7267 | 0.45 |
| KNN | 0.6152 | 0.6267 | 0.3864 (reported) |
| XGBoost | 0.63 | 0.68 | 0.47 |
Best: SVM 1-season 72.67%. All-features usually beat 10-feature subsets but differences negligible; no universally superior selector (RF best with RFE 0.69; SVM/XGB best with all features; KNN best with correlation subset).
Draw class (0) is near-unpredictable: recall 0.06–0.41 across models — draws are the accuracy ceiling.
Most influential features: xG, xGA, shot-creating actions (SCA), goal-creating actions (GCA).
Matchweek-38 forecast tables show strong polarization (RF put 3833/5000 draws votes on Palace-Forest, 3934/5000 away on Leeds-Tottenham).

## 8. Code / data availability
None stated — no repo; data from fbref scrape not shared.

## 9. Leakage & limitations
- Target leakage: last matchweek of 2022-23 replaced with season-long averages — averages include matches after some training samples' time windows; possible lookahead.
- Team/opponent integer encoding lets tree models memorize team identity rather than learn generalizable patterns.
- Small sample: only 2 EPL seasons (1520 rows); 10-matchweek splits are tiny and noisy (accuracies collapse to ~0.45–0.47, below naive home-bias baselines).
- No probabilistic evaluation (accuracy only) — insufficient for odds estimation, which needs calibrated probabilities.
- The "recreate bookmaker odds" framing is aspirational: paper never derives fair odds from model probabilities nor compares against actual bookmaker odds.
- Heavy literature-padding (references [2]–[6] are the author's own unrelated ML papers) and industry-history filler; single-author industry (Deloitte) paper, not peer-reviewed.

## 10. GSE overlap
Per existing-research-map: Poisson/Skellam/Dixon–Coles and Elo-style coverage exist for match outcome modeling; the "Evolution" triage doc already catalogued this paper's xG-centric findings. OVERLAPS the map's xG/xGA-as-features knowledge — no new predictive method. The marginal contribution is the draw-class difficulty quantification (recall 0.06–0.41 across four model families) and the RFE-vs-correlation-vs-all ablation result (no selector dominates; all-features ≈ fine). Does not duplicate any specific in-repo study but adds no novel method beyond a soccer feature-priority data point.

## 11. GSE implementation spec
No new model to implement. Port the two empirical priors as feature-selection guidance:
- Prioritize xG-family features (xG, xGA, SCA, GCA) at the top of GSE's NFL analog feature list (EPA, success rate, explosive-play rate — the NFL equivalents of chance-creation metrics).
- Treat draw/no-result and tie-ish outcomes as intrinsically low-signal classes: do not over-allocate model capacity to them; for NFL this maps to not overfitting push/OT edge cases.

## 12. Reproducible test
- Dataset: nflverse 2020–2025 play-by-play aggregates per team-game.
- Test: rank team-game features by univariate AUC / mutual information with win/loss; verify EPA/success-rate/explosive-play features dominate raw yardage — the NFL analog of the paper's xG finding. 
- Baseline: current GSE feature importance ranking.

## 13. Acceptance / rejection gate
If EPA-family features rank top-3 in the univariate screen, the paper's finding is confirmed as a prior and GSE's existing feature hierarchy stands — ledger closes as guidance-only. If raw yardage dominates EPA, flag a feature-engineering review. The paper's classifiers themselves are not candidates for adoption (REJECT the methods; KEEP the feature priors).

## 14. Improvement experiment
Draw-difficulty analog: quantify GSE's current engine accuracy on "coin-flip" NFL games (spread within ±2.5) vs the rest, mirroring the paper's class-0 analysis; if coin-flip accuracy is near 50%, test whether abstaining or stake-reducing on those games improves bankroll growth under fractional Kelly — turning the paper's descriptive finding into a staking rule.
