# [1092] Optimizing Daily Fantasy Baseball Lineups: A Linear Programming Approach for Enhanced Accuracy (arXiv:2411.11012v1)

**Citation:** Grody, M., Bansal, S., & Ashqar, H. I. (2024). *Optimizing Daily Fantasy Baseball Lineups: A Linear Programming Approach for Enhanced Accuracy*. arXiv:2411.11012v1. URL: https://arxiv.org/abs/2411.11012
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — a naive maximize-projected-points PuLP integer program with inconsistent data descriptions, misnamed metrics, and no contest-level validation; strictly dominated by 1604.01455 (ledger 1091).

## 1. Research question
Can a basic binary integer program (PuLP) that maximizes projected FanDuel MLB fantasy points under salary/position constraints produce better DFS lineups than naive selection?

## 2. Dataset / schema
Described inconsistently: "SaberSim data from 2019"; the main dataset is stated as 408 players over June 1–11, but results later discuss a 30-day span. Schema: player, projected points, actual points, salary. No contest data (authors state they lacked historical contest access). Data not public.

## 3. Method / model
Binary IP: maximize Σ projected points subject to FanDuel MLB salary cap and position constraints, solved with PuLP. Iterative diversification: after generating a lineup, remove one player once a user-set exposure cap is hit, then re-solve. No covariance/ownership model, no variance modeling.

## 4. Equations & assumptions
Objective: max Σ_p proj_p · x_p, x_p ∈ {0,1}, subject to Σ salary_p · x_p ≤ cap and positional requirements. Assumptions: projected points are unbiased and sufficient (no upside/variance); player scores independent; removing a capped-exposure player yields adequate diversification.

## 5. Features / target
Inputs: per-player projection, salary, position. Target: single lineup maximizing projected points.

## 6. Validation design
No contest-level out-of-sample validation (stated: no historical contest access). Compares average projected points of generated lineups (144.6) against hindsight-optimal actual lineups (251.9) — a gap of 107.3 that mostly measures projection error, not optimizer quality. No time-ordered backtest against a baseline optimizer.

## 7. Numerical results / baselines
Average projection 8.41 vs average actual 9.55 per player; average salary ~$3,903. Reports "10.510" as "mean squared error" but describes it as the average actual-minus-projection difference (i.e., apparently MAE, misnamed). Reports "0.19" as "R-mean-squared," a nonstandard/undefined metric. Highest-projected lineups averaged 144.6 vs hindsight-optimal 251.9 (discrepancy 107.3). No baseline comparison.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Inconsistent dataset description (June 1–11 vs 30-day span); misnamed metrics (MSE/MAE confusion; undefined "R-mean-squared"); no contest validation; the "diversification" is a crude exposure cap with no correlation/ownership modeling; maximizing mean projection is known-suboptimal for GPPs (see 1091). The 107.3 gap to hindsight-optimal is dominated by projection error, telling us nothing about the optimizer.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Ledger 1091 (1604.01455) covers this exact problem with portfolio theory, variance/correlation modeling, and real contest backtests. This paper adds nothing beyond a textbook PuLP formulation.

## 11. GSE implementation spec
Not applicable — REJECT. (If salvaging anything: the exposure-cap iteration loop is a 10-line baseline diversifier, but 1091's overlap-cap IP supersedes it.)

## 12. Reproducible test
Not applicable — REJECT. Any test would first need a coherent dataset, which the paper doesn't provide.

## 13. Acceptance / rejection gate
REJECT: no valid contest-level evidence, inconsistent data reporting, nonstandard metrics, and strict dominance by 1091. Replaced by ledger 1300.

## 14. Improvement experiment
Not applicable — see replacement ledger 1300 for the same-lane (DFS/props optimization) substitute.
