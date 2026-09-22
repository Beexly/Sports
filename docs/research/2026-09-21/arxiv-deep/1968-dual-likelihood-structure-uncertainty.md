# [1968] Dual Likelihood for Causal Inference under Structure Uncertainty (arXiv:2402.08328)

**Citation:** David Strieder, Mathias Drton (2024). *Dual Likelihood for Causal Inference under Structure Uncertainty*. arXiv:2402.08328. URL: https://arxiv.org/abs/2402.08328
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; §§1–4, test-inversion framework, dual-likelihood derivation, simulation §4.2, conclusion).
**Verdict:** ADAPT

## 1. Research question
Standard practice learns a causal structure from data and then computes confidence intervals for effects *as if the structure were known* — ignoring model-selection uncertainty (bootstrapping also fails due to singularities at model intersections). Can we construct confidence regions for total causal effects that rigorously capture both uncertainty sources — the causal structure and the numerical effect size — with a tractable closed-form solution?

## 2. Dataset / schema
Simulation only: 1000 synthetic datasets per setting from linear SCMs on randomly selected DAGs; edge weights ~ N(β, 0.1) for a range of average direct-effect strengths β; errors ~ standard normal. Confidence regions computed for the total causal effect C(1→2) at confidence level α = 0.05, across sample sizes. Baseline: the LRT (likelihood-ratio-test inversion) method of Strieder & Drton 2023.

## 3. Method / model
Dual-likelihood test inversion:
- Framework: invert hypothesis tests over *all attainable* total causal effects — values not rejected form the confidence region (classical test/confidence-region duality). This folds data-driven model choice into inference.
- Innovation: replace the Gaussian likelihood with the *dual likelihood* for Gaussian graphical models (maximizing Gaussian likelihood ⟺ a KL-divergence minimization with sample covariance; the dual is "reciprocal" to the Gaussian likelihood). The dual likelihood ratio test for constrained total effects has a **closed-form solution** — no grid search / numerical optimization per effect value.
- Identifiability setting: linear SCMs with Gaussian errors and **equal error variances** (this restriction renders the causal structure identifiable from observational data).
- Computation: bottom-up procedure starting from *sink nodes*, recursively searching causal orderings in reverse and rejecting implausible partial orderings early via the unrestricted partial dual-likelihood estimate — vs. the earlier top-down (source-first) procedure. Computational shortcuts (pruning implausible orderings) make it feasible for "moderate dimensions"; authors suggest alternating bottom-up/top-down could be even faster.

## 4. Equations & assumptions
- Model: linear SCM, X = BX + ε, ε ~ N(0, σ²I) (equal error variances), B permutable to strictly lower-triangular (DAG).
- Dual likelihood: reciprocal of the Gaussian likelihood in the sample covariance; dual LR test statistic equals the classical LR statistic for a modified problem (total effects ↔ direct effects correspondence).
- Critical values: conservative asymptotic χ² bounds give a simple upper bound on the dual-LR statistic's distribution.
- Assumptions: linearity, Gaussian equal-variance errors, acyclicity, causal sufficiency (implicitly — no latent variables in the model class).

## 5. Features / target
Inputs: observational data matrix + a query pair (treatment → outcome). Target: a confidence region for the *total* causal effect C(i→j) that is valid uniformly over the unknown causal structure.

## 6. Validation design
Simulation: empirical coverage frequencies vs sample size (Table in §4.2); region width and computation time vs the Strieder–Drton-2023 LRT method across β (effect strengths) and n. No real data; no time-ordered splits (i.i.d. linear SCM draws).

## 7. Numerical results / baselines
- Coverage: "achieve the desired coverage in all our simulation settings, even in low sample sizes" (95% nominal) despite conservative asymptotic critical values.
- Width: "the difference in performance between both methods seems negligible" — dual-likelihood regions are essentially as tight as the expensive LRT-inversion regions.
- Speed: "computation times ... significantly lower than the competition"; closed form "crucial" under high structure uncertainty where repeated numerical optimization is infeasible. Exact timing numbers live in figures (not quoted in text).
- Qualitative: regions "successfully pick up on the direction and the numerical size of the total causal effect while correctly quantifying the remaining uncertainty in structure as well as effect size."

## 8. Code / data availability
No code link stated in the paper. Simulation recipe fully specified (1000 datasets/setting, N(β,0.1) weights, standard-normal errors).

## 9. Leakage & limitations
Adversarial notes: (1) Equal error variances is a strong, untestable identifiability crutch — sports indicators have wildly unequal variances (EPA vs turnover rates); the paper's guarantees evaporate without it, and there's no diagnostic for "close enough". (2) Linear Gaussian only — nonlinear sports effects unaddressed. (3) "Moderate dimensions" — superexponential structure space still bites; d≈35 sports indicators may exceed "moderate" without aggressive pruning. (4) Conservative asymptotic critical values → regions may be wider than necessary in practice. (5) No public code — reimplementation of dual-likelihood estimation + bottom-up search required. (6) Causal sufficiency assumed — conflicts with ledger 1965's latent-confounder reality; the two methods' uncertainty notions don't compose out of the box.

## 10. GSE overlap
New capability — uncertainty quantification *over structures*, which no ledger so far provides (1962–1966 output point graphs; 1967 validates them). The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has conformal prediction (2208.08598) for *predictive* uncertainty but nothing for *causal* uncertainty. Directly serves Garrett's calibration mandate: GSE publishes causal claims in content ("pressure causes sacks causes defensive EPA") — this is the machinery to attach honest intervals that account for not knowing the graph. Extension, not duplicate.

## 11. GSE implementation spec
- Data: nflverse team-season aggregates (cross-sectional; equal-variance assumption already strained — standardize all indicators first, which the method's scale-sensitivity effectively requires).
- Use case: for each high-confidence edge in the quarterly causal graph (ledgers 1962–1966 consensus), compute the dual-likelihood 95% confidence region for the total causal effect (e.g. C(pressure rate → defensive EPA/play)).
- Pipeline: prune ordering space with the DAGuerreotype ordering (ledger 1966) before the bottom-up search; compute regions for the top-20 edges by |effect|; store (edge, effect CI) in the graph artifact.
- Content rule: any published causal claim must cite the interval; claims whose CI covers 0 are downgraded to "associated with" language.
- Effort: ~4 engineer-days (no public code; math fully specified).

## 12. Reproducible test
Dataset: simulated linear-Gaussian equal-variance SCMs at sports-like dimensions (d=20, n=380 team-seasons) with known effects — verify empirical coverage ≥ 0.93 at nominal 95% and median width within 20% of the oracle-structure interval. Then on real team-season data: compute CIs for 20 consensus edges; check (a) runtime < 10 min total with ordering-space pruning, (b) ≥80% of edges keep their sign (CI excludes 0) — else the graph's edges are too uncertain to publish as causal.

## 13. Acceptance / rejection gate
ADOPT dual-likelihood CIs for published causal claims if: (a) simulation coverage ≥ 0.93 at d=20, n=380; (b) real-data runtime < 10 min for 20 edges with pruning; (c) the intervals are *informative* — median width ≤ 2× the oracle-structure width (if structure uncertainty dominates to the point of useless intervals, the method reports honestly but adds no value). Reject if coverage < 0.90 or median width > 3× oracle (uncertainty too large to be actionable).

## 14. Improvement experiment
Beyond the paper: drop equal-variance via a *sensitivity* layer — compute regions under a grid of variance-ratio bounds (σ²_max/σ²_min ≤ κ for κ ∈ {1, 2, 5}) and report how CIs widen as κ grows (a "variance-robustness curve"). Hypothesis: most strong football edges (pressure→sacks) keep sign up to κ=5 while marginal edges don't — giving a principled ranking of which causal claims survive realistic variance heterogeneity, directly addressing the paper's biggest assumption without abandoning its machinery.
