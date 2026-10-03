# [1125] Assumption-Lean Quantile Regression via Efficient Influence Functions (arXiv:2404.10495v2)

**Citation:** (authors as listed on arXiv). *Assumption-Lean Quantile Regression via Efficient Influence Functions* (title as listed; the paper develops model-free conditional-association estimands for quantile regression with DML/TMLE estimation). arXiv:2404.10495v2. URL: https://arxiv.org/abs/2404.10495v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; full main paper through discussion plus Appendix A read).
**Verdict:** ADAPT — the model-free quantile-association estimand with cross-fitted TMLE is the rigorous way to do GSE's distributional player/prop analysis (what the median and tail effects *are*, not what a linear quantile model assumes); adopt with the paper's nuisance-rate conditions and extreme-quantile caution. Distinct from existing ALQR-adjacent ledgers 1075/1088/1089 (conditional-causal/DML estimand, not plain quantile methods).

## 1. Research question
How do we do valid inference on quantile treatment/association effects **without assuming the quantile model is correct**? The paper defines a partially linear quantile model Qτ(Y|A,L) = βτA + ωτ(L) but maps it to a **model-free conditional-association estimand** Ψτ, derives its efficient influence function, and builds cross-fitted DML and TMLE estimators with honest confidence intervals.

## 2. Dataset / schema
- **Simulations:** experiments 1–2, settings varying n (500+) and τ; naive plug-in vs cross-fitted DML vs TMLE compared on bias and coverage.
- **Application:** **3,925 Belgian participants**; exposure = excess weight; outcome = health-care costs; estimates at the median and 90th percentile.
- Access: simulation DGPs described; Belgian health data is restricted (not public).

## 3. Method / model
- Estimand: **Ψτ = E[(A−A*){Qτ(Y|A,L) − Qτ(Y|A*,L)}] / E[(A−A*)²]**, equivalently a residualized representation using **A − E(A|L)** — a weighted average of conditional quantile contrasts, identified without a parametric quantile model.
- Derives the **efficient influence function** involving the conditional quantile, the exposure regression, the conditional expectation of the quantile, and the **density at the quantile**.
- Estimators: cross-fitted **DML** and **TMLE**; nuisance models need faster-than-**n⁻¹/⁴** rates (or product-rate conditions).

## 4. Equations & assumptions
- Ψτ = E[(A−A*){Qτ(Y|A,L)−Qτ(Y|A*,L)}] / E[(A−A*)²]. EIF-based estimating equation; TMLE fluctuation step targets the EIF.
- Assumptions: unconfoundedness given L (for causal reading; purely associational reading needs less); positivity; nuisance estimators converging faster than n⁻¹/⁴ (achievable with ML under smoothness/sparsity); density at the quantile bounded away from zero.

## 5. Features / target
- Features: exposure A, covariates L. Target: Ψτ — the model-free quantile association at level τ (e.g., median, 90th percentile).

## 6. Validation design
- Simulations: bias × 10⁻² and coverage of 95% intervals for plug-in vs DML vs TMLE across settings and τ. Application: real-data demonstration with reported estimates.

## 7. Numerical results / baselines
- Experiment 1, setting 1, n=500, τ=.5: plug-in bias **−70×10⁻²**, coverage **0.1%** (catastrophic) → TMLE-CF bias **1.2×10⁻²**, coverage **97.2%**.
- Paper's claim: naive plug-in inference fails badly; cross-fitted TMLE is generally best on bias and coverage.
- Application: TMLE estimated excess-weight health-cost differences of **€205.09** at the median and **€1,142.42** at the 90th percentile — the tail effect is 5.6× the median, the distributional point.
- Caveat: extreme-quantile performance degrades; near-zero density estimates can destabilize the estimator.

## 8. Code / data availability
- None stated in paper (no code link noted in extracted text).

## 9. Leakage & limitations
- **Extreme quantiles degrade** — exactly the tails GSE cares about for props; the method is strongest at central quantiles. (b) **Density-at-the-quantile estimation** is the fragile piece; near-zero densities destabilize. (c) Nuisance-rate conditions (faster than n⁻¹/⁴) are real assumptions on the ML estimators. (d) Materially heavier implementation than ordinary quantile regression. (e) No code; health-data application not portable.

## 10. GSE overlap
- Existing ALQR-adjacent ledgers **1075, 1088, 1089** cover quantile-regression methods; this paper's contribution is distinct: a **model-free conditional causal/association estimand + EIF + cross-fitted TMLE** — assumption-lean inference, not another quantile estimator. The map's calibration/CQR lane is covered; this extends the **distributional inference** sub-lane. Extension, not duplicate.

## 11. GSE implementation spec
- **Use case:** distributional prop analysis — e.g., the effect of matchup/weather/rest variables on a player's yardage distribution (median vs 90th percentile), with honest CIs, for GSE's "most calibrated" positioning.
- **Implementation:** Python (DoubleML-style cross-fitting + TMLE fluctuation); nuisance models = gradient boosting for E(A|L) and quantile forests for Qτ; kernel density for f(Y|·) at the quantile. Start at τ ∈ {.25, .5, .75} before attempting extremes.
- **Data:** nflverse player-game features 2015–2024.
- **Effort:** ~3 engineer-weeks.

## 12. Reproducible test
- **Semi-synthetic NFL:** real player-game covariates, simulated heterogeneous quantile effects with known Ψτ at τ=.5 and τ=.9. Compare cross-fitted TMLE vs naive plug-in quantile regression on bias and 95% coverage over 200 replications.

## 13. Acceptance / rejection gate
- **Adopt** if TMLE-CF achieves 90–98% coverage with |bias| ≤ 25% of the plug-in's bias at τ=.5 and τ=.75 on the semi-synthetic test; **reject** if coverage collapses at τ=.9 (then restrict the lane to central quantiles and say so explicitly).

## 14. Improvement experiment
- **Stabilized density estimation:** replace the paper's density-at-quantile estimator with a **conformalized quantile-density** approach (density estimated on held-out folds with conformal cutoffs that fall back to a wider-bandwidth estimate when density < ε). The paper admits near-zero densities destabilize the estimator — a guarded fallback directly targets the failure mode and should extend the usable τ range toward the tails GSE needs.
