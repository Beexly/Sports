# [2148] On the Maximization of Long-Run Reward CVaR for Markov Decision Processes (arXiv:2312.01586)

**Citation:** Li Xia, Zhihui Yu, Peter W. Glynn (2023). *On the Maximization of Long-Run Reward CVaR for Markov Decision Processes*. arXiv:2312.01586. URL: https://arxiv.org/abs/2312.01586
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* the only paper in this lane treating the *risk-seeking* side (prospect-theory loss frame). Its structural result — the optimal long-run policy randomizes over at most *two* actions — gives GSE a principled "drawdown regime" rule: when the bankroll is underwater, the rational risk-seeking response is a computed mixture of exactly two stake/action levels, not ad-hoc chasing.

## 1. Research question
All CVaR-MDP work is risk-averse (minimizing left-tail CVaR). But prospect theory (Kahneman & Tversky 1979) says decision-makers are risk-seeking in the loss frame. What does optimal sequential decision-making look like when the objective is to *maximize* the long-run (right-tailed) CVaR of instantaneous rewards over an infinite horizon? Does an optimal policy exist, what structure does it have, and can it be computed?

## 2. Dataset / schema
No real datasets — three constructed numerical MDP examples (toy 2-state, 3-state/3-action counterexample, university-endowment allocation). All results are theorems + LP computations on these examples.

## 3. Method / model
- **Criterion:** right-tailed CVaR_α(ξ)=(1/(1−α))∫_α^1 VaR_q(ξ)dq (1), α small (e.g., 0.7 in examples → focus on top 30% of outcomes). Note (1−α)CVaR_α + α·CVaR̂_α = E[ξ] links the two tails.
- **Long-run definitions:** limsup CVaR and liminf CVaR over history-dependent randomized policies (Example 1 shows the limit may not exist for history-dependent policies — limsup≠liminf).
- **Structural results:** (a) via two opposing optimality inequalities, limsup optimum = liminf optimum, attained within *stationary randomized* policies; (b) counterexample (Example 2, 3-state/3-action) where NO stationary deterministic policy is optimal — contrary to risk-neutral and risk-averse MDPs; (c) Theorem 2: an optimal stationary randomized policy exists requiring *at most one randomization* (mixing ≤2 actions).
- **Computation:** Rockafellar–Uryasev convex representation CVaR_α(ξ)=min_{y∈[L,U]}{y+(1/(1−α))E[ξ−y]^+} (2) converts the problem to a max-min saddle point; von Neumann minimax gives min/max interchangeability and saddle-point existence; solved via *two linear programs* — one for optimal VaR y*, one dual LP for the optimal stationary randomized policy x*(i,a) (with flow-balance constraints).
- **Extension (Sec. 5):** mean-CVaR maximization J*_β=max_d[CVaR^d + βη^d] (42) — same two-LP structure; α=0 degenerates to ordinary long-run average MDP.
- **Numerical results:** Example 2: optimal randomized policy d*(3|1)=d*(1|2)=1, d*(1|3)=0.0255, d*(3|3)=0.9745, CVaR*=93.24 vs best deterministic 92.6675. Example 3 (endowment: 2 economic states × 3 allocation levels, rewards 1000[(1−a)r_0+a r_1(x')−b|a−ω|]): two LPs compute the optimal mean+CVaR allocation policy.

## 4. Equations & assumptions
- CVaR_α(ξ)=(1/(1−α))∫_α^1 VaR_q(ξ)dq (1); CVaR_α(ξ)=min_y{y+(1/(1−α))E[ξ−y]^+} (2), y*=VaR_α(ξ).
- Long-run CVaR via limsup/liminf of time-averaged per-period CVaR over history-dependent randomized policies.
- Saddle point: max_{x∈X} min_{y∈Y} Σ x(i,a)P(j|i,a){y+(1/(1−α))[r̃−y]^+ + β r̃}; solved by two LPs (Eqs. 38/39, 42).
- Assumptions: finite S, A; bounded rewards [L_r, U_r]; infinite-horizon average-reward (unichain-ish) setting; known transition kernel; risk level α fixed.

## 5. Features / target
State/action spaces of the MDP (abstract). Target: stationary randomized policy maximizing long-run right-tail CVaR (or mean+CVaR).

## 6. Validation design
Theorems proved analytically; numerics are illustrative counterexamples/computations on small hand-built MDPs, solved with the proposed LPs. No baselines beyond enumerating all deterministic policies (Example 2) and no statistical validation.

## 7. Numerical results / baselines
- Example 1: limsup CVaR=+2, liminf CVaR=−2 for a history-dependent policy — limit need not exist.
- Example 2 (α=0.7): optimal randomized CVaR*=93.24 vs best deterministic 92.6675 (gap ≈0.57, ~0.6%); single randomization suffices.
- Example 3: endowment mean-CVaR policy computed via the two LPs (no numeric optimum quoted in the extracted text).

## 8. Code / data availability
None stated; LPs are standard and reimplementable.

## 9. Leakage & limitations
- Requires a *known* tabular MDP with known transitions — GSE doesn't have this; the MDP must be estimated, and the paper gives no learning/estimation theory (contrast 2146's regret bounds).
- Toy-scale numerics only; LP size grows with |S×A×S| — fine for small regimes but not for rich game-state spaces.
- Right-tail CVaR maximization is the *opposite* of what a bankroll usually wants (it deliberately ignores the left tail) — misapplication would be catastrophic; the GSE use must be confined to an explicitly fenced drawdown regime.
- Stationarity assumption on the environment (market efficiency drifts; opponent books adapt).
- The "at most two actions" result is elegant but the two actions and mixture weights are MDP-specific — no robustness analysis if the MDP is misestimated.
- No empirical comparison against heuristic drawdown rules.

## 10. GSE overlap
Existing-research map: no prospect-theory / loss-frame decision rule anywhere in the corpus; all sizing work is risk-averse. This fills the complementary regime: *what should the decision rule be when the bankroll is in drawdown?* Naive systems either freeze (over-conservative, can't recover) or chase (unprincipled). This paper says: under prospect-theoretic risk-seeking preferences, the long-run-optimal response is a *stationary randomized policy over at most two actions* — i.e., principled, computed "swinging": e.g., mix a standard 1u post with an occasional 3u high-edge post at a fixed probability. Composes with 2144 (risk-sensitive Kelly sets the two candidate stake levels) and 2147 (ARA decides *when* we're in the loss frame).

## 11. GSE implementation spec
- **Regime definition:** loss frame = bankroll below its trailing peak by ≥8% (drawdown ≥ 8%). Outside it, the risk-averse stack (2142/2144/2147) governs.
- **MDP construction (small, tabular):** states = {normal, hot, cold} bankroll-momentum × {high, low} edge-availability (6 states); actions = stake tiers {0.5u, 1u, 2u, 3u}; transitions estimated from historical weekly P&L sequences; reward = weekly profit in units.
- **Policy computation:** solve the paper's two LPs for max CVaR_α (α=0.7, right tail) + β·mean with β tuned so mean isn't sacrificed; extract the stationary randomized policy. Per Theorem 2, expect ≤1 randomization — e.g., "in (drawdown, high-edge): post 1u with p=0.8, 3u with p=0.2."
- **Serving:** precompute the 6-state policy table monthly; weekly lookup by current state; log the sampled action and its probability for the audit trail.
- **Effort:** ~1 week (MDP estimation from weekly P&L + two LPs via scipy/pulp + policy table).

## 12. Reproducible test
Dataset: engine weekly P&L 2022–2025 (unit stakes). Build the 6-state MDP from 2022–2023, solve LPs, then simulate 2024–2025 walk-forward: in drawdown weeks follow the randomized policy (seeded), else follow the baseline risk-averse rule. Baselines: (a) flat 1u always, (b) "freeze" (halve stakes in drawdown), (c) naive chase (double stakes in drawdown). Metrics: final bankroll, max drawdown depth, drawdown recovery time, fraction of seasons ending positive. Use common random numbers across baselines where possible.

## 13. Acceptance / rejection gate
**ACCEPT if walk-forward 2024–2025:** recovery time from ≥8% drawdown ≤ 0.75 × best baseline's AND final bankroll ≥ best baseline's AND max drawdown never exceeds 1.2 × the freeze baseline's (the randomization must not blow up the left tail it's ignoring). **REJECT if** recovery isn't faster than flat-1u or the left-tail cost exceeds the 1.2× bound — then the risk-seeking regime isn't worth fencing.

## 14. Improvement experiment
Beyond the paper: make α and β *functions of drawdown depth* (deeper hole → more right-tail focus), re-solving the LPs per depth bucket — the paper fixes α. Test whether depth-conditioned randomization beats a single drawdown policy on recovery time without worsening max drawdown. Second axis: replace the estimated MDP with a *distributionally robust* version (uncertainty set on transitions, à la 2143's outer risk) so the LP policy is robust to MDP misestimation.

