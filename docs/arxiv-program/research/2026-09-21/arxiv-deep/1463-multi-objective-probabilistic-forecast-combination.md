# [1463] Multi-objective probabilistic forecast combination for inventory demand (arXiv:2606.04900v1)

**Citation:** Wang, S., Kang, Y., Spiliotis, E., & Petropoulos, F. (2026). *Multi-objective probabilistic forecast combination for inventory demand*. arXiv:2606.04900v1 [stat.AP]. URL: https://arxiv.org/abs/2606.04900
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 8 pages).
**Verdict:** ADAPT — linear CDF-pool combination of probabilistic forecasts jointly optimized on a proper probabilistic score (DRPS) and a downstream operational cost via NSGA-III; directly transferable to GSE as "combine ensemble pick models on calibration AND bankroll-utility simultaneously" instead of picking one weight vector per objective.

## 1. Research question
How should probabilistic forecasts be combined when the combination must serve two conflicting objectives at once — statistical accuracy of the predictive distribution (measured by the Discrete Ranked Probability Score, DRPS) and the downstream operational cost incurred when acting on those forecasts (inventory holding/stockout cost)? Can a Pareto-optimal set of combination weights dominate single-objective combinations on both axes?

## 2. Dataset / schema
- **M5 (Walmart daily retail demand):** 30,490 daily series (3,049 products × 10 stores), 1,941 days. 60.1% of observations are zeros. Paper excludes 1,587 "problematic series", leaving 28,903 series used.
- **RAF (retailer aggregate forecast, described as an internal retailer dataset, available on request):** 5,000 monthly series × 84 periods.
- Splits (time-ordered): M5 — train through day 1,857 / validation days 1,858–1,913 / test days 1,914–1,941; RAF — 72 / 6 / 6 periods.
- M5 is public (Kaggle). RAF available by request to the authors.

## 3. Method / model
Linear opinion pool on predictive CDFs: the combined forecast is Σᵢ wᵢ Fᵢ with nonnegative weights wᵢ summing to one. Base forecasters are standard probabilistic methods (details in paper). Weight vectors are produced by five schemes: optimize DRPS only (DRPS-opt), optimize cost only (Cost-opt), simple (equal-weight) average, and two NSGA-III variants: NSGA-III-c (constrained) and NSGA-III-hs (hybrid-seeded). NSGA-III (Deb & Jain) is a reference-point-based multi-objective evolutionary algorithm that maintains a population of candidate weight vectors and returns a Pareto front over (DRPS, cost). The Pareto knee is selected for the final reported combination. Inventory cost is computed from a standard single-period newsvendor-style ordering decision applied to the combined predictive distribution over the validation window.

## 4. Equations & assumptions
- Combined CDF: F(x) = Σᵢ wᵢ Fᵢ(x), wᵢ ≥ 0, Σᵢ wᵢ = 1.
- DRPS (Discrete Ranked Probability Score): the discrete-outcome analogue of CRPS, proper for count predictive distributions. No closed form quoted in my notes beyond standard definition; the paper applies it as the statistical objective.
- Inventory cost: newsvendor-type single-period cost evaluated on validation forecasts (exact cost coefficients are retail-calibrated, not stated as universal constants).
- Assumptions: (1) i.i.d.-like forecast-error structure within the validation window (weights fit once, applied over a fixed window); (2) the two objectives conflict (accuracy-optimal weights ≠ cost-optimal weights); (3) base forecasters' predictive distributions are taken as given (no joint retraining).

## 5. Features / target
Inputs: predictive CDFs of the base forecasters at each series/time. Target: a weight vector on the Pareto front. Downstream decision target: order quantity minimizing expected inventory cost under the combined distribution.

## 6. Validation design
Time-ordered sequential splits (no shuffling). Baselines: DRPS-opt, Cost-opt, equal-weight average — each compared against the two NSGA-III Pareto combinations on the held-out test window, reported on both objectives. The key comparison is Pareto-dominance, not a single scalar metric.

## 7. Numerical results / baselines
Exact numbers from the paper's tables (Sec. 4): NSGA-III combinations achieve lower DRPS than Cost-opt and lower inventory cost than DRPS-opt, sitting on the Pareto frontier ahead of the simple average on both datasets. (My extraction notes the directional result and the experimental sizes — 28,903 M5 series, 5,000 RAF series — rather than transcribing the full cost tables; the paper's Table results show the NSGA-III knee solution strictly dominating the single-objective weights on the opposing objective while remaining near-optimal on the fitted one.) The 60.1% zero rate in M5 makes DRPS the appropriate proper score for the sparse-count regime.

## 8. Code / data availability
No public code link stated in the paper. M5 data public via Kaggle; RAF by request.

## 9. Leakage & limitations
- Weights are fit on a single fixed validation window (days 1,858–1,913); nonstationarity outside that window is unhandled — refit cadence is not studied.
- NSGA-III is a heavy evolutionary optimizer for what is ultimately a low-dimensional weight vector; simpler scalarization (weighted-sum grid search) may reach the same knee cheaper. Not ablated.
- Single-period inventory framing; multi-period dynamics ignored.
- Excluded 1,587 "problematic" M5 series — selection criteria could bias reported gains; not stress-tested on the excluded tail.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's ensemble work concentrates on combining point forecasts / pick models, and the Kelly/sizing lane (mentioned 12×, now with ledgers 1368 Kelly-OU and 1500 betting wealth growth) handles stake sizing downstream of probabilities. No existing corpus work jointly optimizes combination weights on calibration AND a downstream money objective. This is an extension, not a duplicate: GSE combines models for accuracy first and sizes bets after; this paper's move is to make the downstream utility (bankroll growth, CLV) a first-class objective in the combination itself.

## 11. GSE implementation spec
- Data: GSE's existing model-zoo pick probabilities per game (spread/ML/total) over 2+ NFL seasons; bankroll simulator with Kelly-fraction stakes.
- Build: (a) per-model predictive distributions for game outcomes (bootstrap the pick models or use their calibrated probability outputs); (b) linear-pool weight vector; (c) NSGA-II/III over (log-loss/CRPS on outcomes, simulated bankroll growth or max-drawdown on a rolling validation season); (d) select knee weight, freeze, deploy for next season.
- Effort: ~1 week (optimizer is the only new code; pymoo provides NSGA-III).

## 12. Reproducible test
Dataset: 2023–2024 NFL seasons of GSE pick-model probabilities (frozen model versions). Metric pair: (mean log-loss on game outcomes, Kelly-simulated bankroll ROI with 0.25-fraction cap). Baseline: equal-weight average and log-loss-optimal weights. Window: train weights on 2023, evaluate on 2024.

## 13. Acceptance / rejection gate
ADOPT the knee-weight combination if, on the 2024 test season, it achieves bankroll ROI ≥ the log-loss-optimal weights' ROI while its log-loss is within 2% of the log-loss-optimal — i.e., it sits on the empirical Pareto front. Reject if the Pareto set collapses to a single point (objectives not in conflict) or if equal weights dominate.

## 14. Improvement experiment
Replace the fixed validation window with a rolling-origin refit (re-run NSGA-III every 4 weeks on the trailing 12 weeks) and test whether the Pareto knee is stable across refits; if unstable, constrain weights with a Dirichlet prior centered on the previous knee to regularize the front — this directly addresses the paper's fixed-window limitation.
