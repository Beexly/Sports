# 1628 On Drawdown-Modulated Feedback Control in Stock Trading (arXiv:1710.01503)

**Citation:** Authors as listed on arXiv (2017). *On Drawdown-Modulated Feedback Control in Stock Trading*. arXiv:1710.01503. URL: https://arxiv.org/abs/1710.01503
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — proves a stake-scaling rule that hard-caps percentage drawdown almost surely while keeping most of Kelly's growth; GSE should adapt it as its automatic drawdown governor.

## 1. Research question
Can a feedback controller modulate a Kelly-style investment so that the percentage drawdown never exceeds a preset cap dmax (almost surely), and how much growth does the cap cost versus unconstrained Kelly?

## 2. Dataset / schema
TSLA daily data: training period 2013-12-31 through 2014-03-28 (60 returns), out-of-sample through 2014-06-24. Parameter selection by Monte Carlo: 100,000 simulated paths. Bounded returns estimated from data: Xmin≈−.049, Xmax≈.157.

## 3. Method / model
Investment rule I(k) = γ·M(k)·V(k), where V(k) is account value and M(k) = (dmax − d(k))/(1 − d(k)) is the drawdown modulator with d(k) the current percentage drawdown. As drawdown approaches dmax, M(k)→0 and the position shrinks to zero — the cap is guaranteed almost surely under bounded returns. The gain γ is tuned by Monte Carlo over the return distribution; the optimal γ*≈11.15 maximizes expected log-growth within the drawdown cap.

## 4. Equations & assumptions
- Modulator: M(k) = (dmax − d(k)) / (1 − d(k)); investment I(k) = γ·M(k)·V(k).
- TSLA calibration: dmax=.05, Xmin≈−.049, Xmax≈.157; gain range [−6.354, 20.248]; optimal γ*≈11.15.
- Out-of-sample: drawdown-modulated terminal wealth ≈1.005×10⁴ with drawdown ≈.05, versus classical Kelly ≈1.136×10⁴ with drawdown ≈.225 — i.e. ~12% less terminal wealth for a drawdown cap of 5% instead of 22.5%.
- Assumptions: returns bounded (Xmin, Xmax known/estimated); the Monte Carlo return model matches future returns.

## 5. Features / target
Input: current drawdown d(k), account value V(k), cap dmax, tuned gain γ. Target: position size I(k). A control rule, not a predictor.

## 6. Validation design
In-sample Monte Carlo (100,000 paths, 60 TSLA returns) to select γ*; out-of-sample test on TSLA 2014-03-28→2014-06-24 comparing drawdown-modulated vs classical Kelly on terminal wealth and realized max drawdown.

## 7. Numerical results / baselines
- γ*≈11.15; out-of-sample modulated terminal wealth ≈1.005×10⁴ at drawdown ≈.05 vs classical Kelly ≈1.136×10⁴ at drawdown ≈.225.
- Paper's claim: the modulator guarantees percentage drawdown ≤ dmax a.s. under bounded returns, at a modest growth cost.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Single-stock (TSLA), short windows (60 training returns, ~3-month OOS), one historical episode — no evidence the γ* transfers across regimes. Bounded-returns assumption is doing the heavy lifting for the a.s. guarantee; a gap move beyond Xmin breaks it. The 100,000-path Monte Carlo inherits the 60-return empirical distribution (small-sample model risk). Growth cost (~12%) is for one favorable episode.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE has no automatic drawdown governor — new capability. This is the natural actuator for the circuit-breaker levels calibrated in 1627/1629.

## 11. GSE implementation spec
(1) Define bankroll drawdown d(k) = 1 − V(k)/max_{j≤k} V(j); (2) set dmax (e.g. 0.20 of bankroll); (3) scale every posted stake by M(k) = (dmax − d(k))/(1 − d(k)) each slate; (4) tune γ (the Kelly-fraction multiplier) by Monte Carlo over GSE's historical pick returns; (5) add a floor: if d(k) ≥ dmax, stakes go to zero until recovery. Effort: 2–3 days including the Monte Carlo tuner.

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026. Test: season replay with the modulator (dmax=0.20, γ tuned on 2024) vs untuned full-Kelly-fraction staking. Metrics: realized max drawdown (must be ≤ dmax), final bankroll, fraction of slates staked at <50% scale. Baseline to beat: unmodulated staking on final bankroll — the modulator must keep ≥85% of its bankroll.

## 13. Acceptance / rejection gate
ADOPT if on the 2025–2026 replay the modulator holds realized max drawdown ≤ dmax while retaining ≥85% of unmodulated final bankroll; otherwise REJECT.

## 14. Improvement experiment
Make dmax adaptive: widen the cap when the Bayes–Kelly monitor (1626) reports a calibrated regime and tighten it when miscalibration is detected — test whether the adaptive cap beats the fixed cap on risk-adjusted bankroll growth.
