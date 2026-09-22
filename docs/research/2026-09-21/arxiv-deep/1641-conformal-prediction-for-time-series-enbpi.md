# [1641] Conformal Prediction for Time Series (EnbPI) (arXiv:2010.09107)

**Citation:** Chen Xu, Yao Xie (2021). *Conformal Prediction for Time Series*. arXiv:2010.09107. IEEE Trans. Pattern Analysis and Machine Intelligence. URL: https://arxiv.org/abs/2010.09107
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: algorithm, theory, real-data experiments, change-point simulation).
**Verdict:** ADAPT — EnbPI's "no data splitting + ensemble + sliding residual window" design is the most directly portable time-series conformal recipe for GSE's weekly engine: it uses every game for both training and calibration, and the sliding window gives automatic adaptation to regime drift. Best suited for GSE's rolling season-long calibration of margin/total intervals.

## 1. Research question
Standard conformal prediction needs exchangeable data and wastes data on a calibration split; time series are neither exchangeable nor data-rich per regime. Can we build valid prediction intervals for time series WITHOUT data splitting, using ensemble out-of-sample residuals and a sliding window of recent residuals — and keep coverage when the series has change points?

## 2. Dataset / schema
Real data: (1) **2018 hourly solar radiation** — Atlanta + 9 California cities (10 series); (2) **2019 hourly Austin wind power**; (3) 11 ambient sensor series (temperature etc.). Train/test protocol: fit on first 10%/19%/28% of each series (three train-ratios), predict the rest sequentially. Change-point simulation: T=600 training points, a mean/variance change at 60% of the combined series, retrain after 60 post-change points; residual window T′=100.

## 3. Method / model
**EnbPI (Ensemble batch Prediction Intervals)**: (1) train B bootstrap models (paper suggests B = 20–50; experiments use B = 25); (2) build leave-one-out ensemble predictions f̂_{-i}(X_i) by aggregating only models that did NOT see point i; (3) residuals ε̂_i = Y_i − f̂_{-i}(X_i); (4) interval at time t: f̂(X_t) ± quantile of the most recent residuals, using an asymmetric residual quantile optimized over β ∈ [0,α] (narrower intervals than symmetric); (5) slide the residual window forward (batch size s = 1 in experiments), discarding stale residuals. No calibration split: all data trains AND calibrates.

## 4. Equations & assumptions
- LOO ensemble predictor: `f̂_{-i}^{φ} = φ({f̂^b : i ∉ S_b})` (φ = mean in experiments)
- Residuals: `ε̂_i = Y_i − f̂_{-i}^{φ}(X_i)`
- Interval: `C_{t} = [ f̂(X_t) + q̂_β(ε̂-window), f̂(X_t) + q̂_{1−α+β}(ε̂-window) ]`, β chosen to minimize width
- Theory: under stationarity/mixing conditions, coverage → 1−α asymptotically WITHOUT exchangeability; finite-sample coverage holds under approximate exchangeability of residuals.
- Assumptions: residuals' dependence decays (mixing); base learner reasonably stable; change points handled by the sliding window + optional retraining.

## 5. Features / target
Solar: weather covariates → hourly radiation; wind: meteorological features → hourly wind power. Transfer: GSE game features (spread, total, injuries, weather, rest) → realized margin / total / team points.

## 6. Validation design
Sequential prediction on each series at three train ratios (0.10, 0.19, 0.28); α = 0.1; metrics = empirical coverage and mean interval width over the test horizon. Baselines: AdaptCI (ACI-style), Jackknife+-after-Bootstrap (J+aB), Quantile-OOB (QOOB, ledger [1650]), ICP (inductive/split conformal), weighted ICP.

## 7. Numerical results / baselines
Atlanta solar, train-ratio 0.10 (hardest — only 10% training data):
- **EnbPI: coverage 0.893 (SE 1.8e-3)**; AdaptCI 0.828; J+aB 0.747; QOOB 0.684; ICP 0.646; Weighted ICP 0.608
- Train-ratio 0.19: EnbPI **0.897**; AdaptCI 0.891 (gap closes with more data)
- Train-ratio 0.28: EnbPI **0.905**; AdaptCI 0.909
The no-splitting design dominates exactly when data is scarce — the regime GSE lives in early-season (weeks 1–4). Change-point simulation: after the change, the sliding window re-covers faster than fixed-window methods; retraining after 60 post-change points restores nominal coverage.

## 8. Code / data availability
https://github.com/hamrel-cxu/EnbPI. Solar/wind data described in the paper (public sources); sensor data from the authors' deployment.

## 9. Leakage & limitations
(a) Asymptotic theory — finite-sample coverage is empirical, not guaranteed; the paper is honest that guarantees need mixing assumptions that are unverifiable. (b) B=25 bootstrap models × weekly refits is compute-heavy for a daily publishing loop (though GSE refits weekly, fine). (c) Sliding window discards ALL old residuals — in a stable regime this wastes signal; window length T′ is a tuning knob with no theory. (d) Change-point handling is heuristic (retrain after 60 points); no detection theory. (e) Asymmetric quantile optimization adds per-step compute.

## 10. GSE overlap
GSE's calibration stack has split-conformal (`conformal-calibration.ts`), CQR (`cqr.ts`), and ACI (`aci-durable.ts`) — but NO ensemble/LOO design and NO sliding-residual-window method. The engine already ensembles models elsewhere (`model-parliament.ts`), so the bootstrap-ensemble machinery is half-built. This is new territory: the first no-split time-series conformal recipe in the GSE corpus.

## 11. GSE implementation spec
(1) **EnbPI-margin**: B=25 bootstrap fits of the GSE margin model on trailing seasons; LOO ensemble predictions per game; residuals windowed over the trailing ~100 games (tune T′ ∈ {50, 100, 200}); asymmetric β-optimized intervals at α ∈ {0.1, 0.2}. (2) **Early-season mode**: when n < 100 games in the current season, fall back to EnbPI with prior-season residuals seeding the window (mirrors the train-ratio-0.10 win). (3) **Retrain trigger**: refit base models when trailing-20-game coverage < 1−α−0.05 for 2 consecutive weeks. Effort: 3–5 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, game-level margin/total predictions and outcomes, chronological. Simulate the online protocol: at each week, train on all past games (EnbPI-style LOO residuals), predict that week's games. Metrics: empirical coverage, mean interval width (points), and coverage in weeks 1–4 specifically (the scarce-data regime). Baselines: split conformal (ICP), ACI, and current cqr.ts.

## 13. Acceptance / rejection gate
ADAPT if: full-season empirical coverage within ±2pp of nominal AND mean width ≤ split-conformal baseline; the early-season (weeks 1–4) coverage must beat ICP by ≥3pp (the paper's signature win). REJECT the bootstrap-ensemble component if B=25 refits exceed the weekly compute budget — fall back to a single-model sliding-window variant (SPCI, ledger [1642]).

## 14. Improvement experiment
**Regime-weighted sliding window**: instead of a hard window cutoff, weight residuals by recency AND by regime similarity (same-QB, same-weather-bucket games get upweighted — borrowing the localized-conformal idea from ledger [1644]); test whether weighted windows recover coverage faster after mid-season QB changes than the uniform window.

**Verdict:** ADAPT — implement EnbPI as GSE's early-season / scarce-data interval method (B=25 bootstrap LOO ensemble, sliding residual window, asymmetric quantile), with the weeks-1–4 coverage-vs-ICP gate as the acceptance test; it fills the no-split time-series gap in the current calibration stack.
