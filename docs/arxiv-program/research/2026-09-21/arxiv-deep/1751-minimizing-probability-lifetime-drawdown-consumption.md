# [1751] Minimizing the Probability of Lifetime Drawdown under Constant Consumption (arXiv:1507.08713)

## 1. Citation and full-text-read statement
**Citation:** Bahman Angoshtari, Erhan Bayraktar, Virginia R. Young (Univ. of Michigan) (2015, v. 17 May 2016). *Minimizing the Probability of Lifetime Drawdown under Constant Consumption*. arXiv:1507.08713. URL: https://arxiv.org/abs/1507.08713
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; verification theorem and optimal-strategy formulas read in full, proofs skimmed).
**Verdict:** ADAPT — one sentence: the drawdown-probability-minimizing feedback rule and the "freeze the high-water mark" regime give GSE a drawdown-probability objective to complement 1749's hard drawdown constraint, but the GBM/constant-consumption/lifetime setting must be re-mapped to seasonal betting with withdrawals.

## 2. Research question
For an investor in a Black–Scholes market who consumes at a constant rate, what investment strategy minimizes the probability that wealth ever falls below a fixed fraction α of its running maximum before death (the probability of lifetime drawdown)?

## 3. Method / model
Market: one riskless asset (rate r) + one risky asset (GBM with drift μ, vol σ); constant consumption rate c; random lifetime with hazard rate λ. Objective: minimize φ(w,m) = P(wealth hits αm before death | W_0=w, M_0=m). Verification theorem (Theorem 3.1 + corollary) for the minimum probability via HJB-type variational inequalities; optimal strategy in feedback form π_t = π(W_t, M_t). Solved in regimes split by the safe level c/r (wealth whose riskless interest covers consumption) and a threshold m* on maximum wealth. Related: Angoshtari et al. (2015) general consumption; Chen et al. (2015) two correlated risky assets / proportional consumption.

## 4. Mathematics / equations / assumptions
- Objective: minimize P(τ_α < τ_d), τ_α = hitting time of α·M_t, τ_d = time of death.
- Safe level: c/r. Optimal feedback investment (case m ≥ c/r, Eq. 4.1): π_t = (μ−r)/σ² · 1/(γ−1) · (c/r − W_t^π), with γ = 1/(2r)[(r+λ+δ) + √((r+λ+δ)² − 4rλ)] > 1, δ = ½((μ−r)/σ)².
- Three regimes (conclusions): (i) αm < w < c/r ≤ m: optimal = the lifetime-ruin-minimizing strategy; (ii) αm < w ≤ m ≤ m* < c/r: optimally NEVER let maximum wealth increase above current m — "if the individual were to allow maximum wealth to increase, then the drawdown level of α times the new maximum would be too great given the constant rate of consumption"; (iii) αm < w < m with m* < m < c/r: allow the maximum to increase to c/r ("the individual wishes to increase her wealth in order to fund her consumption").
- Minimum drawdown probability (regime ii) = Legendre dual of a controller-stopper problem's value function (§5.2).
- Key structural note: π_t ∝ (c/r − W_t) — investment is MORE aggressive when wealth is far below the safe level (classic ruin-minimization shape, opposite of Kelly's wealth-proportional sizing).
- Assumptions: GBM risky asset, constant r/μ/σ, constant consumption c, exponential lifetime, frictionless continuous trading.

## 5. Dataset / schema
None — stochastic optimal control theory. No empirical data.
## 6. Features and target
Not applicable (theory). Inputs: wealth w, running max m, parameters (r, μ, σ, c, λ, α). Output: optimal risky investment π(w,m) and minimum drawdown probability φ(w,m).

## 7. Validation design
None empirical.

## 8. Exact results and baselines with numbers
No numerical results. Analytic: closed-form feedback rule (4.1), the m* threshold structure, the three-regime characterization, Legendre-duality representation.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
GBM + constant consumption + random lifetime is far from a betting bankroll (no consumption; season has a fixed end; outcomes are discrete); the "invest more when poor" shape minimizes drawdown/ruin probability but sacrifices growth — it is NOT growth-optimal and the paper doesn't price the growth cost; the m* threshold is implicit (no closed form quoted); single risky asset (no portfolio); no estimation error; continuous rebalancing.

## 11. GSE overlap
Complements 1749/1750 (hard drawdown/floor constraints) with a probabilistic objective: minimize P(drawdown) rather than forbid it. The regime-(ii) "freeze the high-water mark" insight is new and actionable: GSE's drawdown governor (1749) ratchets the reference max upward on every new peak, which raises the α·m trigger; this paper says when the bankroll is below the safe level, DON'T ratchet — keep the old trigger. Per the existing-research map, GSE has no drawdown-probability objective anywhere. The distance-to-safety feedback form π ∝ (safe − wealth) also offers a contrarian sizing shape to test against Kelly-proportional sizing.

## 12. Implementation specification
Build a "drawdown-probability mode" for the bankroll manager: (a) define the bankroll safe level S = (weekly withdrawal target)/(risk-free rate) — for GSE, withdrawals are Garrett's living expenses funded from betting profits; (b) when B_t < S: size stakes by the distance-to-safety rule stake ∝ (S − B_t) × edge (capped), and FREEZE the high-water mark M (don't raise the drawdown trigger on new peaks until B_t > m*); (c) when B_t ≥ S: revert to the 1749 α-governor with normal ratcheting; (d) estimate the model parameters (μ, σ of the sizer's weekly log returns; λ = 1/season length as the "horizon hazard"). Effort: ~1 day (mode switch + frozen-max logic around the existing governor).

## 13. Reproducible test
Dataset: 2023–2025 NFL backtest. Compare three bankroll modes: (A) 1749 α-governor with ratcheting max; (B) this paper's mode (frozen max below safe level + distance-to-safety sizing); (C) unconstrained Kelly sizer. Metrics: empirical P(B_t < 0.7·M) over the window (the drawdown-probability objective), terminal log growth, time below safe level. Baselines as listed; the test is whether (B) actually lowers realized drawdown frequency vs (A) and at what growth cost.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the frozen-max/distance-to-safety mode if it cuts the empirical drawdown frequency (weeks with B_t < 0.7·M) by ≥ 30% vs mode (A) while terminal log growth stays ≥ 85% of (A)'s; REJECT if the aggressive-when-poor shape blows up (worse drawdowns) on discrete weekly data. Improvement experiment: replace the paper's constant-consumption assumption with Garrett's actual withdrawal schedule (lump sums, not a continuous rate) and re-solve the discrete-time dynamic program numerically — a GSE-native drawdown-probability DP; test whether the optimal policy still has the freeze-the-maximum structure under lumpy withdrawals.

**Verdict:** ADAPT — the drawdown-probability objective, the frozen-high-water-mark regime, and the distance-to-safety sizing shape are all portable insights, but the GBM/consumption/lifetime scaffolding must be replaced with a discrete seasonal-withdrawal DP.
