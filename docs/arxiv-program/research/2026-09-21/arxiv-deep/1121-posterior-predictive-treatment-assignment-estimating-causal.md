# [1121] Posterior Predictive Treatment Assignment for Estimating Causal Effects with Limited Overlap (arXiv:1710.08749v1)

**Citation:** Corwin M. Zigler, Matthew Cefalu (2017). *Posterior Predictive Treatment Assignment for Estimating Causal Effects with Limited Overlap*. arXiv:1710.08749v1. URL: https://arxiv.org/abs/1710.08749
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; method/equations, computation, estimand interpretation, simulation, application, and full discussion read).
**Verdict:** ADAPT — PPTA is the principled Bayesian replacement for ad-hoc propensity trimming that GSE's causal lane needs for limited-overlap problems (e.g., QB/coordinator changes with few treated units); adopt the design, not the power-plant application.

## 1. Research question
How can we estimate causal effects when propensity-score overlap is poor — without the ad-hocery of weight truncation or sample pruning? The paper proposes **Posterior Predictive Treatment Assignment (PPTA)**: a two-stage Bayesian procedure that stochastically includes each unit in the analysis with probability equal to the posterior-predictive probability its treatment assignment *differs* from what was observed — concentrating inference on the overlap population while propagating design uncertainty.

## 2. Dataset / schema
- **Simulation:** 500 datasets, n=500, five normal covariates; confounding strength parameter B varied 0 → 2.5; true outcome effect 0.2.
- **Application:** US power plants, 2002–2014 (yearly analyses); yearly n = **1,505–2,028**; treatment prevalence **15%–47%** (scrubber installation / emissions controls).
- Access: simulation DGP described; power-plant data from public EPA sources (not redistributed by the paper).

## 3. Method / model
- Setup: binary treatment A∈{0,1}, covariates X, potential outcomes (Y₀,Y₁), **strong ignorability** assumed; marginal structural model **E(Y_a) = θ + Δa**.
- **Inclusion indicator S_i** per unit; PPTA inclusion probability = P(posterior-predictive treatment assignment ≠ observed treatment | data).
- **Two-stage modular Bayesian** design: stage 1 (design) fits the propensity model and simulates S; stage 2 (analysis) estimates the effect given S — with **no outcome feedback** into the design stage (modularization / "cutting feedback").
- Computation: **m₁** propensity/design MCMC simulations; for each S draw, **m₂** outcome-model chains; combine m₁×m₂ posterior draws.

## 4. Equations & assumptions
- MSM: E(Y_a) = θ + Δa. Inclusion: S_i ~ Bernoulli(p_i), p_i = P(A_i^rep ≠ A_i^obs | X, data) under the posterior-predictive treatment model.
- Estimand: an **overlap-population effect (ATO)** in the spirit of Li et al. (2016) — *not* necessarily the full-population ATE.
- Assumptions: strong ignorability (no unmeasured confounding); correct propensity-score specification for the design stage; SUTVA (implicit).

## 5. Features / target
- Features: covariates X (design), treatment A, outcome Y. Target: causal effect Δ (average effect on the overlap population).

## 6. Validation design
- Simulation: 500 replications across worsening overlap (B = 0 → 2.5); comparators: IPTW, truncated IPTW (IPTWt50), Crump et al. pruning, overlap weights. Metrics: bias and variability of the effect estimate.
- Application: covariate balance (standardized differences) and interval widths across 13 yearly analyses; Figure 5 shows point estimates + 95% intervals for all methods across years.

## 7. Numerical results / baselines
- Simulation (paper's qualitative-but-clear report): **PPTA and overlap weights had the least variability** as overlap worsened; **IPTW became unstable and biased** under poor overlap.
- Application: PPTA achieved **near-zero standardized differences** (best balance) but **wider intervals** than competitors — honest uncertainty.
- Discussion's verdict: PPTA results were **more credible than IPTW (with or without truncation)** in light of subject-matter knowledge of the emissions-control technology.

## 8. Code / data availability
- None stated in paper.

## 9. Leakage & limitations
- **The estimand moves with S**: the paper is admirably honest — "there is no guarantee that the procedure averages over a single quantity; the causal estimand may vary with S." If GSE needs the ATE, PPTA doesn't promise it. (b) **Wider intervals** — the price of honesty; decision thresholds must account for it. (c) m₁×m₂ MCMC is expensive relative to closed-form weighting. (d) Strong ignorability is untestable; the power-plant application leans on domain knowledge GSE must supply for football. (e) No code.

## 10. GSE overlap
- Existing-research map: causal inference is an ML-brief commissioned topic (results pending); **Garrett's own CEPT ("Baxley Causal E-Process Theory") is a WIP publication lane — cite, do not duplicate.** Related ledgers: `0142-the-counterfactual-combine-a-causal-framework.md`, `0265-framing-causal-questions-in-sports-analytics.md`, `0272-causal-mediation-analysis-for-stochastic-interventions.md`, `0771-transfer-learning-for-causal-effect-estimation.md`. None implement limited-overlap Bayesian treatment-effect estimation — this is an **extension** (the "what to do when overlap is poor" sub-problem).

## 11. GSE implementation spec
- **Use case:** causal questions with few treated units and poor overlap — e.g., effect of mid-season QB changes, coordinator firings, or rest advantages on EPA/success rate.
- **Implementation:** PyMC/Stan; stage 1: Bayesian logistic propensity model on matchup covariates → posterior-predictive inclusion probabilities; stage 2: Bayesian outcome model on each included subset; pool m₁×m₂ draws. Enforce the no-outcome-feedback modularization.
- **Data:** nflverse play-by-play (2015–2024), game-level treatment definitions.
- **Effort:** ~2–3 engineer-weeks (MCMC plumbing is the cost).

## 12. Reproducible test
- **Semi-synthetic NFL:** take 2018–2023 games, simulate a known QB-change effect (Δ = +0.05 EPA/play) with realistic confounding (bad teams change QBs more). Compare PPTA vs IPTW vs overlap weights on bias, RMSE, and 95% interval coverage over 200 replications.

## 13. Acceptance / rejection gate
- **Adopt** if PPTA achieves coverage ≥90% with bias ≤50% of IPTW's bias under the poor-overlap regime, at ≤20% wider intervals than overlap weights; **reject** otherwise (if overlap weights match it, take the cheaper estimator).

## 14. Improvement experiment
- **Continuous-treatment PPTA:** extend the inclusion probability to continuous exposures (e.g., snap share, target share) via posterior-predictive *density* contrast instead of binary mismatch. The paper is binary-only; GSE's exposures are mostly continuous doses. Pair with a BART outcome model in stage 2 and test whether the stochastic-inclusion design still stabilizes inference where IPTW-style weighting blows up.
