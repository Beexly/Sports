# 1632 A General Framework for Portfolio Theory. Part II: Drawdown Risk Measures (arXiv:1710.04818)

**Citation:** Maier-Paape, S. & Zhu, Q. J. (2017). *A General Framework for Portfolio Theory. Part II: drawdown risk measures*. arXiv:1710.04818v1 [q-fin.RM]. URL: https://arxiv.org/abs/1710.04818
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — constructs convex drawdown risk measures inside the growth-optimal (Kelly / Vince optimal-f) framework; gives GSE a principled risk-constrained slate allocator balancing log-growth against drawdown.

## 1. Research question
Can drawdown-based risk measures be made "admissible convex risk measures" (ACRM) inside a generalized portfolio theory that already handles general concave utilities (including log utility / growth-optimal portfolios)? Part II constructs four such measures from the expected log drawdown of portfolio returns.

## 2. Dataset / schema
No external dataset. Theory with worked examples and contour plots of the risk measures (one example uses a fixed two-system allocation ϕ*=(1/5,1/5); Figure 7 shows empirical convergence of the current-drawdown risk measure as K→∞).

## 3. Method / model
Setup: M trading systems with a trade-return matrix T (N scenarios × M systems); fractional portions ϕ; terminal wealth relative TWR^K_1(ϕ,ω) = ∏_{j=1}^K (1 + ⟨t_{ωj}, ϕ⟩) from K random trade draws (the Ralph Vince optimal-f setting). Split log-TWR into up-trade and down-trade log series U^(K), D^(K). Construct two down-trade ACRMs (r_down, r_down^X) and two current-drawdown ACRMs (r_cur, r_cur^X). The X-approximations are positively homogeneous, which (via Part I's theory) gives efficient portfolios an affine linear structure — including a drawdown-risk "market portfolio." Appendix shows a one-period financial market maps into the TWR setup.

## 4. Equations & assumptions
- TWR: TWR^K_1(ϕ,ω) := ∏_{j=1}^K (1 + ⟨t_{ωj}, ϕ⟩).
- Geometric mean: Γ(ϕ) := ∏_{i=1}^N (1 + ⟨t_i, ϕ⟩)^{p_i}; E[Z^(K)(ϕ,·)] = K·ln Γ(ϕ) (Theorem 3.2) — the growth-optimal objective.
- Risk-measure orderings: r_down(ϕ) ≥ r_down^X(ϕ) ≥ 0; r_cur(ϕ) ≥ r_cur^X(ϕ) ≥ 0; r_cur(ϕ) ≥ r_down(ϕ) and r_cur^X(ϕ) ≥ r_down^X(ϕ) (equation 6.1).
- Assumptions: Assumption 2.3 on the trade-return matrix plus a no-arbitrage market; K→∞ convergence of the risk measures is empirically supported (Figure 7) but unproven (stated open question); Part III (applications) was "in preparation" at publication.

## 5. Features / target
Input: trade-return matrix T, scenario probabilities p, allocation ϕ. Target: drawdown risk values r_down/r_cur (and approximations) used as constraints in the Part-I efficient-frontier problem. A risk-measurement framework, not a predictor.

## 6. Validation design
Proofs that the four constructions satisfy the ACRM definition; ordering theorems; contour-plot examples; empirical convergence illustration (Figure 7). No real-data backtest.

## 7. Numerical results / baselines
No numeric performance results — the results are the constructions and orderings themselves. Empirical evidence (Figure 7) supports convergence of r_cur as K→∞ for the ϕ*=(1/5,1/5) example, but convergence is unproven.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Heavy theory with no empirical validation and no code; the K→∞ convergence the framework wants is empirical-only. Part III (promised applications) appears never to have materialized — treat applied claims cautiously. Estimating the trade-return matrix T from GSE's pick history introduces the usual small-sample risk, and the framework assumes the scenario probabilities p are known.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE has no drawdown-constrained efficient-frontier allocator — new capability. This is the Vince optimal-f lineage, the closest academic school to bet sizing; unlike 1631 (rejected), it keeps the growth-optimal (Kelly) objective and adds drawdown as a convex risk measure.

## 11. GSE implementation spec
(1) Treat GSE's bet categories (spreads, totals, moneylines, props) as the M "trading systems"; build the trade-return matrix T from historical per-category pick returns at unit stakes; (2) implement the r_cur^X (positively homogeneous) current-drawdown risk measure via Monte Carlo trade-draw equity curves; (3) solve the Part-I efficient problem: maximize E[log TWR] subject to r_cur^X(ϕ) ≤ budget — a convex problem by construction; (4) map the optimal ϕ to per-category Kelly-fraction caps. Effort: 1–2 weeks (convex solver + Monte Carlo risk evaluation).

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026 grouped by category. Test: build T from 2024, solve the drawdown-constrained allocation, replay 2025–2026 at the constrained ϕ vs unconstrained category-Kelly. Metrics: final bankroll, max drawdown, 5th-percentile terminal wealth. Baseline to beat: unconstrained Kelly on max drawdown with ≥90% of its bankroll.

## 13. Acceptance / rejection gate
ADOPT if the r_cur^X-constrained allocation cuts max drawdown ≥25% versus unconstrained category-Kelly while keeping ≥90% of final bankroll on the 2025–2026 replay; otherwise REJECT.

## 14. Improvement experiment
Replace the empirical scenario probabilities p with the engine's forward calibrated probabilities (rather than historical frequencies) when building T, and test whether the forward-looking risk measure produces a better growth/drawdown tradeoff — this fuses the paper's framework with GSE's calibration edge.
