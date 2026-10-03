# [0749] Temporal Conformal Prediction (TCP): A Distribution-Free Framework for Adaptive Risk Forecasting (arXiv:2507.05470)

**Citation:** Agnideep Aich, Ashit Baran Aich, Dipak C. Jain (2025). *Temporal Conformal Prediction (TCP): A Distribution-Free Statistical and Machine Learning Framework for Adaptive Risk Forecasting*. arXiv:2507.05470. URL: https://arxiv.org/abs/2507.05470
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the rolling-window conformal + Robbins–Monro coverage-error correction is a usable adaptive-interval mechanism for GSE's non-stationary series (totals lines, pick-performance tracking); adapt the mechanism, NOT the paper's calibration claims, which the paper's own tables contradict (see §9). Calibrated, with the abstract flagged as unreliable.

## 1. Research question
Classical conformal prediction needs exchangeability, which financial (and sports) time series violate via volatility clustering and regime shifts. Can a rolling-window conformal layer over quantile-regression forecasts, plus an online Robbins–Monro update of the conformal threshold driven by coverage errors, deliver adaptive prediction intervals that track non-stationarity without parametric assumptions?

## 2. Dataset / schema
Daily log-returns r_t = log(P_t/P_{t−1}), **2017-11–2025-05**: S&P 500 (equities), Bitcoin (crypto), Gold (commodities). Features: 5 lagged returns, 20-day rolling volatility, squared prior return (nonlinearity). Baselines: GARCH, Historical Simulation, static Quantile Regression (QR). 1,449 TCP predictions vs. 1,701 QR / 1,670 GARCH / 1,468 Hist (different burn-in windows).

## 3. Method / model
**TCP (Algorithm 1)**: (1) fit quantile models q̂_{α/2}, q̂_{1−α/2} on rolling window {r_{i−w}..r_{i−1}}; (2) nonconformity scores ε_{i,τ} = r_i − q̂_{α/2}(X_i) (lower) and q̂_{1−α/2}(X_i) − r_i (upper); (3) conformal threshold C_t = (1−α)-quantile of windowed scores; (4) interval [ℓ_{t+1}, u_{t+1}] = [q̂_{α/2}(X_{t+1}) − C_t, q̂_{1−α/2}(X_{t+1}) + C_t]. **Adaptive layer**: coverage error e_t = 1{r_t ∉ [ℓ_t,u_t]} − α; Robbins–Monro update C_{t+1} = C_t + γ_t e_t with γ_t = γ_0/(1+λt)^β, β∈(0.5,1]. **Practical modification** (NOT covered by the proof): when r_t falls inside the interval, shrink C_t by a small fraction of γ_t ("forgetting factor") so intervals narrow again after volatility passes. Theorem 4.2: long-run average coverage → 1−α a.s. under ergodicity (for the unmodified RM rule).

## 4. Equations & assumptions
C_{t+1} = C_t + γ_t e_t; γ_t = γ_0/(1+λt)^β; Σγ_t=∞, Σγ_t²<∞ (Robbins–Monro conditions). Coverage error e_t = 1{r_t∉[ℓ_t,u_t]} − α. Interval: [q̂_{α/2}(X_{t+1})−C_t, q̂_{1−α/2}(X_{t+1})+C_t]. Assumptions: ergodicity for Theorem 4.2; local exchangeability within window w; the shrinking heuristic has NO theoretical backing (authors' own admission).

## 5. Features / target
Features: lagged returns (k=1..5), 20-day rolling SD, squared returns. Target: next-day log-return. Horizon: 1 day.

## 6. Validation design
Out-of-sample rolling evaluation per asset, nominal 95% coverage; metrics: empirical coverage, average interval width; hyperparameter sensitivity over w ∈ {100,252,500} × γ_0 ∈ {0.005,0.01,0.05} on S&P 500 (+ appendices for BTC/Gold); COVID-crash (Feb–Apr 2020) case study visualization.

## 7. Numerical results / baselines
Table 1 (target 95%): S&P 500 — TCP coverage **0.861**, width 2.661; QR 0.971/2.229; GARCH 0.827/3.051; Hist 0.931/5.058. BTC — TCP 0.885/9.611; QR 0.969/7.849; GARCH 0.853/11.391; Hist 0.944/18.058. Gold — TCP 0.881/2.202; QR 0.969/1.800; GARCH 0.837/2.618; Hist 0.933/4.024. Sensitivity (Table 2, S&P): coverage ranges 0.8463–0.8958 across the grid, widths 2.58–2.77 — stable but persistently below 95%. COVID case study: TCP intervals visibly widen in March 2020 and contract in April — the qualitative adaptiveness claim holds.

## 8. Code / data availability
None stated. Price data is public (Yahoo Finance-type).

## 9. Leakage & limitations
**Abstract-vs-body discrepancy (integrity flag)**: the abstract claims "TCP achieves near-nominal coverage" and cites S&P 500 widths "5.21 vs. 5.06" — but Table 1 shows TCP coverage 0.861–0.885 (far from the 95% nominal) and widths 2.661 vs. 5.058. The abstract numbers match neither the table nor the body text (which honestly admits "TCP's empirical coverage of 86–88% undershoots the 95% target"). Treat the abstract as describing a different/stale experiment version; cite only the body. Further limits: (a) the shrinking heuristic voids the Theorem 4.2 guarantee for the actually-tested method; (b) QR "wins" on sharpness but over-covers (0.969–0.971) — miscalibrated in the opposite direction; (d) no comparison to ACI (adaptive conformal inference), the natural baseline; (e) β, λ not sensitivity-tested; (f) financial returns only.

## 10. GSE overlap
Existing-research-map.md: conformal prediction covered (CQR, conformal audit), but **online/adaptive conformal with coverage-error feedback is not in the map** — GSE's intervals are static-window. The RM-update mechanism is a new capability for tracking regime drift in interval calibration.

## 11. GSE implementation spec
(1) Implement the TCP loop for GSE game-total intervals: rolling quantile-regression (or reuse GSE's quantile models) + windowed conformal threshold + RM update on weekly coverage errors (e_t = 1{total outside interval} − α), with the shrink heuristic as a tunable option; (2) grid-search w ∈ {1 season, 2 seasons} × γ_0 on 2023–2024; (3) evaluate on 2025: coverage vs. nominal 90%, width vs. static conformal. Effort: ~3 days.

## 12. Reproducible test
Dataset: 2022–2025 NFL game totals, rolling origin. Baselines: static split-conformal, GSE current intervals. Metrics: empirical coverage (target 90%), mean width, coverage during high-volatility episodes (weeks 1–4, playoff races). Success = TCP coverage within 2pp of nominal AND narrower mean width than static conformal, OR demonstrably faster re-convergence after episode shocks.

## 13. Acceptance / rejection gate
ADOPT the RM adaptive layer if it keeps rolling coverage within 2pp of nominal over the 2025 season with width ≤ static conformal; REJECT the shrink heuristic if ablation shows it causes systematic under-coverage (the paper's own 86–88% vs 95% suggests the heuristic overshoots); REQUIRE an ACI baseline in the horse race — the paper's omission is not GSE's.

## 14. Improvement experiment
**Regime-conditioned γ_t**: make the RM learning rate a function of a detected volatility state (calm/normal/turbulent) instead of pure time decay — the paper's γ_t decays monotonically, so late-sample adaptation is sluggish by construction; a state-dependent rate would adapt fast in crises and stay stable in calm, fixing the exact weakness the COVID case study visualizes.
