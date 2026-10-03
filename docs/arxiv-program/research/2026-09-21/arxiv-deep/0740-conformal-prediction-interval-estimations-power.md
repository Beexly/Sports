# [0740] Conformal Prediction Interval Estimations with an Application to Day-Ahead and Intraday Power Markets (arXiv:1905.07886)

**Citation:** Christopher Kath, Florian Ziel (2019/2020). *Conformal Prediction Interval Estimations with an Application to Day-Ahead and Intraday Power Markets*. arXiv:1905.07886. URL: https://arxiv.org/abs/1905.07886
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the inductive-conformal + normalized-nonconformity interval machinery, the head-to-head vs. QRA on 144 paths, and the explicit failure-mode list (exchangeability, structural breaks, 25–50% holdout cost) directly inform how GSE builds and selects rolling prediction intervals for totals/spreads; the power-market application itself is not adopted.

## 1. Research question
Can conformal prediction (CP) and normalized conformal prediction (NCP) produce competitive prediction intervals for electricity price forecasting — a noisy, heavy-tailed, heteroscedastic series — relative to quantile regression averaging (QRA), naive benchmarks, and empirical-error intervals, across day-ahead and intraday markets?

## 2. Dataset / schema
Three market regimes (exact dates not printed in the full text; day-ahead/intraday markets of Nord Pool and EPEX + GEFCom data): (1) **Nord Pool** day-ahead spot prices — 24 hourly prices as multivariate target (models trained per hour); (2) **EPEX SPOT** intraday continuous market — 15-minute price paths; (3) **GEFCom** competition data. Features: standard price-forecasting covariates (lagged prices, fundamentals) — the paper's emphasis is on interval methodology, not feature engineering.

## 3. Method / model
**Inductive (split) conformal prediction**: split available data 75/25 into proper training set and calibration set; nonconformity measure = absolute residual |y_i − ŷ_i|; prediction interval for new x: [ŷ(x) − q̂, ŷ(x) + q̂] with q̂ the (1−α)-quantile of calibration residuals. **Normalized CP (NCP)**: nonconformity = |y_i − ŷ_i|/σ̂_i with a dispersion estimate σ̂_i to handle heteroscedasticity; interval width adapts per observation. Comparators: QRA (quantile regression on point forecasts), naive/empirical-error intervals. **144 prediction paths** total: combinations of markets × model types × point-predictor choices (random-forest-based and simple autoregressive mean/median point predictors). Evaluation metrics: empirical coverage (PICP), average width, Winkler score, pinball loss, Christoffersen conditional-coverage tests (independence + unconditional coverage LR tests).

## 4. Equations & assumptions
Symmetric conformal interval: Ĉ(x_{n+1}) = [μ̂(x_{n+1}) − q̂_{1−α}, μ̂(x_{n+1}) + q̂_{1−α}], where q̂_{1−α} = quantile_{1−α}({|y_i − μ̂(x_i)|}_{i∈cal}). Normalized: interval [μ̂(x) − σ̂(x)·q̂, μ̂(x) + σ̂(x)·q̂]. Assumptions: **exchangeability** of calibration and future data (the paper's own stated biggest threat); i.i.d.-style random 75/25 split; symmetric intervals (no asymmetry modeling); coverage guarantee 1−α holds marginally.

## 5. Features / target
Targets: day-ahead hourly prices, intraday 15-min price paths, GEFCom targets. Features: lagged price/quantity series and standard market fundamentals. Prediction horizon: day-ahead (H+1) and intraday continuous.

## 6. Validation design
Random 75% train / 25% calibration split (stated limitation: ignores temporal structure); out-of-sample evaluation on held-out periods per regime; 144 paths = full factorial comparison; metrics computed per path. Notably there is NO universal best configuration — the best path varies by market regime.

## 7. Numerical results / baselines
The paper reports that NCP is **equal or better** than QRA, naive, and empirical-error intervals depending on the market regime — but explicitly that **no single configuration dominates**: the optimal choice of point predictor, normalization, and split is market-dependent. Coverage targets are met (PICP ≈ nominal) while average interval widths are competitive; Winkler and pinball scores favor NCP in the heteroscedastic intraday regime where normalization matters most. Exact printed numbers are sparse in the full text — the headline finding is qualitative (competitiveness + regime dependence), not a single percentage gain. The honest headline: 144 paths, none universally best.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
(a) **Random 75/25 split on time series** — leakage risk: future information in training when applied to real ordered data; for GSE this must be a rolling/expanding window. (b) **Exchangeability is false** under structural breaks (market rule changes in power; injuries/coaching changes in NFL) — the paper flags this itself. (c) **25–50% holdout cost**: calibration eats a large fraction of data; with GSE's ~272 games/season this is expensive. (d) Symmetric intervals only — no tail-asymmetry modeling (blowout vs. defensive slugfest tails differ). (e) Exact dataset date ranges are not printed, limiting reproducibility. (f) No comparison to GARCH-type conditional intervals on the same footing.

## 10. GSE overlap
Existing-research-map.md: GSE already has CQR (conformalized quantile regression — Drive research doc), a conformal-prediction audit that caught the cqr.ts coverage bug (per MEMORY.md 2026-09-21), and Mondrian/cross-conformal topics. This paper is adjacent but distinct: it is about **symmetric absolute-residual intervals and the normalization trick (NCP)** plus a disciplined path-selection protocol (144 paths, regime-dependent winner). It does not duplicate the CQR work; NCP's σ̂-normalization is a concrete add-on to GSE's interval toolkit.

## 11. GSE implementation spec
(1) Add a **normalized-nonconformity option** to GSE's interval layer: interval = [ŷ − σ̂·q̂, ŷ + σ̂·q̂] where σ̂ is a per-game dispersion estimate (e.g., recent total-volatility or model disagreement); (2) replace any random calibration split with a **rolling-window** calibration (calibrate on trailing N games, refit weekly); (3) run the paper's **path-selection discipline**: compare {plain CP, NCP} × {point predictors} on rolling backtests per market (spread/total/moneyline) and pick per-market winners — no assumption of a universal config. Effort: ~2 days.

## 12. Reproducible test
Dataset: 2023–2025 NFL regular seasons; target game totals; nominal coverage 90%. Metrics: PICP, average width, Winkler score. Baselines: current GSE interval method + unnormalized CP. Success = NCP hits 90±2pp coverage with ≥5% narrower mean width than plain CP, and the path-selection step picks different winners for spread vs. total markets (confirming regime dependence).

## 13. Acceptance / rejection gate
ADOPT NCP if it achieves nominal coverage within 2pp AND mean width ≤ plain-CP width on the 2025 holdout; KEEP the path-selection protocol regardless (it is process, not a claim); REJECT the random-split calibration design outright — never use it on ordered NFL data.

## 14. Improvement experiment
**Adaptive NCP with regime-triggered recalibration**: maintain the calibration residual distribution in a rolling window and trigger an immediate recalibration (shortened window) when a structural-break detector fires (e.g., starting-QB change, coaching change, weather regime) — directly addressing the paper's own #1 stated limitation (exchangeability failure under breaks) which the paper leaves unsolved.
