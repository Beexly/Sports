# 1635 Portfolio Benchmarking under Drawdown Constraint and Stochastic Sharpe Ratio (arXiv:1610.08558)

**Citation:** Agarwal, A. & Sircar, R. (2018). *Portfolio Benchmarking under Drawdown Constraint and Stochastic Sharpe Ratio*. arXiv:1610.08558v1 [q-fin.PM], this version 19 Sep 2018. URL: https://arxiv.org/abs/1610.08558
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — drawdown-constrained utility maximization with wealth benchmarked to its running maximum; gives GSE the wealth-to-peak ratio ξ as a principled state variable for stake scaling plus a hard stop-barrier rule. (Spare number; replaces rejected 1631.)

## 1. Research question
How should an investor maximize expected utility of terminal wealth measured relative to the running maximum (high watermark) under a hard drawdown constraint, when volatility itself is stochastic — and how different is the optimal strategy from the constant-volatility answer?

## 2. Dataset / schema
No external dataset. Numerical study in a Heston-type local-stochastic-volatility (LSV) model with market-calibrated parameters. Utility functions tested: U(ξ)=ξ^{1−γ}/(1−γ) with γ=3.0, and a two-term mixture with γ_1=3.0, γ_2=1.5.

## 3. Method / model
Maximize E[U(L_T/M_T)] — utility of discounted terminal wealth relative to its running maximum — subject to the hard drawdown constraint L̄_t ≥ αM̄_t a.s. Derive the HJB equation; optimal strategy π* = −[(µ−r)V_l + ρβσV_{yl} + σ²V_{xl}]/(σ²V_{ll}). Reduce dimensionality via ξ = l/m ∈ [α,1] (wealth-to-peak ratio) to a PDE for Q(t,ξ,x,y). At the barrier, the Dirichlet condition V(t,αm,m,x,y)=U(α): hitting the drawdown limit means stop trading the risky asset. Solve by coefficient expansion in the stochastic-vol parameters, using regularity of the risk-tolerance function R(t,ξ) (which satisfies its own nonlinear PDE, Prop. 1) to compute correction terms numerically.

## 4. Equations & assumptions
- Objective: V(t,l,m,x,y) = sup_π E[U(L_T/M_T)] with drawdown constraint L_s ≥ αM_s a.s.
- Optimal strategy: π* = −[(µ(x,y)−r)V_l + ρβ(y)σ(x,y)V_{yl} + σ²(x,y)V_{xl}] / [σ²(x,y)V_{ll}].
- Sharpe-ratio function: λ(x,y) := (µ(x,y)−r)/σ(x,y).
- Barrier condition: V(t,αm,m,x,y) = U(α) — stop trading at the drawdown barrier; Neumann condition V_m(t,m,m,x,y)=0 at the peak.
- Numerical findings: as ξ→1 (near the high watermark) the optimal policy gradually liquidates the risky position; with the stochastic-vol correction the investor holds the risky position longer near the peak, then liquidates sharply to guard downside; at y=1.05θ (vol above long-run mean) invest more than the constant-vol policy π_0 and build up faster away from the barrier; at y=0.95θ invest less but hold more near the peak. The SV correction to the value function is small, but the corrected strategy π_0+π_1 is "remarkably different" from π_0.
- Assumptions: frictionless LSV market; smooth strictly concave bounded utility on (α,1); coefficient-expansion truncation is accurate (no error analysis — stated as future work).

## 5. Features / target
Input: wealth-to-peak ratio ξ, stochastic-vol factor y, calibrated model parameters. Target: optimal risky allocation π*(t,ξ,x,y). A control policy, not a predictor.

## 6. Validation design
Numerical solution of the expansion terms; comparison of π_0 vs π_0+π_1 policies across ξ∈[0.4,1] and volatility regimes (y=θ, 1.05θ, 0.95θ); value-function correction shown to be small while policy differences are large. No real-data backtest.

## 7. Numerical results / baselines
- Relative utility correction from stochastic volatility: small across all tested cases.
- Policy differences: large — SV-corrected policy holds risky assets longer near the peak, liquidates sharply, and builds positions faster away from the barrier when vol is elevated.
- Paper's claim: ignoring stochastic volatility costs little value but produces a "remarkably different" (and worse-positioned) strategy.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Continuous-time diffusion model — a long way from GSE's discrete bets; no empirical validation; no approximation-error analysis (authors flag it as future work); single-asset only (multi-asset flagged as future work). The "stop trading at the barrier" rule is optimal only inside the model's assumptions. Market-calibrated parameters are not published in reusable form.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE has no wealth-to-peak state variable or barrier-stop rule in its staking — new capability. Complements 1628 (drawdown modulator) and 1629 (worry thresholds): this paper supplies the utility-theoretic foundation for ξ-based scaling.

## 11. GSE implementation spec
(1) Track ξ = current bankroll / peak bankroll as a first-class state variable in the staking engine; (2) define the barrier α (e.g. 0.80): stakes scale down as ξ→α following the paper's qualitative shape (gradual near the peak, sharp near the barrier) and halt at ξ≤α until recovery; (3) add a volatility-regime input (trailing realized vol of pick returns vs its long-run mean) that shifts the scaling curve the way y vs θ shifts π_0+π_1; (4) log ξ at every slate for post-hoc analysis. Effort: 3–4 days.

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026. Test: replay with ξ-scaled stakes (barrier α=0.80, regime-shifted curve) vs flat Kelly-fraction stakes. Metrics: final bankroll, max drawdown (must stay above α in the replay), fraction of time staked at full scale. Baseline to beat: flat staking on max drawdown.

## 13. Acceptance / rejection gate
ADOPT if the ξ-scaled replay keeps realized drawdown above the α barrier (no barrier breach) while retaining ≥90% of flat staking's final bankroll on 2025–2026; otherwise REJECT.

## 14. Improvement experiment
Fit the ξ-scaling curve's shape parameter on GSE data directly (rather than borrowing the paper's qualitative shape) by grid-searching the peak-vs-barrier curvature to maximize drawdown-adjusted bankroll — then test whether the fitted shape transfers across sports.
