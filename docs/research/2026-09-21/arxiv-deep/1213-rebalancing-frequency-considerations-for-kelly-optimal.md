# [1213] Rebalancing Frequency Considerations for Kelly-Optimal Stock Portfolios in a Control-Theoretic Framework (arXiv:1807.05265)

**Citation:** Chung-Han Hsieh, John A. Gubner, B. Ross Barmish (2018). *Rebalancing Frequency Considerations for Kelly-Optimal Stock Portfolios in a Control-Theoretic Framework*. arXiv:1807.05265. URL: https://arxiv.org/abs/1807.05265
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — use the Dominant Asset Theorem as a redundancy/concentration screen for GSE's pick slates (detect when one pick dominates all others under the expected-ratio test), not as a literal "bet the farm" rule; and adapt the frequency analysis to GSE's discrete-settling bets.

## 1. Research question
The paper extends the frequency-dependent Kelly analysis (companion to ledger 1211) to multi-asset stock portfolios in a control-theoretic framing: given a rebalancing period n and a portfolio of m assets with known i.i.d. return distributions, what is the Kelly-optimal allocation, how does it depend on n, and under what "dominant asset" condition is it optimal to put everything in a single asset regardless of rebalancing frequency?

## 2. Dataset / schema
Empirical illustration (not a full backtest): adjusted daily closing prices of Netflix and Facebook plus a riskless asset, over a four-year period beginning January 24, 2013. Rolling estimation window N = 126 trading days. No formal train/test split; the data illustrate the dominant-asset condition rather than validate a trading strategy.

## 3. Method / model
Maximize per-period expected log growth g_n(K) = (1/n)·E[log(1 + KᵀX_n)] over the unit simplex (K_i ≥ 0, ΣK_i = 1), where X_n is the n-step compound return vector. Define asset j as *dominant* if E[(1 + X_i)/(1 + X_j)] ≤ 1 for every i ≠ j. Prove the Dominant Asset Theorem: if j is dominant, the Kelly-optimal portfolio is K* = e_j (all capital in j) and g_n* = g_1* for all frequencies n. Demonstrate on the Netflix/Facebook example with rolling 126-day windows.

## 4. Equations & assumptions
- Constraints: K_i ≥ 0 for all i, Σ_i K_i = 1
- Dominance: asset j dominant iff E[(1 + X_i)/(1 + X_j)] ≤ 1 for every i ≠ j
- Dominant Asset Theorem: under dominance, K* = e_j and g_n* = g_1* for all n ≥ 1
Assumptions: known i.i.d. return distribution, log utility, long-only fully-invested simplex constraint, no transaction costs. The empirical part implicitly assumes the rolling-window distribution estimate is adequate (no stationarity test).

## 5. Features / target
Inputs: asset return distributions (estimated from rolling windows). Target: Kelly-optimal portfolio weights K* and the optimal per-period growth g_n*.

## 6. Validation design
Theorem proof plus illustrative empirical example. No train/test split, no out-of-sample performance metric, no baselines — the data serve to demonstrate the condition, not to validate profitability. Window choice (126 days) is not justified against alternatives.

## 7. Numerical results / baselines
No performance numbers are claimed. The empirical content is: Netflix, Facebook, and a riskless asset, four years from January 24, 2013, adjusted daily closes, rolling window N = 126 trading days, used to show when the dominance condition triggers. The theorem's exact statement is the result: dominance ⇔ all-in is Kelly-optimal at every rebalancing frequency.

## 8. Code / data availability
None stated. (Price data described as standard adjusted closes; no link given.)

## 9. Leakage & limitations
The dominance condition is evaluated on the same rolling window used to estimate the distribution — no out-of-sample test of whether detected dominance persists. Under nonstationarity (the norm in sports), empirical dominance can flip; the theorem gives no robustness. "Bet the farm" concentration is the opposite of sound bankroll management for a prediction product; applied literally to sports it would concentrate the entire bankroll on one pick. Long-only simplex constraint rules out hedges.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing had zero deep reads; GSE's `apps/web/lib/staking/kelly-investigation.ts` sizes bets independently with no cross-pick dominance/redundancy logic. This paper supplies a principled redundancy screen GSE lacks — a new capability, not a duplicate. Note the companion result is strengthened in ledger 1219 (2004.12099, necessity added).

## 11. GSE implementation spec
1. Implement a dominance/redundancy screen over each GSE slate: for mutually exclusive or highly correlated picks (e.g., spread + moneyline on the same game, correlated props), evaluate the expected-ratio condition E[(1+X_i)/(1+X_j)] ≤ 1 on the calibrated outcome distribution. If one pick dominates, suppress the dominated picks from the public card (or merge stakes) rather than posting redundant exposure. Effort: M.
2. Do NOT implement literal all-in concentration; cap any single pick at the existing fractional-Kelly ceiling from `kelly-investigation.ts`. Effort: S (config).
3. Log every dominance trigger with the triggering window and probabilities for audit. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks, grouped by slate/game. Metric: realized ROI and max drawdown of (a) current card (all +EV picks posted) vs. (b) card with dominance-suppressed redundancies removed and stakes reallocated to the dominant pick (capped). Baseline: (a). Window fixed in advance.

## 13. Acceptance / rejection gate
ADOPT the dominance screen if it improves realized ROI per unit of max drawdown (Calmar-style) by ≥ 10% on the held-out season without reducing hit-rate transparency (same number of graded picks or explicit "suppressed as redundant" labeling). REJECT otherwise.

## 14. Improvement experiment
Beyond the paper: make dominance time-varying with a regime test — only suppress when dominance holds in both the trailing window and a structural model (e.g., GSE's team-strength state space), reducing false triggers from noisy 126-day-style windows. Hypothesis: dual-confirmation dominance improves the screen's precision.
