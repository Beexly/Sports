# [0229] Who You Play Affects How You Play: Predicting Sports Performance Using Graph Attention Networks With Temporal Convolution (arXiv:2303.16741v1)

**Citation:** Luo, R. & Krishnamurthy, V. (2023). *Who You Play Affects How You Play: Predicting Sports Performance Using Graph Attention Networks With Temporal Convolution*. arXiv:2303.16741v1. URL: https://arxiv.org/abs/2303.16741
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,642 lines).
**Verdict:** ADAPT — port the graph-attention-over-opponent interaction idea to NFL player-prop modeling (GATv2 on an NFL matchup graph), but rebuild the dataset and validation from nflverse/FP rather than adopting the NBA setup.

## 1. Research question
Can individual player performance be predicted more accurately by explicitly modeling dynamic interactions among players (teammates and opponents) via a graph attention network, rather than relying solely on each player's own historical statistics? The paper proposes GATv2-TCN (graph attention network v2 + temporal convolution) and evaluates whether attention over player-interaction graphs improves next-game-day performance forecasts, including a sports-betting case study on Underdog Fantasy.

## 2. Dataset / schema
- Source: NBA.com official API via Python client package (https://github.com/swar/nba_api). Endpoints used: `boxscoretraditionalv2` (basic stats), `boxscoreplayertrackv2` (tracking stats), `boxscoreadvancedv2` (advanced stats), `leaguegamefinder` (match info), plus two roster endpoints.
- Coverage: 2022-23 NBA regular season, 2022-10-18 to 2023-01-20; 691 games across 92 game days; 582 active players; 30 teams.
- Schema: 13 player statistics per player-game — 7 basic (PTS, AST, REB, TO, STL, BLK, PLUS_MINUS), 3 tracking (TCHS touches, PASS passes, DIST distance run in miles), 3 advanced (PACE possessions per 48, USG_PCT usage %, TS_PCT true shooting %).
- Open-sourced by authors (anonymous link in paper): https://anonymous.4open.science/r/NBA-GNN-prediction — dataset and code available.

## 3. Method / model
GATv2-TCN has two components:
- **Graph construction:** dynamic player-interaction graphs, one snapshot per game day. Roster fixed over period (n players). If a game between teams A and B occurs at time t, edges form a *complete graph* among all players from both teams who played ≥10 minutes (cluster graph structure). Adjacency a_ij^(t) = 1 if edge exists, else 0.
- **GATv2 layer:** node features f_i^(t) (13 stats) concatenated with learned team embedding (dim 2) and position embedding (dim 2): g_i^(t) = [f_i^(t)‖team_i‖pos_i] ∈ R^d. Attention score e(g_i,g_j) = a^⊤ LeakyReLU(W[g_i^(t)‖g_j^(t)]), normalized α_ij^(t) = softmax over neighborhood N_i; node update h_i^(t) = σ(Σ_j α_ij^(t) W g_j^(t)) ∈ R^h. Multi-head attention with H = 4 heads, GATv2 output dim 32, Xavier init, dropout per PyTorch defaults.
- **Temporal convolution:** over sequence of t0 = 10 prior graph-attention representations, Y^(t) = Φ ∗ ReLU(H^(t)) where H^(t) = [h^(t−t0+1),…,h^(t)] ∈ R^{n×h×t0}, Φ is the temporal kernel, output dim 64; then a fully-connected layer to forecasting target dim.
- Training: Adam optimizer, learning rate 0.001, weight decay 0.001. Input seq length 10, output seq length 1 (predict next game day). Forward-filling for missing values (days when a player's team doesn't play).
- Key theoretical claim: spectral GNNs (GCN, ChebyConv) fail on these graphs because the Laplacian is block-diagonal with repeated eigenvalues (cluster graphs have high automorphism order; per Theorem 4.5 of [31], spectral GNNs fail to produce all 1D predictions without nonlinearity) — hence GATv2 is used instead.

## 4. Equations & assumptions
Actual equations from the paper (faithfully transcribed):
- Adjacency: a^(t)_ij = {1 if {v_i,v_j} ∈ E^(t); 0 otherwise} (eq 1).
- Graph Laplacian: L^(t) = D^(t) − A^(t), with D^(t) diagonal entries d^(t)_ii = Σ_j a^(t)_ij.
- Cluster-graph Laplacian: block diagonal with blocks L^(t)_m = k_m I_{k_m} − J_{k_m} (eqs 2-3), where J_{k_m} = 11^⊤; eigenvalues 0^{n−Σk_m+p}, k_1^{k_1−1}, …, k_p^{k_p−1}.
- GATv2 score: e(g_i^(t),g_j^(t)) = a^⊤ LeakyReLU(W[g_i^(t)‖g_j^(t)]) (eq 4), with a ∈ R^{2d′}.
- Attention: α_ij^(t) = exp(e(g_i^(t),g_j^(t))) / Σ_{l∈N_i} exp(e(g_i^(t),g_l^(t))) (eq 5).
- Update: h_i^(t) = σ(Σ_{j∈N_i} α_ij^(t) W g_j^(t)) ∈ R^h (eq 6).
- Temporal conv: Y^(t) = Φ ∗ ReLU(H^(t)) (eq 8).
- Original GAT score (contrast): e = LeakyReLU(a^⊤ W[g_i‖g_j]) (eq 7).
- Concatenation: g_i^(t) = [f_i^(t)‖team_i‖pos_i] ∈ R^d.
Stated assumptions: league roster fixed over the period (all snapshots share vertex set V); undirected edges (offense/defense roles ignored — paper notes generalizable to directed graphs for baseball/American football with distinct offense/defense roles); edge formation threshold of ≥10 minutes played; forward-fill imputation for missing values; game days treated as discrete steps (not evenly spaced in time).

## 5. Features / target
- Input features: 13 per-player per-game statistics (PTS, AST, REB, TO, STL, BLK, PLUS_MINUS, TCHS, PASS, DIST, PACE, USG_PCT, TS_PCT) over a 10-game-day window, plus team and position embeddings learned end-to-end (2 dims each).
- Target: the same 13 statistic vector on the next game day (multivariate one-step-ahead forecast; final output dim 6 per hyperparameter section — paper states GATv2 output dim 32 "because the input dimension (13) and the final output dimension (6) are both modest", suggesting 6 predicted metrics though 13 are collected; exact reduction not explained in text).

## 6. Validation design
- Splits: chronological 50% train / 25% validation / 25% test (dates not stated as calendar dates; period covers 2022-10-18 to 2023-01-20).
- Input length 10 game days → predict next game day (rolling/sequence forecasting).
- Baselines: N-BEATS, DeepVAR, TCN (via Darts package), ASTGCN (temporal graph convolution with spatial-temporal attention).
- Metrics: RMSE, MAE, MAPE, CORR (correlation averaged across output dims via Fisher z transformation).
- Betting case study: Underdog Fantasy Higher-Lower entries, data 2023-01-10 to 2023-01-19, predictions evaluated on 2023-01-20 (n = 59 bets).

## 7. Numerical results / baselines
Table 2 (paper's exact values):
- N-BEATS: RMSE 5.112, MAE 4.552, MAPE 3.701, CORR 0.366
- DeepVAR: RMSE 2.896, MAE 2.151, MAPE 1.754, CORR 0.396
- TCN: RMSE 2.414, MAE 1.780, MAPE 0.551, CORR 0.418
- ASTGCN: RMSE 2.293, MAE 1.699, MAPE 0.455, CORR 0.453 (MAPE best, bolded in paper)
- GATv2-TCN (ours): RMSE 2.222, MAE 1.642, MAPE 0.513, CORR 0.508 (RMSE, MAE, CORR best, bolded in paper)
- Interpretation note: these are the paper's reported values; GATv2-TCN beat ASTGCN on RMSE/MAE/CORR but lost MAPE to ASTGCN (0.455 vs 0.513). No confidence intervals stated; no statistical significance tests stated.
- Betting case study: 35/59 correct predictions on Underdog Fantasy (2023-01-20) — 59.3% hit rate, no ROI or unit accounting stated.
- Interpretability: team embeddings clustered Knicks↔Trail Blazers and Grizzlies↔Hornets as stylistically similar; attention heatmap for Suns vs Warriors 2023-01-10 showed top inter-team attention to Bismack Biyombo (Suns) and Stephen Curry (Warriors) from opponents; former-teammate pairs (Damion Lee ex-Warriors, Ty Jerome ex-Suns) paid high attention to old teams.

## 8. Code / data availability
Code and data stated available at https://anonymous.4open.science/r/NBA-GNN-prediction (anonymous review link). NBA raw data via public nba_api package.

## 9. Leakage & limitations
- The 59-bet "betting experiment" is a single-day backtest (2023-01-20) with no walk-forward, no ROI accounting, no vig comparison, and no test of line-availability timing — profitability claim is essentially anecdotal.
- Target ambiguity: 13 stats collected but "final output dimension (6)" stated; the exact 6 predicted metrics are unstated, so replication of the metric set is uncertain.
- Forward-fill imputation on missing game days could smear stale data; no ablation stated.
- Edge construction (complete graph among ≥10-min players) is dense and ignores matchup specifics (who guarded whom); attention weights are learned but the paper's own heatmap examples (former teammates attending to old teams) may reflect narrative cherry-picking rather than systematic validation.
- Distribution-fit EDA (Figure 1) has no downstream use in the model — decorative.
- Fixed-roster assumption breaks with trades/injuries (relevant to NFL: roster churn is high).
- NBA regular-season data only; playoff/rotation dynamics untested. Transfer to NFL props requires rethinking "game day" snapshots (NFL = weekly, and 10-week windows span bye weeks).
- No CIs or significance tests; CORR averaging via Fisher-z is fine but metric aggregation details (per-stat vs pooled) are unstated.
- Sample: 691 games over 92 game days — small for a 4-head GATv2 + TCN with 64-dim temporal output; overfitting risk managed only via small dims, dropout, and weight decay.

## 10. GSE overlap
Per existing-research-map.md: GSE has covered GNN sports outcomes (2207.14124 read in depth — game-outcome GNNs) and TabTransformer event representation (2606.09327). Nothing in the corpus covers player-level *interaction-graph attention* for individual player performance prediction — no paper or repo doc models teammates/opponents as an attention graph for props. Related-but-distinct: nflverse gse-lab features (EPA, CPOE, unit matchups) are per-player/per-unit aggregates, not attention graphs; FTN charting has coverage-matchup data that could feed such a graph. This is a **new capability**: attention over explicit matchup graphs for player-prop forecasting.

## 11. GSE implementation spec
- Build an NFL analog: nodes = key players per matchup (skill players, QBs, pass rushers, coverage defenders); edges = game-context edges (complete graph per game between both teams' ≥X-snap players, or sparse edges from FTN charting coverage/matchup data and alignment data).
- Node features from nflverse play-by-play aggregated to per-player-per-game: receiving yards, targets, receptions, air yards, YAC, EPA/target, CPOE, rush attempts/YPC for QBs; defensive features for defenders (targets allowed, completion % allowed, PFF grades if licensed).
- Model: GATv2 (PyTorch Geometric) + TCN on 8–17 week windows, per the paper's architecture (attention dims 32, 4 heads, temporal dim 64). Team/position embeddings → NFL team and position-group embeddings.
- Training: Adam 1e-3, weight decay 1e-3; chronological train/val/test on 2021–2025 nflverse seasons; target = next-week player fantasy/prop-relevant stats (receiving yards, receptions, rushing yards).
- Serving: weekly batch inference (Tuesday after nflverse updates); outputs feed props consensus and DFS pool generation.
- Effort estimate: 2–4 engineer-weeks (graph construction + feature pipeline dominates; model code is standard PyG).

## 12. Reproducible test
Dataset: nflverse play-by-play 2021–2024 seasons (train 2021–2022, val 2023, test 2024), WR/TE receiving yards as target. Baseline: TCN-only (no graph) and the paper's own reported margin logic — measure next-week receiving-yard MAE on the test season. Metric: player-week MAE and per-stat CORR (Fisher-z averaged), exactly the paper's four metrics (RMSE/MAE/MAPE/CORR). Baseline to beat: TCN without graph attention (paper's ablation analog) and GSE's existing per-player projection features.

## 13. Acceptance / rejection gate
Adopt (as GSE's prop-graph lane) if GATv2-TCN beats the TCN-only baseline by ≥5% MAE reduction on 2024 WR receiving yards AND CORR improves by ≥0.03 absolute on the test window, with no MAPE deterioration >10% (the paper's own MAPE loss pattern). Reject the graph component if it fails to beat TCN; reject the whole approach if it fails to beat GSE's existing per-player features.

## 14. Improvement experiment
Beyond the paper: (a) replace binary complete-graph edges with *weighted* edges from FTN charting — coverage matchup minutes, alignment, and shadow-coverage indicators — the authors themselves suggest weighted edges as future work; (b) add a market-conditioning head: concatenate de-vigged prop line embeddings to node features so attention can route around lines the model thinks are mispriced (paper never touches the market); (c) extend to a multi-task target (yards + receptions + TD jointly) with a joint loss, since props are correlated products. The weighted-matchup-graph variant is the one I'd run first — it's the paper's admitted weakness and the natural NFL edge (coverage matchups are the true interaction structure, not "both teams' rosters").
