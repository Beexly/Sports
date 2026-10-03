# 1627 Drawdown Risk Beyond Brownian Motion (arXiv:2608.00127)

**Citation:** Authors as listed on arXiv (2026). *Drawdown Risk Beyond Brownian Motion*. arXiv:2608.00127. URL: https://arxiv.org/abs/2608.00127
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — a Monte Carlo drawdown-quantile framework with non-Gaussian archetypes (trend, mean-reversion/short-vol, market-neutral) that GSE can lift directly to stress-test its bankroll against realistic losing streaks instead of Gaussian ones.

## 1. Research question
How badly can standard Brownian-motion drawdown formulas understate real drawdown risk when returns are non-Gaussian (trended, mean-reverting, or short-volatility-like)? The paper builds a simulation framework for four drawdown statistics under several return archetypes.

## 2. Dataset / schema
No external market dataset — Monte Carlo simulation study. Brownian simulations use 250 trading days/year (one table uses 20,000 paths). Non-Gaussian archetype simulations use 16,000 independent paths with a fixed random seed. Statistics computed: maximum drawdown, maximum loss, final negative time, longest recovery time.

## 3. Method / model
Simulate return paths under (a) Brownian motion benchmarks and (b) non-Gaussian archetypes: trend, mean-reversion/short-volatility, and market-neutral. For each, compute the distribution of the four drawdown statistics and tabulate medians and 90th percentiles in units of annual volatility, indexed by Sharpe ratio and horizon. Recommends the stationary block bootstrap and Hurst-exponent stress scenarios (H=0.5, 0.6, 0.7) for real-world application.

## 4. Equations & assumptions
- Brownian table (Sharpe 1, 3-year horizon): max-drawdown median 1.16 and 90th percentile 1.89 (in annual-vol units).
- Archetype table (Sharpe 1, 3 years), 90th-percentile maximum drawdown: Gaussian 1.87, trend 1.98, mean-reversion/short-vol 2.48, market-neutral 2.00.
- Assumptions: simulated return processes; fixed horizons; Sharpe ratios treated as known inputs; block bootstrap recommended for empirical use.

## 5. Features / target
Input: return-process archetype, Sharpe ratio, horizon. Target: quantiles (median, 90th percentile) of maximum drawdown, maximum loss, final negative time, longest recovery time. A risk-measurement framework, not a predictor.

## 6. Validation design
Monte Carlo tables across archetypes × Sharpe × horizon; cross-archetype comparison of the same quantile statistics. No real-data backtest.

## 7. Numerical results / baselines
- Sharpe 1, 3 years, Brownian: max-drawdown median 1.16, 90th pct 1.89 annual-vol units.
- Same setting across archetypes (90th pct max drawdown): Gaussian 1.87, trend 1.98, mean-reversion/short-vol 2.48, market-neutral 2.00 — i.e. the short-vol/mean-reversion archetype is ~33% worse than Gaussian at the tail.
- Paper's claim: Gaussian drawdown formulas materially understate tail drawdown for non-Gaussian return processes; archetype tables + block bootstrap give the correction.

## 8. Code / data availability
Paper claims reproducible tables but no code URL was found — record as none stated.

## 9. Leakage & limitations
All results are simulated; no real bankroll or market data. The archetypes are stylized — GSE's pick-return process (discrete −110 bets with time-varying edge) matches none of them exactly. 16,000 paths is modest for 90th-percentile tail claims. The block-bootstrap recommendation is not demonstrated on real data in the paper.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE has drawdown discussion but no drawdown-quantile stress framework — new capability. Complements 1707.01457 (exact Brownian formulas): this paper supplies the non-Gaussian correction.

## 11. GSE implementation spec
(1) Build a bankroll simulator fed by GSE's realized pick-level P&L (per-bet returns at actual Kelly-fraction stakes); (2) generate archetype return streams: Gaussian baseline, trend (autocorrelated wins/losses), mean-reversion/short-vol (clustered losses), and a stationary block bootstrap of GSE's own history; (3) tabulate 90th-percentile max drawdown and longest recovery time per archetype at the current stake scale; (4) use the worst-archetype drawdown to set the bankroll reserve and the circuit-breaker levels. Effort: 3–5 days.

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026. Test: block-bootstrap (block length = 2 weeks) 16,000 bankroll paths at current stakes; compute 90th-percentile max drawdown and longest recovery time; compare against the Gaussian/Brownian prediction at the same Sharpe. Gate metric: the bootstrap 90th-pct drawdown must be within the archetype envelope (i.e. between the Gaussian and short-vol table values, scaled to GSE's vol).

## 13. Acceptance / rejection gate
ADOPT if the block-bootstrap 90th-percentile max drawdown exceeds the Brownian prediction by ≥15% (confirming the paper's non-Gaussian warning applies to GSE's returns) — then the archetype tables become the sizing guardrail; if the bootstrap matches Brownian within 15%, REJECT as unnecessary for GSE.

## 14. Improvement experiment
Fit the Hurst exponent H of GSE's own pick-return series and re-run the archetype tables at the fitted H (0.5/0.6/0.7 grid from the paper) — if GSE's returns show H≠0.5, the H-specific table should predict realized drawdowns better than the H=0.5 table on a holdout season.
