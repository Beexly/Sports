# 1629 You Are in a Drawdown. When Should You Start Worrying? (arXiv:1707.01457)

**Citation:** Authors as listed on arXiv (2017). *You are in a drawdown. When should you start worrying?* arXiv:1707.01457. URL: https://arxiv.org/abs/1707.01457
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — exact Brownian formulas for drawdown depth and duration give GSE closed-form "worry thresholds" for live bankroll monitoring; the strongest candidate in the lane for a keep/slow/stop dashboard.

## 1. Research question
You are currently in a drawdown — when is it deep or long enough that you should conclude something is wrong (rather than it being normal fluctuation)? The paper derives the exact distributions of the depth and duration of the last drawdown for Brownian motion with drift.

## 2. Dataset / schema
No empirical dataset. Analytical results for Brownian motion with drift; a ten-year benchmark computed with 257 trading days/year.

## 3. Method / model
For a Brownian motion with Sharpe ratio SR, derive the exact joint distribution of the depth and duration of the ongoing (last) drawdown. From the 5% tail of these distributions, extract simple scaling rules: the 5%-tail drawdown duration scales as 2.14 × SR⁻² (in years, on the ten-year benchmark) and the normalized 5%-tail depth scales as 1.50 × SR⁻¹.

## 4. Equations & assumptions
- 5% tail duration fit: duration ≈ 2.14 × SR⁻².
- 5% tail normalized depth fit: depth ≈ 1.50 × SR⁻¹.
- Worked implications: at SR=.5 there is a 5% chance a ten-year process remains in drawdown for seven years or more; at SR=1.6 the normalized 5% depth is about .95, and such a drawdown is very unlikely to end in less than about two months.
- Assumptions: Brownian motion with constant drift and volatility (Gaussian, i.i.d. increments); SR known.

## 5. Features / target
Input: current drawdown depth and duration, assumed Sharpe ratio, horizon. Target: tail probability that the drawdown is "abnormal" — i.e. a worry/no-worry classification. A monitoring statistic, not a predictor.

## 6. Validation design
Exact distributional derivations; the 2.14×SR⁻² and 1.50×SR⁻¹ fits are closed-form approximations to the exact 5% tails. No empirical backtest.

## 7. Numerical results / baselines
- SR=.5: 5% chance a ten-year process is still in drawdown after ≥7 years.
- SR=1.6: normalized 5% depth ≈.95; recovery in under ~2 months very unlikely.
- Paper's claim: these are exact (not simulated) tail benchmarks for when a drawdown stops being routine.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Gaussian/i.i.d. assumption is the whole game — real betting returns are discrete, heteroskedastic, and regime-shifting; the paper's own companion literature (1627) shows Gaussian tails understate real drawdowns by ~33% at the 90th percentile. SR must be estimated, and SR estimation error propagates directly into the worry thresholds. No treatment of what to do after the threshold trips.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE has no live drawdown-monitoring dashboard — new capability. Pairs with 1627 (non-Gaussian stress overlay) and 1628 (the modulator as the actuator when the threshold trips).

## 11. GSE implementation spec
(1) Track GSE bankroll drawdown depth and duration continuously; (2) estimate the bankroll's realized Sharpe on a trailing window; (3) compute the 5% worry thresholds from 2.14×SR⁻² (duration) and 1.50×SR⁻¹ (depth, scaled by bankroll vol); (4) dashboard states: GREEN (inside median), YELLOW (beyond median, inside 5% tail — halve stakes), RED (beyond 5% tail — stop and run the Bayes–Kelly miscalibration check from 1626). Apply the 1627 non-Gaussian inflation factor to the thresholds. Effort: 2 days.

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026. Test: replay the monitor; count RED trips and check whether post-trip 4-week forward returns are significantly worse than baseline (they should be if trips detect real regime breaks). Metric: forward 4-week ROI after RED trips vs unconditional. Baseline: random-date placebo trips.

## 13. Acceptance / rejection gate
ADOPT if post-RED-trip 4-week forward ROI is worse than the unconditional ROI with p<0.05 on the 2025–2026 replay (trips carry signal); otherwise REJECT as noise.

## 14. Improvement experiment
Replace the constant-SR assumption with a regime-switching SR estimate (two-state model on trailing returns) and test whether regime-aware thresholds cut false RED trips without missing the real ones — this attacks the paper's weakest assumption directly.
