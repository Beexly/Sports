# [0769] What Makes Forest-Based Heterogeneous Treatment Effect Estimators Work? (arXiv:2206.10323v2)

**Citation:** Susanne Dandl, Christian Haslinger, Torsten Hothorn, Heidi Seibold, Erik Sverdrup, Stefan Wager, Achim Zeileis (2022). *What Makes Forest-Based Heterogeneous Treatment Effect Estimators Work?* arXiv:2206.10323v2. URL: https://arxiv.org/abs/2206.10323
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2206.10323.txt`; complete paper incl. abstract, §§1–7, benchmark Table 2, Figure 1, references and Supplementary Material A, verified end-to-end).
**Verdict:** ADAPT — unifies causal forests (Athey et al. 2019, grf) and model-based forests (Seibold et al. 2018, model4you) under one additive L₂ model and dissects *which computational ingredient* drives performance in observational settings: local centering of the **treatment indicator with propensity scores** is the dominant driver; outcome centering is secondary and can be replaced/enhanced by simultaneous split selection on prognostic and predictive effects. This is a direct recipe for GSE's causal questions (heterogeneous effect of rest, surface, weather, coaching decisions, lineup changes on performance): center the "treatment" with a propensity model, split on both prognostic and predictive scores.

## 1. Research question
Causal forests and model-based forests both estimate heterogeneous treatment effects (HTE/CATE) τ(x) but differ in theory and implementation. The paper asks: (i) which computational elements make causal forests successful, (ii) can they be blended with model-based forests' strengths (non-Gaussian outcomes, simultaneous prognostic+predictive splitting), and (iii) what does the blended machinery reveal on a real observational problem (heterogeneous cesarean-section effect on interval-censored, right-skewed postpartum blood loss, N=1300)?

## 2. Dataset / schema
- **Simulation benchmark** (Nie & Wager 2021 setups A–D): X ~ U([0,1]^P) (A) or N(0,I) (B–D), P ∈ {10, 20} (5 informative + P−5 noise), N ∈ {800, 1600}, 100 replications, test N=1000. Propensities: π_A(x₁,x₂)=max{0.1,min{sin(πx₁x₂),0.9}} (complex confounding), π_B≡0.5 (randomized), π_C(x₂,x₃)=1/(1+exp(x₂+x₃)) (strong confounding, constant τ≡1), π_D=1/(1+exp(−x₁)+exp(−x₂)) (uncorrelated arms). τ_A=(x₁+x₂)/2, τ_B=x₁+log(1+exp(x₂)), τ_C≡1, τ_D=max{x₁+x₂+x₃,0}−max{x₄+x₅,0}. Y ~ N(μ(x)+τ(x)(w−0.5), 1).
- **Application:** 1,300 women (Zurich prospective study, Oct 2015–Nov 2016; one 5700 mL outlier + 8 missing-BMI rows removed). Outcome = measured blood loss (mL), right-skewed, interval-censored (50 mL width ≤1 L, 100 mL above). 8 prepartum covariates: gestational age, maternal age, multiparity, BMI, multifetal pregnancy, neonatal weight, induction of labor, chorioamnionitis. Not public.
- Metric: MSE of τ̂(x) vs τ(x) on test data; mixed-model analysis with log-link gives MSE ratios with simultaneous 95% CIs.

## 3. Method / model
- **Unifying framework (§2):** both forests fit E[Y|x,w] = μ(x) + τ(x)·w under L₂ loss (causal forests center first: E[Y|x,w] = m̂(x) + τ(x)(w−π̂(x))). Blended variants in model4you: **mob** (no centering), **mob(Ŵ)** (treatment centered only: μ(x)+τ(x)(w−π̂(x))), **mob(Ŵ,Ŷ)** (both centered, simultaneous splits in μ̃ and τ), **mobcf** (both centered, splits only in τ — a model4you re-implementation of cf). Bivariate score function: s = (Y−m̂(x)−μ̃−τ̂(w−π̂(x)))·(1, w−π̂(x))ᵀ. Extension demonstrated: Poisson forest (ℓ = exp(μ+τw)−(μ+τw)Y) and interval-censored transformation forests (Φ-difference negative log-likelihood), plus a Tobit-style censored likelihood — i.e., model-based forests as a *framework*, not one model.
- Propensities π̂(x) and marginal means m̂(x) estimated by grf regression forests for all variants; honest vs adaptive forests compared (rankings unchanged).

## 4. Equations & assumptions
(1) E[Y|x,w] = m̂(x) + τ(x)(w−π̂(x)) (cf / mobcf). (2) E[Y|x,w] = m̂(x) + μ̃(x) + τ(x)(w−π̂(x)) (mob(Ŵ,Ŷ)). (3) Score: s_mob(Ŵ,Ŷ)(μ̃,τ̂) = (Y−m̂(x)−μ̃−τ̂(w−π̂(x)))(1, w−π̂(x))ᵀ. (4) Pseudo-outcomes ρ = ψ_τ·A_p⁻¹ with A_p = n⁻¹Σwᵢ²; causal-forest split criterion C_cf = (n_L n_R/n²)‖ρ̄_L−ρ̄_R‖² vs model-based-forest criterion C_mob = Z_mob′V_mob Z_mob with score-sum quadratic forms (Supplementary A.1). (5) Interval-censored likelihood for blood loss: ℓ = −log(Φ((ȳ−μ−τw)/σ) − Φ((y̲−μ−τw)/σ)); Poisson-forest variant: ℓ = exp(μ+τw) − (μ+τw)Y.
Assumptions: unconfoundedness given X (observational setups); propensity model correctly specified enough (grf forest); L₂/additive structure for the benchmark; honesty not required for the rankings to hold.

## 5. Features / target
Simulation: 5 informative covariates + noise; treatment W ~ Bernoulli(π(x)); target τ(x). Application: 8 prepartum characteristics; target = heterogeneous excess blood loss due to cesarean vs vaginal delivery.

## 6. Validation design
100 replications × 16 scenarios (4 setups × 2 N × 2 P); MSE(τ̂) on fixed N=1000 test sample; normal linear mixed model with log-link + random intercept per replication → MSE ratios with simultaneous 95% CIs (Table 2). Same hyperparameters across variants to isolate algorithmic ingredients. Application: OOB estimates, dependence plots of τ̂(x) on covariates (Figure 5–6).

## 7. Numerical results / baselines
- **RQ1 (cf vs mob):** cf beats mob in all 16 scenarios. Setup A (N=800,P=10): MSE ratio 0.663 (0.596, 0.738). Setup C (strong confounding, constant τ): ratio 0.148 (0.141, 0.156) — mob collapses under confounding; Setup B (randomized): 0.707 (0.662, 0.756) — cf still better but closer. Setup D: 0.756–0.807.
- **RQ2 (mob(Ŵ,Ŷ) vs mobcf):** simultaneous prognostic+predictive splitting wins almost everywhere: ratios 1.446–1.693 (A/B/C) — i.e., mobcf's MSE ~45–69% higher; Setup D is the exception (0.967–0.983, arms uncorrelated).
- **RQ3 (cf vs mobcf):** near-identical in A and B (ratios 1.111–1.201, mostly n.s.), mobcf slightly better in C (1.123–1.184), cf slightly better in D (0.934–0.982) — implementation details (split selection, stopping) matter little; the centering is what matters.
- **RQ4 (mob(Ŵ) vs mob):** with confounding, treatment centering alone transforms mob: Setup A ratio 0.392 (0.334, 0.461); Setup C 0.197 (0.190, 0.205) — ~5× MSE reduction from centering W alone. Setup B (no confounding): 1.000 — no effect, as expected.
- **RQ5 (outcome centering on top):** small additional gains: mob(Ŵ) vs mob(Ŵ,Ŷ) ratios 0.988–1.061 in A (no improvement), 1.533–1.734 in B, 2.258–2.615 in C (large when propensity easy to estimate, per authors), 1.099–1.157 in D. Headline: **treatment centering is the dominant ingredient; outcome centering is secondary and partly replaceable by simultaneous prognostic+predictive splitting.**
- **Application:** model-based transformation forest for interval-censored blood loss; mean personalized effect τ̂ = 0.823 (on the transformed scale); dependence plots show gestational age ~270 days, birth weight ~3050 g, singleton births associated with small median losses for vaginal deliveries.

## 8. Code / data availability
Methods implemented in R packages **grf** (cf) and **model4you** (mob + blended variants) — both public on CRAN. Simulation design from Nie & Wager (2021) is reproducible. Clinical data not public.

## 9. Leakage & limitations
(i) Benchmark is Gaussian with additive structure — the "treatment centering dominates" conclusion is demonstrated under L₂; interval-censored/non-Gaussian cases get only the application, not a full simulation; (ii) propensity scores themselves estimated by grf forests — errors in π̂(x) propagate (Setup C shows how much this matters); (iii) honest vs adaptive rankings align, but honest forests were worse in Setup D; (iv) no comparison to X-learners/BART/neural CATE estimators — only forest-family; (v) P ≤ 20, N ≤ 1600 — high-dimensional sports tracking settings untested; (vi) clinical application is descriptive (no ground truth for τ(x)).

## 10. GSE overlap
Methodological extension for the causal/injury lane. GSE repeatedly asks heterogeneous-effect questions: effect of rest days on performance, of surface/weather on injury risk, of a coaching/play-calling change on EPA, of a lineup decision on win probability, of travel on Thursday-night performance. The existing map has causal-inference entries but no forest-based CATE recipe with an empirically validated ingredient ranking. Portable: (a) when estimating any heterogeneous effect from observational NFL data, center the "treatment" with a propensity forest first — the single highest-ROI step; (b) don't pay the complexity cost of outcome centering unless propensities are easy to estimate — instead split on prognostic+predictive scores simultaneously; (c) the Poisson/interval-censored extensions license CATE estimation on count outcomes (injuries, targets) and censored outcomes (snap shares, games missed).

## 11. GSE implementation spec
- **CATE recipe for GSE causal questions**: for any binary "treatment" T (e.g., short rest, turf surface, new play-caller, starter benched) and outcome Y (EPA/play, win, injury): (1) fit propensity forest π̂(x) = P(T=1|x) on game/player covariates; (2) fit marginal-mean forest m̂(x); (3) fit model-based forest on E[Y|x,t] = m̂(x) + τ(x)(t−π̂(x)) with simultaneous splits in prognostic and predictive scores. Report τ̂(x) with forest-based uncertainty.
- **Minimum viable version**: skip outcome centering entirely; center only the treatment indicator (mob(Ŵ)) — RQ4 shows this captures most of the gain (MSE ratio 0.197–0.392 under confounding). Add outcome centering only if propensity estimation is clean (validated overlap/positivity diagnostics).
- **Count/censored outcomes**: use the paper's Poisson-forest negative log-likelihood for injury counts / touchdown counts; the interval-censored likelihood form for snap-share or games-missed outcomes with heaping.
- Effort: ~2 days to implement the mob(Ŵ) + simultaneous-split CATE pipeline in Python (sklearn-style forests with custom split scores, or via the grf/model4you R packages through reticulate); ~1 day per causal question thereafter.

## 12. Reproducible test
Dataset: 2020–2024 NFL games with a binary "treatment" — e.g., road team on short rest (Thu games) vs normal rest — outcome = ATS cover or EPA margin, covariates = team strength, injuries, weather, travel. Fit (a) plain causal forest, (b) mob(Ŵ), (c) mob(Ŵ,Ŷ) on a semi-synthetic benchmark: real covariates + simulated heterogeneous τ(x) with known ground truth (Nie & Wager style), N≈1,200 games. Success: mob(Ŵ) achieves MSE(τ̂) ≤ 1.2× the causal-forest MSE (parity), and both beat uncentered mob by ≥2× — replicating the paper's ingredient ranking on sports data.

## 13. Acceptance / rejection gate
ADAPT the ingredient ranking immediately as GSE's default CATE recipe (treatment-centering mandatory, outcome-centering optional). ADOPT the mob(Ŵ) implementation only if the reproducible test shows parity-with-causal-forest MSE (≤1.2×) and ≥2× improvement over uncentered mob; otherwise REJECT the custom implementation and use off-the-shelf grf causal forests.

## 14. Improvement experiment
Test whether the ingredient ranking reverses under *targeted* (rather than random) confounding: construct a DGP where confounding is concentrated in the prognostic direction only, and another where it is concentrated in the predictive direction only, then re-run the forest-flavor bake-off. If treatment-centering dominates in both, the ranking is robust; if outcome-centering matters more under prognostic confounding, GSE's CATE recipe should condition on the confounding structure — diagnosed via a cheap pre-test on the covariate–treatment association spectrum.
