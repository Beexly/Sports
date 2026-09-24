# 1633 Determining Optimal Stop-Loss Thresholds via Bayesian Analysis of Drawdown Distributions (arXiv:1609.00869)

**Citation:** Zambelli, A. E. (2016). *Determining Optimal Stop-Loss Thresholds via Bayesian Analysis of Drawdown Distributions*. arXiv:1609.00869v1 [q-fin.RM]. URL: https://arxiv.org/abs/1609.00869
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT (weak) — the drawdown-binned Bayesian threshold construction is a concrete, implementable calibration procedure for GSE's bankroll-level drawdown-gated stake throttling; the fit is loose (equity stop-losses, weak +0.65% headline result) and the ledger states that plainly.

## 1. Research question
Stop-loss levels are usually set arbitrarily. Can the optimal stop-loss threshold be derived systematically from the empirical distribution of maximum drawdowns, binned by whether the trade ultimately won or lost?

## 2. Dataset / schema
Case study: hourly 20-hour-SMA signal-only long system on SPY (1-minute data) and IWM. Extended to 114 assets (round-trip trade counts per asset tabulated in the appendix, e.g. AAPL 219, LMT 321 trades). Two construction methods: T (real signal-only trades) and R (rolling window: every hourly point as entry, exit l=20 hours ahead, m=250 trades).

## 3. Method / model
For each trade record its maximum drawdown; bin the drawdown distribution into n bins {B_i}. Per bin compute P(win), P(loss), and mean returns conditioned on the bin. Build the expected-value vector across bins and take its cumulative sum; the optimal threshold T is the right edge of the bin at the argmax of that cumulative vector (equation 4). Implement as a trailing stop at (1−T)×(maximum price since entry). The R method densifies data with overlapping artificial trades; the paper recommends calibrating l to the mean/mode holding period and choosing n by a square-root rule on trade count.

## 4. Equations & assumptions
- Threshold: T = right edge of the bin maximizing the cumulative conditional-expected-value vector (eq. 4); stop set at (1−T) × max price since entry.
- R-method parameters used: l=20 hours, m=250 trades, n bins by square-root rule.
- Results on 114 assets: R method improved final NLV in 57.02% of cases; average gains +6.37%, average losses −6.94%; overall expected change in NLV +0.65% (eq. 5–6, appendix tables).
- Assumptions: past trade drawdown behavior (real or artificial) predicts future behavior; the strategy has both entry and exit signals; backtesting is computationally intensive but live use is cheap.

## 5. Features / target
Input: trade-level maximum drawdowns with win/loss labels. Target: the stop-loss threshold T maximizing cumulative conditional expected value. A calibration procedure, not a predictor.

## 6. Validation design
SPY/IWM case studies comparing T vs R methods against the signal-only baseline; 114-asset extension reporting the fraction improved and average NLV change. No time-ordered splits described; parameters l, m chosen with knowledge of the data (paper flags this as future work).

## 7. Numerical results / baselines
- 114 assets, R method vs signal-only: 57.02% improved; avg +6.37% on winners, avg −6.94% on losers; expected NLV change +0.65%.
- Paper's own conclusion: "our method is on average quite successful, but imperfect"; T method suffers from sparse data; the +0.65% is a thin margin.
- Footer disclaimer: "This is a preprint. Please do not invest your life savings based on this."

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Weak headline result (+0.65% expected NLV, barely better than a coin flip at 57%); parameters l and m tuned with hindsight; no time-ordered validation; equity long positions with continuous exits — GSE's discrete −110 bets cannot be "stopped" mid-trade, so the literal stop-loss does not transfer. Overlapping artificial trades in the R method create correlated samples the paper does not adjust for.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): GSE has no drawdown-threshold calibration procedure — the mechanism (not the equity stop-loss) is new. The transferable piece is the binning methodology applied to bankroll drawdowns rather than trade drawdowns.

## 11. GSE implementation spec
Adapt the binning machinery to bankroll-level stake throttling: (1) from GSE's settled-pick history, compute bankroll drawdown at each slate; (2) bin drawdown depths; per bin compute the forward 4-week ROI conditioned on the bin (the analog of win/loss-conditioned returns); (3) find the drawdown depth maximizing the cumulative conditional forward value — that depth becomes the stake-throttle trigger (halve stakes beyond it, stop beyond a deeper second trigger); (4) re-run monthly so thresholds evolve with market conditions (the paper's own recommendation). Effort: 2–3 days.

## 12. Reproducible test
Dataset: GSE settled picks 2024–2026. Test: calibrate triggers on 2024, apply to 2025–2026 replay (halve stakes past trigger 1, stop past trigger 2); compare risk-adjusted bankroll (Sharpe of weekly P&L) vs no-trigger baseline. Metric must improve on a walk-forward basis, not in-sample.

## 13. Acceptance / rejection gate
ADOPT if the trigger replay improves the Sharpe of weekly bankroll P&L by ≥15% versus the no-trigger baseline on 2025–2026 with no worse final bankroll; otherwise REJECT — the paper's own +0.65% warns the effect may not survive.

## 14. Improvement experiment
Replace the paper's fixed bins with a Bayesian changepoint model on the drawdown-conditioned forward ROI curve, and test whether the changepoint-derived trigger beats the binned argmax — this removes the arbitrary bin count n the paper never resolves.
