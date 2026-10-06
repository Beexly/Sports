# [0934] The Evaluation of Rating Systems in Team-based Battle Royale Games (arXiv:2105.14069)

## Citation / full-text source

- arXiv:2105.14069 — full text: https://arxiv.org/pdf/2105.14069
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Arman Dehpanah, Muheeb Faizan Ghori, Jonathan Gemmell, Bamshad Mobasher (2021). *The Evaluation of Rating Systems in Team-based Battle Royale Games*. arXiv:2105.14069 [cs.AI]. URL: https://arxiv.org/abs/2105.14069.
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
Which evaluation metrics best capture the predictive power *and* predictive behavior of rating systems (Elo, Glicko, TrueSkill) in team-based battle royale, where many teams compete simultaneously and each match's outcome is a full rank list? Compare accuracy, MAE, Kendall's tau, MRR, AP, and NDCG under three setups: all players, best players, frequent players.

## 2. Dataset / schema
- **PUBG duo matches** (teams of 2), publicly available on Kaggle: **>25,000 matches, >825,000 unique players**, sorted by match timestamp. In-game statistics (kills, distance walked) available but unused — only ranks used.
- Team rating = sum of member ratings (TrueSkill's aggregation assumption), applied to Elo and Glicko as novel extensions.

## 3. Method / model
- **Elo (extended to team battle royale):** team rating μ_{t_i} = Σ_j μ_j. Win probability per team = Σ_{j≠i}(1+e^{(μ_{t_j}−μ_{t_i})/D})^{−1} / (N choose 2), D=400. Zero-sum: observed rank converted to normalized score R′_{t_i} = (N−R^obs_{t_i})/(N choose 2), update μ′_{t_i} = μ_{t_i} + K[R′_{t_i} − Pr(t_i wins, F)], K=10. Members get contribution-weighted shares: w_{p_j} = μ_j/μ_{t_i}, μ′_j = μ_j + w_{p_j}(μ′_{t_i} − μ_{t_i}).
- **Glicko (extended):** team μ = Σμ_j, team σ = Σσ_j (sum, not quadrature — their choice). Win prob uses 10^{−g(√(σ²_{t_i}+σ²_{t_j}))(μ_{t_i}−μ_{t_j})/400} normalized over pairs; updates μ′_{t_i} = μ_{t_i} + 0.0057565/(1/σ²_{t_i} + 1/d²) · [g(σ_{t_j})(R′_{t_i} − Pr)], σ′_{t_i} = √((1/σ²_{t_i} + 1/d²)^{−1}); separate contribution weights for μ and σ.
- **TrueSkill:** standard non-draw updates μ′_i = μ_i + (σ²_i/c)·N(t/c)/Φ(t/c), c = √(2β²+σ²_i+σ²_j), β=4.16, τ=0.833.
- **PreviousRank (naive baseline):** predicted rank = previous match's observed rank; new players get N/2; team PreviousRank = sum of members'.
- Default ratings: 1500 (Elo/Glicko), 25 (TrueSkill).

## 4. Equations & assumptions
- Elo: Pr(t_i wins,F) = Σ_{1≤j≤N,i≠j}(1+e^{(μ_{t_j}−μ_{t_i})/D})^{−1} / (N 2) ; R′_{t_i} = (N−R^obs_{t_i})/(N 2) ; μ′_{t_i} = μ_{t_i} + K[R′_{t_i} − Pr(t_i wins,F)]; w_{p_j} = μ_j/μ_{t_i}.
- Glicko: Pr(t_i wins,F) = Σ(1+10^{−g(√(σ²_{t_i}+σ²_{t_j}))(μ_{t_i}−μ_{t_j})/400})^{−1} / (N 2); μ′_{t_i} = μ_{t_i} + 0.0057565/(1/σ²_{t_i}+1/d²)·[g(σ_{t_j})(R′_{t_i}−Pr)]; σ′ = √((1/σ²+1/d²)^{−1}); w^μ_{p_j} = μ_j/μ_{t_i}, w^σ_{p_j} = σ_j/σ_{t_i}.
- TrueSkill: μ′_i = μ_i + (σ²_i/c)[N(t/c)/Φ(t/c)]; σ′ = σ − σ(σ²/c²)[N(t/c)/Φ(t/c)][N(t/c)/Φ(t/c) + t].
- Metrics: MAE = (1/N)Σ|R^pred_i − R^obs_i|; τ = (n_c − n_d)/(N 2); MRR = (1/N)Σ 1/(1+error_i); AP = (1/N)Σ P(i)·1/(1+error_i); NDCG = Σ_{i=1}^{N} [1/log_2(i+1) · 1/(1+error_i)] / IDCG.
- Assumptions: team skill = sum of member skills; rank errors treated via 1/(1+error) dampening for IR metrics; 10 games enough to judge "best players," 100 for "frequent."

## 5. Features / target
Input: player identity + match history only (no behavioral features — that's the stated future work). Target: predicted rank list per match vs observed rank list.

## 6. Validation design
Chronological: matches processed in timestamp order, ratings updated online. Three setups: (1) **all players** — all matches, equal weight, exposes new-player influx (gray trend line tracks % new players); (2) **best players** — top 1000 by most recent rating with >10 games, evaluated on their first 10 games; (3) **frequent players** — players with >100 games, evaluated on first 100 games. Six metrics × three setups = 18 trend plots (Figure 1).

## 7. Numerical results / baselines
- **Accuracy:** all-players rises then flat ≈**2.5%** once new-player share <60% (≈80% known at end); Elo/Glicko/TrueSkill indistinguishable at 2.5%, all beat PreviousRank. Best players: ≈2× all-players (≈5%) but **cannot distinguish any rating system from PreviousRank**.
- **MAE:** all-players settles ≈**14.5** once new share <40%; Elo slightly best. Best players: TrueSkill 16.5→13.5 (only system to improve vs all-players); Elo/Glicko stuck ≈14.5. Frequent players: all start *increasing*; only TrueSkill corrects downward — Elo/Glicko **worse than in the new-player-contaminated all-players setup**.
- **Kendall's tau:** negative at start (predicted/observed in *opposite* order) under new-player load. Best players ≈ all-players values; fails to separate systems from PreviousRank. Authors conclude **tau is inappropriate for this task** — ignores deviations, only pairwise agreement.
- **MRR:** all-players steady ≈14% once new share <70%. Frequent players: Elo/Glicko flat, TrueSkill peaks ≈16% at game 40 then decays to ≈14.5%; **PreviousRank beats Elo and Glicko** here — MRR can't capture frequency-of-play learning.
- **AP:** all-players ≈0.55% once new <60% (hit-based precision weighting crushes values); best-players improves; TrueSkill beaten by PreviousRank on frequent players. AP detects position+deviation but **severely underestimates** true predictive power.
- **NDCG (winner):** reliable once new-player share <**80%** (vs MAE's 55% — far more robust to new-player influx). All-players: best at showing system superiority over PreviousRank **and** the clearest system separation. Best players: much higher NDCG, systems ≫ PreviousRank, clear ordering. Frequent players: Elo/Glicko higher than all-players (correct); TrueSkill decays and is beaten by PreviousRank (same TrueSkill failure AP showed — a real signal about TrueSkill, not a metric artifact).
- No system dominates everywhere; TrueSkill's frequent-player decay appears in MRR, AP, and NDCG alike.

## 8. Code / data availability
Dataset public on Kaggle (PUBG). No code stated.

## 9. Leakage
Online chronological evaluation — no leakage by construction. One design caveat: "best players" are selected by *final* rating (top 1000 by most recent rating) then evaluated on their first 10 games — selection uses post-hoc information, biasing that setup toward systems whose ratings the selection was based on.

## Limitations
- Results are figure-based; no tabulated numbers or significance tests.
- Figure-only reporting makes exact values approximate (all numbers above read from text descriptions).
- Best-player selection uses final ratings (mild selection bias).
- Duo-only PUBG; team-sum aggregation untested on larger teams.
- Behavioral features explicitly deferred to future work.
- Glicko team-σ as a raw sum is statistically questionable (deviations should combine in quadrature) — a modeling wart in their extension.

## 10. GSE overlap vs existing-research-map
- Repo evaluates ratings almost exclusively via accuracy / log-loss / Brier (the GSE engine's calibration lane) — **no repo work uses rank-position-weighted metrics** (NDCG, AP, MRR) for model comparison. 0933 (this wave) used NDCG to evaluate standings but not as a *model selection* metric across systems.
- 0932 (Elo-MMR) and 1910.03400 luck-decomposition give us rating systems; this paper gives us how to *judge* them — direct complement.
- No duplication: evaluation-methodology gap is real in the repo.

## 11. Implementation spec (GSE adaptation)
- **Adopt NDCG as the primary model-selection metric for weekly power rankings:** each week, compute predicted ranking of all 32 teams vs end-of-week observed ranking (by record, then point differential); compare candidate rating systems (existing Elo, 0932-style MMR, market-implied) by NDCG with 1/log₂(i+1) position weights. Weight top-8 positions 2× via adjusted relevance to focus on playoff-relevant tiers.
- **Adapt team-sum aggregation:** maintain player-level ratings for QBs (repo already has QB tiers) and key position groups; aggregate to team rating via contribution weights w = μ_j/μ_team, updating shares after each game. Test whether player-aggregated team ratings beat direct team ratings on 2022–2025.
- **New-player protocol:** rookies/debuting QBs get league-median prior with high σ (Glicko-style), and model comparisons are only trusted once <60% of snaps come from low-observation players — directly from the paper's new-player thresholds.
- Effort: 3 days (metrics harness) + 1 week (player-aggregated ratings prototype).

## 12. Reproducible test
Dataset: nflverse 2022–2025, weekly team rankings from three candidate systems (existing GSE Elo, market-implied from spreads, simple point-differential). Metric: season NDCG of predicted vs final standings with position weights; also compute on the paper's three setups analog: all teams, top-8 teams, most-stable-roster teams. Baseline to beat: accuracy of exact-rank hits (the paper predicts ≈2.5%-style low hit rates — verify NDCG separates systems where accuracy cannot). Success: NDCG ordering of the three systems is stable across ≥3 of 4 seasons while accuracy ordering flips in ≥2 seasons.

## 13. Numeric gate
ADAPT confirmed if, on 2022–2025 data, NDCG-based system ranking is stable (same best system ≥3/4 seasons) while accuracy-based ranking is unstable (flips ≥2 seasons) — reproducing the paper's core claim that NDCG is the more reliable evaluator. Reject if accuracy and NDCG agree on system ordering in all 4 seasons (then NDCG adds nothing for GSE).

## 14. Improvement experiment
Position-weighted *calibration*: extend the paper's fixed 1/log₂(i+1) weights with **market-aware relevance** — weight each team's rank error by the absolute closing-spread error it implies, so NDCG focuses evaluation on the teams where misranking costs money (playoff bubble, top seeds). Hypothesis: market-weighted NDCG selects a different best rating system than plain NDCG in ≥2 of 4 test seasons, and the market-weighted winner has better next-season ATS log-loss. This turns an evaluation metric into a profit-aligned model selector — the paper's "freedom to adjust weights" taken to its betting conclusion.

## 15. Verdict

**ADAPT** — a methodology paper whose contribution is *how to evaluate* rating systems, not a better one: NDCG with position-based weighting was the only metric that (a) stayed reliable under heavy new-player influx, (b) distinguished rating systems from the naive baseline across all three experimental setups, and (c) separated top-tier performance from the mass. GSE should adopt NDCG as the primary model-comparison metric for weekly power rankings, and adapt the team-sum Elo/Glicko extension (member-contribution weights) for aggregating player-level ratings to team level. Not ADOPT: it evaluates existing systems, offers none of its own.
