# 0839 Conformal Kelly: Conformal Prediction Intervals as the Scale in Fractional Kelly Position Sizing (arXiv:2608.01494v1)

**Citation:** Robert Jacob Ryan (2026). *Conformal Kelly: Conformal Prediction Intervals as the Scale in Fractional Kelly Position Sizing*. arXiv:2608.01494v1. URL: https://arxiv.org/abs/2608.01494v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — a rare registered-report-style portfolio paper that pre-registered its growth claim and reported its partial refutation honestly: conformal intervals calibrated (0.7450 vs 0.75 nominal) but the growth edge did not survive the 2022–2024 lockbox; the transferable asset for GSE is uncertainty-width-based fractional Kelly sizing plus the paper's break-detection discipline, not its portfolio returns.

## 1. Research question

Can conformal prediction intervals supply the uncertainty scale (σ̂) in a fractional-Kelly position-sizing rule — f = 0.15·μ̂/σ̂² — so that position sizes automatically shrink when the model's uncertainty is wide? The paper pre-registers a growth claim on a development period and tests it on a sealed 2022–2024 lockbox, with a "drawdown dial" variant targeting lower drawdown.

## 2. Dataset / schema

- **Assets:** 8 ETFs, daily prices, frozen Kaggle download, 2006-05 through 2024-09-20.
- **Splits:** train through 2015-12-31; DEV 2016–2021 (1,511 days); sealed LOCKBOX 2022-01-01–2024-09-20 (683 days).
- **Schema:** daily OHLC/close per ETF; derived rolling features for ridge regression.
- **Access:** Kaggle data is public; frozen vintage not re-downloadable identically.

## 3. Method / model

- **Return forecast:** ridge regression (λ=10), refit every 21 days; forecast horizons 12, 16, 21, 27, 34 days.
- **Uncertainty:** rolling conformal prediction with window 500, nominal 75% interval → interval half-width as σ̂.
- **Sizing:** fractional Kelly f = 0.15·μ̂/σ̂², per-asset cap ±0.75, gross exposure cap 2.0.
- **Config A:** base rule. **Config B ("drawdown dial"):** a variant intended to lower drawdown (details: tighter sizing when drawdown accumulates).
- Pre-registered primary claim: Config A beats baselines on growth in the lockbox.

## 4. Equations & assumptions

- Sizing rule (quoted): f = 0.15·μ̂/σ̂².
- Conformal interval: nominal 75% coverage from rolling 500-day score window.
- Caps: |f_i| ≤ 0.75 per asset, ∑|f_i| ≤ 2.0 gross.
- Assumptions: ridge residuals are exchangeable enough for rolling conformal validity; ETF returns predictable at 12–34-day horizons; financing costs ignored (see §9); covariance across ETFs ignored (diagonal sizing).

## 5. Features / target

- **Inputs:** lagged return/momentum-style features per ETF (exact feature list not fully specified in the excerpt read).
- **Target:** 12–34-day ahead ETF returns; positions sized from (μ̂, σ̂).

## 6. Validation design

- DEV (2016–2021, 1,511 days) for configuration search; sealed LOCKBOX (2022-01-01–2024-09-20, 683 days) for the registered test.
- Baselines: naive equal-weight 2×, inverse-vol 2×.
- Metrics: log growth, Sharpe, max drawdown, empirical conformal coverage.

## 7. Numerical results / baselines

DEV: Config A growth 0.2845, Sharpe 1.336, max DD 27.7%. Config B growth 0.2584, Sharpe 1.386, max DD 20.3%.

Lockbox (quoted exactly): Config A growth 0.0847, Sharpe 0.453, max DD 36.6%. Config B growth 0.0701, Sharpe 0.422, max DD 31.7%. Empirical coverage 0.7450 vs 0.750 nominal. Naive equal-weight 2× growth 0.1679; inverse-vol 2× growth 0.1576.

Central finding: calibration transferred (coverage hit), growth did not — the registered growth claim was partially refuted. The drawdown dial lowered drawdown but also Sharpe, failing its strict gate.

## 8. Code / data availability

None stated.

## 9. Leakage & limitations

- **~200 DEV configurations** searched — severe selection bias on DEV numbers; the lockbox exists precisely because of this, and it refuted the claim.
- **Cap bound 97.7% of DEV days** — the strategy was effectively cap-constrained, so the "Kelly" sizing rarely operated as designed.
- **Incorrect Gaussian constant 1.2816 used instead of 1.1503** (disclosed by the author) — the interval construction had a known error.
- Financing/borrowing costs excluded; covariance ignored (diagonal sizing on correlated ETFs).
- Frozen Kaggle vintage limits exact replication.

## 10. GSE overlap

Per the existing-research map: conformal prediction is heavily covered (CQR Drive doc, Mondrian/cross-conformal, conformal WP 2208.08598, and the 2026-09-21 conformal audit that caught the live cqr.ts coverage bug). Kelly sizing covered in 0834–0836. The novel combination — conformal interval width as the Kelly σ — is new. This paper is also a methodological role model: pre-registered claim + sealed lockbox + honest refutation.

## 11. GSE implementation spec

- For each GSE pick, produce a conformal interval over expected profit (from the engine's historical residuals); set stake ∝ edge / (interval width)² with a fractional multiplier and per-pick/gross caps.
- Maintain a sealed lockbox: current-season picks sized by the rule, evaluated only at season end against flat-stakes and 0835 Kelly baselines.
- Effort: 2 days (conformal residuals pipeline exists from the CQR work).

## 12. Reproducible test

Dataset: GSE engine picks 2024 with pre-game model outputs archived. Metric: season ROI and max drawdown, lockbox protocol (no tuning on 2024). Baselines: flat stakes, 0.25-Kelly. Pass if conformal-Kelly matches Kelly ROI with lower max drawdown.

## 13. Acceptance / rejection gate

ADOPT if lockbox max drawdown is lower than 0.25-Kelly at ROI within 1 pp; REJECT if, as in the paper, the uncertainty-width sizing adds nothing once caps bind (check cap-binding frequency — if >90% of days, the rule is decorative).

## 14. Improvement experiment

Replace the fixed 0.15 fractional multiplier with a coverage-adaptive multiplier: scale up when trailing empirical coverage is at/nominal (model well-calibrated) and down when coverage breaks (regime change). Hypothesis: this turns the paper's break-detection observation into the sizing rule itself — the multiplier becomes the regime detector.
