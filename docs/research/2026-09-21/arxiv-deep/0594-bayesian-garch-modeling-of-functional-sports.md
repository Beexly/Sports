# [0594] Bayesian GARCH Modeling of Functional Sports Data (arXiv:2101.08175v1)

**Citation:** Dolmeta, P., Argiento, R. & Montagna, S. (2021). *Bayesian GARCH Modeling of Functional Sports Data*. arXiv:2101.08175v1. URL: https://arxiv.org/abs/2101.08175v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5,018 lines).
**Verdict:** ADAPT — port the two transferable ideas: (1) GARCH errors on seasonal/inter-seasonal intercepts to model volatility clustering in athlete/team performance (directly applicable to player-prop variance and week-to-week consistency modeling), and (2) the latent-factor functional decomposition for career/aging trajectories. The shot-put setting itself has no NFL content.

## 1. Research question
How can the full career trajectory of an athlete in a "measurable sport" (single-number outcome — distance, time) be described and predicted, accounting for intra-seasonal smooth evolution, inter-seasonal jumps with time-varying volatility, and covariates (sex, age, environment, doping)?

## 2. Dataset / schema
World Athletics elite shot-put competitions from tilastopaja.eu (ethical approval Prop_72_2017_18), restricted to 1996–2016 for measurement consistency: 41,033 observations on 653 athletes (309 men, 344 women), best-result-per-competition in meters (range 10.6–22.56, mean 17.30). Covariates: sex, age (time-dependent or fixed at career start), environment (indoor/outdoor: 13,200 indoor vs 27,800 outdoor obs), doping violation flag (only 18 athletes). Time t_ij = days since January 1 of athlete i's career-start year, rescaled to [0,1]; seasons = calendar years; careers up to 19 seasons. Data centered on athlete means for MCMC convergence.

## 3. Method / model
Hierarchical Bayesian additive model: y_ij = g_i(t_ij) + ε_ij, ε_ij ~ N(0, ψ²), with g_i(t) = f_i(t) + μ_is + x_i(t)β. (1) Functional component f_i(t) = Σ_{m=1}^{80} θ_im b_m(t): cubic B-splines (80 df; 120 df in model M4) with a sparse latent-factor model on coefficients θ_im = Σ_l λ_ml η_il + ξ_im, λ under a Bhattacharya–Dunson multiplicative-gamma-process shrinkage prior (adaptive number of factors k ≪ p). (2) Seasonal component: athlete-season random intercepts μ_is = m + ζ_is with GARCH(1,1) errors h_is = α_0 + α_1 ζ_{is−1}² + ϖ h_{is−1} (stationarity requires α_1 + ϖ < 1). (3) Regression on sex, age, environment (+doping in M5/M6). Inference: blocked Gibbs sampler — conjugate updates for functional/regression/error terms, adaptive Metropolis (Haario et al. 2001, target acceptance 0.234) for the GARCH parameters (m, α, ϖ) via log-transform random walks; 20,000 iterations, 60% burn-in, thinning 5. Model comparison by LPML (log pseudo-marginal likelihood).

## 4. Equations & assumptions
y_ij = g_i(t_ij) + ε_ij, ε_ij iid N(0, ψ²); g_i(t_ij) = f_i(t_ij) + μ_is + x_i(t_ij)β.
f_i(t) = Σ_m θ_im b_m(t); θ_im = Σ_l λ_ml η_il + ξ_im; η_i ~ N_k(0, I); λ_ml | φ, τ ~ N(0, φ_ml^{−1} τ_l^{−1}), τ_l = Π_{v≤l} ϖ_v (multiplicative gamma process).
μ_is | m, h_is = m + ζ_is ~ N(m, h_is); h_is = α_0 + α_1 ζ_{is−1}² + ϖ h_is−1; α_0 > 0, α_1, ϖ ≥ 0.
β ~ N(β_0, σ_β² I); data centered: ỹ_ij = y_ij − ȳ_i.
Assumptions: additive separability of intra-seasonal (smooth), inter-seasonal (step + GARCH), and covariate effects; Gaussian iid measurement error; GARCH captures all residual season-to-season dependence; only 18 doped athletes (imbalanced); time rescaling aligns athletes' career clocks rather than calendar years.

## 5. Features / target
Features: time-in-career t, season index s, sex, age, environment (indoor/outdoor), doping flag. Target: competition best-result distance (meters). Evaluation target: model fit via LPML; trajectory estimates with 95% credible bands; one-season-ahead predictions (visual, Fig. 4).

## 6. Validation design
No train/test split on outcomes; model selection among six specifications (M1–M6, differing in spline df, GARCH vs AR seasonal errors, age definition, doping covariate) by LPML on the full data; vague-prior variant M1^(2) checks prior sensitivity for m. One-season-ahead trajectory extrapolation shown graphically but not scored. Regression significance judged by 95% credible intervals and ESS.

## 7. Numerical results / baselines
LPML: M1 = −45943; M1^(2) (vague m prior) = −46573; M2 (fixed age) = −45472 (best); M3 (AR seasonal) = −46544; M4 (120 df) = −46314; M5 (doping) = −48565; M6 = −48122. Authors prefer M1 (80 df, GARCH, time-dependent age) because its regressors are significant.
M1 posterior (1600 retained samples): β1 (sex) = −0.120, sd 0.0270, ESS 190, [−0.175, −0.0675] — women's trajectories less variable around their mean; β2 (age) = 6.22e-3, sd 9.95e-4, ESS 170, [4.20e-3, 8.20e-3] — performances improve through career; β3 (environment) = 0.0453, sd 9.55e-3, ESS 1600, [0.0269, 0.0643] — outdoor better than indoor. All 95% intervals exclude zero.
Doping (M5): β4 = −0.116, sd 0.0761, ESS 70, [−0.267, −0.0365] — negative but unreliable (n=18); M6: β4 = −0.0103, interval contains zero.
Structural findings: the seasonal random intercept captures the majority of variability; the adaptive factor procedure selects exactly as many operative latent bases as there are seasons (the 80-df spline support confines each basis to one season, so "functional" ≈ seasonal); covariate effects are small in magnitude.

## 8. Code / data availability
Code and prepared data: https://github.com/PatricDolmeta/Bayesian-GARCH-Modeling-of-Functional-Sports-Data. Raw data from www.tilastopaja.eu. Full MCMC conditionals in Appendix A.

## 9. Leakage & limitations
- No out-of-sample predictive scoring; LPML is in-sample; one-season-ahead predictions are visual only.
- Data centered on athlete means — regression coefficients describe variability around the athlete's own average, not absolute performance; easy to misread.
- Only 18 doped athletes: the doping coefficient is uninterpretable (ESS 70 in M5).
- The "smooth functional" component collapses to a seasonal step function in practice (one basis per season) — the fancy latent-factor machinery adds little beyond the GARCH seasonal intercepts.
- Shot put is an individual measurable sport; the season structure (calendar years, indoor/outdoor) has no direct NFL analog — transfer is methodological only.
- GARCH stationarity constraint α_1 + ϖ < 1 is tested, not imposed in priors.

## 10. GSE overlap
Partial overlap with extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1 master metrics list), the repo has player aging-curve and trajectory work but nothing modeling *volatility clustering* in performance — the GARCH-on-seasonal-intercepts idea is new structure. Prop-bet and player-consistency lanes exist, but no heteroskedastic error modeling of week-to-week or season-to-season variance. The latent-factor functional decomposition overlaps existing trajectory/aging-curve methods in spirit.

## 11. GSE implementation spec
Two portable pieces. (1) Volatility model: fit GARCH(1,1) errors on player-season (or team-season) random intercepts for a prop-relevant metric (e.g., weekly receiving yards for WRs, team EPA/play) on nflverse 2015–2025; test whether volatility clustering exists (α_1 + ϖ significant) and whether the conditional variance h_is predicts next-season prop-line beat rates — i.e., use estimated volatility as a "consistency" feature in prop models. (2) Trajectory model: reuse the additive decomposition (smooth career curve via splines + season intercepts + covariates) for aging curves of skill-position players, replacing the latent-factor machinery with a simpler hierarchical spline (the paper shows the factor model adds little once seasons are the operative unit). Effort: ~2 engineer-weeks for (1), ~1 week for (2).

## 12. Reproducible test
Dataset: nflverse weekly player stats 2018–2025. Fit per-player season intercepts with GARCH(1,1) vs constant-variance errors for receiving/rushing yards per game. Metric: LPML-equivalent (WAIC/LOO) comparison of GARCH vs homoskedastic specifications; then an economic test: sort players by estimated conditional variance h and check whether high-volatility players systematically beat/miss their season prop lines (hit-rate differential). Baseline: constant-variance hierarchical model.

## 13. Acceptance / rejection gate
Adopt if the GARCH specification wins on LOO by a clear margin (Δelpd > 2×se) for at least one prop-relevant metric AND the volatility feature improves a prop hit-rate model (log-loss) by ≥0.3% on 2024–2025 holdout. Reject if volatility is unclustered (α_1 + ϖ ≈ 0) or the feature adds nothing — then the paper's heteroskedastic machinery is overkill for NFL data.

## 14. Improvement experiment
Make the GARCH volatility itself covariate-driven (GARCH-X): h_is as a function of age, injury history, and team context, testing whether volatility spikes are predictable (e.g., post-injury seasons, QB changes) rather than purely autoregressive. If predictable, the model becomes a forward-looking "boom/bust risk" score for DFS and props — a use the paper's purely backward-looking GARCH cannot serve.
