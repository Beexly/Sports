# [0401] The role of intrinsic dimension in high-resolution player tracking data -- Insights in basketball (arXiv:2002.04148v1)

**Citation:** Edgar Santos-Fernandez, Francesco Denti, Kerrie Mengersen, Antonietta Mira (2020). *The role of intrinsic dimension in high-resolution player tracking data -- Insights in basketball*. arXiv:2002.04148v1. URL: https://arxiv.org/abs/2002.04148v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,452 lines).
**Verdict:** ADAPT — basketball domain, but the Hidalgo intrinsic-dimension framework is a principled, directly portable unpredictability/complexity metric for NFL NGS tracking data (pre-snap motion complexity, play-design entropy as EPA-prediction features); the authors explicitly flag football as the next sport. Adopt the ID methodology, discard the basketball conclusions.

## 1. Research question
Can the intrinsic dimension (ID) of high-resolution player-tracking data serve as a quantitative indicator of play complexity and unpredictability, and does higher ID relate to better offensive performance? The paper (i) uses a Bayesian mixture model (Hidalgo) to estimate heterogeneous IDs in NBA SportVU tracking data, with two theoretical enhancements; (ii) identifies phases of offensive plays from the ID trajectory over time; (iii) clusters shot-chart data (all 10 players' positions at shot time) into high- vs. low-return groups; and (iv) tests whether higher ID is associated with winning, smaller score margins, and shot success.

## 2. Dataset / schema
- **STATS SportVU** high-resolution player-tracking raw data from the **2015–16 NBA season**, 25 frames/second (downsampled to 2.5 fps "without losing a substantial amount of information"). Play-by-play events from stats.nba.com, manually matched to tracking via YouTube video annotation (labor-intensive curation).
- **15 randomly selected games** from the 2015–16 season (Table 1: e.g., CLE@GSW 12.25.2015, GSW@LAL 01.05.2016, etc.). Detailed worked example: Cleveland Cavaliers vs. Golden State Warriors, 25 December 2015.
- Movement analysis: (x, y) positions of all 10 players in the offensive court (after the ball crosses the 47-foot line), plus derived speed/angle series.
- Shot-chart analysis: 20-dimensional rows (2 coordinates × 5 players × 2 teams) per field-goal attempt; individual-team analysis at D=10.
- Access: raw SportVU data is proprietary (STATS); the authors' curated data and R code are public at **https://github.com/EdgarSantos-Fernandez/id_basketball**.

## 3. Method / model
**Hidalgo** (Allegra et al. 2019): a Bayesian mixture model of K Pareto distributions that estimates heterogeneous intrinsic dimensions — each observation is assigned to one of K latent manifolds, each with its own ID d_k. Key ingredients:
1. Two-NN estimator (Facco et al. 2017): under locally constant density, the ratio μ_i = r_i2/r_i1 of the 2nd-to-1st nearest-neighbor distances follows Pareto(1, d).
2. Local-homogeneity likelihood term on the N×N adjacency matrix N^(q) (q-NN graph), with parameter ζ ∈ (0.5, 1) enforcing that neighbors are more likely to share a manifold — fixes the cluster-membership identifiability problem caused by overlapping Pareto densities.
3. Posterior inference by **MCMC**; number of components K chosen ex-post (average log-posterior, or DIC/BIC/AICm/BICm/WAIC); final partition via Binder loss or Variation of Information on the posterior co-clustering matrix, or k-means on per-observation posterior-median IDs with Silhouette/Calinski-Harabasz selection.
**Paper's enhancements**: (a) **truncated Gamma prior** on d_k over (0, D), plus an optional mixture atom δ_D(d_k) with proportion ρ̂ to include d = D; (b) **repulsive prior** on d = (d_1…d_K) using a sigmoidal g(Δ) = 1/(1+exp(−(Δ−τ)/ν)) to suppress redundant near-identical components; (c) per-observation ID estimates d̂_i = mean/median over T MCMC sweeps of the assigned component's d — which sidesteps label switching.
**Analyses**: within-play ID trajectories (24 frames at 2.5 fps for the worked example); speed/angle ID (D=10 each); between-play shot-chart ID clustering (D=20); between-game winner-vs-loser ID comparison (Mann-Whitney per game); score-margin ID distributions (Wilcoxon rank-sum pairwise).

## 4. Equations & assumptions
- Bishop (1995) definition: a set in ℝ^D has intrinsic dimension d if the data lies within a d-dimensional subspace entirely, without information loss (d < D expected).
- Two-NN ratio (equation 1): μ_i = r_i2/r_i1 ~ Pareto(1, d), where r_ij = d(x_i, x_(j,i)) is the distance from observation i to its j-th nearest neighbor; Pareto density f_X(x) = d·a^d / x^{d+1} with scale a=1.
- Mixture likelihood (equation 2): P(μ_i|d,p) = Σ_{k=1}^{K} p_k d_k μ_i^{−(d_k+1)}, with p ~ Dir(c_1,…,c_K), d_k ~ Gamma(a, b) (conjugacy-motivated priors).
- Latent assignment (equation 3): μ_i|z,d ~ Pareto(1, d_{z_i}); z_i|p ~ Σ_k π_k δ_k(z_i).
- Neighborhood likelihood (equation 4): f(N^(q)|z,ζ) = Π_i [ ζ^{n_i^in(z)} (1−ζ)^{q−n_i^in(z)} / Z(ζ, N_{z_i}) ], with n_i^in(z) = Σ_j n_ij 𝟙_{z_j=z_i} (q neighbors of i sharing its manifold), ζ ∈ (0.5, 1); ζ = 0.5 reduces to no neighborhood term.
- Full likelihood (equation 5): L(μ|d,z,ζ) = Π_i P(μ_i|d_{z_i}) · f(N_i^(q)|z,ζ).
- Enhancements: truncated prior π(d_k) ∝ [b^a/Γ(a)] d_k^{a−1} exp{−b d_k} 𝟙_{(0,D)}; mixture-with-atom variant π(d_k) ∝ ρ̂ [Gamma] 𝟙_{(0,D)} + (1−ρ̂) δ_D(d_k); repulsive prior π(d) = c_1 (Π_k g_0(d_k)) h(d) with h(d) = min_{(s,j)∈A} g(Δ(d_s, d_j)) (equation 6) and sigmoidal g(Δ) = 1/(1+exp[−(Δ−τ)/ν]), τ,ν > 0 (equation 7); as ν→0 the sigmoid approaches a step at τ, enforcing minimum separation τ between component IDs.
- Per-observation estimators (equation 8): d̂_i = (1/T) Σ_{t=1}^{T} d_{z_i^t} and d̂_i = median{d_{z_i^t}}_{t=1}^{T}.
- Speed/angle: s_t = √((y_{t+1}−y_t)² + (x_{t+1}−x_t)²); θ_t = tan^{−1}((y_{t+1}−y_t)/(x_{t+1}−x_t)).
- Radius of gyration is *not* in this paper (that was 0399); cluster coherence here comes from the posterior similarity heatmaps.
- Stated assumptions: (i) data density constant on the scale of the 2nd NN (required for the Pareto result); (ii) different manifolds are spatially separated — neighbors more likely to share a manifold (the ζ term); (iii) rows of the adjacency matrix treated as independent; (iv) K fixed during MCMC, chosen ex-post; (v) prior simulation showed posterior ID medians stable across priors (Gamma vs truncated vs repulsive) and across K = 3, 4, 5 (analysis run with repulsive prior, K = 3); (vi) the authors explicitly flag the **temporal-independence violation**: observations across time frames are not independent, and combining the ID framework with Hidden Markov Models is left as future research.

## 5. Features / target
- Movement analysis: input = (x, y) Cartesian positions of the 10 players (offensive court only, 2.5 fps), D effectively 20 per frame; derived series s_t (speed) and θ_t (angle), D = 10. Target = per-frame (per-observation) intrinsic dimension d̂_i and manifold assignment z_i — used to segment plays into phases.
- Shot-chart analysis: input = 20-D rows (x,y of 5 attackers + 5 defenders at shot time; ball location excluded; shot time from ball z-coordinate). Targets = cluster membership (3 clusters per team in the worked game) and per-shot success probability.
- Game-level: per-game posterior ID distributions for winners vs. losers; ID vs. score-margin categories {small 0–5, medium 6–10, large 11–15, huge ≥16}.

## 6. Validation design
No predictive train/test splits (descriptive/inferential study). Validation consists of: (a) prior-sensitivity simulation study — posterior ID medians consistent across the three priors and K = 3, 4, 5 (Appendix A, Fig. 15); (b) phase identification cross-checked against video (worked example: frames 1–6 ball handler crosses center; 7–12 creating space for passing; 17–20 preparation/shooting; 21–24 follow-through); (c) simple-vs-complex play contrast (plays idn 23/25/96 vs 355/477/308) — complex plays show higher ID; (d) statistical tests for game-level claims: Mann-Whitney per game (winner vs loser ID), Wilcoxon rank-sum pairwise across score-margin categories; (e) shot-distance stratification (δ < 6 ft short; 6 ≤ δ < 22 mid-range; δ ≥ 22 three-pointers) and short/long possession split (12.5 s cutoff) for Fig. 7.

## 7. Numerical results / baselines
Paper's claims:
- Within-play ID **spikes, peaking between 4 and 8 seconds** after the ball reaches the offensive court, then declines (abstract's headline result). Stratified: short possessions (t ≤ 12.5 s) peak around frames 10–15 (≈4–6 s after crossing center); long possessions peak at ≈6–8 s (frames 15–20).
- Simple plays (uni-directional movement) have smaller median ID; complex multi-directional plays have higher ID (Figs. 5–6).
- Speed ID: gradual increase frames 1–20 then stabilizes; angle ID: sustained increase through the play (Fig. 8).
- Shot-chart clustering (worked game, 3 clusters each): GSW attack success probabilities **0.400 / 0.550 / 0.481** (Table 4); GSW defense (opponent success) **0.360 / 0.333 / 0.407**; CLE attack **0.333 / 0.407 / 0.429**; CLE defense **0.500 / 0.429 / 0.600** (Table 5). Concrete: 56% of GSW offensive shots in cluster 1(a) successful vs. only 16.7% in cluster 2; GSW defensive cluster 3 allowed 55% CLE scoring; CLE defensive cluster 3 allowed 83% GSW scoring.
- Table 2 (worked game, per shot type): CLE short n=40, p_success 0.375, ID̄ 9.596; CLE mid-range n=16, 0.500, 10.182; CLE 3pt n=20, 0.250, 10.052; GSW short n=25, 0.640, 11.317; GSW mid-range n=22, 0.409, 11.056; GSW 3pt n=15, 0.333, 11.049. Season context: CLE 0.362 on 3pt / 0.514 on 2pt; GSW 0.416 / 0.528.
- Winners vs losers (15 games): in **6 games the winner had significantly greater ID** (Mann-Whitney), in 6 no difference, in **3 the loser had higher ID**.
- Score-margin Wilcoxon p-values (Table 3; H1: row category has greater median ID than column): small vs huge **<0.0001**; small vs large **0.010**; small vs medium 0.505; medium vs huge **<0.0001**; medium vs large 0.334; large vs huge 0.285 — supporting "smaller margin → greater ID/complexity."
- Simulation: ID posteriors stable across priors and K; analysis run with repulsive prior, K = 3.

## 8. Code / data availability
**Code: https://github.com/EdgarSantos-Fernandez/id_basketball** — R code for the ID computation plus the curated data. Computations done in R (packages mcclust, superheat, tidyverse, gganimate). Raw SportVU data is proprietary (not shared); the repo carries the authors' curated subset.

## 9. Leakage & limitations
- **Small sample**: 15 games, one season — the authors themselves say the winner–ID association "needs to be validated using a larger sample size." The 6/6/3 winner-loser split is barely directional.
- **Temporal independence violated**: the Hidalgo model assumes independent observations; tracking frames are strongly autocorrelated (authors acknowledge; HMM extension is future work). MCMC credible intervals are therefore overstated in precision.
- **K chosen ex-post** with no uncertainty accounting (Bayesian nonparametric extension — Dirichlet process mixtures — listed as future work).
- **Shot outcome is tiny-sample**: cluster success probabilities rest on ~15–40 shots per cell (e.g., CLE 3pt n=20) — the 56% vs 16.7% cluster contrast could be noise; no out-of-sample cluster validation.
- **Curation bias**: manual video matching of events to tracking; only 15 games because curation was "time-consuming."
- **Causal direction unclear**: does complexity cause success, or do good teams (GSW's ID̄ ≈ 11.0–11.3 vs CLE's ≈ 9.6–10.2 across all shot types in Table 2) simply play more complexly? Confounded by team quality.
- **External validity to NFL**: basketball is continuous-flow 5v5 on a small court; NFL plays are discrete, 11v11, with pre-snap/post-snap phases — the ID construct transfers, the numeric findings do not. The authors explicitly state the analysis "can be easily extended to other sports like football and rugby."
- **Computation**: MCMC over N×N adjacency structures is expensive; the authors downsampled 25 fps → 2.5 fps for tractability — NFL's 10 Hz NGS would need similar thinning.

## 10. GSE overlap
Extension/new capability, not a duplicate. Per the existing-research map, nothing in Garrett's corpus covers **intrinsic dimension / manifold-based complexity** of tracking data. The NGS lane holds a 27-family *metric* taxonomy (2026-09-21) and the STRAIN pass-rush paper — both measure specific phenomena, neither quantifies play complexity or unpredictability. The closest conceptual neighbors are ball-entropy discussions (Hobbs et al. 2018, cited in the paper) and the ML-brief topic on representation learning — but no ID estimation exists in-repo. This is the first principled "complexity meter" for tracking data in the sweep and plugs directly into the NGS replacement spec (2026-09-18): an ID-based unpredictability feature computed from public NGS/Big Data Bowl tracking, no proprietary feed required.

## 11. GSE implementation spec
Build an **NFL play-complexity (ID) feature** from public NGS tracking:
1. Data: NFL Big Data Bowl tracking (10 Hz, 2018–2024) — no proprietary feed. Per play, construct the D-dimensional frame vectors (x,y of 22 players → D=44, or offense-only D=22), thin to ~2 Hz per the paper's precedent.
2. Fit: port the paper's R code (or reimplement Hidalgo in Python/PyMC) — two-NN Pareto mixture with the repulsive prior, K=3. Compute per-frame posterior-median ID within each play, plus a play-level summary (peak ID, mean ID over the first 2 s post-snap).
3. Features for the engine: (a) pre-snap motion ID (complexity of shifts/motion in the 5 s before snap) as an EPA/play-action-success predictor; (b) post-snap route-combination ID as a defense-confusion feature; (c) team-level ID as a "scheme unpredictability" rating updated weekly.
4. Serving: precompute per-play IDs offline in the weekly pipeline; serve as features to the EPA/probability models. No real-time inference needed.
5. Effort: ~2 weeks to port the R Hidalgo implementation and validate on one season; ~1 week per feature-integration experiment. MCMC cost is the main constraint — start with the paper's 2.5 Hz thinning.

## 12. Reproducible test
Using 2023 Big Data Bowl tracking data: compute play-level peak ID (posterior median, repulsive prior, K=3, 2 Hz thinning) for all pass plays; test (i) whether peak ID in the first 2 s post-snap predicts EPA/play in a logistic/linear model controlling for down, distance, yardline, and shotgun — metric: out-of-sample R²/AUC lift over the no-ID baseline; (ii) whether pre-snap motion ID predicts play-action success (yards per play) vs. a motion-flag dummy baseline. Time window: 2023 season, train on weeks 1–12, test on weeks 13–18 (time-ordered). Runnable with public data + the authors' R code or a Python port; no proprietary feeds.

## 13. Acceptance / rejection gate
**Adopt** the ID feature into GSE's NGS lane if either test shows a statistically significant lift: post-snap peak ID adds ≥0.005 out-of-sample R² to EPA/play over the down-distance-yardline-shotgun baseline, OR pre-snap motion ID beats the motion-flag dummy by ≥0.01 AUC on play-action success — both on the weeks 13–18 holdout, with the direction matching the paper's (higher complexity → better offensive outcomes). **Reject** if neither clears the bar or if the sign flips (higher ID → worse outcomes), since the transfer hypothesis would be falsified; keep the paper as a methods reference only. Gate evaluated on 2023 data before any production feature wiring.

## 14. Improvement experiment
Go beyond the paper by fixing its acknowledged weakness — **temporal dependence**: replace the i.i.d. Hidalgo model with a **Hidden Markov Model over ID regimes** (the authors' own suggested future work), where each play's frame sequence moves through latent complexity states (e.g., set → develop → break) with state-specific ID distributions. Fit via MCMC on the same 2023 tracking data and test whether HMM state posteriors (e.g., "time spent in high-complexity state before the throw") predict completion probability / EPA better than the paper's static per-frame ID medians (metric: out-of-sample AUC for completions, weeks 13–18). If the HMM wins by ≥0.01 AUC, it replaces the static ID as GSE's complexity feature — turning the paper's descriptive curve into a generative play-phase model.
