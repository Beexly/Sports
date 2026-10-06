# [1126] Causal-ICM: Multi-task Gaussian Processes for Combining RCT and Observational Data (arXiv:2405.20957)

**Citation:** Dimitriou, E., Fong, E., Tarp, A., Diaz-Ordaz, K., & Lehmann, J. (2024). *Causal-ICM: Multi-task Gaussian Processes for Combining RCT and Observational Data*. arXiv:2405.20957v3. URL: https://arxiv.org/abs/2405.20957
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections incl. appendices G–K).
**Verdict:** ADAPT — the ρ-controlled experimental/observational GP fusion gives GSE a principled way to combine a small trusted evidence source with larger biased historical data while quantifying, not hiding, the uncertainty from borrowing.

## 1. Research question
How can we combine a small randomized trial (unconfounded but tiny coverage) with a large observational study (rich coverage but hidden confounding) to estimate the conditional average treatment effect (CATE), controlling how much information is borrowed from the biased source? The paper proposes a rank-2 intrinsic coregionalization model (ICM) whose single borrowing parameter ρ ∈ (0,1) governs the trade-off between efficiency gain and bias contamination.

## 2. Dataset / schema
- Simulations: two univariate settings (nonlinear CATE + nonlinear confounding), two multivariate settings (5 baseline covariates Xⱼ ∼ U[−2,2], j=1…5; trial participation S ∼ Bernoulli(pS) with logit pS = −10 − 8X1 − 8X2; treatment A ∼ Bernoulli(0.5) in trial; observational propensity logit e(X) = −(X1+X2); hidden confounding U ∼ N((2A−1)(X1+X2), 1) [setting 1] or U ∼ N((2A−1)(sin X1 + sin X2), 1) [setting 2]). Simulation scale per the main text: roughly 200–300 RCT observations and ~1,000 observational observations.
- Real data: Tennessee STAR class-size study — 422 unconfounded (randomized) observations, 2,593 confounded (observational) observations, 379 held-out validation observations. Task: estimate effect of small classes on test scores (continuous outcome).

## 3. Method / model
Rank-2 ICM multi-task GP. Experimental latent function fᵉ(x) = u₁(x); observational latent function fᵒ(x) = ρfᵉ(x) + √(1−ρ²)u₂(x), where u₁, u₂ are independent zero-mean GPs with a shared base kernel k. Shared kernel across tasks; ρ ∈ (0,1) controls information borrowing. ρ is selected by five-fold cross-validation over the grid {0.0, 0.1, …, 1.0}, minimizing a weighted held-out RCT error. Posterior for fᵉ (and hence CATE τ(x)) is available in closed form, including a posterior distribution for the hidden confounding function η(x) = fᵉ(x) − fᵒ(x).
Baselines: experimental-only GP (GP exp), observational-only GP (GP obs), "experimental grounding" GP of Kallus et al. (2018), Integrative HTE, Power Likelihood (Lin et al. 2025), RF, XGB T-learner variants.

## 4. Equations & assumptions
- fᵉ(x) = u₁(x); fᵒ(x) = ρfᵉ(x) + √(1−ρ²)u₂(x); u₁, u₂ ∼ GP(0, k), independent; ρ ∈ (0,1).
- Posterior variance lower bound (proven in Appendix F): Vᵉ(x*) ≥ (1−ρ²)·Vᵉ_De(x*), where Vᵉ_De is the variance conditional on the experimental data Dᵉ = (Xᵉ, yᵉ) only. Interpretation: borrowing can only shrink uncertainty by at most a factor tied to ρ; the proof shows a matrix C = A⁻¹ + BA⁻¹B is positive definite.
- Confounding function posterior: η(x*) | X, y ∼ N(mᵉ(x*) − mᵒ(x*), Vη(x*)), with Vη expressed via (βᵉ + βᵒ − 2βᵉᵒ) and (1−ρ) terms (Appendix G.1).
- Finite-sample false-information guarantee for the discrete analogue is not given; the continuous theory is the variance bound above.
- Assumptions: standard multi-task GP assumptions (shared latent structure), selection of ρ by RCT held-out error (requires some experimental holdout), common kernel across tasks.

## 5. Features / target
Input features: baseline covariates (simulated X or STAR student/school covariates). Target: individual potential outcomes Y(a); derived target is the CATE τ(x) = E[Y(1)−Y(0) | X=x]. Tennessee STAR: outcome = test scores; treatment = small class assignment.

## 6. Validation design
- Simulations: 100 simulated datasets per setting; RMSE of estimated CATE against ground truth. Main univariate setting 2 (nonlinear CATE + nonlinear confounding).
- ρ selected by five-fold CV minimizing weighted held-out RCT error.
- Real data: 379 held-out validation observations; RMSE on validation.
- Sensitivity sweeps (Appendix J): ρ ∈ {0.0,…,1.0}, kernels (RBF, Matérn 3/2, Matérn 5/2), observational sample size 200–2000, full/high/low RCT–observational overlap, in- vs out-of-support MSE.
- Baselines listed in §3; comparisons are against exact-paper figures (see §7).

## 7. Numerical results / baselines
- Tennessee STAR validation RMSE: Causal-ICM **6.29**; experimental GP 6.36; observational GP 7.47; experimental grounding GP 6.38; RF 6.27; Integrative HTE 11.84. (RF is essentially tied with Causal-ICM on this dataset; paper's claim is about robustness under misspecification, not a clean STAR win.)
- Multivariate setting 2 under model misspecification (Table 2, mean RMSE (SD)): Causal-ICM 2.586 (1.513) vs GP exp 3.422 (2.186), GP obs 3.580 (0.796), experimental grounding 3.582 (1.713), Integrative HTE 21.883 (3.330).
- Observational-sample-size sweep (Table 5, setting 2, RMSE): at n_obs=2000, Causal-ICM 0.934 (0.674) vs Integrative HTE 1.576 (0.318), power likelihood 1.161 (0.606), experimental grounding 1.660 (0.443), GP obs 1.377 (0.062) — Causal-ICM *improves* as observational data grows while Integrative HTE degrades.
- Out-of-support (Table 7): Causal-ICM MSE 1.071 (0.722) outside RCT support vs Integrative HTE 3.153 (0.919), Kallus GP 43.461 (42.069); in-support Causal-ICM 0.252 (0.099), best of all methods.
- ρ sensitivity (Table 3): RMSE minimized near ρ=0.8 (0.305), rising at ρ=1.0 (1.095) where confounding is no longer absorbed; kernels: RBF 0.822 (0.651) beats Matérn variants.
- Runtime (Table 8, setting 2): Causal-ICM mean 4.56 s vs Integrative HTE 6.01 s (100 datasets; cubic GP scaling noted, inducing-point approximations suggested for scale).

## 8. Code / data availability
Code: https://github.com/EvanDimitriou/CausalICM (stated in paper). Data: simulations generated per Appendix H formulas; Tennessee STAR is a public dataset (Project STAR).

## 9. Leakage & limitations
- ρ is tuned on held-out RCT error, so ρ selection consumes experimental data; with tiny RCTs the CV estimate is noisy — the paper shows it works at n≈200–300 but does not explore n<100.
- Rank-2 ICM with a single ρ is a strong structural assumption: one global borrowing parameter cannot represent confounding that varies spatially (confounding strong in some covariate regions, absent in others).
- GP cubic scaling; the method as presented does not scale to nflverse-scale row counts without inducing points.
- Tennessee STAR result is effectively a tie with plain RF (6.29 vs 6.27) — the headline advantage is robustness under misspecification, demonstrated in simulation, not a real-data win.
- The variance bound is a guarantee on the posterior's own uncertainty, not a finite-sample coverage guarantee for τ(x).

## 10. GSE overlap
New capability. The existing-research map lists causal inference as an ML-brief topic (area 10) with no coregionalization or RCT+observational fusion work in-repo; FineCausal (2503.23911) is in the Drive dossiers but addresses fine-grained causality, not multi-source fusion. Repo greps for "coregionalization" return only assignment files — nothing implemented. This would be the first repo method for *principled borrowing from biased data*, which is exactly GSE's situation: a small set of verified/settled engine outcomes plus a much larger history of model outputs of varying quality.

## 11. GSE implementation spec
- Build a two-source GP (or sparse-GP) module: source A = GSE's own verified pick outcomes (small, trusted, post-hoc verified — GSE's picks DB); source B = large historical model outputs (biased: stale, miscalibrated eras). Shared RBF kernel on game-state covariates (spread, total, rest, weather); single global ρ first, then region-specific ρ via a second ICM factor if warranted.
- Use gpytorch with inducing points (≤500) to handle ~10k rows. ρ grid {0.1,…,0.9} via rolling-origin time-split CV on source-A outcomes only (never tune ρ on source B — that reintroduces the confounding the parameter is meant to absorb).
- Output per-pick: posterior mean edge and the bound-inflated posterior variance → feed into calibration (Venn-Abers/isotonic) and Kelly sizing rather than point picks.
- Effort: 1–2 weeks for a prototype on one market (spread), plus backtest harness.

## 12. Reproducible test
Dataset: GSE picks DB (picks table, model v5.2.7, SPREAD only) 2024–2025 seasons as source A; all historical engine predictions as source B. Metric: out-of-sample log-loss/Brier of the Causal-ICM edge estimate vs (a) source-A-only GP, (b) pooled GP, on 2026 holdout weeks. Baselines to beat: pooled GP Brier and the current engine's Brier; require the ICM to beat pooled-GP by ≥0.005 Brier *and* show smaller performance degradation in the out-of-support slice (games with line/total outside source-A's historical range) before any sizing use.

## 13. Acceptance / rejection gate
ADOPT if: on the 2026 holdout, Causal-ICM beats pooled-GP Brier by ≥0.005 on all picks AND by ≥0.01 on the out-of-support slice, with ρ̂ selected by rolling CV stable across folds (SD of ρ̂ ≤ 0.15). REJECT if ρ̂ collapses to ≈0 or ≈1 (borrowing does nothing or confounds everything), or if any baseline (pooled GP or engine) beats it on total Brier — then keep the simpler model.

## 14. Improvement experiment
Region-adaptive ρ: replace the single global ρ with ρ(x) = sigmoid(g(x)) where g is a second GP or linear model on covariates, so borrowing shrinks where source B is known to be unreliable (e.g., stale-rating eras, weather-affected totals). Compare against global-ρ Causal-ICM on the out-of-support slice; hypothesis: adaptive ρ keeps the Table-5/7 advantage while eliminating the residual bias that made plain RF tie it on STAR.
