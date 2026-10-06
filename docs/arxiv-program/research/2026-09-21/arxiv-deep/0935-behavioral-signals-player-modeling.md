# [0935] Player Modeling using Behavioral Signals in Competitive Online Games (arXiv:2112.04379)

## Citation / full-text source

- arXiv:2112.04379 — full text: https://arxiv.org/pdf/2112.04379
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Arman Dehpanah, Muheeb Faizan Ghori, Jonathan Gemmell, Bamshad Mobasher (2021). *Player Modeling using Behavioral Signals in Competitive Online Games*. arXiv:2112.04379 [cs.AI]. URL: https://arxiv.org/abs/2112.04379.
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
Can simple behavioral features (strategy, goals, expertise — not just win/loss outcomes) model players well enough to predict battle-royale ranks better than Elo, Glicko, and TrueSkill? And which behavioral aspects matter for which player groups (all / top-tier / frequent)?

## 2. Dataset / schema
- **PUBG solo matches** (singletons, last-player-standing): **>75,000 matches, 1,700,000 unique players**, Kaggle (skihikingkevin/pubg-match-deaths), sorted by timestamp. Raw stats per match: rank, kills, damage dealt, distance walked/rode, time survived.
- All features computed at match start from history only, updated after each match.

## 3. Method / model
- Nine behavioral features: **β1** games played (experience/engagement); **β2** kill/death ratio (skill + aggression); **β3** firing accuracy = total kills / cumulative damage dealt; **β4** survive ratio = cumulative time survived / games played (expertise + passive strategy); **β5/β6** walking/riding ratio = cumulative distance / games; **β7/β8** walking/riding velocity = cumulative distance / cumulative time survived (robust to early deaths); **β9** rank ratio = cumulative rank *percentile* / games played (normalizes varying field sizes).
- Prediction function: **Φ = arg sort_{i∈{1..n}}((F,p_i)|β)** — sort the match's players by one feature (descending; ascending for rank ratio), ties broken randomly; that order is the predicted rank list. One-feature models, no learning at all.
- Compared vs Elo/Glicko/TrueSkill (battle-royale extensions from 0934's lineage) on three setups: all players, top-tier (500 highest win-rate, >10 games, evaluated on first 10 games), frequent (>100 games, evaluated on first 100 games). Metric: NDCG (per 0934's conclusion).

## 4. Equations & assumptions
- Φ = arg sort_{i∈{1,2,...,n}}((F,p_i)|β); higher β → better rank except β9 (lower = better).
- β3 = Σkills / Σdamage; β4 = Σtime_survived / #games; β5,β6 = Σdistance / #games; β7,β8 = Σdistance / Σtime_survived; β9 = Σrank_percentile / #games.
- New players defaulted: 1500 (Elo/Glicko), 25 (TrueSkill), 100 (β9), 0 (all other β).
- Assumptions: behavioral aspects (goals, strategy, expertise) are stable per player and measurable from history; rank percentile normalizes field-size variation; ties random.

## 5. Features / target
Inputs: nine per-player cumulative behavioral statistics. Target: per-match rank list. Evaluation: NDCG of predicted vs observed rank order.

## 6. Validation design
Chronological online prediction; three setups (all / top-tier-first-10-games / frequent-first-100-games); NDCG averaged per setup (Table I). Feature-development time series for top-5 win-rate and top-5 most-played players (Figures 1–2) to show behavioral features track true performance development.

## 7. Numerical results / baselines
Table I, average %NDCG — columns: Elo, Glicko, TrueSkill, Φ(β1)..Φ(β9):
- **All Players:** 56.8, 56.2, **57.4** | 54.1, **60.1**, 56.1, **59.7**, **58.6**, **58.5**, 55.9, 56.8, **61.3**. Rank ratio (61.3) best overall; K/D, survive, walking, riding ratios all beat the best rating system (TrueSkill 57.4). Behavioral models win with new/seasonal players present.
- **Top-tier Players:** 73.7, 62.4, **79.1** | 59.0, 71.6, 57.8, **79.4**, 69.6, 67.8, 56.7, 57.3, **85.1**. Rank ratio 85.1% (best); survive ratio 79.4 edges TrueSkill's 79.1. Rating systems improve vs all-players (consistent behavior reduces uncertainty) but still lose.
- **Frequent Players:** 59.3, **63.8**, 57.9 | **86.4**, 60.7, 57.6, 59.9, 58.9, **64.1**, 58.1, **64.2**, 63.0. Games played β1 = **86.4%** — highest value of any model in any setup, beats best system (Glicko 63.8) by 22.6 points. Riding ratio/velocity also beat systems.
- Development plots: top-tier players' K/D spans 0.3–2.0 after 10 games (heterogeneous paths, consistent trends); most top-tier below 30th-percentile rank ratio after game 2; frequent players hover ~50th percentile.

## 8. Code / data availability
Dataset public on Kaggle. No code stated.

## 9. Leakage
Features computed from pre-match history only — clean. Same mild selection caveat as 0934: top-tier players chosen by final win rate, evaluated on first 10 games (post-hoc selection).

## Limitations
- PUBG solo only; team dynamics explicitly excluded (deferred to future work).
- Single-feature models — no combinations tested (weighted hybrid is stated future work).
- Ties broken randomly, unquantified noise.
- No significance tests; table only.
- Behavioral features are game-specific; only the *framework* (effort/strategy/expertise aspects) transfers.

## 10. GSE overlap vs existing-research-map
- Direct sequel to **0934** (same authors): 0934 concluded NDCG is the right metric and promised behavioral features as future work — this paper delivers them. Read as a pair.
- Repo connection: the GSE engine's player features are outcome/stat-based (EPA, CPOE, TPRR); **no repo work uses effort/engagement-style behavioral signals** (snaps played, route participation, games observed) as first-class predictors, nor single-feature sort baselines for rankings.
- Complements 0931 (margin regression) and 0933 (learned embeddings): this argues the *input side* — what you feed the model matters more than the rating algorithm.

## 11. Implementation spec (GSE adaptation)
- **NFL behavioral analogs:** β1 → snaps/games observed (rookie/veteran sample-size signal); β2 → EPA/play or pressure rate (skill-aggression); β4 → "survival" analog: drives extended / avoided negative plays (sack+turnover avoidance rate); β9 → historical percentile rank of the team/player in DVOA/EPA among the league that week (field-size normalization ≈ week-to-week league context). Compute all from pre-week history only.
- **Sort-baseline for power rankings:** weekly Φ-style prediction — rank all 32 teams by sorting on one feature (e.g., trailing-8-week EPA/play percentile); publish as the naive baseline every power-ranking model must beat. Cheap, explainable, exactly the paper's Φ.
- **Effort feature in the rating stack:** add log(snaps observed) / games-played as an explicit feature in the game-prediction model so the model learns the paper's lesson: entities with more observations are more predictable. Test interaction with rating σ (Glicko-style uncertainty).
- Effort: 2 days for the sort-baseline harness; 1 week for behavioral-feature backtest.

## 12. Reproducible test
Dataset: nflverse 2018–2025. Build NFL analogs β1′ (career games), β2′ (EPA/play), β4′ (negative-play avoidance), β9′ (league EPA percentile). For each week 2022–2025, predict game winners by sorting teams on each single feature (Φ analog) and compare NDCG/log-loss vs the existing GSE Elo. Baseline to beat: GSE Elo weekly log-loss. Success: ≥2 single-feature sort models beat Elo on 2022–2025 log-loss, OR β9′ (percentile feature) alone matches Elo within 0.005 — reproducing "simple behavioral signals rival rating systems."

## 13. Numeric gate
ADAPT confirmed if any single behavioral feature's sort-prediction beats the existing GSE Elo on 2022–2025 walk-forward log-loss by ≥0.005, or if adding log(games observed) as a feature improves the current game model by ≥0.003. Reject if no behavioral feature adds anything — the PUBG finding doesn't transfer to football.

## 14. Improvement experiment
Weighted hybrid (the authors' stated next step, never published in this paper): learn optimal weights over the nine NFL behavioral analogs via logistic regression on 2018–2021, then test whether the hybrid beats both the best single feature and the rating systems on 2022–2025. Second experiment: **behavioral mismatch modeling** — the paper's intro argues teammates with *different* behaviors (leader vs supporter) outperform same-behavior groups; test whether QB-receiver *style* complementarity (aggressive QB + possession receivers vs matched styles) predicts offensive EPA residuals. This extends the paper's framework from individuals to interactions, which the authors deferred.

## 15. Verdict

**ADAPT** — the direct follow-up to 0934 (same authors, their stated future work): nine engineered behavioral features, used one at a time through a trivially simple sort-based prediction function, beat Elo/Glicko/TrueSkill at rank prediction in nearly every setup. The transferable insight for GSE: single strong behavioral/effort signals (games played, survive ratio, historical rank percentile) outperform outcome-only rating systems when data is sparse — and the sort-on-one-feature predictor is a powerful, explainable baseline. Adapt to NFL as effort/sample-size-aware features and single-feature rank baselines. Not ADOPT: PUBG-solo features don't port literally; the framework does.
