# [2149] Risk-Sensitive Markov Decision Processes with Long-Run CVaR Criterion (arXiv:2210.08740)

**Citation:** Li Xia, Peter W. Glynn (2022). *Risk-Sensitive Markov Decision Processes with Long-Run CVaR Criterion*. arXiv:2210.08740. URL: https://arxiv.org/abs/2210.08740
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* the risk-averse counterpart to ledger 2148 (same authors' risk-seeking follow-up): a sensitivity-based *policy iteration* algorithm that directly optimizes the long-run CVaR of per-period costs, converging in 2–3 iterations, with a mean-CVaR β knob for risk attitude. This is GSE's missing *season-level policy optimizer*: instead of one-shot Kelly sizing, learn a bankroll-state → stake-tier policy minimizing long-run CVaR of weekly P&L.

## 1. Research question
CVaR breaks the dynamic-programming principle (time inconsistency), so standard MDP theory doesn't apply. From the sensitivity-based optimization viewpoint: can we derive a CVaR difference formula (policy improvement quantified), a Bellman-type local optimality equation, and a policy-iteration algorithm that efficiently optimizes the *long-run* CVaR of per-period costs — plus a mean-CVaR combination?

## 2. Dataset / schema
No real datasets. Constructed portfolio-management MDP: 10 market conditions × 6 risky-asset percentages (state space 60), actions = next-period risky percentage ∈ {0.1, 0.25, 0.4, 0.55, 0.7, 0.85}, transaction cost 0.45%, riskless rate 0.01%/day; cost c_t = −reward. CVaR level α=0.66 (Sec. 5.1), α=0.75 (Sec. 5.2).

## 3. Method / model
- **Pseudo CVaR:** CVaR_α(X) as expectation of losses beyond VaR; introduce a *pseudo* CVaR with a fixed threshold y to linearize sensitivity analysis.
- **CVaR difference formula:** quantifies long-run CVaR difference between any two policies — enables policy improvement steps without DP.
- **Optimality of deterministic policies** derived for the risk-averse (minimization) case — contrast with 2148, where maximization required randomization.
- **Bellman local optimality equation:** necessary + sufficient for local optima, only necessary for global optima (non-convex landscape).
- **CVaR derivative formula** for extra sensitivity information.
- **Algorithm 1 (policy-iteration type):** alternate policy evaluation (long-run CVaR under current policy) and improvement via the difference formula; provably converges to local optima in the mixed-policy space.
- **Mean-CVaR extension:** minimize CVaR(c_t) + βη(c_t); β = risk-attitude knob (β=0.1 conservative → β=2 aggressive); also extended to CVaR maximization (the bridge to 2148).

## 4. Equations & assumptions
- CVaR(X) := E[X | X ≥ F_X^{−1}(α)] = (1/(1−α))∫_α^1 F_X^{−1}(γ)dγ (loss convention).
- Pseudo-CVaR with fixed threshold; CVaR difference formula (policy pair); Bellman local optimality equation; CVaR derivative formula.
- Mean-CVaR objective: CVaR(c_t) + βη(c_t).
- Assumptions: finite S, A; infinite-horizon average-cost; known transitions; bounded costs; unichain policies for the difference formula.

## 5. Features / target
Market condition × current allocation (portfolio). Target: deterministic policy minimizing long-run CVaR (or CVaR+β·mean) of per-period costs.

## 6. Validation design
Algorithm 1 run from multiple random initial policies; convergence trajectories plotted; loss distributions histogrammed; policy matrices visualized; comparison against random policy and mean-optimal policy. Table 3/4 summarize mean, std, CVaR.

## 7. Numerical results / baselines
- **Convergence:** CVaR strictly decreases, converges in 2–3 iterations from any start; different starts land on one of two local optima (global CVaR 4.43, local 12.58).
- **Table 3 (mean, std, CVaR of costs):** CVaR-global policy: (−37.55, 37.91, 4.43); CVaR-local: (−92.37, 94.77, 12.58); random: (−150.41, 205.21, 50.38); mean-optimal: (−311.65, 322.20, 45.17). Mean-optimal policy has ~10× worse CVaR than the CVaR policy — maximizing mean ignores tail risk entirely.
- **Qualitative:** CVaR policy holds minimal risky assets in bear markets, slightly more in bull markets; mean-optimal holds max risky assets everywhere.
- **Mean-CVaR (β=0.22, α=0.75):** combined objective converges to 3.38 by iteration 3; higher β → visibly more aggressive policy matrices; two local optima appear at β=0.4.

## 8. Code / data availability
None stated; algorithm is reimplementable from the formulas.

## 9. Leakage & limitations
- Only local-optimum convergence guaranteed; two local optima found in a 60-state toy — the landscape is non-convex and initialization matters (multi-start needed).
- Toy portfolio MDP; no real-market validation; transition matrix hand-specified.
- Known-transition tabular setting — GSE must estimate the MDP from limited weekly data; no learning theory provided.
- Minimizing CVaR of *costs* with the loss convention — sign conventions need care when mapping to profit maximization.
- Deterministic-policy optimality holds for minimization; the mean-CVaR combination's landscape gets more local optima as β varies.
- No comparison against simpler baselines (e.g., fixed-fraction staking) in the paper.

## 10. GSE overlap
Existing-research map: no long-run/season-level policy optimization anywhere — all sizing work (2144, Kelly literature) is one-shot per bet. This is the paper that lifts risk control from "each bet" to "the whole season": the policy maps *bankroll state → stake tier*, optimized for the long-run CVaR of weekly P&L. It is the risk-averse mirror of 2148 (risk-seeking drawdown regime): run this policy in normal regime, 2148's randomized policy in the loss frame. The β knob in mean-CVaR is also the cleanest formalization of GSE's risk-attitude dial — one scalar interpolating conservative ↔ aggressive seasonal policies, settable per Garrett's mandate. Table 3's lesson (mean-optimal has 10× worse tail) is the quantitative case for why GSE must not optimize expected profit alone.

## 11. GSE implementation spec
- **MDP:** states = bankroll bucket (deciles of current bankroll vs season start, 10) × edge-availability bucket (high/low, 2) = 20 states; actions = stake tiers {0, 0.5u, 1u, 1.5u, 2u} (0 = sit out the week); transitions estimated from 2022–2025 weekly P&L; reward = weekly profit in units; cost = −profit.
- **Algorithm:** implement the paper's policy iteration (difference-formula improvement) with 5 random restarts, keep the best local optimum; objective = CVaR_{0.75}(weekly cost) + β·mean, β ∈ {0.1, 0.22, 0.4} precomputed as three policy tables (conservative/balanced/aggressive).
- **Regime gating:** normal regime (drawdown < 8%) uses this policy table; loss frame switches to 2148's randomized policy.
- **Serving:** weekly lookup: current bankroll bucket + edge bucket → stake tier for the week's slate; monthly re-solve as new P&L data arrives (2–3 iterations each — cheap).
- **Effort:** ~1–2 weeks (MDP estimation + policy iteration + three β tables + regime switch).

## 12. Reproducible test
Dataset: engine weekly P&L 2022–2025. MDP from 2022–2023; policy iteration; simulate 2024–2025 with weekly state transitions. Baselines: (a) flat 1u, (b) fixed-fraction Kelly from 2144, (c) mean-optimal policy from the same MDP (β→∞). Metrics: long-run CVaR_{0.75} of weekly costs, mean weekly profit, max drawdown, fraction of positive seasons. Multi-start: report best and median local optimum.

## 13. Acceptance / rejection gate
**ACCEPT if 2024–2025 simulation:** long-run CVaR_{0.75}(weekly cost) ≤ 0.7 × best baseline's AND mean weekly profit ≥ 0.9 × best baseline's AND max drawdown ≤ 0.85 × best baseline's. **REJECT if** the local-optimum spread across restarts exceeds 30% of the objective (landscape too unstable to trust) or any β setting underperforms flat-1u on all three metrics.

## 14. Improvement experiment
Beyond the paper: replace the paper's exact policy evaluation with a *distributional* evaluation (learn the full distribution of long-run costs per state-action, à la 2145's spectral view), then run the policy-improvement step against a spectral risk measure instead of pure CVaR — testing whether "CVaR-blindness-to-success" (2145) also afflicts the seasonal policy. Second axis: online version — re-solve the LPs/policy iteration monthly with a sliding 2-season window and measure whether the policy adapts to regime changes (e.g., 2024 rule changes) faster than the fixed-window version.

