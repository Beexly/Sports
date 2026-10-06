# [0941] Intransitive Player Dominance and Market Inefficiency in Tennis Forecasting: A Graph Neural Network Approach (arXiv:2510.20454)

## Citation / full-text source

- arXiv:2510.20454 — full text: https://arxiv.org/pdf/2510.20454
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Lawrence Clegg, John Cartlidge (U. Bristol) (2025). *Intransitive Player Dominance and Market Inefficiency in Tennis Forecasting: A Graph Neural Network Approach*. arXiv:2510.20454. URL: https://arxiv.org/abs/2510.20454.
**Title note:** the assignment list gave the title as "Capturing Intransitive Dominance in Tennis Forecasting"; the paper's actual title is as above.
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete through Appendix A and most of Appendix B).

## 1. Research question
Intransitive dominance (A beats B, B beats C, C beats A — e.g., Federer > Davydenko > Nadal > Federer, mid-2000s) is common in tennis but ignored by scalar ratings and bookmakers. Can a directed temporal graph + spectral GNN (MagNet) capture it, and does Pinnacle misprice high-intransitivity matches?

## 2. Dataset / schema
- **tennis-data.co.uk, 2014-01-01 to 2025-06-08; Slams + Tour Finals + 1000 + 500 tiers only: 16,663 men's matches (598 men), 16,447 women's (567 women).**
- Pinnacle Sports odds (Shin 1993 margin removal) as the bookmaker benchmark; player attributes (height/weight/DOB/handedness) from tennisexplorer.com, gender-median imputed.
- Validation 2019-08-29–2022-11-20; out-of-sample test 2023-01-01–2025-06-08 (8,375 matches).

## 3. Method / model
- **Temporal snapshot graphs:** per gender × surface, snapshot = tournament round. Nodes = players; edges = dominance-weighted H2H. Node features: static attributes + dynamic ℓ2-normalized in/out-degrees per surface.
- **Dominance score:** D_n^s(u,v) = Σαβφg / Σαβφ — proportion of games won g_k(u,v), weighted by surface similarity α, tournament prestige β, time decay φ_k = exp(−λ(τ_n−τ_k)). One directed edge per pair, pointing dominant→dominated.
- **MagNet** (Zhang et al. 2021): spectral GCN on the magnetic Laplacian L_N^(q) = I − D_s^{−1/2}A_sD_s^{−1/2} ⊙ exp(iΘ^(q)), q=0.25, Chebyshev K=2, L=2 layers (4-hop receptive field), 64 hidden, lr 0.003, wd 1e-4, dropout 0.3, label smoothing 0.19. Edge-direction prediction → set-win p̂_uv → match probs via i.i.d.-sets formulas (eq. 4). Retrain 30 epochs every 38 snapshots; <10s/run on RTX 2070.
- **Intransitivity:** adapted Hamilton et al. Hodge measure on the common-opponent subgraph: A_uv[i,j] = log(w_ij/(1−w_ij)); I = (1+‖cyclic‖_F)/(1+‖transitive‖_F); evidence-weighted I* = I·√(Σαβφ).
- Baselines: Elo, Weighted Elo (Angelini 2022), BT via ILSR (λ=0.01), Pinnacle.

## 4. Equations & assumptions
- φ_k(u,v) = exp(−λ(τ_n−τ_k)) ...(2); D_n^s(u,v) = Σ_k α_{s,t_k}β_kφ_k g_k(u,v) / Σ_k α_{s,t_k}β_kφ_k ...(3).
- P̂_3 = p̂²+2p̂²(1−p̂); P̂_5 = p̂³+3p̂³(1−p̂)+6p̂³(1−p̂)² ...(4); magnetic Laplacian (15); Chebyshev filter (17); edge softmax (19); order-averaged p̂_uv (20).
- I(A_uv) = (1+‖A−grad∘div(A)‖_F)/(1+‖grad∘div(A)‖_F) ...(9); I* = I·√(Σαβφ) ...(10); Kelly f* = (p̂o−1)/(o−1) ...(11); annualised Sharpe S = (P̄/σ_P)·√365.25 ...(12).
- Assumptions: i.i.d. sets; dominance edge per pair suffices (loses info — authors admit); label smoothing 0.19 handles overconfidence.

## 5. Features / target
Inputs: dominance-weighted directed graphs + node features → set-win probability. Targets: match outcome; metrics: accuracy, Brier, ROI/Sharpe, bootstrap significance.

## 6. Validation design
Walk-forward: 85% historical graph, train on most recent 15% edges, predict next snapshot, integrate outcomes. 300-trial TPE hyperparameter search, multi-objective (men's + women's Brier), Pareto selection. Intransitivity robustness: bins by I*, Brier gap vs PS/WElo, cluster-robust bootstrap (10k player-level resamples), Spearman trend test. Betting: threshold γ=2.55 tuned on validation, Kelly + unit staking, bankroll reset per Boshnakov, Wunderlich-Memmert bootstrap p-value.

## 7. Numerical results / baselines
- **Overall (test):** Model 65.7%/0.215; WElo 66.4%/0.212; Elo 65.8%/0.215; BT 64.8%/0.217; **Pinnacle 69.0%/0.196** — bookmaker superior in absolute terms.
- **Intransitivity:** women's +11.5% more intransitive than men's (3.02 vs 2.71). Brier gap vs Pinnacle narrows **68.3%** from Bin 0 (+0.023) to Bin 3 (+0.007); beats WElo in moderate/high-intransitivity bins. Spearman ρ=+0.049, p<0.001.
- **Betting (γ≥2.55, test):** Kelly: 1,903 bets, ROI **+3.26%**, Sharpe 0.61, p=0.005; unit: 2,063 bets, +1.14%, Sharpe 0.48, p=0.022 (both survive Bonferroni α=0.025). Unfiltered: −5.49% Kelly / −1.64% unit. WElo at same threshold: −5.54% / −3.38%. Extreme intransitivity turns negative (bookmakers efficient there).
- **Hyperparams:** λ=0.38 (vs 0.01 in the unoptimized pilot, which degraded on extension); α_hg=0.37, α_hc=0.01, α_cg=0.09, α_ch=0.07, α_gc=0.05, α_gh=0.45 (hard↔grass transfer high, clay isolated); β^1000=0.85, β^Finals=0.94, β^500=0.69.

## 8. Code / data availability
MagNet via PyTorch Geometric Signed Directed (He et al. 2024). No paper-specific repo stated; data from tennis-data.co.uk (public) + tennisexplorer.com.

## 9. Leakage
Walk-forward with strict pre-snapshot graphs; hyperparameters tuned on validation, threshold γ tuned on validation, applied once to test. Betting uses Pinnacle odds available pre-match. Residual risk: Pinnacle odds data quality (authors cite their own correction study, Clegg & Cartlidge 2025a). The γ=2.55 threshold was selected to maximize validation profit — one hyperparameter of selection, mitigated by the bootstrap significance test.

## Limitations
- Overall predictive performance (65.7%/0.215) trails both Weighted Elo (66.4%/0.212) and Pinnacle (69.0%/0.196) — the GNN only wins in the high-intransitivity slice, not in general.
- Profitability is confined to a tuned intransitivity band: at *extreme* intransitivity the strategy turns negative (bookmakers efficient where evidence is thickest).
- MagNet's receptive field (4 hops) and q=0.25 are fixed design choices; no ablation of cheaper directed-graph alternatives (e.g., HodgeRank itself as a predictor).
- The dominance-score edge construction discards per-match detail (one edge per pair) — the authors admit a multi-attribute edge model would retain more information.
- Betting simulation is a paper trade against Pinnacle closing odds; real-world execution (limits, line movement, availability) would erode the 3.26% ROI.
- Threshold γ and the I* measure were developed on the same validation window — the test-set significance test mitigates but doesn't eliminate data-snooping concerns.

## 10. GSE overlap vs existing-research-map
- 0940 (this batch) says Elo beats complex models in sparse data — this paper is the counter-case: in *dense* H2H tennis data, local graph structure adds value exactly where scalar ratings are blind (intransitivity). The two papers together define the regime map: sparse → Elo; dense-with-cycles → local graph features.
- 0933 (Siamese/LambdaRank team embeddings) and 0936 (Ω ratings) both produce *transitive* scalar ratings — none of the batch's ledgers contains an intransitivity measure. This is genuinely new territory for the corpus.
- Kelly staking with bankroll reset connects to the 750 program's Kelly-bet-sizing keyword; the market-inefficiency framing connects to market microstructure/CLV.

## 11. Implementation spec (GSE adaptation)
- **NFL I\*:** build the common-opponent subgraph for each matchup (teams sharing ≥N common opponents), advantage matrix from margin/EPA-based dominance, Hodge decomposition → transitive + cyclic components; evidence-weight by games. Feature for the game model: high-I* games get a matchup-interaction term (or a separate "stylistic cycle" flag). Hypothesis from the paper: markets (and scalar GSE ratings) misprice exactly these games.
- **Dominance score for NFL:** D(team A, team B) = weighted H2H with time decay φ=exp(−λ·weeks), context weights α (division/conference/playoff analog of surface similarity), prestige β (playoff > regular season). Use as a matchup prior blended with ratings.
- **Betting-discipline transfer:** the Kelly-with-reset + threshold-tuned-on-validation + bootstrap-significance protocol is a template for any GSE "spot" system (e.g., bet only high-I* divisional games).
- Effort: 1 week (I* + dominance score as features) + 2 weeks (backtest of the high-intransitivity spot system).

## 12. Reproducible test
Dataset: NFL 2002–2025. Compute I* per game from common-opponent subgraphs (EPA-margin dominance). Test 1 (prediction): does adding I* and its interaction with the rating spread improve Brier on 2020–2025 holdout vs GSE base? Test 2 (market): backtest a spot system — bet (paper-trade) games with I* ≥ γ (γ tuned 2002–2019) against closing lines, Kelly-with-reset; compare CLV and ROI vs betting all games. Success: I* interaction improves Brier by ≥0.002 OR the spot system shows positive CLV with p<0.05 bootstrap. Expect the NFL effect to be smaller than tennis (16-game seasons → weak cycles) — a null result is informative: it bounds how much stylistic intransitivity matters in football.

## 13. Numeric gate
ADAPT confirmed if the NFL I* replication shows either (a) Brier improvement ≥0.002 from the intransitivity interaction term, or (b) positive CLV on the high-I* spot system with bootstrap p<0.05. Reject if neither — football's schedule density may make cycles too weak to matter.

## 14. Improvement experiment
**Coach-cycle intransitivity:** the paper's cycles are player-stylistic; in the NFL, the analog is *scheme* cycles (e.g., Shanahan wide-zone offense vs. Fangio two-high shells vs. power-run teams). Build I* on *coach-scheme* nodes rather than teams: nodes = head-coach×scheme identities, edges = weighted H2H dominance. Test whether scheme-level intransitivity predicts upsets better than team-level I* — if scheme cycles are the real carrier of NFL intransitivity, this beats the team-level version and gives GSE a genuinely novel matchup feature no public model has. This directly extends the paper's "stylistic matchup" intuition to football's actual unit of style.

## 15. Verdict

**ADAPT** — not for the GNN (MagNet is overkill for the NFL's dense round-robin schedule), but for three transferable assets: (1) the **evidence-weighted intransitivity measure I\*** (Hodge decomposition of the local advantage matrix × √evidence weight) as a matchup-specific feature — stylistic rock-paper-scissors cycles exist in the NFL (e.g., team A beats blitz-heavy B, B beats C, C beats A) and are precisely what scalar ratings can't see; (2) the **dominance-score construction** D_n^s(u,v) — weighted head-to-head proportion with learned time decay λ=0.38, surface-similarity α, and tournament-prestige β weights — a portable recipe for NFL matchup priors (recency + context-weighted H2H); (3) the **market-efficiency finding**: Pinnacle systematically misprices high-intransitivity matches (model's Brier gap narrows 68.3% from Bin 0 to Bin 3; selective betting: +3.26% Kelly ROI over 1,903 bets, p=0.005) — the first quantitative evidence in the reader-14 batch that *stylistic-matchup* complexity is a market blind spot, which maps directly onto GSE's market-microstructure/CLV lane. Adapt I* and the dominance score to NFL divisional/rivalry matchups; skip MagNet.
