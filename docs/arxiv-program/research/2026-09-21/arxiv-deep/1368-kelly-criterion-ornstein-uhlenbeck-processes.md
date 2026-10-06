# [1368] Application of the Kelly Criterion to Ornstein-Uhlenbeck Processes (arXiv:0903.2910v1)

**Citation:** Lv, Y., & Meister, B. K. (2009). *Application of the Kelly Criterion to Ornstein-Uhlenbeck Processes*. arXiv:0903.2910v1 [q-fin.PM]. URL: https://arxiv.org/abs/0903.2910
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 13 pages incl. conclusions and references, complete).
**Verdict:** ADAPT — the explicit dynamic Kelly fraction f_t* = R^{−1}c_t (eq. 21), collapsing to f_t* = (μ_t − r)/σ² with a *mean-reverting* drift μ_t = a − b·log(S(t)) + 0.5σ², is the first corpus source for Kelly sizing when the edge itself moves; the estimation-sensitivity rule (1% σ-error ≈ 2% drift-error) and the correlation-structure results (eqs. 23–28) give concrete calibration priorities.

## 1. Research question
Does an optimal self-financing log-utility (Kelly) trading strategy exist in a complete market of mean-reverting Ornstein–Uhlenbeck price processes, and can the optimal investment fractions be written explicitly — including how correlation structure and estimation error affect them? (Secs. 1–3)

## 2. Dataset / schema
No empirical data — analytical + one simulation. Set-up: n assets with S_i(t) = exp(x_i(t)), dx_i = (a_i − b_i·x_i)dt + Σ_j σ_{i,j}dW_t^j (OU mean reversion, eq. 13); risk-free rate r; market completeness assumed (Lemma 2). One illustrative simulation: a = 0.5, b = 0.2, σ = 0.1, r = 0.03, S_0 = 10, V_0 = 10 (Fig. 1: price path, optimal fraction, wealth process).

## 3. Method / model
- Martingale/duality method: optimal discounted wealth Ṽ_t* = I(η_t*) where I = (U')^{−1} is the inverse marginal utility (Prop 1, Thm 1, eq. 12).
- Girsanov change of measure to the risk-neutral measure P̃_T (eq. 14); completeness ⇒ optimal claim attainable by a self-financing strategy (Thm 1 proof).
- Itô's lemma applied to Ṽ_t* to read off the replicating strategy (Thm 2 proof, eqs. 18–20).
- Correlation-structure case studies: local (tridiagonal σ) and global (rank-1-style σ) volatility matrices, large-time limits.

## 4. Equations & assumptions
- **Thm 1 (existence):** in a complete market, for concave U there exists an optimal self-financing ψ* with wealth V_t(ψ*) = I(η_t*), t ∈ [0,T] (eq. 12); the optimal strategy is adapted (uses only information up to t).
- **Thm 2 (explicit strategy):** φ_0*(t) = B_t^{−1}V_t*(1 − B_t^{−1}θ_t^T λ_t S_t), φ_i*(t) = B_t^{−1}V_t*·Σ_j θ_j(t)λ_{j,i}(t), i = 1..n (eq. 17), with λ_t = S̃_t^{−1}σ^{−1} (Moore–Penrose if σ singular).
- **Optimal fraction vector:** f_t* = R^{−1}c_t (eq. 21), R = σσ^T the yield-rate correlation matrix; equivalently the maximizer of F(x) = c_t^T x − ½x^T R x (eq. 22) — the Kelly–mean-variance link.
- **Single asset:** f_t* = (μ_t − r)/σ² with μ_t = a − b·log(S(t)) + 0.5σ² — the fraction is *dynamic*: it rises as the price falls below its mean-reverting level.
- **Estimation sensitivity (r = 0):** a 1% overestimation of volatility ≈ a 2% underestimation of drift in its effect on f* — volatility estimation errors dominate.
- **Local correlations (tridiagonal σ, r = 0):** expected total fraction f_S*(∞) = (n+1)/4 for odd n, n/4 for even n (eq. 24).
- **Global correlations:** total optimal fraction = (μ_1(t) − r)/σ² (eq. 26) — n correlated assets behave like one; long-run limit f*(∞) = (a_1 + ½σ² − r)/σ² if b_1 = 0, else (½σ² − r)/σ² (eq. 28).
- **Bubble mechanism (speculative):** σ ↓ ⇒ perceived optimal leverage ↑ ⇒ more short-vol selling ⇒ σ ↓ further — a Kelly-driven self-reinforcing bubble loop.
- Assumptions: complete market; OU dynamics with known (a, b, σ); no transaction costs/spreads (frictions deferred to a follow-up paper); continuous rebalancing.

## 5. Features / target
N/A (analytical). Inputs: OU parameters (a_i, b_i, σ), risk-free rate r, current prices S(t). Targets: optimal self-financing strategy ψ_t*, optimal fraction vector f_t*, optimal wealth process V_t*.

## 6. Validation design
No train/test — proof-based. One numerical illustration (Fig. 1) of a single OU path with its optimal fraction and wealth trajectory; no statistical validation or market data.

## 7. Numerical results / baselines
- Fig. 1 (a = 0.5, b = 0.2, σ = 0.1, r = 0.03): optimal fraction oscillates inversely with price (buy the dip, sell the rally), wealth compounds along the path.
- No baselines vs fixed-fraction Kelly or buy-and-hold.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Continuous-time complete-market finance: no direct mapping to discrete binary sports bets; the OU assumption on "prices" is a modeling choice, not an empirical claim.
- Assumes known (a, b, σ) — estimation is where all the difficulty lives; the paper only gives the sensitivity rule, not an estimator.
- No frictions: transaction costs, bid–offer spreads, and rebalancing-frequency limits are explicitly deferred to a follow-up ([7] in their references).
- The bubble/evolutionary-finance discussion in the conclusions is speculative (authors' own word: "speculative aside").

## 10. GSE overlap
Complements, not duplicates: ledger 1200 gives static lognormal-portfolio Kelly with an inclusion rule; ledger 1367 gives general-distribution and high-frequency Kelly; ledger 1366 gives the binary-regime partition. None treats a *time-varying, mean-reverting edge* with an explicit dynamic fraction — the f_t* = (μ_t − r)/σ² form and the correlation-collapse results (eqs. 24, 26–28) are new to the corpus.

## 11. GSE implementation spec
1. **Mean-reversion-adjusted sizing (the adapt):** treat the market line's deviation from GSE's fair price as an OU process: estimate pull speed b and line volatility σ from line-move history; scale the posted stake by (fair_line − current_line)/σ² clipped to the base Kelly fraction — i.e., bet bigger when the line has moved *against* GSE's number (mean-reversion edge) and smaller when it has moved with it. Discrete analog of f_t* = (μ_t − r)/σ².
2. **Calibration priority rule:** per the sensitivity result, spend calibration budget on σ (line volatility) first — a 1% σ error costs twice what a 1% edge/drift error costs. Add a σ-sanity gate to the sizing module.
3. **Correlation collapse check:** for same-game / correlated pick sets, apply the eq. 26 lesson — n strongly correlated picks sized independently behave like one pick; cap the *total* stake of a correlated cluster at the single-pick Kelly fraction rather than summing.
4. Data: line-move history (odds API snapshots), engine fair prices. Effort: medium — OU parameter estimation plus a sizing overlay.

## 12. Reproducible test
Dataset: GSE engine's 2024–2025 NFL picks with timestamped line history (odds API snapshots). Estimate (b, σ) per market type from line moves; backtest OU-adjusted stakes vs static fractional-Kelly stakes on realized log-wealth growth and max drawdown. Also test the correlation-cluster cap on same-game pick clusters vs uncapped sizing. Backtest window: full 2024 + 2025 seasons.

## 13. Acceptance / rejection gate
ADOPT OU-adjusted sizing if it beats static Kelly on realized log-wealth growth with no worse max drawdown; REJECT if the OU parameter estimates are unstable week-to-week (b̂ sign flips on > 20% of markets → the mean-reversion premise fails empirically).

## 14. Improvement experiment
Extend the local-correlation result (eq. 24) to a *ladder* of correlated derivatives on the same game (spread / total / alt-lines): derive the expected total Kelly fraction for the tridiagonal outcome-correlation structure estimated from the engine's joint simulations, and test whether the closed-form (n+1)/4-style scaling predicts the backtested optimal cluster cap better than the current heuristic.
