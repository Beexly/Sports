# [0559] Convergence Rate of Efficient MCMC with Ancillarity-Sufficiency Interweaving Strategy for Panel Data Models (arXiv:2507.18404)

**Citation:** Nakakita, M., Toyabe, T., Nakatsuma, T., & Hoshino, T. (2026). *Convergence Rate of Efficient MCMC with Ancillarity-Sufficiency Interweaving Strategy for Panel Data Models*. arXiv:2507.18404. URL: https://arxiv.org/abs/2507.18404
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3813 lines).
**Verdict:** ADAPT — the SA/AA decision rule (Corollary 1) and the ASIS sampler design are worth porting to GSE's Bayesian hierarchical team-strength fitting; the panel-Gaussian setting transfers, but the theory covers only the global mean and a linear Gaussian model, so it is an engineering input to MCMC sampler choice, not a modeling result.

## 1. Research question
Which MCMC data-augmentation parameterization converges faster for a Bayesian hierarchical panel model — sufficient augmentation (centered) or ancillary augmentation (non-centered) — and can the ancillarity–sufficiency interweaving strategy (ASIS) be shown to mix optimally? The paper gives the first rigorous convergence theory for ASIS in panel models.

## 2. Dataset / schema
- Simulation: synthetic panels at (N, T) = (10,10), (10,100), (500,10), (500,100); three variance-ratio patterns per configuration; 10,000 MCMC iterations, 1,000 burn-in, results averaged over 100 independent runs.
- Real data: U.S. "Cigarette" panel dataset (Baltagi & Levin 1986; popularized by Baltagi) — 48 states × 11 years; outcome per-capita cigarette-pack consumption; covariates real per-capita income, average retail price per pack (incl. sales taxes), average excise tax per pack. Publicly available in R and Stata.
- No sports data.

## 3. Method / model
Gibbs sampler with data augmentation for the panel model y_it = α_i + ε_it, α_i ~ N(μ_α, σ_α²), ε_it ~ N(0, σ_ε²), with prior μ_α ~ N(φ_α, τ_α²) and known variances. Two parameterizations: SA (centered; draws α_i then μ_α | α) and AA (non-centered; draws deviation α̃_i = α_i − μ_α then μ_α | α̃). ASIS (Yu & Meng 2011) interweaves both: SA→AA and AA→SA sweeps within each iteration. Closed-form Gaussian full conditionals; asymptotic analysis of the induced AR(1) Markov process for μ_α under each scheme.

## 4. Equations & assumptions
Key results, copied faithfully:
- SA: y_it = α_i + ε_it, α_i ~ N(μ_α, σ_α²) — eq. (1). AA: y_it = μ_α + α̃_i + ε_it, α̃_i ~ N(0, σ_α²) — eq. (2).
- Theorem 1: the SA and AA geometric rates satisfy (σ_ε⁻²T)/(σ_ε⁻²T + σ_α⁻²) + (σ_α⁻²)/(σ_ε⁻²T + σ_α⁻²) = 1 — i.e., if one scheme mixes well, the other necessarily mixes poorly (eq. 15).
- Corollary 1: SA converges faster if σ_ε² < σ_α²T; AA converges faster if σ_ε² > σ_α²T (eq. 16).
- Theorem 2: under SA→AA and AA→SA ASIS, {μ_α^(r)} is approximately an IID sequence when τ_α²N is sufficiently large (latent effects decouple from the global mean).
- Assumptions: Gaussian likelihood, known variances σ_ε² and σ_α², τ_α²N → ∞ (diffuse prior on the global mean), linear model with only individual effects (covariates partialed out as in the cigarette-data application). Authors note non-Gaussian extensions (panel logit/probit) as future work.

## 5. Features / target
Methodology paper — no features. Target in the real-data demo: per-capita cigarette-pack consumption, modeled with covariates partialed out.

## 6. Validation design
Synthetic simulations across the 4 (N,T) configurations × 3 variance patterns (Table 1–4), metric = Monte Carlo standard error (MCSE) of μ_α. ACF plots of μ_α (Figs. 3–6) compare SA/AA/ASIS. Real-data validation on the cigarette panel (48 states × 11 years; MCSE Table 5, ACF Fig. 7). No held-out predictive validation and no external baselines — the comparison is between samplers of the same posterior.

## 7. Numerical results / baselines
MCSE of μ_α (×10⁻⁵, smaller better; bold = best in paper):
- Table 1 (N=10, T=10): Pattern 1 (σ_ε,σ_α)=(1,1): SA 2.980, AA 6.178, ASIS 2.427. Pattern 2 (10,1): SA 56.286, AA 17.057, ASIS 13.716. Pattern 3 (√10,1): SA 9.644, AA 14.399, ASIS 6.697.
- Table 2 (N=10, T=100): Pattern 1 (√10,1): SA 3.255, AA 8.587, ASIS 2.877. Pattern 2 (√1000,1): SA 53.828, AA 17.665, ASIS 13.781. Pattern 3 (10,1): SA 9.221, AA 13.949, ASIS 6.589.
- Table 3 (N=500, T=10): Pattern 1: SA 0.600, AA 2.279, ASIS 0.567. Pattern 2: SA 10.496, AA 1.753, ASIS 1.722. Pattern 3: SA 1.192, AA 1.126, ASIS 0.738.
- Table 4 (N=500, T=100): Pattern 1: SA 0.618, AA 2.379, ASIS 0.585. Pattern 2: SA 8.815, AA 1.813, ASIS 1.733. Pattern 3: SA 1.169, AA 1.168, ASIS 0.744.
- Table 5, cigarette data (×10⁻³): SA 8.673, AA 8.232, ASIS 3.072.
In every setting ASIS has the lowest MCSE; the SA-vs-AA ordering always matches Corollary 1. ACF under ASIS decays markedly faster than either single scheme. (Interpretation mine: the largest gains accrue to the badly-matched scheme; e.g., N=10/T=10 Pattern 2, SA MCSE is ~4× ASIS.)

## 8. Code / data availability
None stated for the code. Data: the cigarette panel is public (R `plm`/`Ecdat` and Stata), which the authors cite as making the demo fully replicable.

## 9. Leakage & limitations
Adversarial notes: (a) the theory is for a Gaussian random-effects-only model with known variances — GSE's hierarchical models are logistic (win prob), Poisson/NB (scores), and non-linear, for which the exact rate results do not hold; (b) the τ_α²N → ∞ asymptotic is a diffuse-prior limit, and real Bayesian workflows with informative shrinkage priors violate it; (c) gains are only about sampling efficiency, not about predictive accuracy — posterior draws of team strengths are identical targets, so "leakage" in the predictive sense does not apply, but a poorly-mixing sampler producing under-dispersed chains could masquerade as converged (the ACF diagnostic point is genuine); (d) ASIS roughly doubles per-iteration work versus a single parameterization, so wall-clock wins are smaller than MCSE ratios suggest; (e) one of the cited sports applications (Nakakita & Nakatsuma 2023, racehorse running ability) is the authors' own prior work, not independent confirmation of sports-domain transfer.

## 10. GSE overlap
Extension, not duplicate. GSE's state-space/dynamics lane covers Kalman filters, particle filters, dynamic Elo, nested AR(1) team strength (1701.05976), and hierarchical pooling (ML brief area 2), but the existing-research map shows no MCMC sampler-efficiency work and no centered-vs-non-centered parameterization guidance. The corpus has Bayesian calibration work (CQR, grouping loss) but nothing on how to *fit* hierarchical Bayesian models faster. This paper's Corollary 1 is directly actionable for GSE's hierarchical models (team strength, opponent adjustment, player-level random effects).

## 11. GSE implementation spec
For any GSE Bayesian hierarchical model with team-level random effects (e.g., opponent-adjusted EPA team strength, QB random effects in player models):
1. Estimate the variance ratio: fit once to get posterior medians of noise variance σ_ε² vs group-level variance σ_α²; compute σ_ε² vs σ_α²T with T = observations per team-season.
2. Per Corollary 1: if σ_ε² < σ_α²T, start from SA (centered); if σ_ε² > σ_α²T, start from AA (non-centered).
3. Implement ASIS interweaving in the GSE sampler (e.g., in a NumPyro/Stan-style or hand-rolled Gibbs loop) so the global intercept/mean mixes near-IID; add the cheap deterministic moves (α̃_i = α_i − μ_α and back) between sweeps.
4. Monitor with ACF plots and MCSE / effective sample size of the global parameters; gate convergence on R̂ < 1.01 plus min ESS.
5. Estimated effort: 1–2 days for a Gaussian team-strength prototype; the port to GSE's logistic/Poisson models needs sampler re-derivation — treat as a research task, not drop-in.

## 12. Reproducible test
Dataset: the public cigarette panel (48 states × 11 years, available in R via `Ecdat::Cigarette` or Stata), or the paper's simulation setup at (N,T)=(10,10) Pattern 1 and Pattern 2. Metric: MCSE of the global mean μ_α over 10,000 post-burn-in draws, averaged over ≥20 independent runs. Baseline: the single best-matched scheme per Corollary 1 (SA in Pattern 1, AA in Pattern 2). Test: reproduce the paper's ordering (ASIS MCSE ≤ min(SA, AA) MCSE in all 12 settings, and the SA/AA ordering matching Corollary 1 in all 12).

## 13. Acceptance / rejection gate
Adopt the ASIS interweaving into GSE's hierarchical sampler stack if a local re-implementation reproduces ASIS MCSE ≤ best-single-scheme MCSE in at least 10 of the 12 paper settings AND the Corollary 1 ordering holds in all 12. Reject as a GSE build input if ASIS fails to beat the single scheme in >2 settings (then the result is too fragile for porting to non-Gaussian models).

## 14. Improvement experiment
Extend Corollary 1 to a generalized-linear panel (e.g., binomial/probit win-outcome model, the actual GSE case): derive the SA/AA AR(1) rates under a Laplace-approximated working precision, test whether σ_ε² vs σ_α²T is replaced by a working-residual-variance analogue, and check if ASIS still yields near-IID global means — this is exactly the "nonGaussian extensions" the authors list as future work and would make the technique production-ready for GSE's logistic team-strength models.
