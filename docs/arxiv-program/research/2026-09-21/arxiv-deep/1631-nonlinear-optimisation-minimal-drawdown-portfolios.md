# 1631 A Nonlinear Optimisation Model for Constructing Minimal Drawdown Portfolios (arXiv:1908.08684)

**Citation:** Valle, C. A. & Beasley, J. E. (2019). *A nonlinear optimisation model for constructing minimal drawdown portfolios*. arXiv:1908.08684. URL: https://arxiv.org/abs/1908.08684
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** REJECT — equity-portfolio drawdown optimizer with no edge/probability input; sizes positions purely from trailing realized drawdown, so it cannot distinguish +EV from −EV legs and has no stake-sizing rule GSE can use. Replaced by 1635 (1610.08558).

## 1. Research question
Can nonlinear programming (solved to proven global optimality with SCIP) construct equity portfolios that minimize average or maximum drawdown over a trailing window, and do such portfolios beat the index out of sample?

## 2. Dataset / schema
Daily price data 2010–2016 (inclusive) for EURO STOXX 50, FTSE 100, and S&P 500 constituents, manually curated to index composition at each rebalance date (survivorship-bias controlled). Methodology: T=30 trading-day in-sample, D=20 trading-day drawdown lookback, rebalance every 10 trading days (~180 rebalances per instance). Transaction costs assumed zero.

## 3. Method / model
Four nonlinear programs: MINAVG (minimize average drawdown), MINMAX (minimize maximum drawdown), and shorting variants MINAVG-S / MINMAX-S, subject to weight, proportion-limit (δ_i ∈ {0.1, 1}), and self-financing constraints. Solved with SCIP to proven global optimality within max(500, 7N) seconds per rebalance; initialized C=1000, A_i=0, warm-started from the previous rebalance's weights.

## 4. Equations & assumptions
- Drawdown defined per equations (1)–(2) with lookback D=20; formulations optimize equations (3)/(14) subject to (4)–(12), (15), (16), (18)–(23) (+ shorting equations (24)–(28)).
- Rebalance rule: in-sample T=30 days, out-of-sample hold 10 days, ~1800 daily out-of-sample portfolio values per instance.
- Assumptions: zero transaction costs; the 30-day trailing window is representative; SCIP's global-optimality certificates hold within the time limit.

## 5. Features / target
Input: trailing 30-day asset returns. Target: portfolio weights minimizing in-sample average or maximum drawdown. A weight optimizer, not a predictor or a sizing rule.

## 6. Validation design
Successive periodic rebalancing: ~180 rebalances per index, in-sample metrics (avg daily log return, max/avg drawdown, solve time, % proven optimal) and out-of-sample metrics (same return/drawdown stats on the amalgamated OOS series, annualized Sharpe with r_f=0, % of OOS days beating the index).

## 7. Numerical results / baselines
- EURO STOXX 50: all four drawdown portfolios dominate the index in-sample and out-of-sample on return and (mostly) drawdown; cumulative return exceeds the index on over 99% of out-of-sample days; all four Sharpe ratios beat the index.
- Paper's claim: drawdown-optimized portfolios effectively dominate the index both in-sample and out-of-sample.

## 8. Code / data availability
C++ code mentioned; no public link stated. Data: commercial index constituents, not public.

## 9. Leakage & limitations
The >99%-of-days dominance claim with zero transaction costs, overlapping 30-day in-sample windows, and 10-day rebalancing is a classic overfit signature — in-sample drawdown minimization is being rewarded for fitting recent noise. No probability or edge input anywhere: weights are chosen to minimize trailing realized drawdown, so applied to GSE picks it would concentrate stake on low-volatility legs regardless of whether they are +EV. No stake-sizing rule (weights, not fractions of bankroll). Single 2010–2016 regime.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): no GSE drawdown-weight optimizer exists, but that is because GSE sizes from calibrated probabilities — this paper's probability-free approach is a step backward from GSE's edge-based sizing, not an extension.

## 11. GSE implementation spec
Not applicable — rejected. The salvageable idea (trailing-window volatility reweighting across bet types) is better served by 1632's drawdown-constrained growth-optimal framework, which keeps the Kelly objective.

## 12. Reproducible test
Not applicable — rejected before testing.

## 13. Acceptance / rejection gate
REJECTED at the paper level: no edge input, no sizing rule, overfit-suspicious empirical claims, and the lane already has stronger direct drawdown tools (1627, 1628, 1629, 1632, 1635). Does not count toward the 12; replaced by 1635.

## 14. Improvement experiment
Not applicable — rejected. (If revisited: add an edge filter so only +EV assets enter the drawdown optimizer, and re-test whether any dominance survives transaction costs.)
