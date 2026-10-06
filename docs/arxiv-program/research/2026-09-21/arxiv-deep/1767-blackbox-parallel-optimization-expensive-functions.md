# 1767 blackbox: A Procedure for Parallel Optimization of Expensive Black-Box Functions (arXiv:1605.00998v2)

**Citation:** Paul Knysh, Yannis Korkolis (2016). *blackbox: A Procedure for Parallel Optimization of Expensive Black-Box Functions*. arXiv:1605.00998v2. URL: https://arxiv.org/abs/1605.00998
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

How to efficiently optimize expensive black-box functions (e.g., engineering simulations) using radial-basis-function response surfaces, Latin-hypercube initialization, a modified CORS sampling algorithm with space rescaling, and parallel function evaluations? A Python implementation is provided.

## 2. Dataset / schema

No dataset — methods note with a Python implementation. Test functions are standard black-box benchmarks (details in the paper's examples section).

## 3. Method / model

RBF response-surface surrogate; Latin hypercube initial design; modified CORS (Constrained Optimization using Response Surfaces) with space rescaling for infill sampling; parallel batch evaluations for multicore scaling. Standard surrogate-based optimization machinery.

## 4. Equations & assumptions

- RBF surrogate: s(x) = Σ λ_i φ(||x−x_i||) + polynomial tail.
- CORS infill: optimize the surrogate subject to a distance constraint from evaluated points, with rescaling.
- Assumptions: the black-box function is smooth enough for RBF interpolation; parallel workers are available.

## 5. Features / target

Generic: continuous decision variables → black-box objective value.

## 6. Validation design

Benchmark function tests (per the paper). No sports content whatsoever.

## 7. Numerical results / baselines

Benchmark comparisons for the optimizer itself. Nothing sports-related.

## 8. Code / data availability

Python source code provided with the paper (2016). Modern equivalents (scikit-optimize, BoTorch, nevergrad) supersede it.

## 9. Leakage & limitations

- **Generic optimizer, zero sports content:** this is a 2016 engineering-optimization note. It contains no fantasy sports, no DFS, no lineup, no tournament, no contest content of any kind.
- **Superseded:** modern Bayesian-optimization libraries (BoTorch, Ax, scikit-optimize) dominate this 2016 RBF/CORS implementation in features, maintenance, and performance.
- **Wrong problem class:** DFS lineup optimization is a discrete/combinatorial stochastic integer program, not a continuous expensive black-box function. The method doesn't apply to GSE's optimizer architecture.
- **Thin paper:** a short methods note; even as an optimizer reference it's shallow.

## 10. GSE overlap

None. The corpus has no "generic continuous black-box optimizer" ledger because none is needed — GSE's optimization is MILP/stochastic-programming based. This paper was surfaced only because ledger 1760's authors cited black-box optimization literature; the citation does not make it lane-relevant.

## 11. GSE implementation spec

None — GSE should not adopt a 2016 unmaintained RBF optimizer. If surrogate-based tuning is ever needed (e.g., hyperparameter search), use BoTorch or scikit-optimize.

## 12. Reproducible test

Not applicable — no sports claims.

## 13. Acceptance / rejection gate

**Reject** because the paper is a generic 2016 continuous black-box optimizer with zero sports/DFS content, superseded by modern libraries, and inapplicable to GSE's combinatorial lineup optimization.

## 14. Improvement experiment

None.

**Verdict:** REJECT — Generic 2016 RBF/CORS black-box optimizer with no sports content, superseded by modern libraries (BoTorch, scikit-optimize), and inapplicable to combinatorial DFS lineup optimization.
