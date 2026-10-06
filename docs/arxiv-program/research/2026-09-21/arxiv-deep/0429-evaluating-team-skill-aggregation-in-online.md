# [0429] Evaluating Team Skill Aggregation in Online Competitive Games (arXiv:2106.11397v1)

**Citation:** Dehpanah, Ghori, Gemmell, Mobasher (2021). *Evaluating Team Skill Aggregation in Online Competitive Games*. arXiv:2106.11397v1. URL: https://arxiv.org/abs/2106.11397v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1619 lines).
**Verdict:** ADAPT — the MAX-vs-SUM aggregation question is worth porting to GSE's unit/team rating construction, but the domain is esports with tiny samples, so port the method, not the results.

## 1. Research question
The paper asks how the skill rating of a team should be computed from the skill ratings of its members: conventional SUM (all members contribute equally), MAX (best member determines team performance — a "carry" effect), or MIN (weakest member determines team performance — a "weak link" effect). It tests all three aggregations inside three rating systems (Elo, Glicko, TrueSkill) on three real esports datasets to see which aggregation gives the best rank-prediction performance.

## 2. Dataset / schema
Three datasets, all public:
- **PUBG (PlayerUnknown's Battlegrounds)**: duo matches (teams of two), battle royale format. "over 25,000 matches and 825,000 unique players". In-game stats: distance walked, kills, rank. Source: Kaggle (public). Time range not stated in paper.
- **League of Legends (LoL)**: head-to-head, teams of five. "over 52,000 head-to-head matches and 324,000 unique players". Stats: kills, gold earned, rank. Source: Harvard Dataverse repository (introduced in Sapienza et al. 2018).
- **CS:GO (Counter Strike: Global Offensive)**: head-to-head, teams of five. "over 26,000 matches and 4,900 unique players". Stats: map name, rank. Source: Kaggle, after preprocessing/merging tables.
Schema: match timestamp, team membership, observed rank. No exact date ranges stated. All matches sorted by timestamp for online evaluation.

## 3. Method / model
Three rating systems extended to multi-team fields of size N, plus a naive PreviousRank baseline:
- **Elo**: Gaussian skill μ with fixed σ. Win probability for team t_i in field F generalized as mean pairwise logistic over all opponents, denominator C(N,2). Observed rank R^obs normalized to R′ so ranks sum to 1. Team rating updated μ′ = μ + K(R′ − Pr); player rating updated proportionally to contribution weight w_pj (ratio of player's rating to team rating sum). Hyperparameters: K=10, D=400.
- **Glicko**: μ with dynamic rating deviation σ (uncertainty shrinks with games played). Win probability uses base-10 form with g(σ) uncertainty weighting; g(σ) = [sqrt((1 + 3(0.0057565)²σ²)/π²)]⁻¹. Team μ update scaled by 0.0057565/(1/σ²_ti + 1/d²_ti) with d² from the Hessian of the log marginal likelihood. Players' μ and σ updated with weights w^μ, w^σ. Defaults 1500; TrueSkill 25.
- **TrueSkill**: Bayesian factor-graph/expectation-propagation updates; non-draw win update μ′ = μ + (σ²_ti/c)·[N(t/c)/Φ(t/c)], c = sqrt(2β² + σ²_ti + σ²_tj), β=4.16, τ=0.833.
- **PreviousRank baseline**: predict same rank as previous match; new players get N/2; team PreviousRank = sum of members' (uses SUM by construction).
Three experimental setups per dataset: all players, best players (top 1000 by latest rating with >10 games, evaluated on first 10 games), most frequent players (>100 games, evaluated on first 100 games). Metrics: NDCG for PUBG (ranked-list outcome), accuracy for LoL/CS:GO.

## 4. Equations & assumptions
Win probability (Elo, N teams), quoted from paper:
Pr(t_i wins, F) = [Σ_{1≤j≤N, i≠j} (1 + e^{(μ_tj − μ_ti)/D})⁻¹] / C(N,2)
Rank normalization: R′_ti = (N − R^obs_ti) / C(N,2)
Elo team update: μ′_ti = μ_ti + K[R′_ti − Pr(t_i wins, F)]
Elo player update: μ′_j = μ_j + w_pj (μ′_ti − μ_ti), w_pj = μ_j / Σ μ_members
Glicko: Pr(t_i wins, F) = [Σ_{j≠i} (1 + 10^{−g(√(σ²_ti+σ²_tj))(μ_ti − μ_tj)/D})⁻¹] / C(N,2); g(σ) = (√((1 + 3(0.0057565)²σ²)/π²))⁻¹; μ′_ti = μ_ti + [0.0057565/(1/σ²_ti + 1/d²_ti)]·[Σ_{j≠i} g(σ_tj)(R′_ti − Pr)]; d²_ti = [(0.0057565)² Σ_{j≠i} g(σ_tj)² Pr(1−Pr)]⁻¹; player: μ′_j = μ_j + w^μ_pj(μ′_ti − μ_ti), σ′_j = σ_j + w^σ_pj(σ′_ti − σ_ti).
TrueSkill (win, non-draw): μ′_ti = μ_ti + (σ²_ti/c)·[N(t/c)/Φ(t/c)], t = μ_ti − μ_tj, c = √(2β² + σ²_ti + σ²_tj); σ update per paper (subtracts σ_ti·(σ²_ti/c²)·[N(t/c)/Φ(t/c)]·[N(t/c)/Φ(t/c) + t]).
Aggregations: SUM: μ_t = Σ_{i=1}^n μ_i; MAX: μ_t = max_i(μ_i); MIN: μ_t = min_i(μ_i).
Stated assumptions: player skill ~ Gaussian (fixed σ for Elo, dynamic for Glicko/TrueSkill); SUM assumes equal contribution; MAX assumes best member determines team; MIN assumes worst member determines team; teams have equal player counts (SUM treated as mainstream only under equal counts).

## 5. Features / target
Input features: individual player skill ratings (μ, and σ for Glicko/TrueSkill) computed online; aggregation method converts them to a team rating. Target: observed match rank of each team (PUBG: ordered rank list; LoL/CS:GO: binary win/loss). Prediction horizon: next match rank, predicted online by sorting team ratings. Player features used only for setup definitions (top-1000 best players, >100-game frequent players).

## 6. Validation design
Purely online/temporal: matches sorted by timestamp; rating updated after each match; prediction made from pre-match ratings. No train/test split — it is a walk-forward evaluation over the full match sequence. New players get default ratings (1500 Elo/Glicko, 25 TrueSkill). For time-series plots, the all-players LoL/CS:GO sequences were divided into 500 bins; a gray trend line tracks the count of new players per match. Baselines compared: SUM vs MAX vs MIN within each of Elo, Glicko, TrueSkill, plus PreviousRank (SUM-based naive baseline). Metrics: NDCG (PUBG), accuracy (LoL, CS:GO). Three setups: all players / best players / frequent players. Time ordering respected (online).

## 7. Numerical results / baselines
Table I (average scores; best scores bolded in paper), quoted exactly:
- PUBG (%NDCG) — All players: Elo SUM 60.2 / MAX 61.5 / MIN 61.3; Glicko SUM 59.8 / MAX 61.5 / MIN 61.3; TrueSkill SUM 61.7 / MAX 62.2 / MIN 61.8; PreviousRank 60.8. Best players: Elo 71.7 / 73.0 / 69.1; Glicko 69.6 / 72.8 / 68.1; TrueSkill 69.2 / 72.8 / 68.4; PreviousRank 68.4. Frequent players: Elo 66.7 / 71.4 / 66.9; Glicko 67.9 / 71.6 / 67.9; TrueSkill 60.3 / 62.8 / 60.4; PreviousRank 59.3.
- LoL (%Accuracy) — All: Elo 49.2 / 50.2 / 49.5; Glicko 49.3 / 50.1 / 49.8; TrueSkill 49.8 / 50.4 / 49.3; PreviousRank 47.6. Best: Elo 61.3 / 76.1 / 51.1; Glicko 59.1 / 78.4 / 44.3; TrueSkill 60.2 / 76.1 / 26.1; PreviousRank 42.1. Frequent: Elo 49.2 / 50.4 / 49.7; Glicko 49.7 / 50.3 / 50.2; TrueSkill 49.5 / 50.5 / 49.7; PreviousRank 48.4.
- CS:GO (%Accuracy) — All: Elo 64.7 / 64.3 / 60.8; Glicko 59.1 / 59.1 / 56.6; TrueSkill 64.3 / 62.7 / 59.7; PreviousRank 46.8. Best: Elo 54.5 / 59.1 / 51.8; Glicko 57.2 / 55.5 / 50.0; TrueSkill 54.5 / 56.4 / 52.8; PreviousRank 47.5. Frequent: Elo 64.3 / 63.5 / 60.1; Glicko 59.2 / 59.6 / 57.4; TrueSkill 63.6 / 62.5 / 60.1; PreviousRank 46.6.
Paper's claims: MAX wins in the majority of cases (all PUBG and LoL setups; CS:GO less consistent — authors attribute this to CS:GO's higher density and smaller rating range). The SUM method "even shows more inaccurate predictions compared to PreviousRank in the case of Elo and Glicko" for PUBG all-players. For LoL best players, MIN collapses (TrueSkill MIN 26.1 vs MAX 76.1). Their interpretation: team performance is primarily determined by the most skilled member ("carry" effect).

## 8. Code / data availability
Data: PUBG dataset on Kaggle; LoL dataset on Harvard Dataverse (Sapienza et al. 2018); CS:GO dataset on Kaggle. No code link stated in the paper text. Write: "None stated" for code; data sources public as named above.

## 9. Leakage & limitations
Adversarial read: (1) New players get default ratings — in the all-players setups this contaminates a large fraction of predictions; the authors partly handle this via best/frequent setups but the "best players" setup selects on *final* ratings (top 1000 by most recent rating) then evaluates their *first 10 games* — selecting the sample on the outcome of the evaluation period is survivorship/lookahead in sample construction, inflating the best-players numbers (e.g., TrueSkill MIN 26.1 vs MAX 76.1 gap looks driven by selection). (2) Equal-team-size assumption is artificial; NFL units have different roster sizes and role structure. (3) Esports domains with 2–5 person teams; an NFL offense has 11 simultaneous roles — the "carry" mechanism (one player shot-calling) does not transfer cleanly; football has far more substitution and specialization. (4) Accuracy/NDCG reported without confidence intervals; gaps like 62.2 vs 61.7 (TrueSkill PUBG) are within noise given tens of thousands of correlated online predictions. (5) No hyperparameter search reported (K=10, D=400, β=4.16 fixed). (6) CS:GO "all players" shows MAX roughly tied with SUM — the authors' headline claim rests on PUBG/LoL. (7) External validity to NFL: rating systems here predict match ranks of fixed teams; GSE needs probabilities for spread/total/prop markets, not just rank ordering.

## 10. GSE overlap
The existing-research map names Elo, Glicko, TrueSkill, Bradley-Terry only as "mentioned" inventory items (26-metric catalog) — none has been read in depth, and the *aggregation-of-player-ratings-to-team-rating* question (SUM vs MAX vs MIN) is not covered anywhere in the map: not in gse-lab (unit matchups computed, but no aggregation-method comparison), not in the ML brief, not in the 64 deduped papers. Status: **new capability question**, not a duplicate. Nearest existing work: 2026-09-17 gse-lab unit matchups CSVs and the "state-space team strength" ML brief topic.

## 11. GSE implementation spec
Concrete build plan (ADAPT):
1. Data: nflverse 2020–2025 play-by-play + roster; FTN charting for unit-level splits.
2. Construct player-level skill ratings: per-player EPA/play (QB: CPOE/EPA per dropback; receivers: TPRR/YPRR; defenders: pressure rates) with shrinkage toward position means; treat as "μ" per player-week via rolling windows.
3. Aggregation variants for unit ratings: SUM (mean of starters), MAX (best player's rating), MIN (weakest starter's rating), plus a learned weighted blend (ADAPT: replace fixed MAX with weights from role importance, e.g., OL unit rating weighting LT/C).
4. Team strength = aggregation of unit ratings; feed into logistic win-probability vs closing lines (1211.4000 benchmark lane) and vs market.
5. Serving: weekly batch job recomputing unit ratings from nflverse; outputs to the edge sheet / engine benchmark lane.
Estimated effort: 2–3 days (data pipeline exists in gse-lab; the new work is the aggregation comparison harness).

## 12. Reproducible test
Dataset: nflverse pbp 2020–2025 regular season, team-level closing lines from The Odds API history (or de-vigged consensus capture in repo). Metric: log-loss and Brier vs closing line, plus accuracy at bookmaker closing spread sign. Baseline: GSE's current team-strength construction (whatever aggregation it uses today — default SUM/mean). Test window: 2024 + 2025 seasons walk-forward (train ratings on data through week k, predict week k+1). All three aggregations computed from the same player ratings; only aggregation varies.

## 13. Acceptance / rejection gate
Adopt the aggregation variant if it beats the current GSE baseline by ≥0.003 log-loss on the 2024–2025 walk-forward window AND by ≥0.5 percentage points ATS accuracy; ADAPT the blend weights if only the weighted blend beats baseline; REJECT if no variant beats baseline by those margins (aggregation method doesn't matter for NFL — esports carry effect doesn't transfer).

## 14. Improvement experiment
Beyond the paper: learn the aggregation weights from data instead of choosing MAX/SUM/MIN. Fit a per-role weighted mean (softmax weights over positional groups) by maximizing walk-forward log-likelihood of game outcomes — i.e., let the data decide whether the QB is the "MAX player" on offense and whether the weak-link OL starter is the MIN. Compare learned-weights vs MAX on 2025 holdout; if learned weights concentrate mass on QB + weakest-OL-starter, that confirms the carry/weak-link mechanisms with NFL-specific role structure.
