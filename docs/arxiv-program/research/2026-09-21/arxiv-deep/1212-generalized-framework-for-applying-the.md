# [1212] Generalized framework for applying the Kelly criterion to stock markets (arXiv:1806.05293)

**Citation:** Tim Byrnes, Tristan Barnett (2018). *Generalized framework for applying the Kelly criterion to stock markets*. arXiv:1806.05293. URL: https://arxiv.org/abs/1806.05293
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — use the exact multivariate Kelly first-order condition as the sizing engine for GSE's correlated simultaneous-pick slates, but replace the paper's unconstrained linear solve with a cash/drawdown-constrained convex program and solve the exact nonlinear condition for realistic (non-small) edges.

## 1. Research question
The paper asks how to generalize the Kelly criterion from a single gamble to portfolios of multiple simultaneous investments with arbitrary return distributions and correlations: what is the exact optimality condition, when does a closed-form approximation exist, and how do correlations between investments change the optimal fractions?

## 2. Dataset / schema
No empirical dataset. Worked examples use assumed distributions (general single distribution, Gaussian returns) with illustrative parameters. The paper is theoretical; numerical examples are pedagogical.

## 3. Method / model
Derive the exact first-order condition for the Kelly fraction by differentiating expected log growth. For one investment with return function k(x) and density p(x): ∫ k(x)·p(x)/(1 + f·k(x)) dx = 0. For L simultaneous investments: ∫ k_l(x_l)·p(x)/(1 + Σ_{l'} f_{l'}·k_{l'}(x_{l'})) dx = 0. Expand the denominator to first order to obtain a linear system M·f = b, where M uses return first and second moments and b uses expected returns — i.e., a moment-based closed form. Analyze how the correlation structure in M shifts the optimal fractions.

## 4. Equations & assumptions
- Single investment: ∫ k(x)·p(x)/(1 + f·k(x)) dx = 0
- Multivariate: ∫ k_l(x_l)·p(x)/(1 + Σ_{l'} f_{l'}·k_{l'}(x_{l'})) dx = 0, for l = 1..L
- First-order approximation: M·f = b, with M_{ll'} = E[k_l·k_{l'}], b_l = E[k_l]
- Arbitrary single distribution: f = (E[x]/x0 − 1)/(1 + E[x²]/x0² − 2·E[x]/x0)
- Gaussian case: f = μ/(μ² + σ²)
Assumptions: known return distributions, log utility, the linear approximation valid only for small parameters (authors' own warning). Key qualitative result: positive correlation between investments reduces optimal fractions; negative correlation increases them.

## 5. Features / target
Not a prediction paper. Inputs: return distributions (or first/second moments) of simultaneous investments and their correlations. Target: optimal Kelly fraction vector f.

## 6. Validation design
Analytic derivation plus illustrative numerical examples. No train/test split, no empirical validation, no baselines. The authors note the GBM approximation agrees with μ/σ² only for small μ and σ.

## 7. Numerical results / baselines
No empirical results; the paper's "results" are the formulas and the qualitative correlation findings:
- f = μ/(μ² + σ²) for the Gaussian case.
- Positive correlation reduces optimal fractions; negative correlation increases them.
- Author warning: the linear (M·f = b) approximation is valid only for small parameters; solve the exact nonlinear condition for larger values. (This is my reading of their stated warning.)

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage — but also no demonstration that the moment-based approximation works on real correlated bets. The first-order expansion is exactly the kind of approximation that paper 1210 (1710.01787) shows can be catastrophically wrong for asymmetric payoffs — sports moneyline/parlay payoffs are far more asymmetric than the paper's examples. Unconstrained solution can imply leverage (Σf > 1) with no discussion of cash constraints. Estimation error in M (second moments of correlated sports outcomes) is not addressed.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, "portfolio-of-bets sizing" and "Kelly criterion / optimal bet sizing under uncertainty" are identified gaps with zero deep reads. GSE's current `apps/web/lib/staking/kelly-investigation.ts` sizes single bets independently — it has no multivariate/correlated-slate capability. This paper is the theoretical foundation for that missing capability: an extension, not a duplicate.

## 11. GSE implementation spec
1. Build a slate sizer: inputs = GSE per-pick edge estimates (win prob vs. market-implied prob) + outcome correlation matrix (estimated from historical same-game/same-slate co-occurrence). Solve the exact multivariate first-order condition as a constrained convex program: maximize E[log(1 + fᵀk)] s.t. Σf ≤ 1 (cash), f ≥ 0, E[drawdown] ≤ d. Effort: M–L.
2. Use the paper's M·f = b only as a warm-start initializer for the exact solver; add a regression test on an adversarial asymmetric-payoff case (cf. ledger 1210) asserting the approximate solution is never served directly. Effort: S.
3. Encode the qualitative rule as a guardrail test: increasing pairwise correlation between two +EV picks must not increase either's allocated fraction. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 NFL backtest picks with same-slate groupings and realized outcomes. Metric: realized log-bankroll growth and max drawdown of (a) current independent per-bet sizing vs. (b) multivariate slate sizer. Baseline: (a). Window fixed in advance.

## 13. Acceptance / rejection gate
ADOPT the slate sizer if it beats baseline realized log growth by ≥ 5% on the held-out season with max drawdown no worse than baseline. REJECT otherwise (keep independent sizing).

## 14. Improvement experiment
Beyond the paper: estimate the correlation matrix from a hierarchical model of GSE's calibration residuals (shared slate-level random effects) rather than raw co-occurrence, and re-derive the optimality condition under a robust (worst-case over a correlation uncertainty set) objective. Hypothesis: robust correlation-aware sizing beats point-estimate sizing when correlations are unstable week to week.
