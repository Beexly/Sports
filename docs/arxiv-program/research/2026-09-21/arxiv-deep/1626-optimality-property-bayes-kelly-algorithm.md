# 1626 An Optimality Property of the Bayes–Kelly Algorithm (arXiv:2402.03035)

**Citation:** Authors as listed on arXiv (2024). *An optimality property of the Bayes–Kelly algorithm*. arXiv:2402.03035. URL: https://arxiv.org/abs/2402.03035
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — proves the Bayes–Kelly test martingale is the optimal sequential monitor of forecast calibration; GSE can adapt it as the statistical engine behind its abstention / stake-shrink triggers.

## 1. Research question
Given a stream of probabilistic forecasts and outcomes, what is the optimal way to sequentially accumulate evidence that the forecasts are miscalibrated (not exchangeable)? The paper shows the Bayes–Kelly algorithm — a conformal test martingale — is exactly optimal in the expected-log-wealth sense.

## 2. Dataset / schema
No empirical dataset. Pure theory about conformal test martingales; no simulations with stated sample sizes found.

## 3. Method / model
The Bayes–Kelly algorithm builds a test martingale from a prior over the alternative (miscalibration) and updates it with each observed forecast–outcome pair via a conformity measure. Theorem 3.2: for a fixed conformity measure and alternative, the Bayes–Kelly martingale maximizes the expected logarithm of test wealth (accumulated evidence) at every horizon, and the optimum value equals a Kullback–Leibler divergence between the alternative and the null.

## 4. Equations & assumptions
- Theorem 3.2 (paper's numbering): for fixed conformity measure and alternative, Bayes–Kelly maximizes E[log(test wealth)] at every horizon; the maximum equals the KL divergence D(alternative ‖ null).
- Assumptions: observations are exchangeable under the null (calibrated forecasts); the conformity measure and prior over alternatives are fixed in advance; the general algorithm may be computationally infeasible (stated limitation).

## 5. Features / target
Input: stream of (forecast probability, realized outcome) pairs; a conformity measure; a prior over miscalibration alternatives. Target: a test martingale (evidence process) whose growth certifies miscalibration. Not a sizing rule itself.

## 6. Validation design
Pure theory (optimality proof). No empirical evaluation, no baselines, no betting-bankroll results.

## 7. Numerical results / baselines
No numerical results stated. The result is the optimality theorem itself: no other test martingale (for the same conformity measure and alternative) accumulates expected log-evidence faster at any horizon.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
The general algorithm may be computationally infeasible (paper's own caveat) — practical use needs a tractable special case. No demonstration on real forecasts or on betting data. Optimality is relative to a fixed conformity measure and prior; a bad prior yields a valid but weak monitor. Exchangeability under the null is a strong assumption for sports forecasts with regime shifts.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE's calibration work (conformal prediction audit, cqr.ts) is adjacent but GSE has no sequential miscalibration monitor — new capability. This is the missing statistical backbone for "when do we stop trusting the engine."

## 11. GSE implementation spec
(1) Define a conformity score on each settled pick (e.g. signed log-loss residual of the engine's probability vs outcome); (2) implement the tractable Bayes–Kelly special case with a simple parametric alternative (e.g. Beta-family miscalibration); (3) run the test martingale over the settled-pick stream per market (NFL spreads, totals, props separately); (4) wire thresholds: martingale crossing level L1 → halve stakes; crossing L2 → abstain until the process mean-reverts. Effort: 1 week for the monitor; 1 week for the trigger wiring.

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026 with engine probabilities. Test: backtest the monitor — inject synthetic miscalibration regimes (shift p by ±5 points for 4-week windows) and measure detection delay (bets until L1 crossing) versus a fixed rolling-calibration-error rule. Metric: detection delay at a fixed false-alarm rate (tune thresholds on 2024, test on 2025–2026).

## 13. Acceptance / rejection gate
ADOPT if the Bayes–Kelly monitor detects the injected miscalibration regimes at least 30% faster (fewer bets to L1) than the rolling-calibration-error baseline at equal false-alarm rates; otherwise REJECT.

## 14. Improvement experiment
Replace the fixed prior with an empirical-Bayes prior refit monthly on GSE's own miscalibration history, and test whether detection delay improves further — this turns the paper's "fixed alternative" limitation into a learning system.
