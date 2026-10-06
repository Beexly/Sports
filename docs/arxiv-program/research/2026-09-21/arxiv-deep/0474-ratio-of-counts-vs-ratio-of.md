# [0474] Ratio of counts vs ratio of rates in Poisson processes (arXiv:2012.04455v1)

**Citation:** Giulio D'Agostini (2020). *Ratio of counts vs ratio of rates in Poisson processes*. arXiv:2012.04455v1. URL: https://arxiv.org/abs/2012.04455v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 15,405 lines, read sequentially in full): intro, §2 predictive problems (Poisson, Skellam difference, ratio-of-counts Monte Carlo), §§3–5 inference + ratio-of-Gamma derivations (eqs. 1–81), §6 direct-inference Model B + prior cross-influences (eqs. 82–126), §7 JAGS/MCMC extensions + ratio-vs-v + combining ratios, §8 conclusions, references, Appendix A (Bernoulli→Poisson→Gamma), Appendix B R/JAGS scripts (B.1–B.6).
**Verdict:** ADAPT (narrow) — adopt the closed-form ratio-of-Gamma posterior (Beta-prime) and its mode/mean/sd summaries for exact uncertainty on *ratios of scoring rates* in GSE's Poisson/Dixon-Coles goal models, plus the "α₀ slightly above 1" prior trick. No modeling novelty beyond textbook results; value is the ready-to-implement recipe.

## 1. Research question
Didactic: how should physicists handle "ratios of small numbers of events"? The paper insists on separating the predictive problem (forecasting counts and their ratios under stated assumptions) from the inferential problem (learning rates λ, r and their ratio ρ from observed counts), deriving closed-form posteriors for rates and their ratios under conjugate priors, with MCMC (JAGS/rjags) cross-checks and extensions to efficiencies, backgrounds, and systematics.

## 2. Dataset / schema
No real dataset — purely didactic with toy numerical examples (e.g., x₁=3 counts in T₁=3 s vs x₂=6 counts in T₂=6 s; larger-count proportional examples for MC cross-checks). R and JAGS code printed in Appendix B. No data URLs.

## 3. Method / model
Poisson counting model f(x|λ)=λˣe^{−λ}/x! with λ=rT. Bayesian inference: flat prior on λ (or r) ⇒ posterior Gamma(x+1,1) [rate parametrization]; general conjugate prior Gamma(α₀,β₀), posterior Gamma(α₀+x, β₀+T), with prior elicitation α₀=μ₀²/σ₀², β₀=μ₀/σ₀² (eqs. 54–55). **Trick:** set α₀ slightly above 1 to forbid r=0 while staying vague. Ratio of rates: exact propagation of two independent Gamma posteriors through the ratio transformation (eqs. 58–64). Alternative Model B (Sec. 6): reparametrize r₁=ρ·r₂ and put flat priors directly on (ρ, r₂) — shown to give a *different* posterior than Model A (flat on r₁, r₂), demonstrating prior-parametrization dependence. MCMC cross-checks with JAGS, including models with uncertain efficiencies and background.

## 4. Equations & assumptions
Ratio-of-Gammas pdf (eq. 64/76): f(ρ_z|α₁,β₁,α₂,β₂) = [Γ(α₁+α₂)/(Γ(α₁)Γ(α₂))]·β₁^{α₁}β₂^{α₂}·ρ_z^{α₁−1}(β₂+ρ_zβ₁)^{−(α₁+α₂)} = [1/B(α₁,α₂)]β₁^{α₁}β₂^{α₂}ρ_z^{α₁−1}(β₂+ρ_zβ₁)^{−(α₁+α₂)} (Beta-prime form). Under flat priors: f(ρ_λ|x₁+1,1,x₂+1,1) = [(x₁+x₂+1)!/(x₁!x₂!)]·ρ_λ^{x₁}(1+ρ_λ)^{−(x₁+x₂+2)}; f(ρ=r₁/r₂|x₁+1,T₁,x₂+1,T₂) = [(x₁+x₂+1)!/(x₁!x₂!)]·T₁^{x₁+1}T₂^{x₂+1}·ρ^{x₁}(T₂+T₁ρ)^{−(x₁+x₂+2)}. Summaries: mode(ρ)=(x₁/T₁)/((x₂+2)/T₂); E(ρ)=((x₁+1)/T₁)/(x₂/T₂) (x₂>0); σ(ρ)=(T₂/T₁)·√[((x₁+1)/x₂)·((x₁+2)/(x₂−1)−(x₁+1)/x₂)] (x₂>1). Graphical models: Fig. 10 (r₁,r₂ top nodes) vs Fig. 13 (ρ,r₂ top nodes), eq. (82) chain rule f(…)=f(x₂|r₂,T₂)f₀(r₂)f(x₁|r₁,T₁)f(r₁|r₂,ρ)f₀(ρ). Model B summaries (flat f₀(ρ), f₀(r₂)): mode(ρ)=(x₁/T₁)/((x₂+1)/T₂) (100); E(ρ)=((x₁+1)/T₁)/((x₂−1)/T₂) (x₂>1) (101); σ(ρ)=√[μ_ρ((T₂/T₁)(x₁+2)/(x₂−2)−μ_ρ)] (x₂>2) (102) — same structure as Model A with x₂→x₂−1. Effective likelihood form (95): f(ρ|x₁,T₁,x₂,T₂) ∝ ℒ(ρ;x₁,T₁,x₂,T₂,α₀,β₀)·f₀(ρ). Relative belief updating ratio ℛ(r;x,T,r_R)=ℒ(r;x,T)/ℒ(r_R;x,T) (44)–(45); zero-count case: likelihood "opened in the left side," flat ℛ region = experiment loses sensitivity. Cross-influence result (§6.2): flat priors on r₁,r₂ induce f(ρ)=1/2 for ρ≤1, 1/(2ρ²) for ρ>1 — P(1/10≤ρ≤10)=9/10; log-scale histogram symmetric/exponential. §7.4 ratio-vs-covariate: ρ_j=m·v_j+c (140), v_Oj∼𝒩(v_j,σ_Ej) (147). §7.5 combining ratios: N instances with constant ρ ⇒ same structure as eq. (85) with x_tot=Σx_j, T_tot=ΣT_j — no weighted-average prescription, direct pooling. Assumptions: Poisson counts, independent processes, flat or Gamma priors on top nodes, T known exactly (negligible uncertainty), efficiencies/background deferred to JAGS extensions.

## 5. Features / target
Features: observed counts x₁, x₂ and observation times T₁, T₂. Target: posterior distribution of the rate ratio ρ=r₁/r₂ (and of λ₁/λ₂). For GSE transfer: x = goals scored, T = matches/minutes — ratio of two teams' scoring rates.

## 6. Validation design
No empirical validation — internal consistency checks: closed-form pdfs vs 10⁷-sample Monte Carlo vs JAGS MCMC on the toy examples. This is a methods tutorial, not an experiment.

## 7. Numerical results / baselines
Model comparison (x₁=3,T₁=3 s; x₂=6,T₂=6 s): Model A [flat f₀(r₁),f₀(r₂)]: r₁=1.33±0.67, r₂=1.17±0.44, ρ=1.33±0.94. Model B [flat f₀(ρ),f₀(r₂)]: r₁=1.33±0.67, r₂=1.00±0.41, ρ=1.60±1.20 — slightly wider and shifted; MCMC histograms agree "excellently" with closed forms. Prior-elicitation example: belief r=(5±2) s⁻¹ ⇒ α₀=6.25, β₀=1.25 s, equivalent to having observed ~5 counts in 1.2 s from a flat start. All numbers are the paper's claims.

## 8. Code / data availability
R and JAGS/rjags code printed in Appendix B (dPoisDiff, MC ratio sampling, JAGS models); no repository.

## 9. Leakage & limitations
Adversarial notes: (a) no real data, no comparison to any baseline — everything is internal cross-checking; (b) the ratio-of-Gammas result is textbook (Beta-prime) — the paper presents it as a "lucky" closed form without naming the standard distribution, so the novelty is pedagogical, not mathematical; (c) flat priors on rates are improper and the "flat" prior on ρ in Model B is equally arbitrary — the paper's own lesson is that results are prior-parametrization dependent, which undercuts any claim of objectivity; (d) the large-count approximations and small-count regimes are not connected to any decision rule; (e) NFL transfer: goals are not Poisson-iid across teams (Dixon-Coles dependence), and rate ratios ignore attack/defense decomposition — use only as a quick-look uncertainty, not as the model.

## 10. GSE overlap
Extension (small). The existing map inventories Poisson, Dixon-Coles, Skellam, and goal-expectancy models, but not the closed-form ratio-of-rates posterior. What is NEW: (i) the ready-to-code Beta-prime posterior + mode/mean/sd formulas for "team A scores at ρ× the rate of team B" from raw goal counts — useful as a fast prior/uncertainty input to the Poisson goal models (e.g., quantifying uncertainty in head-to-head scoring-rate ratios for matchup previews); (ii) the α₀≳1 prior trick to exclude zero rates while staying vague; (iii) the Model A vs B caution: when GSE publishes "X scores 1.4× more than Y" style claims, the uncertainty depends on the prior parametrization — report the parametrization. Cite: Poisson/Dixon-Coles/Skellam entries in the metric inventory.

## 11. GSE implementation spec
1. Implement the closed-form ratio posterior f(ρ) (eq. 76) as a utility function: inputs (goals₁, minutes₁, goals₂, minutes₂, prior α₀/β₀), outputs posterior mode/mean/sd/credible interval of the scoring-rate ratio — for use in matchup preview content ("Chiefs score at 1.31× [1.05, 1.62] the rate of..."). Effort: <1 day. 2. Use the Gamma(α₀,β₀) sequential-update form for rolling team scoring-rate posteriors in the Poisson goal model (replaces ad-hoc exponential weighting with a principled conjugate update). 3. Adopt the α₀=1.01 floor trick wherever GSE fits Gamma priors on rates to exclude degenerate zero-rate posteriors.

## 12. Reproducible test
Dataset: 2022–2025 NFL team points scored per game (nflverse). Compute pairwise scoring-rate-ratio posteriors via eq. 76 (flat priors) for all 32 teams each week; compare posterior means against the naive ratio x₁/x₂ and against the Dixon-Coles-implied rate ratios. Metric: calibration of the 80% credible intervals on next-4-week realized rate ratios (empirical coverage vs nominal 80%). Baseline: naive ratio ± Gaussian error propagation.

## 13. Acceptance / rejection gate
Adopt the closed-form ratio posterior as a GSE utility if: on 2024–2025 data, its 80% credible intervals achieve empirical coverage within [0.75, 0.85] on forward rate ratios while being narrower than the Gaussian-propagation intervals. Reject if coverage is off-nominal or intervals are wider than the naive baseline — i.e., the textbook form adds no practical value over what the team already computes.

## 14. Improvement experiment
Go beyond the paper: (i) replace the paper's independent-Poisson assumption with the Dixon-Coles dependence structure — derive (or MCMC) the ratio posterior for *correlated* bivariate Poisson rates, which the paper never attempts; (ii) extend the Model A vs B analysis to a hierarchical prior (team rates shrunk toward league average), testing whether the parametrization sensitivity the paper flags disappears under partial pooling — if so, that is the principled fix for GSE's published rate-ratio claims.
