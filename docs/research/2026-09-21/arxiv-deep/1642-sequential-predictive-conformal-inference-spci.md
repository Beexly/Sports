# [1642] Sequential Predictive Conformal Inference for Time Series (SPCI) (arXiv:2212.03463)

**Citation:** Chen Xu, Yao Xie (2023). *Sequential Predictive Conformal Inference for Time Series*. arXiv:2212.03463. ICML 2023. URL: https://arxiv.org/abs/2212.03463
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: method, theory, simulations, real-data experiments).
**Verdict:** ADAPT — SPCI's "predict the residual distribution from recent residuals" is the sharpest interval-narrowing idea in this wave: on real wind data it hit 95% coverage at less than HALF EnbPI's width (2.65 vs 6.38). For GSE, this is the upgrade path when the residual process is autocorrelated (streaky offenses, weather regimes) — conditional quantiles of residuals instead of unconditional ones.

## 1. Research question
EnbPI (ledger [1641]) uses the unconditional empirical distribution of recent residuals — but residuals are often autocorrelated: a big miss today predicts a big miss tomorrow. Can we get VALID intervals that are much NARROWER by modeling the conditional distribution of the next residual given the recent residual history?

## 2. Dataset / schema
Simulations: (1) nonstationary AR-type series; (2) heteroskedastic series; (3) drift-adjusted and change-adjusted variants. Real data: wind power, electricity demand, solar radiation series (hourly). Target α = 0.1 (90% intervals) throughout; metrics = empirical coverage + mean interval width.

## 3. Method / model
**SPCI**: (1) fit any point predictor f̂(X_t); (2) compute residuals ε̂_t = Y_t − f̂(X_t); (3) train a quantile regression forest (QRF) that predicts the conditional quantiles of ε̂_t from the lagged residual vector (ε̂_{t−1}, …, ε̂_{t−w}) — window w; (4) interval: C_t = [f̂(X_t) + Q̂_t(β̂), f̂(X_t) + Q̂_t(1−α+β̂)] where Q̂_t are the QRF-predicted residual quantiles and β̂ ∈ [0,α] is chosen to minimize interval width. The residual quantile function adapts to autocorrelation: after a volatile stretch it widens, after calm stretches it narrows.

## 4. Equations & assumptions
- Interval: `C_t = [ f̂(X_t) + Q̂_t(β̂), f̂(X_t) + Q̂_t(1 − α + β̂) ]`, `β̂ = argmin_β (Q̂_t(1−α+β) − Q̂_t(β))`
- Q̂_t(·) = QRF conditional quantile of ε_t given (ε_{t−1}, …, ε_{t−w})
- Theory: under EXCHANGEABILITY, finite-sample marginal coverage ≥ 1−α (standard conformal argument); under stationarity/decaying dependence + QRF consistency, ASYMPTOTIC conditional coverage.
- Assumptions: for the strong result, the residual process must be stationary-ish with decaying dependence and the QRF must consistently estimate conditional quantiles — much stronger than ACI's assumption-free guarantee.

## 5. Features / target
Residual lags as features (pure time-series structure); the point predictor uses the original covariates. Transfer: GSE margin residuals' recent history (last w games' engine errors, team-specific or league-wide) as QRF features.

## 6. Validation design
Sequential prediction on simulated and real series; α=0.1. Baselines: EnbPI, AdaptiveCI (ACI), NEX-CP (a nonexchangeable-CP method). Metrics: empirical coverage, mean width. Simulations test nonstationarity, heteroskedasticity, drift, and change points.

## 7. Numerical results / baselines
Simulations (coverage / width):
- Nonstationary: SPCI 0.94 / **11.23**; EnbPI 0.91 / 25.22 (SPCI less than half the width)
- Heteroskedastic: SPCI 0.89 / **24.09**; EnbPI 0.92 / 25.84
- Drift-adjusted: SPCI 0.90 / 3.43; NEX-CP 0.91 / 3.45
- Change-adjusted: SPCI 0.90 / 4.18; NEX-CP 0.91 / 4.13
Real data (coverage / width):
- Wind: SPCI 0.95 / **2.65**; EnbPI 0.93 / 6.38; AdaptiveCI 0.95 / 9.34
- Electricity: SPCI 0.93 / **0.22**; EnbPI 0.91 / 0.32
- Solar: SPCI 0.91 / **47.61**; EnbPI 0.88 / 48.95; AdaptiveCI 0.96 / 56.34
SPCI is the width winner on every real dataset at valid coverage.

## 8. Code / data availability
https://github.com/hamrel-cxu/SPCI-code. Real datasets are standard energy series.

## 9. Leakage & limitations
(a) Conditional coverage is only ASYMPTOTIC and needs stationarity + QRF consistency — in a regime-shifting NFL season the theory is thin; the finite-sample guarantee is just marginal. (b) QRF on residual lags needs enough history to learn the conditional law — weak in weeks 1–6 (complement to EnbPI's strength, not a replacement). (c) If the point predictor's errors are NOT autocorrelated, SPCI ≈ EnbPI with extra compute. (d) Width-minimizing β̂ selection can produce asymmetric intervals that look odd to users (e.g., [−3, +10] around a pick). (e) No delayed-feedback handling.

## 10. GSE overlap
No residual-modeling in GSE's calibration stack today: `cqr.ts` adapts to heteroskedasticity in X (via quantile regression on features), ACI adapts the LEVEL over time, but nothing models the residual PROCESS itself. `model-parliament.ts` ensembles point forecasts; nothing ensembles/forecasts errors. This is new territory — the "second-order" calibration layer.

## 11. GSE implementation spec
(1) **Residual-QRF**: after the engine produces margin/total point forecasts, collect trailing residuals; train a QRF (or gradient-boosted quantile model) on lag features (last w ∈ {4, 8, 16} residuals, team-specific and league-pooled variants); (2) publish intervals C_t per the SPCI formula at α ∈ {0.1, 0.2} with width-minimizing β̂; (3) gate on autocorrelation: only enable SPCI when trailing-50-game residual lag-1 autocorrelation is significant (|ρ̂| > 0.15), else fall back to EnbPI/ACI. Effort: 3–4 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, game-level margin/total residuals, chronological. Online protocol: QRF refit every 4 weeks on trailing residuals. Metrics: empirical coverage, mean width (points), width during high-volatility stretches (post-bye, December) vs calm stretches. Baselines: EnbPI ([1641] implementation), ACI, fixed CQR.

## 13. Acceptance / rejection gate
ADAPT if: empirical coverage within ±2pp of nominal AND mean width ≤ 85% of the EnbPI baseline on 2024–2025 (the paper's signature is width reduction, so demand a material one). REJECT (fall back to EnbPI) if residual lag-1 autocorrelation is insignificant in GSE data (|ρ̂| < 0.1) — then the conditional machinery buys nothing.

## 14. Improvement experiment
**Covariate-augmented residual quantiles**: the paper uses only residual lags as QRF features; test adding game-context features (rest differential, weather bucket, QB-change flag) to the residual QRF — i.e., a hybrid of CQR's X-adaptivity and SPCI's residual-adaptivity. Score width/coverage vs pure-lag SPCI; this directly targets GSE's regime-driven error spikes.

**Verdict:** ADAPT — build SPCI as GSE's second-order calibration layer (QRF on residual lags → conditional residual quantiles → width-minimized intervals), gated on significant residual autocorrelation; demand ≥15% width reduction vs EnbPI at valid coverage on the 2024–2025 backtest.
