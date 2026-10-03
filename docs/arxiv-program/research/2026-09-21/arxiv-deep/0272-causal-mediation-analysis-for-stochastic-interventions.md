# [0272] Causal mediation analysis for stochastic interventions (arXiv:1901.02776)

**Citation:** Iván Díaz, Nima S. Hejazi (v2 dated 2026; v1 2019). *Causal mediation analysis for stochastic interventions*. arXiv:1901.02776. URL: https://arxiv.org/abs/1901.02776
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 11504 lines, sequential, including §§1–7, §8 proofs of Theorems 1–4/Lemmas/Corollary 1, §9 second-order EIF representations (Theorems 5–6), and references).
**Verdict:** ADAPT — the stochastic-intervention direct/indirect decomposition (with the runnable `medshift` R package) fills GSE's empty mediation-analysis lane, but only for decomposing one well-defined causal contrast at a time (e.g., weather → totals via pace vs. direct path), and the "no mediator-outcome confounder affected by exposure" assumption must be checked per application rather than assumed.

## 1. Research question
Can the average treatment effect decomposition into natural direct and indirect effects be generalized to **stochastic interventions** (interventions that draw exposure from a distribution, e.g., modified treatment policies or exponential tilting) to get a **population intervention effect (PIE)** decomposition that (a) works for continuous and categorical exposures, (b) requires **weaker identification assumptions** than the natural direct effect (no cross-world counterfactual independencies — identifiable even in experiments randomizing exposure and mediator), and (c) admits efficient, machine-learning-compatible estimators with valid inference? Illustrated on the effect of children's sports-team participation on BMI, mediated by exercise/snacking/overweight status.

## 2. Dataset / schema
- **Simulation:** fully specified synthetic DGP (3 binary covariates W₁~Bern(0.50), W₂~Bern(0.65), W₃~Bern(0.35); binary A with propensity (ΣW_j)/4+0.1; 3 binary mediators Z₁,Z₂,Z₃ as nonlinear expit functions of A and W; Y = Z₁+Z₂−Z₃+A−0.1(ΣW_j)²+ε, ε~N(0,0.25)); n ∈ {400, 900, 1600, 2500, 3600, 4900, 6400}, 1000 Monte Carlo replicates; incremental propensity score (IPS) intervention δ=0.5; true direct effect ≈ 0.137 (computed by large-sample Monte Carlo integration).
- **Illustrative application:** the `mma` R package dataset (Louisiana State University Health Sciences Center; survey of children, teachers, parents in Grenada, 2014): **691 observations, 15 variables** after removing missing values. Exposure A = participation in a sports team (binary); outcome Y = BMI (continuous); mediators Z = snacking, exercising, overweight status (multivariate); all other collected covariates as confounders W.
- Access: `mma` package on CRAN (public); methods in the **`medshift`** R package (Hejazi & Díaz 2019) on GitHub (open source).

## 3. Method / model
**PIE mediation decomposition with efficient influence-function (EIF) estimation.** Define the population intervention effect **ψ(δ) = E{Y(A_δ) − Y}** for a stochastic intervention drawing A_δ ~ g_δ(a|w) (g_{δ=0} = g). By composition, ψ(δ) decomposes into a population intervention indirect effect and direct effect (eq. 5, §4 below). The estimation target is **θ(δ) = E{Y(A_δ, Z)}** (outcome under intervened exposure but natural mediator); the direct effect is β(δ) = θ(δ) − E[Y], the indirect effect ψ(δ) − θ(δ) (ψ estimated via Kennedy's `npcausal`). Three estimators: (a) **substitution** — plug m̂, ĝ_δ into the identification formula (eq. 14); (b) **re-weighted (IPW)** — E[ĝ_δ(A|W)/ê(A|Z,W)·Y] (eq. 15), using the reparameterization e = gq/r so only the univariate density e(a|z,w) is estimated instead of multivariate mediator densities; (c) **efficient one-step estimator** — solution to P_n D_{η̂,δ} = 0 with **cross-fitting** (J-fold train/validation splits; nuisance η=(g,m,e,φ) trained on T_j, evaluated on V_j) per eq. 16, in randomized trials with the D^A component set to zero. Nuisance functions estimated with flexible ML (Super Learner ensembles: xgboost, random forests, glmnet lasso/ridge/elastic-net, HAL via hal9001). Uniform confidence bands over δ for exponential tilting give a test of H: sup_{δ∈Δ} β(δ) = 0 (no direct effect).

## 4. Equations & assumptions
- (1) NPSEM: W=f_W(U_W); A=f_A(W,U_A); Z=f_Z(W,A,U_M); Y=f_Y(W,A,Z,U_Y), with temporal order W→A→Z→Y. **Mediator-outcome confounders affected by exposure are explicitly excluded** (Avin et al. 2005 hardness result cited).
- (2) Modified treatment policy example: d(a,w) = a−δ if a > l(w)+δ else a.
- (3) Exponential tilting: **g_δ(a|w) = exp(δa)g(a|w)/∫exp(δa)g(a|w)dκ(a)**.
- (4) Binary IPS (Kennedy 2018a): **g_{δ'}(1|w) = δ'g(1|w)/(δ'g(1|w)+1−g(1|w))**, δ'=exp(δ) an odds ratio.
- (5) Decomposition: **ψ(δ) = E{Y(A_δ,Z(A_δ)) − Y(A_δ,Z)}⏞PIIE + E{Y(A_δ,Z) − Y(A,Z)}⏞PIDE**.
- (6) Change-of-variable for g_δ under A1.
- (7) **Identification (Theorem 1): θ(δ) = ∫ m(a,z,w) g_δ(a|w) p(z,w) dν(a,z,w).**
- (8–11) Auxiliary nuisance φ: modified-policy form φ(a,w)=∫m(d(a,w),z,w)r(z|w)dν(z) = E[g(A|W)/e(A|Z,W)·m(d(A,W),Z,W)|A=a,W=w]; exponential-tilt form φ(a,w)=∫m(a,z,w)r(z|w)dν(z) = E[g(A|W)/e(A|Z,W)·m(A,Z,W)|A=a,W=w] — the reparameterization that **avoids estimating the multivariate mediator density r(z|w)**.
- Theorem 2 (EIF): **D_{η,δ} = D^Y_{η,δ} + D^A_{η,δ} + D^{Z,W}_{η,δ} − θ(δ)** with **D^Y_{η,δ}(o) = g_δ(a|w)/e(a|z,w)·{y − m(a,z,w)}** and **D^{Z,W}_{η,δ}(o) = ∫ m(a,z,w)g_δ(a|w)dκ(a)**; D^A is the efficient score for g (Lemmas 1–2; Corollary 1 gives the binary-IPS closed form **D^A_{η,δ}(o) = δφ(w){a − g(1|w)}/{δg(1|w)+1−g(1|w)}²**).
- Lemma 3 (multiple robustness, modified policies): consistency if (i) g₁=g and (e₁=e or m₁=m), or (ii) m₁=m and φ₁=φ. Lemma 4 (exponential tilt): consistency requires g₁=g and (e₁=e or m₁=m) — **not robust to g misspecification**.
- Theorem 3: **√n{θ̂(δ)−θ(δ)} ⇝ N(0, σ²(δ))**, σ²(δ)=Var(D_{η,δ}(O)) (the efficiency bound), under **n^{−1/4}-consistency of nuisance regressions** (‖m̂−m‖{‖ĝ−g‖+‖ê−e‖} + ‖ĝ−g‖‖φ̂−φ‖ = o_P(n^{−1/2})), boundedness, and A1. Wald CI: θ̂(δ) ± z_{1−α/2}σ̂(δ)/√n. Theorem 4: uniform weak convergence to a mean-zero Gaussian process over δ for exponential tilting.
- Identification assumptions: **A1** piecewise smooth invertibility of the modified treatment policy; **A2** common support supp(g_δ) ⊆ supp(g); **A3** conditional exchangeability E{Y(a,z)|A,W,Z} = E{Y(a,z)|W,Z} (weaker than the usual E{Y(a,z)|A,W,Z}=E{Y(a,z)|W}; holds automatically if exposure and mediator are both randomized — hence direct effects are **falsifiable by experiment**, unlike natural direct effects). Implicit: all mediator-outcome confounders measured and **not affected by exposure** (Remarks 1–2 with DAGs).

## 5. Features / target
- Simulation: no ML features — inputs are the (W, A, Z, Y) draws per the DGP; target = direct effect β(δ) = θ(δ) − E[Y] at IPS δ=0.5 (true ≈ 0.137).
- Application: covariates W = all non-mediator survey variables; exposure A = sports-team participation; mediators Z = snacking/exercise/overweight status; target Y = BMI; intervention = IPS with δ=2 (doubling odds of participation, marginal odds 0.69 → 1.38). Prediction horizon: none (retrospective).

## 6. Validation design
- **Simulation:** 1000 Monte Carlo replicates × 7 sample sizes; nuisance functions fit two ways — well-specified via **HAL (hal9001)**, guaranteed n^{1/4} rates, and misspecified via intercept-only models (E mis., M mis., G mis. variants of the efficient estimator). Metric: MSE scaled by n (Table 1), plus bias/SE decomposition (Figure 3). No train/test split (cross-fitting is internal to the estimator).
- **Application:** no holdout; inference via the EIF-based Wald/uniform CIs. Baselines: the three estimators compared against each other; no external benchmark.

## 7. Numerical results / baselines
- Simulation (Table 1, n-scaled MSE at δ=0.5, n = 400→6400): Substitution **0.083, 0.086, 0.084, 0.077, 0.072, 0.074, 0.075**; Re-weighted (IPW) **0.105, 0.120, 0.111, 0.116, 0.107, 0.112, 0.109**; Efficient one-step **0.092, 0.086, 0.071, 0.072, 0.068, 0.067, 0.065**; Efficient (E mis.) **0.060, 0.060, 0.060, 0.059, 0.054, 0.059, 0.058**; Efficient (M mis.) **0.165, 0.130, 0.110, 0.107, 0.099, 0.103, 0.097**; Efficient (G mis.) **0.436, 0.829, 1.255, 1.912, 2.662, 3.543, 4.519**. Findings: substitution and efficient estimators perform "essentially equivalent[ly]" well with HAL nuisances (efficient slightly better bias-variance trade-off); the efficient estimator is robust to E- or M-misspecification but **not to G-misspecification, whose n-scaled MSE grows with n (asymptotic bias)**; curiously the E-misspecified variant beats the fully efficient one (authors attribute to intercept-only weights being smaller — a simulation idiosyncrasy).
- Application (Table 2, IPS δ=2; lower / estimate / upper 95% CI): Direct effect **−0.458 / 0.011 / 0.479**; Indirect effect **−0.672 / −0.157 / 0.357**. Conclusion: "little total effect of doubling the odds of participation in a sports team on the BMI of children"; the indirect point estimate suggests a BMI reduction of 0.157 through snacking/exercise behavior changes, but the CI covers zero — not efficacious by this evidence.

## 8. Code / data availability
**Code: `medshift` R package (Hejazi & Díaz 2019), free and open source on GitHub** — implements substitution, re-weighted, and one-step efficient estimators. Total-effect ψ̂ via the `npcausal` R package (Kennedy 2018b); nuisance ensembles via `sl3` (Super Learner), `xgboost`, `ranger`, `glmnet`, `hal9001`. Data: `mma` CRAN package (public). Nothing proprietary.

## 9. Leakage & limitations
- **A3 is untestable in observational data**: the sports-team/BMI application assumes no unmeasured mediator-outcome confounding and no exposure-affected mediator-outcome confounder — strong for survey data (e.g., parental health attitudes plausibly confound exercise→BMI and correlate with sports participation).
- Missing data were simply dropped (691 complete cases); the authors recommend imputation/IPCW in practice but did not apply it — selection bias possible.
- The illustrative study is underpowered and null; it demonstrates mechanics, not a substantive finding.
- The e = gq/r reparameterization trades mediator-density estimation for **density-ratio estimation** (g/e weights) — with continuous exposures, extreme weights can destabilize the IPW component; the boundedness assumption (ii) in Theorem 3 papers over this.
- G-misspecification is fatal (Lemma 4, Table 1 last row) for exponential-tilt interventions — the exposure mechanism must be estimated well, which is the hardest part in high dimensions.
- NFL transfer: genuine randomized mediator experiments are impossible in observational NFL data; A3 must be defended per application, not assumed.

## 10. GSE overlap
- **New capability.** The existing-research-map contains **no mediation analysis** — the causal entries are CEPT (Garrett's own theory), FineCausal, and the paired home/away paper in this same wave; the commissioned ML-brief "causal inference" topic has results pending. Direct/indirect decomposition of any NFL effect is absent from the 468-file corpus.
- Adjacent: GSE's luck-layer work (turnover occurrence vs. recovery, special-teams EPA splits) decomposes *variance*, not *causal pathways* — a weather→totals analysis today cannot separate the direct physical path (wind on passes) from the mediated path (wind → conservative play-calling → fewer deep shots). This paper's machinery is the formal tool for that separation.

## 11. GSE implementation spec
- **Data:** nflverse pbp 2015–2025 + stadium weather (existing barometric-pressure benchmark work). Question: decompose the causal effect of **wind speed** (continuous exposure A) on **total points** (Y) into direct effect (physics: pass efficiency) vs. indirect effect mediated by **play-calling** (Z = deep-pass rate / neutral pass rate / pace). Confounders W: temperature, precipitation, dome/outdoor, team offensive/defensive EPA priors, week, rest.
- **Intervention:** modified treatment policy d(a,w) = max(a − δ, 0) — "what if wind were δ mph lower" (Example 1 analog), δ ∈ {5, 10} mph. A1 holds (piecewise linear, invertible).
- **Estimation:** install the `medshift` R package; nuisance regressions via Super Learner (xgboost + ranger + glmnet + HAL) with 5-fold cross-fitting per eq. 16; θ̂(δ) for the direct component, ψ̂(δ) via the same package's total-effect routine; direct = θ̂ − Ȳ, indirect = ψ̂ − θ̂; Wald CIs from the EIF variance.
- **Assumption check:** explicitly argue A3 — the dangerous confounder is an unmeasured variable affecting both play-calling and scoring conditional on weather (e.g., game script); mitigate by including score differential and time remaining in W, and run the no-direct-effect uniform test as a specification check.
- **Serving:** offline research artifact — one table per season: direct vs. indirect wind effect on totals, feeding the totals model as a decomposed weather adjustment. Re-run annually.
- **Effort estimate:** 3–4 days (R package is pre-built; most time goes to assembling the weather×pbp panel and the A3 defense write-up).

## 12. Reproducible test
- **Dataset:** nflverse pbp 2015–2024 regular-season games with matched stadium weather (wind speed in mph), outcomes = total points; mediators = neutral-situation deep-pass rate (air yards ≥ 15) and seconds/play; confounders = temperature, precipitation indicator, dome flag, both teams' season-to-date offensive/defensive EPA.
- **Metric:** PIDE and PIIE at δ = 10 mph wind reduction, with 95% EIF-based CIs.
- **Baseline:** the naive total weather effect on totals (regression of total points on wind) — the decomposition must attribute a **statistically significant indirect share** (PIIE CI excluding 0) to count as adding value over the naive total effect GSE could already estimate.
- **Window:** fit on 2015–2022, confirm sign and significance of PIIE on 2023–2024 holdout.

## 13. Acceptance / rejection gate
- **Adopt** the medshift mediation module into the totals-model weather adjustment if on 2015–2022: (a) PIIE at δ=10 mph is significant at 5% with the expected sign (wind reduction → more deep passes → more points), (b) the sum PIDE+PIIE agrees in sign with the naive total wind effect, and (c) the holdout 2023–2024 PIIE keeps its sign.
- **Reject** if PIIE is null while the naive total effect is significant (mediation adds nothing — a single wind coefficient suffices), or if the direct/indirect split is unstable across the fit/holdout windows (sign flip), or if A3 cannot be defended after including game-script controls — then the decomposition is not credible on NFL observational data and GSE stays with total-effect weather adjustments.

## 14. Improvement experiment
Extend the decomposition to **multiple ordered mediators** (wind → play-calling → time-of-possession → points) by chaining two medshift decompositions: first decompose wind's effect with play-calling as Z, then decompose play-calling's effect (as exposure) with TOP as mediator. This goes beyond the paper's single-mediator-layer setup (the paper allows multivariate Z but treats it as a joint block) and would tell GSE *where* in the causal chain the wind effect concentrates — if the second-stage indirect path dominates, the totals adjustment should key off pace projections rather than raw wind speed.
