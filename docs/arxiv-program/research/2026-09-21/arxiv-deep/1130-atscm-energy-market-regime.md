# [1130] ATSCM: Adaptive Time-varying Structural Causal Model for Energy Market Regime Detection (arXiv:2511.04361)

**Citation:** Authors (2025). *ATSCM Energy Market Regime Detection*. arXiv:2511.04361v2. URL: https://arxiv.org/abs/2511.04361
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 5 pages — the entire paper).
**Verdict:** REJECT — a five-page workshop proposal with zero empirical content: no dataset, no experiment, no baseline, no numerical result, and the authors explicitly list "empirical validation" as future work. There is nothing to reproduce, test, or adapt; it is replaced by reserve ledger 1318.

## 1. Research question
Proposes (not tests) an adaptive time-varying structural causal model (ATSCM) for detecting regime changes in energy markets: a three-level architecture with interpretable factors, latent dynamics, and observations, plus a learned time-varying causal graph.

## 2. Dataset / schema
None. No dataset is named, sized, or described. The paper claims "competitive forecasting performance" in the abstract but presents no data section, no sample, and no numbers.

## 3. Method / model
Conceptual architecture only: three levels — interpretable factors Wᵗ ∈ ℝ²⁷, latent dynamics Iᵗ, observations Vᵗ ∈ ℝ³⁵; a time-varying graph Gᵗ = f_discovery(V¹:ᵗ, W¹:ᵗ; θ_disc); objective = reconstruction + causal + counterfactual + discovery losses. Training procedure, hyperparameters, and graph-discovery algorithm details are not given.

## 4. Equations & assumptions
Only the architecture sketches above (Wᵗ, Iᵗ, Vᵗ, Gᵗ notation). No theorems, no identification assumptions stated. "No equations stated" applies to anything testable; the notation is definitional.

## 5. Features / target
Not stated — no features listed beyond the dimensionalities (27 factors, 35 observables).

## 6. Validation design
None. The authors list "empirical validation" as future work.

## 7. Numerical results / baselines
None. Zero numbers in the paper. The "competitive forecasting performance" claim is unsupported by any table, figure, or metric.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
The paper's central empirical claim ("competitive forecasting performance") has no evidence behind it — it cannot be evaluated for leakage because there is no experiment. The contribution is a design sketch.

## 10. GSE overlap
None — and that is not the reason for rejection. The reason is the absence of any empirical content; per Garrett's standard, only work with real, testable value counts, and a result-free proposal cannot meet the bar that every other ledger in this program meets.

## 11. GSE implementation spec
Not applicable — rejected.

## 12. Reproducible test
Not applicable — there is no claim to test. A future empirical version of ATSCM could be screened normally.

## 13. Acceptance / rejection gate
REJECT: no dataset, no results, no baselines, validation explicitly deferred. Replaced by reserve 1318 per the replace-on-reject rule.

## 14. Improvement experiment
Not applicable.

---
**Replacement:** ledger 1318 (reserve) — arXiv replacement paper, full read, to follow.
