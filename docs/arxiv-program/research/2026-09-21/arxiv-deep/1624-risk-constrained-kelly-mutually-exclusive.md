# 1624 Risk-Constrained Kelly for Mutually Exclusive Outcomes (arXiv:2604.11577)

**Citation:** Long, C. D. (2026). *Risk-Constrained Kelly for Mutually Exclusive Outcomes: CRRA Support Invariance and Logarithmic One-Dimensional Calibration*. arXiv:2604.11577. URL: https://arxiv.org/abs/2604.11577
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — a closed-form risk-constrained Kelly (CRRA risk penalty with a log-scale one-dimensional calibration) that cuts stakes under edge uncertainty; directly usable as GSE's conservative sizing mode.

## 1. Research question
How can the Kelly criterion be modified so that the bettor's risk aversion (CRRA) constrains the optimal stakes, while preserving Kelly's support structure (which outcomes get bet) and remaining computationally trivial to calibrate?

## 2. Dataset / schema
No external dataset. Pure theory plus one fully worked numerical illustration: ternary event with p=(0.50,0.30,0.20), state prices q=(0.45,0.35,0.30) (overround total 1.10), risk-aversion parameter γ=1 and constraint exponent λ=2.

## 3. Method / model
Impose a risk constraint of the form Σ_i p_i W_i^{−λ} ≤ 1 on the Kelly problem (W_i = terminal wealth per outcome). The paper's support-invariance result: in overround markets, the constrained and unconstrained optimizers share the same "likelihood-ratio prefix" support — i.e. the same set of outcomes is active (sorted by edge ratio p_i/q_i), only the cash level and stake magnitudes change. Calibration reduces to a one-dimensional root-find on the log scale: solve for the constrained scalar s* via the KKT system, then recover cash c* and stakes.

## 4. Equations & assumptions
- Risk constraint: Σ_i p_i W_i^{−λ} ≤ 1, with CRRA risk-aversion parameter γ and constraint exponent λ.
- Numerical illustration (p=(0.50,0.30,0.20), q=(0.45,0.35,0.30), γ=1, λ=2, overround 1.10):
  - Unconstrained: cash c=.9091, stake on outcome 1 x1=.0909; risk measure R(0)=1.01.
  - Constrained solve: s*=.3794, z1=1.1433, c*=.9394, W1*=1.0740, constrained stake x1*=.0606 (a one-third stake cut versus the unconstrained .0909).
- Assumptions: mutually exclusive outcomes; CRRA utility; overround market (Σq_i>1); the support-invariance result is stated for the overround case.

## 5. Features / target
Input: p (bettor probabilities), q (state prices), risk-aversion γ, constraint exponent λ. Target: constrained-optimal cash c* and stake vector x*. Not a prediction model.

## 6. Validation design
Exact derivation (KKT analysis) plus the numerical illustration comparing constrained vs unconstrained stakes. No empirical backtest.

## 7. Numerical results / baselines
- Unconstrained Kelly: c=.9091, x1=.0909, R(0)=1.01 (constraint violated at R(0)=1.01>1).
- Risk-constrained (λ=2): s*=.3794, z1=1.1433, c*=.9394, W1*=1.0740, x1*=.0606 — stake cut from .0909 to .0606 while the active outcome set is unchanged (support invariance).
- Paper's claim: the constrained optimizer keeps the same likelihood-ratio-prefix support as unconstrained Kelly in overround markets; calibration is one-dimensional.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No empirical validation; the example is a single hand-picked ternary event. The risk constraint Σ p_i W_i^{−λ} ≤ 1 is a mathematical convenience — its economic interpretation (which downside it actually guards against) is thinner than a drawdown or ruin constraint. Still requires accurate p; risk-aversion γ and λ are free parameters with no calibration guidance. Support invariance is proven for overround markets only.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): Kelly sizing is a known GSE topic with zero prior paper reads — new capability, not a duplicate. GSE currently has no risk-constrained (CRRA-penalized) sizing mode; this fills that gap.

## 11. GSE implementation spec
Add a "conservative sizing" mode to the GSE engine: (1) after computing unconstrained Kelly stakes from calibrated p and market q, check the constraint Σ p_i W_i^{−λ} ≤ 1 (start with λ=2); (2) if violated, solve the one-dimensional log-scale KKT system for s* and rescale cash/stakes (closed form given the shared support); (3) expose γ as a user-facing risk slider (1 = full-Kelly-equivalent boundary, higher = more conservative). Effort: 1–2 days; fits in the existing staking module.

## 12. Reproducible test
Dataset: GSE 2025–2026 season picks (engine p, closing-line q). Test: season replay comparing unconstrained Kelly vs risk-constrained Kelly (γ=1, λ=2) vs half-Kelly. Metrics: final bankroll, max drawdown, 5th-percentile terminal wealth. Baseline to beat: half-Kelly on max drawdown and 5th-percentile wealth.

## 13. Acceptance / rejection gate
ADOPT if risk-constrained Kelly achieves ≥90% of unconstrained Kelly's final bankroll with max drawdown at least 20% smaller than half-Kelly's, on the 2025–2026 season replay; otherwise REJECT.

## 14. Improvement experiment
Fit λ and γ on a rolling validation window (choose the pair maximizing the 5th-percentile terminal bankroll rather than the mean), then test whether the fitted pair transfers across sports (NFL→NBA) — if γ needs refitting per sport, build a per-market risk-profile table.
