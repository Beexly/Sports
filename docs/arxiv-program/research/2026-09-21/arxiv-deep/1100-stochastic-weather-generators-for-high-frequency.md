# [1100] Stochastic Weather Generators for High-Frequency Wind Vector Time Series (arXiv:2606.09941v1)

**Citation:** Cui, M., Eng, K., Greene, J. T., Ke, Z., Sodagartojgi, A., Xia, Z., Moran, G. E., Stein, M. L. (2026). *Stochastic Weather Generators for High-Frequency Wind Vector Time Series*. arXiv:2606.09941v1. URL: https://arxiv.org/abs/2606.09941
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — a niche deep-generative method (Time VQ-VAE + MaskGIT) for minute-scale wind simulation at one Oklahoma site that explicitly fails on extreme winds — exactly the tail regime that would matter for game-day applications; no path to improving NFL predictions.

## 1. Research question
Can a deep generative model (Time VQ-VAE + MaskGIT bidirectional transformer) produce realistic minute-by-minute synthetic wind-vector time series capturing complex diurnal volatility, for use as inputs to wind-energy/wildfire/aviation models?

## 2. Dataset / schema
US DOE ARM facility, Lamont, Oklahoma: 1 Hz surface meteorology summarized to minute scale, June only (to suppress seasonality), 1994–2025. Train: June 1–21, 1998–2020 (474 full days); validation: June 22–30 same years; test: 1994–1997 + 2021–2025 (185 days). Wind vector at 10 m; discrete weather states from pressure/rain (16 levels). Gaps ≤20 min imputed with Brownian bridges.

## 3. Method / model
Stage 1: Time VQ-VAE tokenizes each day's 1,440-minute wind-vector sequence. Stage 2: MaskGIT bidirectional transformer trained with masked token-wise NLL (Eq. 8), plus weather-state variants (None / as-Feature / Embedded, Eqs. 9–10). Sampling via iterative MaskGIT decoding (Algorithm 1). Two temporal modes: independent days vs consecutive-day conditioning (last 60 min of prior day).

## 4. Equations & assumptions
- Masked NLL: `L(θ) = −Σ_i Σ_{t:m=1} Σ_k 1(s_t^{(i)}=k) log p(s_t^{(i)}=k | s_{1:C}^{(i−1)}, s_{m(1:T)}^{(i)})`.
- Energy score: `ES(F,y) = (1/m)Σ||Xi−y|| − (1/2m²)ΣΣ||Xi−Xj||`.
- Quantile-regression volatility diagnostic: minimize `Σ ρ_τ(d_t − βᵀf(·))`, ρ_τ(u)=u(τ−1{u<0}).
- Assumptions: June-only stationarity; tokenization preserves relevant dynamics; weather-state discretization (16 levels) captures regime effects.

## 5. Features / target
Inputs: minute-scale easterly/northerly wind components (+ optional weather-state channel). Target: synthetic day-long wind-vector sequences indistinguishable from real ones.

## 6. Validation design
Held-out years as test (analyzed only after model freeze). Evaluation: (a) bidirectional-LSTM discriminator (real vs synthetic accuracy, 50 seeds); (b) energy scores vs training-distribution baseline on 185 test days; (c) graphical diurnal/marginal/tail checks; (d) quantile-regression volatility replication at τ=0.9; (e) memorization check (min Euclidean distance to training days).

## 7. Numerical results / baselines
- Discriminator (1-day, best = Embedded+Consecutive): real 0.766 (0.052), synthetic 0.744 (0.081) — well above 0.5 chance, so detectable; high-pass-filtered accuracy 0.896 on synthetic.
- Energy scores (Embedded+Independent): median +0.55% vs training baseline, IQR [−2.12%, +3.12%] — closest to training performance.
- Volatility: Embedded generator replicates the 42.0% C_0.9 reduction (achieves 40.6%); Features generator underestimates baseline volatility by ~26%.
- Tails: no generated wind speed exceeds the 22.7 m/s training max in 50,000 days (Embedded: 3 exceedances); observations exceed 20 m/s 28 times. Authors' conclusion: nonparametric generators "understandably unable to reproduce extreme winds accurately."
- Code: https://github.com/Zernjk/Stochastic-weather-generators-for-high-frequency-wind-vector-time-series (+ Zenodo archive).

## 8. Code / data availability
Code on GitHub + Zenodo (Cui et al., 2026a). Data: ARM facility public data.

## 9. Leakage & limitations
Clean split discipline (test years untouched until freeze). Limitations: single site, single month — no spatial or seasonal generalization; day-boundary transitions unrealistic (RMS day-boundary wind-speed change 1.17–1.34 vs 0.73 observed); extreme winds not reproduced (the regime that would matter for sports); minute-scale modeling is overkill for game-day decisions (hourly stadium forecasts suffice); no predictive (forecasting) use — purely generative.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8 (weather physics for totals) needs wind physics × stadium effects on scoring — this paper simulates minute-scale wind at one site with no stadium, no scoring linkage, and no tail fidelity. Ledger 1098 covers the actionable weather-calibration lane. No transferable method for GSE.

## 11. GSE implementation spec
Not applicable — REJECT.

## 12. Reproducible test
Not applicable — REJECT.

## 13. Acceptance / rejection gate
REJECT: methodologically interesting but the failure mode (no extreme winds) kills the only sports use case, and minute-scale single-site simulation has no path to NFL prediction value. Replaced by ledger 1305.

## 14. Improvement experiment
Not applicable — see replacement ledger 1305 for the same-lane (weather/wind) substitute.
