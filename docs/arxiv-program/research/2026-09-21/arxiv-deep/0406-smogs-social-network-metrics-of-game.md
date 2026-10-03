# [0406] SMOGS: Social Network Metrics of Game Success (arXiv:1806.06696v1)

**Citation:** Fan Bu, Sonia Xu, Katherine Heller, Alexander Volfovsky (2018). *SMOGS: Social Network Metrics of Game Success*. arXiv:1806.06696v1. URL: https://arxiv.org/abs/1806.06696v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,299 lines).
**Verdict:** ADAPT — basketball passing networks don't exist in football (the NFL pass graph is a QB-centered star, not a network), but the paper's core machinery — multiplicative latent sender/receiver factors for dyadic interactions, with a win/loss "fragmentation vs. overlap" signature — ports cleanly to NFL QB–receiver target dyads as a chemistry metric, a genuinely new capability for GSE.

## 1. Research question
Can a team's passing behavior be modeled as a dynamic social network, and can the learned network structure (multiplicative latent factors for who passes to whom) distinguish a win from a loss? The paper extends Cervone et al.'s (2016) multi-resolution stochastic process model of basketball possessions with latent-factor network models (Hoff 2005, 2009) to produce "social network metrics of game success," estimated by MCMC, and tests them on the first public high-resolution (25 Hz) college-basketball optical tracking dataset.

## 2. Dataset / schema
- **First public SportsVu dataset for college basketball**: one NCAA Division I team's home games, December 2014 – January 2015 (players anonymized by random ID). 25 Hz snapshots of every player, the ball, and action labels.
- Three merged XML sources: **Boxscore** (assists/points/rebounds per game), **Play by Play** (event stream — dribble, foul, pass — used to divide games into possessions, ending on made/missed shots, turnovers, and non-turnover violations; fouls removed), and **Sequence Optical** (25 Hz locations, used for spatio-temporal covariates and passing order).
- Synthetic dataset for validation: 2 games, 8 players, ~10,000 observations generated from the model itself.

## 3. Method / model
1. Baseline: Cervone et al. (2016) multi-resolution possession model — possessions decompose into possession states (micro-movements), transition states (pass/shot/turnover), and end states (0/2/3 points); the pass hazard for carrier i to teammate j is the log-linear model (2): log(θ_{i,j}(t)) = W_{i,j}(t)^T η_{i,j} + ξ_{i,j}(s_i(t)) + ξ̃_{i,j}(s_j(t)).
2. Preliminary AME (additive/multiplicative effects, Hoff 2008) model on possession-aggregated passing networks (5): log-odds(y_{ij}=1) = β_d x_d + r_i + s_j + u_i^T v_j + ε_{ij}, fit per game with Hoff's R package **amen** — the latent plots already separate a win from a loss (Figure 1).
3. **Full model (SMOGS)** (7–10): passes as events of a non-homogeneous spatio-temporal Poisson process with game-specific latent factors: log(θ_{i,j}(t)) = X_{i,j}(t)^T β_{i,j} + **u_{i,g}^T v_{j,g}** + ε_{i,j}(t), where u_{i,g}, v_{j,g} are R-dimensional sender/receiver latent vectors for player i/j in game g (R = 2 in the application).
4. Spatial effects ξ̄_i, ξ̃̄_{i,pos(j)} estimated off-line by **thin-plate-spline smoothing** of empirical pass-location counts on 1 ft × 1 ft half-court tiles (11), with λ chosen by generalized cross-validation — simpler and less data-hungry than the GMRF approach of Cervone et al.
5. Inference: Metropolis-within-Gibbs sampler (section 3.2): Gibbs updates for β_{i,j}, U_g, V_g columns; Metropolis update for the θ intensities; standard multivariate normal priors; posterior full conditionals analytically tractable.

## 4. Equations & assumptions
- Pass hazard (6): θ_{i,j}(t) = lim_{ε→0+} P(Y_{i,j}(t) | H(t)) / ε.
- Full model (10): log(θ_{i,j}(t)) = X_{i,j}(t)^T β_{i,j} + u_{i,g}^T v_{j,g} + ε_{i,j}(t), with latent term (8): z_{i,j,g}(t) = u_{i,g}^T v_{j,g} + ε_{i,j}(t).
- Preliminary AME (5): log-odds(y_{ij}=1) = β_d x_d + r_i + s_j + u_i^T v_j + ε_{ij}, with r_i = β_i x_i + a_i (receiver), s_j = β_j x_j + b_j (sender).
- Thin-plate-spline smoother (11): min Σ_k ‖ñ_k − ξ̄_i(c_k)‖² + λ ∫_S ‖∂²ξ̄_i/∂s²‖²_F ds.
- Covariate vector W_{i,j}(t) (5-dim): baseline constant; dribble-started indicator; log distance from i to nearest defender; j's closeness rank to i (1–4); passing-route openness (Cervone metric). Spatial effects normalized to integrate to 1 over the half court.
- Stated assumptions: (i) pass events follow a non-homogeneous Poisson process conditional on history; (ii) ε_{i,j}(t) are independent standard normals; (iii) latent factors are game-specific (not possession-specific — listed as future work); (iv) fouls can be dropped without biasing transition modeling; (v) 90%-in-game training / 10%-held-out is an adequate test of real-time prediction.

## 5. Features / target
Input features: time-varying dyadic covariates (baseline, dribbling, defender distance, receiver closeness rank, route openness) + spatial pass/receive surfaces per player and per receiver position (F/C/G) + dyadic/nodal features in the AME (shared position/height/weight/class; previous-possession indicators; points per game). Target: the occurrence (hazard) of a pass from i to j in (t, t+ε] — a continuous-time event prediction, not a game outcome; game success is read off the latent factors post hoc.

## 6. Validation design
- **Simulation**: data generated from the model (2 games, 8 players, ~10k obs); 90% train / 10% held out; Latent model vs. Covariate-only subset compared on train and held-out log-likelihood; parameter recovery checked (posterior of β_{i,j,1} centered on truth; squared error of u/v samples decaying and stabilizing — Figure 3).
- **Real data**: Dec 2014 – Jan 2015 games; per-game 90/10 split; same Latent-vs-Covariate log-likelihood comparison (Table 2).
- **Interpretive validation**: latent-factor scatter plots (sender in red, receiver in blue) for a win vs. a loss (Figures 1, 4); box-score stats as reference; no numeric classification of wins vs. losses.

## 7. Numerical results / baselines
- Simulation (Table 1): **Latent beats Covariate-only** — train LL −10,025.93 ± 189.31 vs. −10,719.68 ± 120.26; held-out LL −1,219.80 ± 57.62 vs. −1,314.00 ± 43.43.
- Real data (Table 2): **Latent beats Covariate-only** — train LL −679.33 ± 114.51 vs. −917.89 ± 220.41; held-out LL −58.52 ± 11.20 vs. −64.68 ± 12.59.
- Win/loss signature (Figures 1, 4): in the **win**, main starters' sender and receiver effects cluster together (left quadrant) — "more overlap… more active teamwork"; in the **loss**, effects lie farther from the origin and ball movement is "fragmented" (one player receives from upper-left passers, another passes to lower-left receivers). Non-point-guards sitting at the origin flags "non-standard playing."
- No numeric accuracy/AUC for win/loss prediction — the success claim is interpretive + likelihood-based.

## 8. Code / data availability
No code repository stated; the preliminary AME fit uses Hoff et al.'s (2014) R package **amen**. The college SportsVu dataset is described as "the first public" one but no download link is given in the text.

## 9. Leakage & limitations
- **Win/loss "metric" is never scored**: the paper shows two hand-picked games' plots and calls the difference a metric — no classifier, no out-of-sample win prediction, no baseline comparison for game-success prediction.
- **Tiny real dataset**: one team's home games over ~2 months; all conclusions about wins vs. losses rest on a handful of games (two shown).
- **90/10 in-game split**: test data comes from the same games (and game-specific latent factors u_{i,g}, v_{j,g} are fit on the same game), so held-out LL is not a true out-of-game test.
- **Game-specific latent factors can't predict a future game**: u_{i,g}, v_{j,g} are per-game — the model has no mechanism to carry chemistry forward (authors flag possession-level and defender/offender extensions as future work).
- **Fouls dropped**; SportsVu auto-translation errors acknowledged in the XML data.
- **No comparison to simple baselines** for the win/loss interpretation (e.g., raw pass-count entropy might separate the same two games).
- **NFL transfer caveat**: football passes are a QB-centered star (QB→receiver), not a network — the u_i^T v_j interaction structure collapses when only one player ever sends. The transferable unit is the **target dyad**, not the pass network.

## 10. GSE overlap
Extension/new capability. Per the existing-research map, dyadic/chemistry modeling is essentially absent: the map's passing-game coverage is completion-probability models (1910.12337, read in depth in this wave), route/defender work, and target-share tables — nothing models **QB–receiver chemistry as latent sender/receiver factors**, and nothing produces a "teamwork fragmentation" signature. NGS tracking gives the dyadic covariates this model needs (defender distance, separation, route openness analogues). The thin-plate-spline spatial-surface technique (§3.3) is also new to the corpus as a cheap empirical-Bayes smoother for NFL field surfaces.

## 11. GSE implementation spec
Build **QB–Receiver Chemistry Factors (QRCF)**:
1. Replace the pass network with the **target dyad**: for each dropback, model target choice among eligible receivers as a multinomial/conditional-logit over the 5 eligibles — the AME form (5) maps directly: log-odds(target i→j) = β_d x_d + r_j (receiver popularity) + u_QB^T v_j (chemistry) + ε. QBs are senders only, receivers only — the model simplifies to one sender factor per QB (or per QB-game) plus receiver factors.
2. Dyadic covariates x_d from NGS: receiver separation at throw, nearest-defender distance, route type, air-yards depth, pressure indicator — the paper's W_{i,j}(t) translated to the dropback.
3. Latent dimension R = 2, fit per QB-team-season (or per game for the fragmentation diagnostic) with Stan/PyMC; priors standard normal as in the paper.
4. Products: (a) a **chemistry leaderboard** — QB–WR pairs with the largest positive u^T v residuals (targets beyond what separation/route explain = trust) — weekly X content; (b) the paper's win/loss signature re-examined: does target-factor fragmentation (dispersed v_j) correlate with losses at the team-week level? — a testable version of the paper's interpretive claim.
5. Effort: ~2 weeks (dropback dyad matrix from nflverse + NGS 1 wk; Stan AME + validation 1 wk).

## 12. Reproducible test
Fit QRCF on 2022–2023 dropbacks (nflverse play-by-play + NGS separation/defender-distance features) and evaluate on 2024: (a) held-out **target-choice log-likelihood** vs. a no-latent-factors baseline (the paper's Table 2 comparison, but across games, not within); (b) the fragmentation hypothesis — regress team win/loss (or EPA per dropback) on the dispersion of that game's receiver latent factors; success = latent model wins on (a) AND fragmentation negatively predicts offensive EPA out-of-sample (the paper's signature made quantitative). Time window: 2024 season holdout. Data: nflverse + NGS public tracking — no proprietary inputs.

## 13. Acceptance / rejection gate
**Adopt** QRCF if on the 2024 holdout the latent-factor target model beats the no-latent baseline on held-out log-likelihood **and** receiver-factor fragmentation is a significant negative predictor of team dropback EPA out-of-sample (the paper's win/loss signature, quantified). Then the chemistry leaderboard ships as recurring content. **Reject** if the latent factors add no held-out likelihood over covariates (chemistry is just separation + route, no residual trust signal) or if fragmentation has no out-of-sample relationship with offensive performance (the paper's two-game visual doesn't generalize). Either rejection kills the metric — don't ship an interpretive plot without the numbers, which is the paper's own weakness.

## 14. Improvement experiment
Fix the paper's two structural gaps: (a) make latent factors **carry across games** — a dynamic AME where u_{QB,t}, v_{j,t} evolve as random walks across weeks (the paper's per-game factors can't predict the future; this makes chemistry a real leading indicator); (b) add the **defender as a network node** — model the QB–receiver–nearest-defender triad with a third latent factor (the paper lists defender/offender links as future work). Test on 2024: does the dynamic triadic model beat the static dyadic QRCF on next-week target-choice log-likelihood? If yes, the dynamic version becomes the production spec — and the week-to-week change in a pair's chemistry factor becomes a genuinely predictive "trust is building/breaking down" signal for matchup previews, which is beyond anything the paper attempted.
