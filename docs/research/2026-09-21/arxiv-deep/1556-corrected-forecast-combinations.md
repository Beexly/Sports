# [1556] Corrected Forecast Combinations (arXiv:2601.09999)

**Citation:** Liu, C.-A. and Vasnev, A. L. (2026). *Corrected Forecast Combinations*. arXiv:2601.09999v1 [econ.EM]. URL: https://arxiv.org/abs/2601.09999
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 22 pages, all sections incl. Tables 1–4, Figures 1–4, Theorems 1–4, refs).
**Verdict:** ADAPT — the cheapest high-ROI idea in this lane: if GSE's consensus forecast errors are serially correlated (very likely across weeks), adding γ≈0.5 × last week's consensus error to this week's forecast is a near-free accuracy gain, and the GLS one-step estimator gives a principled way to learn combination weights under that dependence.

## 1. Research question
The forecast-combination literature obsesses over *weights* but ignores the time-series properties of the *combined forecast's errors*. The paper shows combined errors are often strongly autocorrelated (54% in the Bates–Granger 1969 example — overlooked for 55+ years) and asks: can a simple correction — adding a fraction γ of the previous combined error to the next combined forecast — deliver gains exceeding the original combination gains? And can the correction be jointly estimated with optimal weights via GLS under ARMA error dependence, resolving the forecast combination puzzle?

## 2. Dataset / schema
- **Motivating example:** Bates & Granger (1969) Table 1 — 12 monthly 1953 passenger-miles errors for Brown's ES, Box-Jenkins ARIMA, and their EW combination; MSFE 196 / 188 / 150.
- **U.S. Survey of Professional Forecasters** (Philadelphia Fed, public, accessed Oct 2025): one-step-ahead (h=1) quarterly forecasts for UNEMP, RGDP, INDPROD (1969Q1–2025Q2), CPI (1981Q3–2025Q2). Highly unbalanced panel (forecasters skip/join); for the optimal-weight demo: 6 forecasters with ≥70/80 quarters, 2000Q1–2019Q4, missing → previous-forecast imputation.
- **Periods (Table 2):** full, ex-COVID (2020Q1–2022Q4 set to missing per Hyndman & Rostami-Tabar 2025), pre/post-2000, pre-GFC, GFC–COVID, post-COVID.

## 3. Method / model
- **Two-step correction:** f^{CZZ}_{T+h|T} = f^{ZZ}_{T+h|T} + γ·e^{ZZ}_{T|T−h}, ZZ ∈ {EW, BG/OLS-optimal, any}. γ either fixed (default **0.5**) or estimated by rolling historical MSE minimization (Eq. 1) with stabilizing bound −1<γ<1. Theorem 1–2: with b_T = E(e_{T+h|T}|I_T), corrected forecast weakly dominates in conditional and unconditional MSE.
- **One-step (GLS):** y_{t+h} = Σwⱼf_{j,t+h|t} + γ(y_t − Σwⱼf_{j,t|t−h}) + ξ_{t+h} ⟺ quasi-differenced regression (Hildreth–Lu); forecast f^{GLS}_{T+h|T} = ŵ′f_{T+h|T} + γ̂(y_T − ŵ′f_{T|T−h}) (Eq. 6). Theorem 3: GLS weakly dominates OLS out-of-sample under dependence. General ARMA(p,q) extension: min_w (y−Fw)′Ω(γ)⁻¹(y−Fw) s.t. w′ι=1 → w^{opt} = Σ̃⁻¹ι/ι′Σ̃⁻¹ι (Eqs. 7–8); Theorem 4 bounds the risk gap from estimated Ω.
- **Conditional framework (Gibbs & Vasnev 2024):** e^c_{T+h|T} = b_T + ξ_{T+h}, b_T = E(e^c|I_T); AR(1) example b_T = γe^c_{T|T−1}.

## 4. Equations & assumptions
- Correction: f^{CEW}_{t+1|t} = f^{EW}_{t+1|t} + 0.5·e^{EW}_{t|t−1}; error e^{CEW}_{t+1|t} = e^{EW}_{t+1|t} − 0.5·e^{EW}_{t|t−1}.
- γ̂_t = argmin_γ Σ_{τ=t₀}^{t−h} [y_{τ+h} − (f^{EW}_{τ+h|τ} + γe^{EW}_{τ|τ−h})]² (Eq. 1).
- BG optimal weights w^{BG} = Σ⁻¹ι/ι′Σ⁻¹ι (Eq. 3); Granger–Ramanathan regression y_{t+h} = Σwⱼf_{j,t+h|t} + e (Eq. 5), Σwⱼ=1.
- GLS one-step (Eq. 6); general Ω(γ) problem (Eqs. 7–8); Theorem 4 risk bound |R(w^{opt})−R_n(ŵ^{GLS})| ≤ 2a_Tc².
- **Assumptions:** unbiased individual forecasts E(e)=0 (for BG form); existence of first two moments; stationarity of ARMA errors for the generalization; I_T = past combined errors; γ fixed or slowly varying; COVID treated as missing.

## 5. Features / target
- **Inputs:** n individual point forecasts per period; past combined errors e_{T|T−h}.
- **Target:** y_{T+h} (macro indicator levels/growth), h=1 quarter.
- No exogenous features; the "feature" is the lagged combined error itself.

## 6. Validation design
- **Mean-forecast correction:** fixed-γ grid {0,0.1,...,1.0} + historically-optimal γ, relative RMSFE vs. uncorrected mean, across 9 periods × 4 indicators (Table 3). COVID excluded from γ estimation and (in starred rows) evaluation.
- **Optimal-weight correction (UNEMP, 2000Q1–2019Q4):** out-of-sample restricted-OLS weights estimated on expanding [t₀,t], corrected with γ∈{0.5, 0.7(fixed-opt), hist-opt}; GLS one-step via Harvey–Phillips MLE; evaluation from 2006 (Table 4). ACF plots of errors before/after (Figure 4).
- Baselines: individual forecasters, uncorrected mean, uncorrected OLS-optimal (the puzzle: 1.0315 relative MSFE — worse than mean).

## 7. Numerical results / baselines
- **Motivating example (Table 1):** MSFE ES 196 / BJ 188 / EW 150 / **corrected EW 103** — combination: −20%; correction: −31% (correction gain > combination gain).
- **UNEMP mean correction (Table 3, ex-COVID):** γ=0.5 → relative RMSFE 0.83–0.86 across periods (e.g., 2000Q1–2019Q4: 0.83; 2022Q1–2025Q2: 0.74); hist-optimal γ ≈ 0.4–0.54 (Figure 3), performance ≈ fixed 0.5. With COVID included, correction hurts (1.16–1.53) — outlier propagation.
- **RGDP:** γ=0.5 → 0.85–0.92 in all periods *including* COVID (1969–2025: 0.90, ~10% gain).
- **INDPROD:** γ=0.5 → 0.83–0.87 ex-COVID; post-COVID period correction ≈ neutral (0.97).
- **CPI:** hard to beat; γ≈0.3 best except post-COVID 2022–2025 where γ=0.5 → **0.70** (−30%); hist-opt → 0.84 (−16%).
- **Optimal-weight demo (Table 4, UNEMP):** mean MSFE 0.1563 (1.0000); OLS-optimal 0.1613 (**1.0315** — the puzzle); mean+γ0.5: 0.0802 (**0.5132**, −49%); mean+γ0.65: 0.0729 (**0.4663**); OLS-optimal+γ0.5: 0.0915 (**0.5850**, −41%); OLS-optimal+γ0.7: 0.0860 (0.5502); **GLS one-step: 0.0825 (0.5275)** — beats two-step, nearly catches corrected mean. Correction removes error autocorrelation (Figure 4b,d,e).
- Paper's bottom line: "corrected optimal forecast is better than the mean forecast, yet still outperformed by the corrected mean forecast" — the puzzle is *mitigated*, GLS is "a formidable contender."

## 8. Code / data availability
Stated: "The code for the motivating example and the empirical investigation is available at https://github.com/a-vasnev/GLS." Data: SPF public via Philadelphia Fed.

## 9. Leakage & limitations
- **COVID fragility:** correction propagates outliers — with COVID in-sample, γ must be 0 (UNEMP rows >1.0). Any deployment needs outlier handling (the paper just sets COVID to missing). In NFL terms: COVID-like shocks = 2020 opt-out season anomalies, key-injury regime breaks.
- **Hist-optimal γ barely beats fixed 0.5** — estimation adds variance for ~nothing; the paper's own practical advice is "use simple corrections before adding complexity."
- **Unbalanced-panel imputation** (previous forecast carried forward) for the optimal-weight demo is ad hoc; authors admit results "should not be sensitive" but don't test alternatives.
- **Evaluation starts 2006** for methods needing burn-in — shorter effective test.
- **h=1 only** in the empirical work; the theory covers general h but multi-step correction is untested.
- External validity to sports: macro series are smooth and persistent (AR errors natural); NFL weekly outcomes are noisier and more efficient — serial correlation of *consensus errors* may be weaker, though systematic model biases (e.g., overvaluing home favorites) plausibly persist week to week. The 0.5 default was calibrated on macro data, not sports.
- Only 6 forecasters in the optimal-weight demo; Σ estimation with the full unbalanced panel was infeasible — the puzzle-mitigation claim rests on a small, selected subset.

## 10. GSE overlap
Existing-research map: no GSE work corrects the *consensus* forecast using its own lagged errors — GSE's engine publishes weekly picks; whether week-to-week engine errors are autocorrelated is unexamined. This is a **new capability** (error-autocorrelation correction layer), orthogonal to all combiner ledgers [1548, 1552, 1554, 1555]: it sits *downstream* of any weighting scheme. It also reframes [1553]'s beat-the-consensus objective: if consensus errors persist, last week's miss predicts this week's bias. The GLS one-step estimator is an alternative to [1548]'s weight-learning for the same weight-estimation problem under dependence.

## 11. GSE implementation spec
- **Data sources:** GSE engine weekly consensus forecasts (predicted spread/total or win prob) 2020–2025, actuals from nflverse.
- **Build (v1, two-step):** compute weekly consensus error e_t = actual_margin − forecast_margin (or Brier residual for probabilities); publish corrected forecast f_{t+1} + γ·e_t with γ = 0.5 default, per market type (spread/total). Estimate γ per market on rolling history with −1<γ<1 bound (Eq. 1); fall back to 0.5.
- **Build (v2, GLS one-step):** quasi-difference the sub-model forecasts and outcomes, estimate weights + γ jointly (Eq. 6) each offseason.
- **Guardrails:** skip correction after extreme-outlier weeks (|e_t| > 3σ — the COVID lesson); monitor error ACF(1) weekly — if it collapses to ~0, set γ=0 automatically.
- **Effort:** hours for v1 (a dozen lines on engine logs); 2–3 days for the GLS version.

## 12. Reproducible test
2021–2024 NFL regular seasons: baseline = uncorrected weekly engine consensus; challenger = γ=0.5-corrected consensus (per market: spread, total). Metrics: RMSE of predicted margin, Brier on ATS cover, and beat-the-close rate. Also report ACF(1) of baseline consensus errors to verify the premise. Strictly causal (only past errors used).

## 13. Acceptance / rejection gate
ADOPT if (a) baseline consensus errors show ACF(1) ≥ 0.15 (the correctable signal exists) **and** (b) the corrected consensus reduces margin RMSE by ≥3% **and** improves ATS Brier by ≥1% on the 2024 holdout, with no single week contributing >25% of the gain (outlier-robustness). REJECT if ACF(1) < 0.1 (nothing to correct) or if the gain vanishes when the 3 largest-error weeks are excluded — the COVID lesson says outlier-driven "gains" are losses waiting to happen.

## 14. Improvement experiment
**Team-conditional error correction.** The paper corrects with the *pooled* consensus error; in the NFL, biases are team-specific (the engine may systematically overrate certain teams/systems). Decompose e_t into team-level persistent components: e_{t} = μ_{team} + ρ·e_{t−1} + noise, estimated hierarchically across teams. Correct each team's forecast with its own (μ, ρ) shrinkage estimate. Hypothesis: team-level bias persistence is stronger than league-pooled error autocorrelation (coaching systems change slowly), so hierarchical correction beats the paper's pooled γ — and it degrades gracefully (shrinks to pooled γ) for teams with little history.
