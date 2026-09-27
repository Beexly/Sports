# [0602] Measuring Spatial Allocative Efficiency in Basketball (arXiv:1912.05129v2)

**Citation:** Sandholtz, N., Mortensen, J., Bornn, L. (2020). *Measuring Spatial Allocative Efficiency in Basketball*. arXiv:1912.05129v2. URL: https://arxiv.org/abs/1912.05129v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2462 lines).
**Verdict:** ADAPT — port the rank-matching "allocative efficiency" framework to NFL target/touch allocation (receiver target share vs. per-route efficiency; play-call mix vs. situational EPA), dropping the Bayesian spatial machinery for GSE's empirical zone/route splits.

## 1. Research question
How can a basketball lineup's shot allocation be judged efficient when each player's shot has an opportunity cost — it eliminates all potential shots by the four teammates? The paper introduces spatial allocative efficiency: a lineup is allocatively efficient at a court location if the players' FG% ranks match their FGA-rate ranks (best shooter takes the most shots). It proposes lineup points lost (LPL) and player LPL contribution (PLC) metrics, demonstrates via a permutation test that NBA lineups minimize LPL beyond random allocation (GSW, POR best; SAC worst), and shows in a game-level regression that a 1-point reduction in LPL corresponds to a 0.62-point gain in actual score — i.e., inefficient shot allocation measurably costs wins.

## 2. Dataset / schema
- **2016–17 NBA regular season:** 224,567 shots by 433 players, from the NBA stats API (`shotchartdetail` endpoint for shooter + shot (x,y) locations; `playbyplayv2` for lineup construction). Lineup-building code: https://github.com/jwmortensen/pbp2lineup. Players with <5 shots treated as "replacement players."
- **Empirical demo:** https://github.com/nsandholtz/lpl.
- No train/test split (descriptive/causal-inference framing, not prediction).
- Motivating case: Russell Westbrook in four Thunder elimination games 2017–2019 — 30+ attempts each, 45.5% average usage; the extreme case 46 points on 43 attempts in a 96–91 Game 6 loss to Utah (2017–18 R1), with OKC losing 3 of 4 close-out games and never escaping the first round.

## 3. Method / model
- **FG% surfaces (Bayesian hierarchical, Cervone et al. 2016 adaptation):** logit(π_j(s)) = β'x + Z_j(s) (eq. 1), x = [intercept, player position, shot distance, position×distance]. Z_j(s) = w_j'ΛΨ(s) (eq. 2): Gaussian process with deterministic basis Λ (D=16 bases) from NMF of per-player LGCP intensity fits of made-shot locations (Miller et al. 2014; P ≈ BΛ, eq. 3), and Ψ(s) linear-interpolation mesh basis (Lindgren et al. 2011). Player weights regularized by a conditionally autoregressive (CAR) prior shrinking toward 5 nearest neighbors in NMF loading space B (symmetrized adjacency H): (w_j|w_{−(j)},τ²) ~ N(mean of neighbors, τ²/n_j·I_D), τ² ~ InvGam(1,1) (eq. 4); β ~ N(0, 0.001·I); fit by INLA. Court gridded 1ft×1ft (M=2350 cells); ξ_ij = player j's FG% at cell i centroid.
- **FGA-rate surfaces:** per-player, per-lineup log-Gaussian Cox process log λ(s) = β₀ + Z(s), INLA (Simpson et al. 2015); rescaled to exactly match observed attempts; normalized per 36 minutes → A_ij (deterministic, no uncertainty modeled; shot choice treated as non-random and within the player's control).
- **Rank correspondence:** R^ξ_ij (FG% ranks 1–5 within lineup, MAP estimate) and R^A_ij (FGA ranks, deterministic) per cell (eqs. 5–6). Rank correspondence R^A − R̂^ξ ∈ [−4,4]; negative = over-usage, positive = under-usage. Key finding: aggregate FGA-rate vs PPS looks flat/slightly negative, but conditioning on court region flips it positive everywhere — a Simpson's paradox that motivates the spatial treatment.
- **Lineup Points Lost (LPL):** redistribute the lineup's shot vector A_i to A*_i via permutation g(·) that matches FGA ranks to FG% ranks (eq. 7–8): LPL_i = Σ_j v_i·ξ_ij·(A*_ij − A_ij); per-shot version LPL^Shot_i = LPL_i/Σ_j A_ij (eq. 9). Constraint: A*_i is a permutation of A_i (no player can be allocated shots nobody took; total attempts per cell preserved).
- **Player LPL Contribution (PLC):** PLC_ij = LPL_i × (A*_ij − A_ij)/Σ_j|A*_ij − A_ij| (eq. 10); positive = undershooting, negative = overshooting; per-shot version (eq. 11). No whole-lineup over/under-shooting by construction — the metric says nothing about shot selection, only allocation.
- **Game-level regression (§4.2):** court collapsed to 3 regions (restricted area, mid-range, 3pt); TGLPL_ag = Σ_ℓΣ_c GLPL^ℓ_c (eqs. 15–16); Score_abg = μ + α_a + β_b + γ·I(Home_ag) + θ·TGLPL_ag + ε_abg (eq. 17), ε ~ N(0,σ²) (eq. 18); Bayesian HMC in Stan; priors μ~N(100,10²), α,β,γ,θ~N(0,10²), σ~Gamma(2,0.2).
- **Permutation test (§4.1):** test statistic T = Σ_iΣ_j v_i·ξ̃_ij·(A_ij − A†_ij) (eqs. 12–14) vs. 500 random permutations; one-sided p̂ = fraction < 0.

## 4. Equations & assumptions
Eqs. 1–18 as in §3. Also: toy LPL example (Cavs 3-pt region) = 0.84 expected points. Cavaliers starting lineup total LPL = 0.68 per 36 min (cell values 0–0.008). Empirical appendix variant: 12 discrete regions; ad hoc +1 make / +4 misses anchor (FG% → ~20%) for low-sample cells.
Assumptions: player FG% is lineup-independent (flagged as likely violated — gravity/open shots); FG% held constant when redistributing volume (no usage/skill curve — acknowledged limitation, Oliver 2004; Goldman & Rao 2011); A*_i constrained to be a permutation of A_i; rank matching (not marginal-efficiency equalization) defines the optimum; defensive pressure/shot clock unobserved in public data; shot creation not credited.

## 5. Features / target
Inputs: shot (x,y) locations + shooter identity + lineup membership. Features: spatial basis loadings, CAR-neighbor structure, covariates (position, distance). Target: per-cell LPL (lineup-level expected points lost to misallocation) and PLC (player-level over/under-usage); downstream target: game score (regression) and the permutation-test statistic.

## 6. Validation design
- **Permutation test:** observed total LPL vs. 500 random-permutation allocations per team's 2016–17 starting lineup (Table 1) — tests whether offenses minimize LPL more than defenses maximize it.
- **Game-level regression:** team game score on TGLPL controlling for offensive strength α_a, defensive strength β_b, home court γ (Dixon–Coles-style, Dixon & Coles 1997) — 82 games × 30 teams, both teams' observations.
- **Empirical appendix:** LPL/PLC recomputed with crude 12-region empirical FG%/FGA estimates to show metric-model agnosticism (patterns persist, but noisy — Thompson 4/6 vs. Love 8/26 in right midrange flips their ranks).

## 7. Numerical results / baselines
- **Permutation test (Table 1, starting lineups):** GSW and POR p̂ = 0.000 (no random allocation beat observed in 500 draws — best allocative efficiency); CLE p̂ = 0.002 (Fig. 10); SAC p̂ = 0.442 (worst); league-wide, most lineups beat random with p̂ < 0.15 — offenses minimize LPL beyond the defense's ability to prevent it.
- **Game regression:** θ posterior mean = −0.62, 95% HPD (−1.08, −0.17) — each additional lineup point lost costs 0.62 actual points; shaving ~3 TGLPL points ≈ +2 game points. Houston lost only ~1 point/game to misallocation (most efficient); Washington lost >3 points/game (least). 10% of 2016–17 games were decided by ≤2 points — playoff-bubble relevance.
- **Cavs specifics:** Kyrie Irving under-utilized from 3 (positive rank correspondence at the arc); LeBron over-shooting mid-range top-of-key — but mid-range LPL density is negligible for CLE (they barely shoot there). Figure 8 LPL surfaces peak around the rim and 3-point line (attempt density dominates).
- **Utah Jazz case (§4.3):** Derrick Favors' mid-range baseline/elbow shots (1500+ shots, 0.76 PPS over 2013–17) flagged by PLC; the Jazz's attempted "stretch four" fix (21 threes in 4 seasons → 141 in 2017–19, at 0.66 PPS) was misguided; he wasn't re-signed after 2019 — a six-year decision LPL/PLC might have expedited.
- **Westbrook OKC (§4.4):** positive PLC in corner threes for Westbrook looks like under-usage, but those corner shots are created by his drives — LPL ignores shot creation and game-theoretic predictability (D'Amour et al. 2015): minimizing LPL is diagnostic, not prescriptive.

## 8. Code / data availability
Stated: https://github.com/jwmortensen/pbp2lineup (lineup construction) and https://github.com/nsandholtz/lpl (empirical analysis demo). Data: public NBA stats API endpoints. No model code for the INLA/CAR pipeline (method described, implementation not released).

## 9. Leakage & limitations
- **Wrong sport, but concept transfers.** The spatial basis machinery (INLA + NMF + CAR) is basketball-specific and overkill; the portable core is the rank-matching allocation framework.
- **FG% lineup-independence assumption** is exactly what breaks most in football: a receiver's efficiency depends heavily on coverage and who's drawing it; the paper's own caveat (gravity effects) is worse in NFL where defensive attention concentrates on one player.
- **No usage/skill curve:** redistributing targets to the "best" receiver assumes his efficiency holds at higher volume — in NFL, target concentration invites bracket coverage; the paper flags this but doesn't solve it.
- **Selection bias in FG% estimates** (unequal defensive pressure on different skill levels; CAR shrinkage inflating centers' 3-pt FG%) — the NFL analog is worse: per-route efficiency samples are small and coverage-contaminated.
- **Shot creation blind spot** (Westbrook drive-and-kick): the NFL analog is a QB who creates open targets via scrambles/play-action — his "allocation inefficiency" may be the offense's engine. A naive LPL port would punish the creator.
- **Causality:** the game regression is observational; teams with good allocative efficiency are also just better coached/talented — θ = −0.62 likely absorbs unobserved quality. The 0.62 conversion factor is descriptive.
- **No uncertainty on FGA side** and only 500 permutation draws for the test; no out-of-sample prediction anywhere in the paper.

## 10. GSE overlap
**Extension with a clean mapping.** The existing-research map shows GSE has TPRR, YPRR, target share, EPA/play, and xFP/FPOE (expected fantasy points over expected — the closest existing concept: usage-adjusted efficiency) but no framework that *jointly* evaluates allocation vs. efficiency or quantifies "points lost" to misallocation. The transferable skeleton: **allocation rank vs. efficiency rank within a unit, with deviation scored in expected points.** Candidate NFL ports: (a) receiver target allocation — rank WR/TE target share (TPRR) against per-target efficiency (EPA/target, YPRR) by route/zone, flag over/under-targeted players (props-relevant); (b) play-calling — rank run/pass mix or target distribution across downs/distances/field zones against situational EPA efficiency (coaching content). This is new capability, not a duplicate — no read paper covers within-team allocation efficiency. Lane: props + coaching/team-ratings.

## 11. GSE implementation spec
- **NFL "Target Allocation Efficiency" (TAE) metric.** Data: nflverse play-by-play 2020–2026 (already in gse-lab). For each team-week (rolling 4-week windows for stability): compute per-receiver efficiency (EPA/target, or success rate) and allocation (target share / TPRR) stratified by route-depth bucket × field zone (the "spatial" analog — use 3×3: short/intermediate/deep × own/ mid/ red zone, or FTN route charting if available). Within each cell, rank receivers by efficiency and by allocation; compute rank correspondence and an NFL LPL: expected EPA lost = Σ_j (EPA/target)_j × (optimal_targets_j − actual_targets_j), where optimal targets = permutation of the actual target vector matching efficiency ranks (paper's constraint). Player-level TPC (target points contribution) = LPL apportioned by |target deviation| — positive = under-targeted, negative = over-targeted.
- **Usage-curve guardrail:** shrink extreme reallocations by the receiver's historical target-vs-efficiency slope (the paper's acknowledged gap); flag rather than prescribe.
- **Validation:** game-level regression of team offensive EPA on aggregate TAE controlling for opponent defensive EPA and home field (paper's eq. 17 analog); expect θ < 0.
- **Output:** weekly "over/under-targeted" props content + team play-calling efficiency grades. Effort: ~4–5 days (empirical version first, per the paper's appendix; no INLA needed).

## 12. Reproducible test
Dataset: nflverse 2022–2025 regular seasons. Build per-team-week TAE (rolling 4-week efficiency × allocation, 3 route-depth × 3 field-zone cells, empirical estimates only). Metric: out-of-sample correlation between a team's aggregate TAE (weeks 1–k) and its offensive EPA/play in weeks k+1..k+4, controlling for opponent adjustments; plus the game-level regression coefficient θ (expect negative, 95% CI excluding 0). Baseline: raw target-share concentration (Herfindahl) or EPA/play alone — TAE must add predictive R² beyond both. Time window: train on weeks 1–8, evaluate 9–17 each season 2022–2025.

## 13. Acceptance / rejection gate
ADAPT to a weekly props/coaching metric if, on 2022–2025 nflverse, the TAE-augmented game model beats the baseline (EPA/play + Herfindahl) by ≥0.5 points of out-of-sample RMSE per game AND θ's 95% CI excludes 0 with the expected sign. REJECT as an engine input if it fails; keep as a content-only diagnostic (over/under-targeted lists) only if the directional relationship holds but weakly (|θ| significant, RMSE gain <0.5).

## 14. Improvement experiment
Add the missing usage curve: estimate per-receiver target-share→efficiency curves (fractional-polynomial or isotonic regression of EPA/target on target share, by archetype) and replace the paper's rank-permutation optimum with a constrained optimization — maximize Σ_j targets_j·eff_j(targets_j) subject to Σ targets_j = total team targets. Compare the optimized expected EPA against both actual allocation and the naive rank-matched LPL optimum on held-out weeks. Hypothesis: the usage-curve-aware optimum beats naive rank matching out-of-sample because it avoids dumping targets onto a player whose efficiency collapses under volume (the NFL version of the paper's acknowledged flaw) — and it directly yields a "how many more targets should X get" number for props/coaching content.
