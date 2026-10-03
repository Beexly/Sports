# [0573] Static and Dynamic BART for Rank-Order Data (arXiv:2308.10231v5)

**Citation:** Matteo Iacopini, Eoghan O'Neill, Luca Rossini (2023). *Static and Dynamic BART for Rank-Order Data*. arXiv:2308.10231v5. URL: https://arxiv.org/abs/2308.10231v5
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5204 lines).
**Verdict:** ADAPT — the ARROBART dynamic latent-score framework (nonlinear autoregression on latent team strengths with closed-form filtering/smoothing) is directly portable to weekly NFL power-rating dynamics, but port it with nflverse game-level covariates and a plain-Gaussian state-space rather than the paper's pollster-ranker machinery, which has no NFL analogue.

## 1. Research question
Most rank-order models (Thurstone/Plackett-Luce families) assume a linear specification of latent scores and ignore temporal dependence in rankings. The paper asks: can Bayesian Additive Regression Trees (BART) give a nonparametric static model (ROBART) and an autoregressive dynamic model (ARROBART) for rank-order data that capture nonlinear covariate effects and persistent-but-occasionally-jumpy latent scores — and do they forecast better than linear counterparts?

## 2. Dataset / schema
- Simulation: synthetic datasets per Li et al. 2022 designs (3 scenarios × σ ∈ {1,5,10,20,40}, 100 replications; covariates ~ N(0, Σ), Cov(x_l,x_m) = ρ^|l−m|); dynamic simulations: M=5 rankers, N=20 items, T=52 periods, σ ∈ {0.1,0.5,1.0,1.5,2.0}, three nonlinear AR scenarios (γ=0.1z²_{t−1}; 0.05z_{t−1}+0.1z²_{t−1}; 0.1z_{t−1}x_{t−1,1}).
- Real application: 2022 NCAA Division I football AP weekly poll, N=7 teams, M=15 pollsters, T=16 weeks (subset chosen so rankings are full lists). Covariates updated weekly before polls: win percentage, average margin of victory, last-game margin of victory, won-previous-game binary. Sources: collegepolltracker.com and teamrankings.com.
- No public data URL for the assembled poll dataset; Supplement has dataset details.

## 3. Method / model
- Thurstone random-utility base: τ_j = rank(z_j), z_ij = f(X̃_ij) + ε_ij, ε ~ N(0,1) (σ_ε²=1 fixed for identification).
- ROBART (static): f is a BART sum-of-S-trees; covariates can be item-, ranker-, or item/ranker-specific. Likelihood (Eq. 4): product over rankers of N-dimensional Gaussian integrals over the order-constrained region A_t.
- ARROBART (dynamic): z_ij,t = f(X_ij,t) + ε_ij,t with X_ij,t = (z_ij,t−1, x^a_it, x^r_jt, w_ij,t) — lagged latent score plus covariates; the no-covariate special case is X=z_{t−1} only. Interpreted as an HMM with measurement τ_{j,t}|z_{j,t} ~ δ_{rank(z_{j,t})} and transition z_{j,t}|z_{j,t−1} ~ N_N(f(z_{j,t−1}), I_N). ARROBARTX adds exogenous covariates.
- Theorem 1: closed-form filtering p(z_t|τ_{1:t}), one-step-ahead predictive p(z_{t+1}|τ_{1:t}), and smoothing p(z_t|τ_{1:T}) distributions for latent scores — proportional to finite mixtures (Corollary 1) over BART-induced partition regions C_k with time-varying weights q_{k,t} (integrals of truncated Gaussians over order sets A_t).
- Inference: Gibbs sampler — (1) sample latent-score paths element-wise conditional on others (full joint filtering too expensive: Gaussian integrals over tiny ℝ^N subspaces + truncated-Gaussian draws); (2) sample trees via Metropolis-Hastings on partial residuals R_s (standard BART backfitting). Priors: Chipman et al. 2010 defaults (α̲=0.95, β̲=2, uniform split variables/rules, conjugate N(μ_μ, σ²_μ) leaves, response rescaled to [−0.5, 0.5]).

## 4. Equations & assumptions
- BART function (Eq. 1): f(x_i) ≈ Σ_{s=1}^{S} Σ_{ℓ=1}^{b_s} μ_{ℓ,s}·𝟙(x_i ∈ B_{ℓ,s}); tree split rules {x_{ik_h} ≤ c_h}.
- Thurstone latent model (Eq. 2): τ = rank(z), z_i = γ_i + ε_i, ε_i ~ N(0, σ_ε²); identification: σ_ε² = 1; optional constraint 1_N'γ = 0 for coefficient interpretation.
- ROBART (Eq. 3): τ_j = rank(z_j); z_ij = f(X̃_ij) + ε_ij; f = BART.
- ARROBART/ARROBARTX (Eq. 5): τ_{j,t} = rank(z_{j,t}); z_ij,t = f(X_ij,t) + ε_ij,t; X_ij,t = (z_ij,t−1, x^a_{i,t}, x^r_{j,t}, w_{ij,t}); f = BART. No-covariate: X = z_{t−1}.
- Order set (rank constraint): A_t = {z ∈ ℝ^N : z_{j,t} < z_{i,t} ⇔ τ_{j,t} < τ_{i,t} ∀i,j}.
- Theorem 1 filtering (Eq. 7): p(z_t|τ_{1:t}) ∝ 𝟙(z_t ∈ A_t)·Σ_k N_N(z_t|μ̃_k, I_N)·q_{k,t}(A_{1:t−1}); q weights recursive integrals over C_{k,t−1} = C_k ∩ A_{t−1}; predictive (Eq. 8) and smoothing p(z_t|τ_{1:T}) ∝ p(z_t|τ_{1:t})·r_t(z_t) with backward recursion for r_t.
- Kendall tau distance metric (Eq. 12): K_n(τ̂,τ) = #{pairwise disagreements} / (N(N−1)/2) ∈ [0,1].
- Assumptions: rankers independent (M=1 analyzed w.l.o.g.); unit latent-noise variance (identification); one lag (p=1, extendable); tree prior regularization keeps each tree a weak learner; element-wise conditional sampling approximates the joint latent posterior.

## 5. Features / target
- Static: item covariates x^a_i, ranker covariates x^r_j, item×ranker covariates w_ij.
- Dynamic: lagged latent score z_{t−1} plus (in ARROBARTX) time-varying item/ranker covariates; lagged observed ranks in the -lag variants.
- Target: the full ranking list τ_{j,t} at each period; forecasting target is next-period ranks (Kendall tau distance to realized ranks).

## 6. Validation design
- Simulations: 100 replications per (scenario, σ); metric = Kendall tau distance to true ranking, reported as ratio to a Borda-count (static) or ARROBART (dynamic) baseline.
- Real data: out-of-sample forecasting with expanding window, test weeks 12–16 of the 2022 AP poll; models: ROBART/ARROBART/ARROBARTX vs linear counterparts (ROLinear/ARROLinear/ARROLinearX); tree counts 25/25/50 (Supplement robustness: 25/50/75).
- Metric: Kendall tau distance to realized poll ranks, averaged across pollsters and weeks; model comparison by ratios to ARROBART.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Static (Table 1, ratios to Borda; lower better): in Scenarios 2 and 3 (nonlinear), "for any σ, the proposed ROBART model outperforms all the competing models" — Scenario 3 gains "around 10% (for σ=1 or 40) to 27% (for σ=5)"; Scenario 2 gains "10% (for σ equal to 1) to 20% (for σ equal to 5)". In Scenario 1 (linear), "for small values of σ (equal to 1 and 5), the ROBART is outperformed by the BARC and BARCM models, while it beats the other models of 1% and 3% when σ is bigger than 10."
- Dynamic (Table 2, ratios to ARROBART; >1 means benchmark wins): "the ARROBART (ARROBART-lag) benchmark outperforms the competitors in all three scenarios for almost all the noise levels. A few exceptions occur in the presence of an extremely strong signal (σ=0.1)"; ARROBARTX is best in Scenario 3 (exogenous covariates), e.g., ARROBARTX/ARROBART ratios 0.85–0.96 across σ; ARROLinear ratios reach 2.99 (Scenario 1, σ=2.0).
- NCAA poll forecasting (Table 4, average Kendall tau across pollsters/weeks): ARROBART 0.09 (weekly: 0.04, 0.07, 0.09, 0.16, 0.07); all competitors' ratios to ARROBART: ARROBARTX 1.58, ROLinear 2.01, ARROLinearX 2.03, ARROLinear 2.03, ROBART 2.04 — i.e., the plain dynamic-nonlinear ARROBART beats even the covariate-augmented variants. "strong evidence in favor of the ARROBART class of models, both with and without covariates"; "the dynamic models (ARROBART and ARROLinear) outperform the static framework"; Figure 2: ARROBART correctly predicts ranks for several teams (Alabama, USC, Michigan weeks 12–14 better than ARROLinear); posterior predictive densities (Fig. 3) are unimodal with horizon-specific dispersion.

## 8. Code / data availability
Replication code for Li et al. 2022 provided by Xinran Li (acknowledged); no GitHub link stated for the new models. NCAA data from collegepolltracker.com and teamrankings.com; Supplement contains details. (Code availability: none stated for ROBART/ARROBART themselves.)

## 9. Leakage & limitations
- Real-data application is tiny: N=7 teams, 16 weeks, test = 5 weeks — the headline "ARROBART beats everything" rests on 5 weekly forecasts of 7-team lists. No confidence intervals anywhere.
- Pollster rankings are the target — but pollsters are biased humans; forecasting biased human lists is a different task from forecasting game outcomes. The paper never links rankings back to actual game results.
- Covariates available to the model at forecast time were "updated each week before pollsters submit their rankings" — but the pollsters themselves see those same covariates, so there is potential circularity: the model predicts pollsters who react to the same signals.
- ARROBARTX (with covariates) LOSES to plain ARROBART on the real data (1.58 ratio) — the covariates add noise, undermining the "nonlinear covariate effects" story on the only real dataset.
- Computational cost: exact filtering requires integrals over tiny ℝ^N subspaces and is "highly computationally intensive"; the element-wise approximation's accuracy vs exact filtering is not quantified. Scaling to N=32 (NFL) with the mixture representation (K^N components) is infeasible without the approximation.
- Identification via σ_ε²=1 fixes the latent scale — latent scores are not interpretable as win probabilities without calibration.
- BART is sub-optimal at very low noise (σ=0.1) — the paper's own caveat, relevant if applied to clean signals.

## 10. GSE overlap
Extension, not duplicate. Per existing-research-map.md: the ML brief lists state-space team strength and "learning-to-rank" as areas; nested AR(1) team strength (1701.05976) was read in depth and Kalman/particle filters are covered; dynamic Elo is in the gse-lab area. But NO repo work uses BART or any nonparametric latent-score dynamics for team strength, and no work models weekly power-rating evolution as an AR process with nonlinear covariate effects. The closest existing work (Lopez/Baumer AR state-space) is linear-Gaussian; ARROBART's nonlinear AR latent dynamics are a new capability — especially relevant to GSE's weekly power-rating and market-relative learning lanes.

## 11. GSE implementation spec
- Port ARROBART to NFL weekly team strength: latent scores z_{i,t} = true strength of team i in week t; observation = weekly game outcomes (not pollster ranks — replace the rank observation model with a score/margin likelihood: point differential ~ N(z_i − z_j + HFA, σ²_game)); latent AR(1)-BART transition z_{i,t} = f(z_{i,t−1}, covariates) + noise with covariates = injury-adjusted roster value, rest days, EPA/play rolling means from nflverse, FTN charting splits.
- Drop the ranker dimension entirely (M=1, observation = games); use the paper's Theorem-1 filtering/smoothing structure but with the game-outcome measurement model — a BART-state-space hybrid.
- Inference: Gibbs as in the paper (element-wise latent sampling + BART backfitting via dbarts/pybart); start with S=25 trees as in the paper's ARROBART.
- Effort: ~1 week (BART state-space is nontrivial; prototype on 2015–2025 nflverse before touching odds data).

## 12. Reproducible test
- Dataset: nflverse 2015–2025, weekly team games; train through week 11 each season, forecast weeks 12–18 (mirror the paper's weeks-12–16 test design).
- Metric: log-loss of implied win probability derived from filtered latent strengths, plus Kendall τ of weekly strength rankings vs end-of-season SRS.
- Baseline: linear-Gaussian AR(1) state-space (the repo's existing approach family, e.g., Lopez/Baumer-style dynamic strength) with the same covariates.

## 13. Acceptance / rejection gate
- ADOPT the BART-dynamic strength model if it beats the linear AR baseline by ≥0.003 mean log-loss on weeks 12–18, 2015–2025 pooled, AND wins Kendall τ vs end-of-season SRS in ≥6 of 10 seasons.
- ADAPT if it wins on only one metric — keep as an ensemble component (average with linear state-space) rather than the primary model.
- REJECT if it loses on both — the paper's simulation wins don't survive NFL data.

## 14. Improvement experiment
- Replace the paper's p=1 AR with a regime-switching BART transition: f_regime(z_{t−1}, covariates) where regime ∈ {stable, shock} is a latent binary state triggered by QB injury / coaching change indicators. The paper's Figure 1 motivates this (small persistent changes punctuated by large breaks from injuries), but the paper's smooth BART-AR cannot produce the bimodal jump behavior cleanly. Test whether the regime-switching variant beats plain ARROBART on the §13 gate — this directly targets the paper's own motivating observation about sports ranking dynamics.
