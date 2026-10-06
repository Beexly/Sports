# [0516] Approximate nonparametric maximum likelihood inference for mixture models via convex optimization (arXiv:1606.02011v3)

**Citation:** Long Feng and Lee H. Dicker (Rutgers). *Approximate nonparametric maximum likelihood inference for mixture models via convex optimization*. Computational Statistics & Data Analysis (journal version). arXiv:1606.02011v3. URL: https://arxiv.org/abs/1606.02011v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 10 sections / ~70,000 chars).
**Verdict:** ADAPT — the machinery (grid-based approximate NPMLE via convex optimization) transfers directly to GSE's empirical-Bayes shrinkage of noisy per-player / per-team latent parameters, replacing parametric hierarchical assumptions; the paper is pure statistics, not a sports prediction model.

## 1. Research question
Can nonparametric maximum likelihood estimation (NPML / Kiefer–Wolfowitz) for mixture models with *multivariate* mixing distributions be made practical — scalable, easy to implement, and theoretically supported — by approximating the infinite-dimensional convex problem with a finite-dimensional convex problem on a pre-specified grid, and does the multivariate version beat univariate NPML and classical shrinkage in real applications?

## 2. Dataset / schema
Three real applications plus Gaussian location-scale simulations (p=1000 units, n=16 replicates; mixing dist. 1: σ fixed at 4, P(μ=0)=P(μ=5)=1/2; mixing dist. 2: correlated (μ,σ) with P(μ=0,σ=5)=P(μ=5,σ=3)=0.5):
- Baseball: 2005 MLB season, 929 players → 567 with >10 first-half AB (train), 499 with >10 second-half AB (test); per player (A_j, H_j) = (at-bats, hits), first half predicts second half.
- Microarray (MAQC-II): breast cancer (n=130 train / 100 test subjects, p=22,283 probesets; outcomes Response, ER status) and myeloma (n=340 train / 214 test, p=54,675 probesets; outcomes OS, EFS). Expression X_ij standardized to variance 1.
- Diabetes CGM: 137 type-1 patients, ~6 months each; ISIG (5-min sensor current) and fingerstick FS (~4/day, ground truth). First half of each subject's data fits, second half tests.

## 3. Method / model
- Approximate NPMLE: replace Ĝ = argmin_{G∈𝔾_𝒯} ℓ(G) (infinite-dim, convex) with Ĝ_Λ = argmin_{G∈𝔾_Λ} ℓ(G) on a finite grid Λ={t_1..t_q}, equivalent to the convex simplex problem min_{w∈Δ^{q−1}} −(1/p)Σ_j log{Σ_k f_0(X_j|t_k) w_k}. Keeps convexity (vs. nonconvex finite-mixture EM with free atoms).
- Proposition 1 (main theory): if f_0(X_j|θ) = h{(θ̂_j−θ)ᵀΣ^{−1}(θ̂_j−θ)}u(X_j) with h decreasing (elliptical unimodal class), the NPMLE support is contained in conv(θ̂_1..θ̂_p) — so Λ = regular grid inside the convex hull of per-unit MLEs is sufficient. Canonically: X_j|Θ_j ~ N(Θ_j,Σ), θ̂_j = X_j.
- Algorithms compared: EM, interior point (Rmosek primal; REBayes dual via Mosek), Frank–Wolfe/vertex-direction. Conclusion: use EM (best simplicity/performance balance); interior point slightly better log-lik and faster; Frank–Wolfe fastest but much worse TSE/log-lik. Results insensitive to grid density (30² vs 50² vs 100²).
- Applications: (i) Baseball Poisson–binomial mixture: A_j|(λ_j,π_j) ~ Poisson(λ_j), H_j|(A_j,λ_j,π_j) ~ Binomial(A_j,π_j), (λ_j,π_j) ~ G_0 (bivariate), grid 30², predict second-half average via posterior mean π̂_j = E_{Ĝ_Λ}(π_j|A_j,H_j). (ii) Microarray: bivariate Θ_j=(μ_j0,μ_j1) per gene across classes, 2d-NPMLE plugged into Bayes classifier. (iii) CGM: linear model FS_j(t)=μ_j+β_j ISIG_j(t)+σ_j ε (3-dim Θ_j={μ_j,β_j,log σ_j}) and Kalman state-space FS_j(t_i)=α_j(t_i)ISIG_j(t_i)+σ_j ε, α_j(t_i)=α_j(t_{i−1})+τ_j δ (2-dim Θ_j={log τ_j, log σ_j}); parameters posterior-averaged under Ĝ_Λ then filtered.

## 4. Equations & assumptions
Stated equations (copied faithfully):
- Eq. 2 (Kiefer–Wolfowitz): Ĝ = argmin_{G∈𝔾_𝒯} ℓ(G), ℓ(G) = −(1/p)Σ_j log{∫_𝒯 f_0(X_j|θ)dG(θ)}.
- Eq. 4/6 (approximation): Ĝ_Λ = argmin_{G∈𝔾_Λ} ℓ(G) ⇔ min_{w∈Δ^{q−1}} −(1/p)Σ_{j=1}^p log{Σ_{k=1}^q f_0(X_j|t_k) w_k}.
- Eq. 8 (support condition): f_0(X_j|θ) = h{(θ̂_j−θ)ᵀΣ^{−1}(θ̂_j−θ)} u(X_j), θ̂_j = argmax_θ f_0(X_j|θ).
- Eq. 10: π̂_j = ∫π_j f_0(A_j,H_j|λ_j,π_j)dĜ_Λ / ∫f_0(A_j,H_j|λ_j,π_j)dĜ_Λ.
- Eq. 12: FS_j(t) = μ_j + β_j ISIG_j(t) + σ_j ε_j(t). Eq. 13 (state space): FS_j(t_i) = α_j(t_i)ISIG_j(t_i) + σ_j ε_j(t_{i−1}); α_j(t_i) = α_j(t_{i−1}) + τ_j δ_j(t_{i−1}).
Stated assumptions: (a) F_0(·|θ) known, G_0 unknown; (b) X_j iid given Θ_j iid ~ G_0; (c) grid "dense enough" that Ĝ_Λ ≈ Ĝ; (d) for the convex-hull construction, elliptical-unimodal likelihood (exactly: Gaussian location; approximately: count data, large-n MLEs); (e) TSE metric with the arcsin variance-stabilizing transform (baseball) is the right yardstick; (f) gene independence ("naive Bayes" assumption, acknowledged false) for the classifier.

## 5. Features / target
- Per-unit observation vectors X_j (replicates); latent unit parameters Θ_j ~ G_0 (the object of inference). No hand features — the "feature" is the per-unit MLE θ̂_j and the learned population prior Ĝ_Λ.
- Targets: second-half batting average (baseball); binary class labels (microarray); fingerstick glucose values (CGM).

## 6. Validation design
- Simulations: 100 independent datasets, p=1000, n=16; metrics = TSE of posterior-mean μ̂_j, Δ(log-lik) vs EM baseline, wall-clock on a 2015 MacBook Pro.
- Baseball: first-half → second-half temporal split (499 players); TSE relative to fixed-MLE = 1.0; vs grand mean, James–Stein, weighted GMLE (univariate NPMLE w/ covariates), semiparametric SURE, Muralidharan binomial mixture.
- Microarray: fixed train/test (MAQC-II); metric = test misclassification count; vs 1d-NPMLE, NP-EBayes w/ smoothing, regularized LDA, logistic lasso.
- CGM: per-subject first-half fit / second-half test; metric = MSE relative to proprietary CGM estimator (=1.0); combined vs individual vs NPMLE-mixture for both models.

## 7. Numerical results / baselines
- Simulations (Table 1): EM vs interior point nearly identical TSE (e.g., dist.1 130.5 vs 130.7); interior point slightly better Δlog-lik (+6..11 ×10⁻⁴) and faster (8s vs 9s at 30²; 80s vs 136s at 100²); Frank–Wolfe far worse (TSE 147.3, Δlog-lik −234). Insensitive to grid (30²/50²/100²).
- Table 2 (TSE, mean of 100 runs): bivariate NPMLE 130.4 (dist.1) / 53.9 (dist.2) vs univariate NPMLE 170.7 / 285.4 vs James–Stein 859.7 / 935.2 vs SURE 859.7 / 880.7 vs soft-thresholding 826.2 / 793.7 vs fixed MLE 997.0 / 1059.3 — NPMLE dominates; bivariate advantage largest when (μ,σ) correlated.
- Baseball (Table 3, TSE relative to MLE): NPMLE 0.29 (all) / 0.26 (pitchers) / 0.14 (non-pitchers) — best on all and non-pitchers, tied-best on pitchers (GMLE 0.30/0.26/0.14); James–Stein 0.54/0.35/0.17; grand mean 0.85/0.38/0.13. Estimated mixture is bimodal (pitcher/non-pitcher modes discovered, not imposed).
- Microarray (Table 4, test errors): 2d-NPMLE 15/19/30/34 vs 1d-NPMLE 36/40/55/76 vs logistic lasso 18/11/27/32 — 2d crushes 1d, competitive with the best.
- CGM (Table 5, MSE rel. to CGM): linear — combined 1.56 / individual 1.54 / NPMLE 1.51; Kalman — combined 1.05 / individual 1.07 / NPMLE 1.03. NPMLE-mixture wins within each model class; all >1 (proprietary CGM still best — it uses extra undisclosed data).

## 8. Code / data availability
R implementations (base R for EM/Frank–Wolfe; REBayes/Rmosek for interior point); not packaged by the authors beyond the paper's description — no GitHub link stated. Datasets are public benchmarks (MLB 2005 via Brown 2008; MAQC-II; Hirsch et al. 2008 CGM study).

## 9. Leakage & limitations
- The baseball and CGM splits are honest (first-half → second-half), but all applications are retrospective; the simulations use known-true G_0.
- Proposition 1's elliptical condition is "rather restrictive" (authors' words); grid construction for non-elliptical likelihoods is heuristic.
- Grid cost: 30^d explodes in d (d=3 → 27,000 points × p likelihood evals); the paper stops at d=3.
- NPMLE gives no cluster interpretability (atoms are a means to an end); discrete Ĝ_Λ with many tiny atoms can be unstable as a "population story," though posterior means are stable.
- Gene-independence assumption in the classifier is knowingly false; CGM results still lose to the proprietary estimator (1.03 vs 1.0).
- No uncertainty quantification on Ĝ_Λ itself; no comparison to modern variational/parametric hierarchical Bayes.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. The map covers ML model families (trees, nets, Elo, GPs, state-space) but its shrinkage/empirical-Bayes coverage is thin — the closest relatives are hierarchical-model mentions in existing team-strength work, not a nonparametric-EB layer. The paper's baseball application is the canonical sports use of exactly this machinery (predicting second-half batting average from first-half data), which maps 1:1 onto GSE's per-player and per-team parameter estimation. No duplication; the technique is a new primitive for the GSE toolbox, not a competing model.

## 11. GSE implementation spec
- Use case: shrink noisy short-season per-unit estimates toward the learned population prior. Concrete first target: per-QB / per-skill-player efficiency parameters (e.g., CPOE, EPA/play, yards/route) estimated from few games, and per-team pace/offensive parameters — replace parametric (Gaussian) hierarchical priors with a data-driven Ĝ_Λ.
- Recipe: for each unit j (player/team), compute MLE θ̂_j (and, where applicable, a noise scale) from game-level replicates; form Λ = regular grid (start 30^d, d=2: e.g., (latent mean, latent noise)) inside conv(θ̂_j); solve Eq. 6 by EM (simple, base-R/base-Python implementable; interior point via cvxpy/ECOS for speed); predict via posterior means under Ĝ_Λ.
- Correlated-dimension win: jointly model (mean, variance) per unit — the paper's Table 2 shows the bivariate version beats univariate most when mean and noise are correlated, which is exactly the sports case (high-usage players have noisier per-game estimates).
- Stack: use shrunk posterior means as features or as priors inside the existing GSE engine, not as standalone predictors.
- Estimated effort: ~1 week for a Python (cvxpy) reimplementation + first-half→second-half NFL test.

## 12. Reproducible test
Dataset: NFL 2015–2024 play-by-play (nflverse), per-QB EPA/dropback and per-team offensive EPA/play. Protocol: first-half-of-season → second-half-of-season prediction of the same unit-level quantity, seasons 2016–2024. Metric: MSE of the unit estimate vs second-half realized value (relative to the raw first-half MLE = 1.0). Baselines: raw MLE, James–Stein, parametric Gaussian hierarchical Bayes. Also run the d=2 (mean, noise) vs d=1 ablation to confirm the correlated-dimension advantage on football data.

## 13. Acceptance / rejection gate
ADOPT as a GSE shrinkage layer if bivariate NPMLE beats both raw MLE and parametric hierarchical Bayes on the 2016–2024 first-half→second-half test with relative MSE ≤ 0.95 of the parametric-HB baseline in at least two of the three target families (QB efficiency, skill-player efficiency, team offense); REJECT if it cannot beat James–Stein on any target (technique adds complexity without gain) or if grid/EM compute exceeds ~10 min per weekly refit on available hardware.

## 14. Improvement experiment
Extend beyond the paper by making the mixing distribution *conditional*: learn Ĝ_Λ(θ | context) where context = opponent strength, game script, or weather bucket — i.e., a covariate-dependent NPMLE via a separate grid per context stratum with shared shrinkage. Hypothesis: the population prior for QB efficiency differs by opponent-tier, and context-conditioned EB shrinkage will beat the paper's single global prior on second-half prediction. This turns a static statistical primitive into a matchup-aware GSE component, which the paper never attempts.
