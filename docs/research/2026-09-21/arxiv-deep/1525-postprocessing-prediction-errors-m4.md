# [1525] Probabilistic Forecasting via Post-Processing Prediction Errors: In- or Out-of-Sample? (arXiv:2608.10620)

**Citation:** Piotr Zaborowski, Arkadiusz Lipiecki, Fotios Petropoulos, Rafał Weron (2026). *Probabilistic Forecasting via Post-Processing Prediction Errors: In- or Out-of-Sample?* arXiv:2608.10620v1 [stat.AP] (EJOR). URL: https://arxiv.org/abs/2608.10620
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv; all sections through discussion and conclusions).
**Verdict:** ADAPT — GSE's engine emits point forecasts; this paper's hybrid framework (post-process residuals + model-specific horizon scaling) is the cheap, proven way to turn them into predictive distributions, with in-sample calibration as the default.

## 1. Research question
Can post-processing prediction errors systematically beat the traditional Gaussian predictive distributions built from in-sample residuals — and should calibration use in-sample residuals (cheap) or out-of-sample rolling-origin errors (expensive)?

## 2. Dataset / schema
14,407 monthly M4 series (T=324 each, longest monthly M4 series; 4 flat series removed), categories Macro 3,818 / Micro 3,416 / Demographic 3,159 / Industry 2,333 / Finance 1,634 / Other 47. Test = last K=12 obs; 2,074,608 forecast–observation evaluations per method (12 horizons × 14,407 series × 12 targets). Base point models: Theta, ETS, ARIMA (R forecast package).

## 3. Method / model
Hybrid framework: (1) post-process one-step errors via HS (signed-error empirical quantiles), CP (absolute-error symmetric intervals), QR/QRM (quantile ~ linear in point forecast, quantiles sorted to fix crossing), or GARCH(1,1) with variance targeting; (2) apply model-specific horizon scaling: in-sample variant rescales (q̂^p − q̂^0.5) by ς̂_{τ|ξ}/ς̄^in_ξ (Eq. 7); out-of-sample variant rescales by ς̂_{τ|ξ}/ς̂_{ξ+1|ξ} for h>1 (Eq. 8). Both in-sample and out-of-sample calibration tested for all four methods (PostForecasts.jl).

## 4. Equations & assumptions
- HS: q̂^p = ŷ + Q_p({ε_t}) (Eq. 1); CP: q̂^p = ŷ ∓ Q_{2p/2(1−p)}({|ε_t|}) (Eq. 2, symmetric-error assumption for quantile translation); QR: q̂^p = β_1,p ŷ + β_0,p (Eq. 3); GARCH(1,1): σ̂²=ω+αε²+βσ̂² (Eq. 4), multi-step σ̂²=ω+(α+β)σ̂² (Eq. 5), Gaussian quantiles (Eq. 6).
- CRPSS_h = [1−exp(mean ln rCRPS)]×100% (Eqs. 15–16), geometric mean over series; CRPS via 99 pinball quantiles (Eqs. 12–14).
- Assumptions: residual shape transfers across horizons (only scale changes per the base model); in-sample residuals approximate out-of-sample error distribution; Gaussian errors for GARCH quantiles and benchmarks.

## 5. Features / target
Point forecasts → quantile forecasts at 99 levels; continuous monthly series values.

## 6. Validation design
Expanding-window origins ξ=72…323, horizons 1–12; CRPSS vs. R-forecast-package Gaussian benchmark; MCB rank tests (Koning et al. 2005) for significance; horizon-by-horizon breakdown; computation-time measurement (Apple M2 Pro, single thread).

## 7. Numerical results / baselines
- All 8 post-processing variants beat the benchmark on average; gains up to 4.6%: Theta QR_in 4.59%, ARIMA QR_in 4.53%, ETS HS_in 3.25% / CP_in 3.14%.
- In-sample beats out-of-sample in 11/12 model–method combos (largest gaps: HS on ETS +1.49pp, CP on ETS +1.35pp); sole exception QR on ETS (−1.78pp, out-of-sample better).
- In-sample advantage grows with horizon (Theta, ETS-HS/CP); GARCH declines with horizon, sometimes worse than benchmark at long h.
- MCB ranks: Theta → QR_in dominates; ETS → HS_in ≈ CP_in; ARIMA → QR_in ≈ GARCH_in; HS_in and QR_out beat benchmark for all three models.
- Compute: rolling-origin forecast generation for out-of-sample calibration costs 180–215× more (Theta 8.4ms→1.8s, ETS 0.45s→83s, ARIMA 1.1s→3.3m); post-processing itself trivial (CP/HS 0.20ms, GARCH 2.2ms, QR 0.12s ≈ 600× CP/HS).

## 8. Code / data availability
PostForecasts.jl (Lipiecki & Weron 2025); M4 data public; R forecast package.

## 9. Leakage & limitations
- No leakage (expanding window, calibration strictly before test targets). Out-of-sample calibration sets have 72 fewer pairs than in-sample — a design confound the authors disclose.
- Monthly data only; benefits expected to shrink at lower frequencies. Horizon scaling inherits base-model assumptions (long-horizon results are joint tests of post-processing + scaling).
- No single method dominates: best method depends on base model and horizon.

## 10. GSE overlap
Existing research map calibration cluster has CQR intervals and conformal layers but no systematic point-forecast → predictive-distribution post-processing comparison. This fills it: HS/CP on engine residuals as a cheap alternative/complement to CQR, with the in-sample finding directly answering the "how do we calibrate without refitting history" question. Pairs with ledger 1522 (which games go in the calibration set) and 1521 (CPIT as the heavier distributional alternative).

## 11. GSE implementation spec
- Build an HS post-processor over the engine's existing point forecasts: collect in-sample residuals (realized margin − engine spread; realized total − engine total), form predictive quantiles q̂^p = point + Q_p(residuals), rescaled by horizon-analog (week-of-season uncertainty growth or model-based error variance).
- Default to in-sample calibration (paper: better in 11/12, ~200× cheaper); use QR variant only if HS underperforms on validation.
- Effort: 1 day.

## 12. Reproducible test
Dataset: engine point forecasts (spread, total) + outcomes, 2022–2024. Build HS_in and CP_in predictive distributions from in-sample residuals vs. the engine's current Gaussian/CQR intervals; evaluate CRPS skill and 90% coverage. Expect positive CRPSS of a few percent per the paper; also test QR_on_ETS-style exception by comparing HS vs QR per market.

## 13. Acceptance / rejection gate
ADOPT HS_in post-processing as the engine's default uncertainty layer if CRPSS >0 vs. current intervals on the 2022–2024 backtest AND 90% coverage lands in [0.87,0.93]; if QR beats HS on any market by >1pp CRPSS, adopt per-market method selection (the paper's heterogeneity finding).

## 14. Improvement experiment
Go beyond the paper: replace the model-based horizon scaling (Eq. 7) with a learned scaling function of week-of-season and matchup features (the GSE analog of "horizon"), and test whether in-sample calibration's advantage persists when the calibration set is chosen by the ledger-1522 diversity selector instead of recency — combining both papers' findings in one experiment.
