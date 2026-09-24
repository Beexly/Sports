# [0232] flexBART: Flexible Bayesian regression trees with categorical predictors (arXiv:2211.04459v3)

**Citation:** Deshpande, S. K. (2023). *flexBART: Flexible Bayesian regression trees with categorical predictors*. arXiv:2211.04459v3. URL: https://arxiv.org/abs/2211.04459
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7,478 lines incl. Appendices A–C).
**Verdict:** ADOPT — replace one-hot-encoded categorical handling in GSE's Bayesian tree/ensemble pipelines with flexBART's multi-level split prior (and its R package); the pitch-framing results (8.6% vs 18.4% misclassification) show the encoding choice is first-order, and the package is open source.

## 1. Research question
Does the standard practice of one-hot encoding categorical predictors in Bayesian Additive Regression Trees (BART) cripple the model's ability to partially pool data across groups of levels — and can a re-implementation that allows multiple categorical levels on both branches of a split (plus a network-structured split prior for spatial/adjacency data) materially improve out-of-sample prediction? Motivated by MLB pitch framing (umpire/player identities as categoricals) and Philadelphia census-tract crime modeling (network-structured tracts).

## 2. Dataset / schema
- Synthetic: 4 DGPs × n ∈ {1,000, 5,000, 10,000}, 50 replications each; 10 continuous U(0,1) predictors + 1 categorical with 10 levels; y ~ N(μ_d(x), 1); 500 out-of-sample test points.
- 16 benchmark datasets (UCI: abalone, cpu, mpg, servo; JAE: Alcohol, amenity, Engel, spouse; R packages: ais, attend, cane, Caschool, fuelEcon, Insur, Medicare, strike); 50 random 75/25 train/test splits each.
- MLB pitch framing: pitch-by-pitch data 2013–2019 scraped via baseballr; ~350,000 called pitches/season; binary y (ball=0/strike=1); predictors = pitch location + player (batter/catcher/pitcher) and umpire identities (~100 umpires, ~1,000 batters, ~100 catchers, ~700 pitchers/season); probit link P(y=1) = Φ(f(x)); 10 random 90/10 splits per season.
- Philadelphia crime: monthly crime density per census tract, Jan 2006–Dec 2021 (t = 1…192); inverse hyperbolic sine transform; y_{v,t} ~ N(f(t,v), σ²); tract adjacency network; 100 random 75/25 splits.
- Code: https://github.com/skdeshpande91/flexBART (R package flexBART, C++/Rcpp core).

## 3. Method / model
- BART review: y ~ N(f(x), σ²), f(x) = Σ_m g(x; T_m, D_m, μ_m), M trees; tree prior: grow from node at depth d with probability 0.95(1+d)^{−2}; decision rules {X_j ∈ C}; continuous: C = [0,c), c ~ U(A); categorical: C = random subset, each available level assigned with probability 1/2; leaf jumps μ ~ N(μ_0, τ²/M) so marginal f(x) ~ N(μ_0, τ²).
- Core finding: one-hot encoding a K-level categorical yields only 2^K − K reachable partitions of levels (vs the K-th Bell number; e.g., K=5: 27 of 52; K=10: 1,014 of 115,975 — under 1%). Proof sketch via the three partition types reachable with binary indicators.
- flexBART: decision rule prior assigns each available level to C independently with probability 1/2 (no one-hot encoding); grows/prunes via Metropolis-Hastings with prior proposals (data-adaptive proposals shown to deflate acceptance — Appendix B).
- Network extension: 4 splitting strategies for network-structured categoricals: gs1 = deterministic Fiedler partition; gs2 = uniform spanning tree (Wilson's algorithm) + delete uniform edge; gs3 = spanning tree + delete edge with probability ∝ smallest resulting cluster size (balanced bias); gs4 = Fiedler partition of the uniform spanning tree. Recommends gs2 or gs3 as defaults.
- Gibbs sampler: Bayesian backfitting; partial residuals r_i = y_i − Σ_{m′≠m} g(x_i; T_{m′}, D_{m′}, μ_{m′}); leaf jumps μ_ℓ | … ~ N(P_ℓ^{−1}θ_ℓ, P_ℓ^{−1}), P_ℓ = σ^{−2}|I(ℓ)| + τ^{−2}, θ_ℓ = σ^{−2}Σ_{i∈I(ℓ)} r_i + τ^{−2}μ_0; closed-form marginal tree likelihood (eq B9); suff_stat_map structure + running allfit_train/residual to avoid redundant computation.
- Baselines: R package BART (one-hot), targetBART (target encoding), oracleBART (fits separate BART per true partition), ASE-embedded BART (adjacency spectral embedding dims 1/3/5 as continuous predictors).

## 4. Equations & assumptions
Actual equations from the paper (faithfully transcribed):
- Model: y ~ N(f(x), σ²); f(x) = Σ_{m=1}^{M} g(x, T_m, D_m, μ_m); g(x; T, D, μ) = μ_{ℓ(x)} (eq B1).
- Tree growth: P(grow at depth d) = 0.95(1+d)^{−2}.
- Leaf posterior: μ_ℓ | T, D, y, σ, E^{(−m)} ~ N(P_ℓ^{−1}θ_ℓ, P_ℓ^{−1}), P_ℓ = σ^{−2}|I(ℓ)| + τ^{−2}, θ_ℓ = σ^{−2}Σ_{i∈I(ℓ)} r_i + τ^{−2}μ_0 (eq B7).
- Marginal tree likelihood: p(y|T,D,σ,E^{(−m)}) = Π_ℓ [τ^{−1} P(ℓ)^{−1/2} exp(Θ(ℓ)²/(2P(ℓ)))] (eq B9).
- MH acceptance: α((T,D)→(T*,D*)) = min{1, [p(T*,D*|…) q(T,D|T*,D*,…)] / [p(T,D|…) q(T*,D*|T,D,…)]} (eq B8); grow/prune prior and likelihood ratios eqs B10–B13.
- Partition count under one-hot: 2^K − K reachable partitions; Bell-number lower bound (K/log_2(K))^K (Berend & Tassa 2010).
- Co-clustering prior covariance: (k,k′) entry ∝ P(c_k, c_{k′} co-clustered in a prior tree) (Linero 2017 argument).
- ASE: d-dimensional embedding Û_d Σ̂_d^{1/2} from SVD A = UΣV⊤.
Stated assumptions: homoscedastic Gaussian errors; independent identical tree priors; μ_0, τ set per Chipman et al. 2010 to cover observed y range; gs1–gs4 require the available-level induced subgraph G[A] to be connected; network structure known a priori; MCMC runs were single chains of 2,000 iterations (comparative study only — author notes more chains in applied practice).

## 5. Features / target
- Synthetic: 10 continuous + 1 ten-level categorical → continuous y.
- Benchmarks: mixed continuous/categorical per dataset (e.g., fuelEcon: 5 cont + 5 cat with up to 84 levels).
- Pitch framing: pitch location (continuous) + player/umpire IDs (high-cardinality categoricals) → binary called strike, probit link.
- Crime: time index + tract ID (network-structured categorical) → transformed crime density.
- Horizon: contemporaneous regression (no forecasting horizon; crime has time index as a predictor).

## 6. Validation design
- Synthetic: 50 replications per DGP × n; metric = out-of-sample MSE relative to BART at 500 new x; two-sided paired t-tests with Bonferroni (Table A1).
- Benchmarks: 50 random 75/25 splits; metric = standardized MSE (SMSE = MSE / train-mean baseline MSE; 1−SMSE ≈ R²); one-sided paired t-tests, Bonferroni over 32 comparisons; runtimes recorded.
- Pitch framing: per season, 10 random 90/10 splits; metrics = misclassification rate, log-loss, Brier score; one-sided tests (flexBART vs BART p = 4.5×10^{−26}; vs targetBART p = 2.7×10^{−22}).
- Crime/network: 100 random 75/25 splits (vertices held out but kept in network — interpolation, not extrapolation); RMSE; Table A2 MSE + credible-interval coverage.

## 7. Numerical results / baselines
Synthetic (n = 5,000, MSE relative to BART): flexBART 18% lower (DGP1), 13% lower (DGP3), 20% lower (DGP4); worse than BART on DGP2 (singleton-outlier partition — flexBART biased toward balanced partitions). Runtime: flexBART 14s/27s/47s vs BART+targetBART 20s/75s/150s for n = 1,000/5,000/10,000 (2,000 MCMC iterations).
Benchmarks (SMSE, starred = flexBART significantly better at 5% after Bonferroni): cpu 0.154 vs BART 0.222* (30% better); servo 0.153 vs 0.189*; Insur 0.021 vs 0.297* (BART catastrophically worse on high-cardinality categoricals); Caschool 0.002 vs 0.005*; attend 0.212 vs 0.262*; cane 0.614 vs 0.691*. flexBART better on 12/16 datasets, significant on 10; runtimes 2–4× faster (e.g., Engel: 88.9s vs 253.4s).
Pitch framing (7 seasons): flexBART misclassification 8.6%, targetBART 8.8%, BART (one-hot) 18.4% — vs 10.6% for Deshpande & Wyner 2017 hierarchical model. flexBART runtime 48 min vs BART 2 hours per 2,000 samples.
Crime/network RMSE: gs2 1.21, gs3 1.21, gs4 1.25 vs BART 1.32, targetBART 1.33, flexBART_unif 1.23, gs1 1.93, BART_ase1 4.05, BART_ase3 1.90, BART_ase5 1.57 (SD of y ≈ 4.65). Synthetic network experiments: piecewise-constant test RMSE — gs2 3.708 vs BART 39.036 vs BART_ase1 46.459; smoothly-varying: gs3 0.191 vs BART 0.953.
Interpretation: my reading — the effect size of encoding choice dwarfs most model tweaks; the single most actionable number is 18.4% → 8.6% misclassification on identical data from changing only the categorical handling.

## 8. Code / data availability
R package + all experiment code: https://github.com/skdeshpande91/flexBART. Benchmark datasets from UCI/JAE/R packages (public). MLB data via baseballr (public). Philadelphia crime from opendataphilly.org (public).

## 9. Leakage & limitations
- MCMC: single chain of 2,000 iterations for comparisons — no convergence diagnostics reported; BART-family mixing over tree space is known-bad (Appendix B3 admits non-identifiability, exponential mixing lower bounds per Ronen et al. 2022, Kim & Ročková 2023). Variable-importance heuristics from tree ensembles are unreliable under non-identifiability (paper's own warning).
- Pitch framing: 90/10 random splits are not time-ordered — umpire zone drift within/across seasons not controlled; no calibration reported beyond Brier (values in appendix, not main text).
- Network experiments are interpolation (held-out vertices stay in the graph) — cold-start extrapolation to new nodes untested.
- DGP2 shows flexBART fails when one level is a true outlier (balanced-partition bias) — relevant to NFL: a single elite QB/team may need singleton treatment.
- Recommends gs2/gs3, but gs2 produced "extremely large" co-clustering probabilities / many singletons on the Philly network in prior draws — prior sensitivity under-explored.
- No comparison to gradient boosting (XGBoost/LightGBM with native categorical support), the actual production alternative.
- External validity to NFL: strong — NFL data is categorical-heavy (team, player, position, formation, coverage shell) and the paper's motivating application is literally sports officiating/player-effect modeling.

## 10. GSE overlap
Per existing-research-map.md: the 2026-09-18 ML research brief commissioned "tabular learners" and "interpretable models" (results pending), and the repo's calibration work mentions temperature scaling etc. — but NO BART paper has been read, no Bayesian tree ensemble exists in the repo, and GSE's engine is XGBoost-based (nflfastR lineage: EP/XGBoost, cp_model = XGBoost). Garrett's gse-lab computes EPA aggregates; no Bayesian nonparametric regression with uncertainty quantification is inventoried. The gap list doesn't name BART but the "interpretable models + uncertainty" lane is open. This is a **new capability**: Bayesian tree ensembles with calibrated posterior uncertainty and principled categorical handling — directly relevant to GSE's stated uncertainty/calibration stack.

## 11. GSE implementation spec
- Install the flexBART R package (or port the C++ core to the Python pipeline) and benchmark it as a drop-in replacement for XGBoost on GSE's tabular game/team/player prediction tasks: features = team IDs, QB IDs, coach IDs (high-cardinality categoricals GSE currently one-hot or target-encodes) + continuous EPA aggregates.
- First application: 4th-down/prop probability models where calibrated uncertainty matters (ties into GSE's CQR/conformal stack); second: umpire-analog — referee crew effects on totals (repo already has referee-crew MNF totals work — categorical crew ID is the natural flexBART input).
- Network extension (gs2/gs3): team-strength modeling where the "network" is the schedule graph (teams as nodes, games as edges) — contiguous partitioning of the schedule graph for opponent-adjusted estimates; or divisional structure as the network.
- Training protocol: multiple chains (paper used 1 for comparison; production needs ≥4 with R-hat checks), 2,000+ iterations; posterior predictive intervals feed the conformal/calibration layer.
- Serving: batch inference (MCMC too slow for real-time); precompute posterior means + intervals weekly.
- Effort: 2–3 engineer-weeks (R/Python bridge + benchmark harness; the package itself is ready).

## 12. Reproducible test
Dataset: nflverse 2021–2024 play-by-play aggregated to team-game EPA margin; predictors: team ID + opponent ID (32-level categoricals) + continuous EPA/success-rate features; target: next-game point differential. Baseline: XGBoost with one-hot team IDs (GSE's current pattern). Metric: out-of-sample RMSE on 2024 season (train 2021–2023), plus interval coverage at 80%/90% nominal. flexBART must be run with ≥4 chains and R-hat < 1.05 (stricter than the paper's single chain).

## 13. Acceptance / rejection gate
Adopt flexBART as GSE's Bayesian tabular learner if: (a) out-of-sample RMSE on 2024 improves ≥3% over one-hot XGBoost (paper's benchmark gains were 5–30% on categorical-heavy data), AND (b) 80%/90% posterior intervals achieve empirical coverage within ±3 pp of nominal (the calibrated-uncertainty payoff), with runtime acceptable for weekly batch. Reject if gains are <3% (the DGP2 caveat bites — check singleton-outlier teams) or if MCMC cost exceeds the batch window; reject the network extension if gs2/gs3 don't beat flexBART_unif on the schedule-graph task.

## 14. Improvement experiment
Beyond the paper: (a) hybridize — use flexBART's posterior co-clustering matrix over team levels as a learned similarity kernel inside GSE's existing XGBoost pipeline (team-similarity features from the Bayesian model, point predictions from the fast model); the paper never uses the co-clustering matrix as an output artifact; (b) extend the network prior to the NFL schedule graph with *weighted* edges (point-differential-weighted adjacency) rather than binary adjacency — the paper's gs2/gs3 use unweighted graphs; (c) run the DGP2 diagnostic explicitly on NFL data: test whether a single elite QB (e.g., Mahomes) breaks flexBART's balanced-partition bias, and if so, add a "singleton-outlier" mixture component to the decision-rule prior.
