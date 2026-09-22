# 1660 Bayesian Model Choice in Cumulative Link Ordinal Regression Models (arXiv:1503.07642)

**Citation:** Touloumis, McKinley, et al. *Bayesian Model Choice in Cumulative Link Ordinal Regression Models*. arXiv:1503.07642 (2015). Code: https://github.com/tjmckinley/BayesOrd
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; Sections 1–5 including the simulation study, dog-data application, and appendices read in full). Not an abstract-only read.
**Verdict:** ADAPT — the per-variable PO/NPO structure selection via RJ-MCMC is the right machinery for GSE's ordered-outcome models (margin buckets, result tiers), but the RJ-MCMC computational cost and out-of-range ordering risk need mitigation before adoption.

## 1. Research question

In cumulative-link ordinal regression, should each explanatory variable enter with proportional odds (PO, one common coefficient) or non-proportional odds (NPO, category-specific coefficients)? Can reversible-jump MCMC jointly perform Bayesian model choice over the 2^p PO/NPO configurations *and* variable selection, while enforcing the stochastic-ordering constraint?

## 2. Method/model

Bayesian cumulative-link ordinal model with RJ-MCMC over model space. Each variable is assigned PO or NPO structure; RJ-MCMC jumps propose adding/removing variables and switching PO↔NPO per variable. Stochastic ordering (non-crossing cumulative probabilities) is enforced by restricting proposals to a bounded hyper-rectangle defined from the observed covariate range. Random effects supported. Simulation study: 100 datasets per scenario (PO truth, NPO truth, mixed), n=1,000, 7 predictors, 3 ordinal levels; 200,000 MCMC updates, 10,000 burn-in; per-variable misclassification rates reported. Real application: dog clinical-signs data (738 dogs, repeated measures), 500,000 iterations, 50,000 burn-in, two chains.

## 3. Mathematics/equations/assumptions

- Cumulative-link: logit(P(Y ≤ k | x)) = θ_k − x'β (PO) or θ_k − x'β_k (NPO), k = 1..K−1; θ_k cutpoints.
- Stochastic ordering requires θ_k − x'β_k increasing in k ∀ observed x — enforced by bounding proposals to a hyper-rectangle from the covariate range.
- RJ-MCMC with dimension-matching proposals for PO↔NPO switches; Bayes-factor-style posterior model probabilities from chain occupancy.
- Assumptions: ordering holds over the *finite observed* covariate range (no guarantee outside it); ordinal levels correctly specified; random effects normal.

## 4. Dataset/schema

- Simulation: 100 datasets × 3 scenarios; n=1,000; 7 predictors; 3 response levels.
- Real: 738 dogs with repeated clinical measurements (veterinary study); ordinal clinical-sign severity outcome; covariates: reproductive status, age, confinement, observed clinical signs, etc.

## 5. Features and target

- Simulation: 7 synthetic predictors; target: 3-level ordinal response.
- Dog data: animal-level and observation-level covariates; target: ordinal clinical-sign severity.

## 6. Validation design

- Simulation with known truth: report per-variable PO/NPO misclassification rates across 100 replicates per scenario; model-averaged predictions.
- Dog application: two chains, convergence by visual/Gelman–Rubin inspection; posterior inclusion probabilities for variables and structures.

## 7. Exact results and baselines with numbers

- PO-truth scenario: 3/700 variable-classifications wrong = 0.43% misclassification.
- NPO-truth scenario: 229/700 wrong = 33% — NPO structure is much harder to identify (needs category-specific signal).
- Mixed scenario: 124/700 = 18% wrong, including 95 NPO→PO (under-fitting the structure) and 29 PO→NPO.
- Dog data: strong/very-strong posterior support for inclusion of reproductive status, age, confinement, and observed clinical signs; most selected covariate effects had PO structure.
- Computational cost: 500k iterations × 2 chains on 738 dogs — heavy; RJ-MCMC mixing over 2^p structures is the bottleneck.

## 8. Code/data availability

R package/code: https://github.com/tjmckinley/BayesOrd. Dog data availability not stated in text.

## 9. Leakage and limitations

- Stochastic ordering enforced only over observed covariate range — predictions for out-of-range x can violate ordering silently.
- NPO identification is weak (33% error even at n=1,000) — the method under-selects NPO structure.
- RJ-MCMC scales poorly: 2^p model space; 500k iterations for a modest dataset.
- No comparison to simpler alternatives (e.g., fit PO and NPO separately, compare by WAIC/LOO) — the RJ machinery may be overkill.
- Simulation uses only 3 ordinal levels; GSE margin buckets would have more.

## 10. GSE overlap

GSE's existing ordinal exposure (ordered logit in props work) assumes PO without testing it. This paper gives the principled way to *test* the PO assumption per variable — directly relevant to GSE's margin-bucket and result-tier models, where effects like home field may well be non-proportional across buckets. Frame as the PO-assumption audit and structure-selection module for GSE's ordinal models.

## 11. Implementation specification

- Build `gse.ordinal.StructureSelect`: cumulative-link model (logit link) on NFL margin buckets (e.g., 7 buckets: blowout loss ... blowout win) with candidate covariates (spread, total, rest, weather, home); per-variable PO/NPO selection.
- Pragmatic implementation: skip full RJ-MCMC initially — fit PO, full-NPO, and per-variable-NPO variants; select by LOO/WAIC; fall back to the paper's RJ-MCMC (via the BayesOrd code) only if LOO differences are ambiguous.
- Guard: enforce and *check* stochastic ordering on a covariate grid extending beyond the training range; reject predictions where ordering fails.

## 12. Reproducible test

- nflverse 2010–2024: 7-bucket margin model, covariates {Vegas spread, total, rest differential, dome, divisional}.
- Train 2010–2019; hold out 2020–2024. Compare PO-only vs selected-structure vs full-NPO by holdout log-loss and calibration within buckets.
- Expectation from paper: most effects select PO; home/divisional may select NPO.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** the structure-selected model beats PO-only by ≥ 0.003 log-loss on 2020–2024 holdout AND no covariate-grid point violates stochastic ordering. If the selected structure ≈ PO-only (no gain), REJECT the machinery (keep PO).
- **Improvement experiment:** (i) partial-PO via penalized category-specific coefficients (fused lasso across k) instead of hard RJ jumps — expect similar selection at 10× speed; (ii) apply to player-prop ordinal tiers (receiving-yard buckets) — expect NPO selection for matchup variables; (iii) posterior predictive checks per bucket for calibration.

**Verdict:** ADAPT — per-variable PO/NPO structure selection is the correct audit for GSE's ordinal margin models, but implement it via LOO/WAIC model comparison first and reserve the paper's costly RJ-MCMC for ambiguous cases.
