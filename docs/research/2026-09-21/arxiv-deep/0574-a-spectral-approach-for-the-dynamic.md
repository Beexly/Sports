# [0574] A Spectral Approach for the Dynamic Bradley-Terry Model (arXiv:2307.16642v2)

**Citation:** Xin-Yu Tian, Jian Shi, Xiaotong Shen, Kai Song. *A Spectral Approach for the Dynamic Bradley-Terry Model*. arXiv:2307.16642v2. URL: https://arxiv.org/abs/2307.16642v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 12351 lines, including Appendices A.1–A.4 proofs).
**Verdict:** ADAPT — Kernel Rank Centrality (KRC) is a cheap, online-updatable dynamic-strength estimator with closed-form entrywise inference; adopt the spectral estimator as an NFL weekly power-rating engine and the Sherman–Morrison rank-one online update for in-week rating refresh, but do not rely on the Bradley-Terry win-only likelihood for spread/total markets.

## 1. Research question
Predicting and inferring time-varying rankings from pairwise comparison data. The authors propose Kernel Rank Centrality (KRC): a spectral estimator that kernel-smooths binary outcomes over time into a Markov transition matrix and reads item strengths from its stationary distribution. Key theoretical claim: the first distribution theory (asymptotic normality) for a spectral ranker in the dynamic Bradley-Terry setting, via a novel group-inverse approximation.

## 2. Dataset / schema
- Simulations: n=10…100 items, M=50–200 comparisons per pair, capabilities α_i ~ U(1,3), true strengths π_i(t)=α_i+sin(5α_i t), outcomes Bernoulli(π_j(t)/(π_i(t)+π_j(t))), 100 replications.
- Real data: NBA regular seasons 2009-10 through 2018-19 (10 seasons × 1230 games), from nba.com. Forecasting design: first 7 seasons as base, estimate capability curves on the last 3 seasons using only data before time t, predict each game's winner as the higher-skill team; accuracy = fraction correct. Elo baseline: the publicly available FiveThirtyEight NBA Elo (Silver & Fischer-Baum 2015).

## 3. Method / model
- Dynamic Bradley-Terry (Assumption A): P(y_ij(t)=1)=π_j(t)/(π_i(t)+π_j(t)), Σ_i π_i(t)=1, outcomes independent Bernoulli; times t_k ~ uniform on [0,1].
- Kernel-smoothed transition matrix (Eq. 3.1): P̂_ij(t) = (1/n)·(Σ_{t_k∈T_ij} y_ij(t_k)K_h(t,t_k))/(Σ K_h(t,t_k)) for i≠j; P̂_ii(t)=1−Σ_{s≠i} P̂_is(t). Rows sum to 1 → Markov chain.
- Population version (Eq. 3.2): P*_ij(t)=(1/n)·π_j(t)/(π_i(t)+π_j(t)) is reversible w.r.t. π(t), so π(t) is its stationary distribution (detailed balance: π_i P*_ij = π_j P*_ji).
- KRC estimator (Eq. 3.3): π̂(t)^⊤=π̂(t)^⊤P̂(t), Σ π̂_i=1. Irreducibility guaranteed with prob ≥ 1−O((nM)^−10) (Lemma 2); optional teleportation regularization [(1−σ_n)P̂_ij+σ_n/n], σ_n/n=1/n².
- Online updating (Lemma 1 + Algorithm 2): a new game changes only rows i and j of P̂; two Sherman–Morrison rank-one updates via the ROU operator on (π̂_old, A^#_old, δ, i) — π_new=π_old−φ with φ^⊤=[π_i,old/(1+δ^⊤A^#_{.i,old})]δ^⊤A^#_old, plus group-inverse update (Eq. 3.5). No re-optimization.
- Static Rank Centrality (Negahban–Oh–Shah 2017) and nearest-neighbor Rank Centrality (Karlé–Tyagi 2021) are special cases of KRC.

## 4. Equations & assumptions
- Dynamic BT likelihood (Eq. 2.1): P(y_ij(t)=1)=π_j(t)/(π_i(t)+π_j(t)).
- KRC transition (3.1)–(3.3) above; α_i(t) scaling and β_i(t) bias in Theorem 2:
  α_i(t)=√[(Σ_{j≠i} y*_ij(t))²/(Σ_{j≠i} (1/M_ij h)(π_i+π_j)² y*_ij(1−y*_ij) ∫K²(v)dv)];
  β_i(t)=Σ_{k<l}(A^#_li−A^#_ki)·(π_k+π_l)/n·ÿ*_kl(t)·∫v²K(v)dv.
- Entrywise expansion (Theorem 4): π̂_i(t)−π_i(t)=[1/Σ_{j≠i}y*_ij]·Σ_{j≠i}(π_i+π_j)Δ̄_ij(t)+β_i(t)h²+ε_i(t), sup|β_i|=O(1/n), sup|ε_i|=o_p(√(1/(n³Mh))).
- Theorem 1 rates: relative ℓ2 error ≤ C1√(1/(nMh))+C2h²; relative ℓ∞ error ≤ C3√(log(nM)/(nMh))+C4h²; optimal bandwidth h≍(nM)^(−1/5).
- Theorem 2: finite-dimensional asymptotic normality of any fixed subvector, covariance diagonal (asymptotic independence as n→∞) under nMh⁷→0.
- Group-inverse diagonal approximation (Theorem 3): max_i‖Ã_.i−A^#_.i‖=O(1/√n), Ã_ii=1/Σ_{j≠i}(1/n)y*_ij — the paper's main technical innovation.
- Assumptions: capability ratios bounded (max π/min π ≤ κ; π_i 3× continuously differentiable); kernel symmetric, nonnegative, ∫K=1, ∫v²K<∞; Mh→∞, h→0; nMh⁷→0 for the CLT.

## 5. Features / target
- Features: binary win/loss outcomes with timestamps only (no margins, no covariates in the base model).
- Target: the latent preference/strength vector π(t) at any time t; derived: pairwise win probabilities with 95% CIs via the asymptotic distribution + delta method.

## 6. Validation design
- Simulations: average normalized RMSE (relative ℓ2) and max relative ℓ∞ error vs truth over 100 replications; KRC vs WMLE (kernel-weighted MLE, Bong et al. 2020, MM algorithm) vs static RC; bandwidth sweep (Fig. 3, h=0.1; Fig. 4 log-log timing).
- Normality check: n=100, M=200, under-smoothed h=0.01; empirical vs theoretical densities (Fig. 5), correlation heatmap (Fig. 6).
- NBA: expanding-base forecasting accuracy on 2016-17/17-18/18-19 seasons; baselines static RC, MLE, WMLE (h=0.1/0.5/1/1.5), FiveThirtyEight Elo.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Table 1 forecasting accuracy (season columns 2016-17 / 2017-18 / 2018-19 / Total): RC 0.6114/0.5732/0.5935/0.5927; KRC(h=0.1) 0.6228/0.6333/0.6341/0.6301; KRC(h=0.5) 0.6301/0.6317/0.6407/0.6341; KRC(h=1) 0.6455/0.6325/0.6366/0.6382; KRC(h=1.5) 0.6301/0.6081/0.6138/0.6173; MLE 0.6179/0.5740/0.5919/0.5946; WMLE(h=0.1) 0.6089/0.6260/0.6358/0.6236; WMLE(h=0.5) 0.6276/0.6260/0.6463/0.6333; WMLE(h=1) 0.6447/0.6236/0.6382/0.6355; WMLE(h=1.5) 0.6341/0.6065/0.6171/0.6192; Elo 0.6309/0.6325/0.6431/0.6355.
- "our method achieved comparable results to Elo and outperformed Elo when h=1 in the average accuracy" (0.6382 vs 0.6355 total) — "This result suggests that season-length data is more informative for estimation and prediction. Note that Elo is a feature-rich method that uses more feature data to adjust the margin of victory than KRC."
- "the KRC method outperforms WMLE for most bandwidths"; static RC "had the worst results in all seasons"; KRC's compute cost "significantly lower than that of the WMLE" with the gap widening in n (Fig. 4).
- Table 2 CIs: e.g., column Warriors over row Rockets 0.51 (0.46, 0.57) — the 2018 champion Warriors' CI vs Rockets contains 0.5 ("the Rockets were a strong opponent"); Celtics over Raptors 0.57 (0.51, 0.63).
- Simulations: "estimation error decreases as M increases or n increases" (Fig. 2); KRC "nearly indistinguishable" from WMLE in error (Fig. 3); empirical densities match theory, pairwise correlations ≈ 0 (Figs. 5–6).

## 8. Code / data availability
No code link stated. NBA data "collected ... from www.nba.com" (no URL to a dataset). Elo baseline: FiveThirtyEight's public NBA Elo page (Silver & Fischer-Baum 2015).

## 9. Leakage & limitations
- Bandwidth h is the whole game: h=1 (season-length smoothing) wins, h=1.5 collapses to 0.6173 — the "beats Elo" headline (0.6382 vs 0.6355, +0.27pp on ~3 seasons) is one bandwidth's margin with no CI on the accuracy differences. Under-smoothing (h=0.1) is worse.
- The comparison flatters KRC by construction: Elo is a one-number-per-team streaming system; KRC refits a full season of kernel-weighted history for each prediction point — more data per prediction, not necessarily a better model.
- Win/loss only: no margin of victory, no injuries, no rest, no covariates. The paper admits MLE degrades when the BT assumption is violated by "injuries, referees, and others" and claims KRC is "more suitable to such data" — but KRC uses strictly less information (no features at all), so this is robustness-by-ignorance, not a real fix.
- Theory needs n→∞, Mh→∞, nMh⁷→0, κ=O(1) bounded capability ratios; real leagues have n=30–32 fixed and heavy tails (tanking teams break the κ bound).
- The CLT requires under-smoothing and ignores the bias term; entrywise CIs assume independence that only holds asymptotically in n.
- Online update stores the full n×n group inverse — O(n²) memory per time point; fine for n=32, not for player-level.

## 10. GSE overlap
Partial overlap, net-new tooling. Per existing-research-map.md: GSE inventories Elo, Glicko, TrueSkill, BT/Plackett-Luce, and state-space ratings, and the ML brief lists state-space team strength. KRC overlaps conceptually with all of these (dynamic BT). What is NEW: (a) a spectral (eigenvector, no optimization) dynamic-strength estimator — nothing in the repo computes ratings via Markov stationary distributions; (b) the exact rank-one online update (Lemma 1/Algorithm 2) for refreshing ratings after each game without refitting; (c) entrywise asymptotic CIs for strength estimates — the repo's rating work does not report per-team uncertainty from a spectral estimator. Modified Glicko-2 (paper 0570) covers Bayesian online updating; KRC is the nonparametric complement.

## 11. GSE implementation spec
- Build a KRC module for NFL weekly power ratings: items = 32 teams; outcomes = game results with game dates; Gaussian kernel, bandwidth selected by walk-forward accuracy (paper's h=1 season-length optimum suggests ~1 season of effective memory; tune on 2015–2025 nflverse).
- Use the stationary distribution π̂(t) as a weekly power-rating vector; convert to win probabilities via the BT link π_j/(π_i+π_j) and compare against the engine's current rating-based probabilities.
- Implement Algorithm 2 (rank-one online update with the group inverse) so ratings refresh after each game in O(n²) without refitting — usable for in-week updates between the engine's batch runs.
- Add margin-of-victory as a future extension only (paper is win/loss; a Kovalchik-style MOV term can be layered on the BT probability).
- Effort: ~2–3 days (transition matrix + power iteration + online update are simple; the tuning/validation harness is the real work).

## 12. Reproducible test
- Dataset: nflverse 2015–2025 regular seasons; expanding-base design mirroring the paper (train on seasons ≤ t−1 plus earlier weeks, predict each game as higher-π̂ team).
- Metrics: winner-prediction accuracy per season and pooled; log-loss of BT-implied win probabilities.
- Baselines: static Rank Centrality, Elo (as the paper used), and the repo's existing dynamic rating (Glicko-2 variant / state-space).

## 13. Acceptance / rejection gate
- ADOPT KRC as a weekly power-rating component if it beats the repo's existing dynamic rating by ≥1.0pp pooled winner accuracy over 2015–2025 AND beats Elo on the same window (mirroring the paper's own bar).
- ADAPT if it matches but doesn't beat — keep the online-update machinery (Algorithm 2) as the fast in-week refresh for the primary rating, since the rank-one update is the most defensible contribution.
- REJECT if it underperforms static RC or Elo on NFL data — the paper's NBA edge may be bandwidth luck.

## 14. Improvement experiment
- Covariate-augmented KRC: weight each game's kernel contribution by a matchup-specific factor (rest differential, QB injury flag, dome/outdoor) — i.e., replace K_h(t,t_k) with K_h(t,t_k)·w(x_k) where w is learned. The paper's future-work section explicitly flags "time-dependent features" as the next step, and its own limitation discussion admits injuries/referees break the BT assumption. Test whether covariate-weighted KRC beats both plain KRC and Elo on the §13 gate — this closes the paper's admitted gap (feature-rich Elo beat featureless KRC in 2 of 3 seasons) while keeping the spectral/online-update advantages.
