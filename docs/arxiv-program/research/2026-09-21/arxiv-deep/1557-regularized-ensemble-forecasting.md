# [1557] Regularized Ensemble Forecasting for Learning Weights from Historical and Current Forecasts (arXiv:2602.11379)

**Citation:** Su, H., Guo, X. and Zhang, X. (2026). *Regularized Ensemble Forecasting for Learning Weights from Historical and Current Forecasts*. arXiv:2602.11379v2 [stat.AP]. URL: https://arxiv.org/abs/2602.11379
**Ledger completed:** 2026-09-21. **Read:** full text end-to-end (PDF, 60 pages: main text §§1–6 + refs + Online Appendix A, all of A.1–A.9: closed-form Identity-L2 weights (Eq. 19), technical assumptions, Proposition 1 + Theorem 1 proofs via Lemmas 1–3 (REF MSPE = σ_y² + O(1/k²)), correlated-error simulation (A.5, ρ = 0.2–0.8, REF beats Winsorized Mean and CCR), Bayesian L2-model derivations (A.6–A.7), M5 tables A.1–A.9 and SPF tables A.10–A.15). Appendix confirms the main-text figures: REF vs simple mean 2.26% (k=5, Table A.4) to 6.22% (k=50, Table A.7); best RMSSE 0.335 at k=15 (Table A.2); validation-selected spec rank 1 at all pool sizes (Table A.9); variance-based priors beat CCR-based priors (GDP 6.81%, UNEMP 6.27%, CPI 2.85%, Tables A.14–A.15).
**Verdict:** ADAPT — a principled answer to the "history vs. this-week" weight problem every GSE ensemble faces: minimize dispersion of the *current* forecast set while shrinking weights toward *historical* track-record priors, with λ chosen by rolling validation. Outperforms every benchmark in M5 and SPF, works with rotating expert pools.

## 1. Research question
Weighting schemes usually use *either* current forecasts (simple mean, trimming) *or* historical accuracy (BG variance weights, OLS stacking) — never both jointly. The paper asks: can an objective that simultaneously (a) minimizes the variance of the *current* ensemble forecast and (b) regularizes weights toward historical-performance priors, with λ tuned by rolling validation, beat both classes of benchmark? And can this be derived from a Bayesian hierarchical model so the variance transform f and penalty Φ are principled choices?

## 2. Dataset / schema
- **Study 1 — M5 competition:** publicly released submissions of 50 teams (accuracy track), 28-day point forecasts of daily unit sales; focus on first 9 hierarchical levels (154 series, levels 1–9; levels 10–12 excluded — sparse daily sales). Fixed expert pool = top-k teams by official M5 leaderboard, k ∈ {5,10,15,20,50}. Days 1–21 historical forecasts (T=21), Days 15–21 rolling validation (l=14), Days 22–28 testing.
- **Study 2 — SPF:** Philadelphia Fed Survey of Professional Forecasters, NGDP growth, UNEMP change, CPI inflation; 2000Q1–2025Q2 test quarters; horizons h=0 (nowcast) and h=1. **Rotating expert pool** (forecasters enter/exit). Realizations from RTDSM initial-release vintages. Per test quarter: preceding 16 quarters history (T=16), prior-weight window l=8 → 8 rolling validation quarters, λ re-tuned per quarter; pool restricted to forecasters submitting at t with ≥1 appearance in the window; missing validation forecasts imputed by cross-sectional mean.
- **Simulation (A.5):** k=10 experts, yt = m+ut, µt,i = m+at,i+rt,i with at,i AR(1) (ϕ=0.5) persistent bias; ρ ∈ {0.2,0.4,0.6,0.8}; 100 Monte Carlo reps; 40-period history, 40-period rolling window, 20 validation, 20 test.

## 3. Method / model
- **REF objective:** w* = argmin_w f(Σᵢ wᵢ²(µᵢ−E[µ])²) + λΦ(w), s.t. Σwᵢ=1, wᵢ≥0 (Eq. 3). Variance term = current-forecast dispersion around consensus (down-weights outliers, robustifies); Φ = historical regularization (L2: Σ(wᵢ−sᵢ)²; Entropy: Σsᵢlog(1/wᵢ)); f ∈ {identity, log, shifted-log}.
- **Bayesian derivation:** hierarchical w∼π(·|α), β|w,µ∼h, y|β∼g; treat unobserved y as missing data and do EM-style E-step Q(w|µ)=E_y[log p(y|w,µ)π(w|α)], M-step maximizes Q → exactly the REF objective under six specs (Table 1): {Shifted Log, Log, Identity} × {Entropy (Dirichlet prior), L2 (normal prior centered at s)}. Also gives the full posterior predictive distribution of the ensemble forecast.
- **Prior weights s:** Common Correlation Weights (Soule et al. 2024) — sᵢ ∝ [(1+(k−1)ρc)vᵢ⁻² − ρc vᵢ⁻¹Σⱼvⱼ⁻¹]/normalization (Eq. 17); ρc estimated by maximum-posterior on complete-case subset, vᵢ² per-expert from available history; new experts imputed with cross-sectional average precision. Robustness check with plain variance weights.
- **Implementation:** softmax reparameterization (unconstrained optimization), σ² estimated from recent simple-mean errors, λ selected by rolling-window validation minimizing validation RMSSE (fixed λ* for M5; per-quarter re-tuning for SPF). Final REF = average of the six specifications (best-spec selection gives similar results).

## 4. Equations & assumptions
- Eq. (1)→(2): min Var(Σwᵢµᵢ) with independent common-mean forecasts → min Σwᵢ²(µᵢ−E[µ])².
- Eq. (3) REF; Eqs. (11),(14),(16),(24)–(27): six Bayesian specs; Table 1 mapping.
- Eq. (17) CCR prior weights; PS (penalty share) measure §5.4; RMSSE (Eq. 18) vs. naïve in-sample RMSE.
- Theorem 1: MSPE of REF = O(1/k)+σy² — same asymptotic rate as the simple mean (needs proper λ order); Proposition 1: simple-mean baseline O(1/k)+σy²; Remark 1: assumptions imply common correlation ρ=σy²/(σ₀²+σy²) on forecast errors.
- **Assumptions:** µᵢ independent draws with common mean E[µ] (errors may still be correlated, Remark 1); convex weights (interpretability, Theorem 1 requirement); wi>0; expert pool known at forecast time; imputation scheme for rotating pools.

## 5. Features / target
- **Inputs:** k experts' current point forecasts µᵢ (target = y, continuous: product sales / macro indicator); plus historical forecast errors for s estimation.
- **Target:** 28-day-ahead daily sales (M5) or next-quarter macro realization (SPF, h=0/1).
- Target transformed for stationarity (growth rates, first differences; §5.3).

## 6. Validation design
- **M5:** 6 REF specs (averaged), λ per series from Days 15–21 rolling validation; RMSSE on Days 22–28 vs. 8 benchmarks (Simple/Trimmed/Winsorized means; Variance Weights; CWM; CCR; StackingRegressor/RidgeCV; ES_bu; Best Expert). One-sided bootstrap p-values (1,999 reps).
- **SPF:** per-quarter λ re-tuning, 8-quarter validation, full-period RMSSE 2000Q1–2025Q2 vs. 6 benchmarks (Simple/Trimmed/Winsorized; Variance Weights; CWM; CCR; StackingRegressor).
- **Simulation:** REF vs. Winsorized Mean and CCR across ρ ∈ {0.2,0.4,0.6,0.8}.

## 7. Numerical results / baselines
- **M5 (Table 2):** REF rank 1 at every pool size k; improvement over Simple Mean: 2.26% (k=5) → 6.22% (k=50); best absolute RMSSE 0.335 at k=15. CCR second (2.27% at k=15). StackingRegressor catastrophically worst (e.g., −553.6% at k=20; unconstrained ridge weights overfit with #coefficients ≈ #observations). All REF-vs-benchmark p-values <0.001 (except CCR at k=20/50: 0.016/0.012). Table 3: REF best at all 9 hierarchy levels.
- **SPF (Table 4, avg of h=0/1):** REF rank 1 for all three indicators: NGDP growth 1.054 (+4.08%), UNEMP change 1.662 (+5.73%), CPI inflation 0.954 (+2.53%). Significant vs. nearly all benchmarks. History-only methods underperform the Simple Mean in 8/9 cases here (rotating pool makes history unreliable) — yet REF still wins by balancing.
- **Penalty-share analysis (§5.4):** REF beats current-only benchmarks most when PS high, beats history-only benchmarks most when PS low; strong even at medium PS (balanced regime). In M5, REF's edge over the Simple Mean grows with expert pool size; historical influence (PS) grows as k grows.
- **Simulation (A.5, Fig A.1):** positive average RMSE gains over both Winsorized Mean and CCR at all ρ; gain over Winsorized Mean larger at small ρ (dispersed current forecasts).

## 8. Code / data availability
No public code repository or package link stated in the paper (M5/SPF data are public; benchmark code adapted from Soule et al. 2024's released code). Method is fully specified — implementable from the paper.

## 9. Leakage & limitations
- **No NFL/sports data** — retail sales and macro; transfer to weekly sports forecasts is the core assumption to test.
- **Evaluation windows short:** M5 test = 7 days; SPF validation windows = 8 quarters — λ selection itself is noisy, though re-tuned per period.
- **Prior weights need history:** for genuinely new experts the prior is imputed as cross-sectional average — in GSE terms, a new model's debut week gets the average weight; fine but slow to promote a genuinely better model.
- **Point forecasts only** — no probabilistic/quantile combination in this paper (M5 uncertainty-track extension is future work); GSE's spread/total engine would map naturally, but win-probability aggregation needs the Beta–Bernoulli extension (also future work).
- **Six-spec averaging** is the reported REF; a practitioner picking one spec blind may get less.
- **λ grid search per series/quarter** is compute-heavy at scale (GSE: fine — small k, weekly cadence).
- Assumes common-mean current forecasts; with very few experts (k=2–3) the variance term is a noisy consensus gauge — Theorem 1 is asymptotic in k.
- RMSSE denominator for M5 is the competition's 1,941-day naïve RMSE — percentage gains are relative to Simple Mean within the same scaling; absolute RMSSE differences are small (0.335 vs 0.351).

## 10. GSE overlap
Existing-research map: no REF-style dual objective — GSE ledgers cover current-only (equal weights, trimming analogues) and history-only (variance-weight-style, OLS/stacking analogues [1555]) but nothing that jointly optimizes both with a validation-tuned balance. The penalty-share diagnostic is new instrumentation: it tells us *when* GSE's ensemble is leaning on track record vs. this-week consensus. Complements [1548] (adaptive weights), [1552] (diversity features), [1556] (error correction downstream). The SPF rotating-pool handling directly answers GSE's sub-model churn problem.

## 11. GSE implementation spec
- **Data sources:** GSE engine sub-model weekly forecasts (per market: spread, total; probability outputs transformed to log-odds for the continuous formulation) 2020–2025 + actuals from nflverse.
- **Build:** weekly, per market: (1) current forecasts µᵢ; E[µ] = cross-sectional mean; (2) prior weights s = CCR (Eq. 17) from rolling l=8 weeks error history with common-correlation estimate, new sub-models imputed at average precision; (3) λ selected from grid by rolling validation over preceding weeks minimizing ATS/point-error; (4) solve Identity-L2 + Log-Entropy specs via softmax, average the six specs' weights; (5) publish ensemble + posterior predictive interval (Bayesian bonus: credible bands for the pick).
- **Effort:** 3–5 days (one clean module; weekly runtime trivial).

## 12. Reproducible test
2021–2023 training (λ and s estimation windows), 2024 test: REF ensemble vs. Simple Mean, Trimmed Mean, CCR-style variance weights, and ridge-stacking of sub-model forecasts. Metrics: margin RMSE, ATS Brier, and penalty-share trajectory through the season. Strictly causal rolling windows; new-model debut weeks included to test the imputation path.

## 13. Acceptance / rejection gate
ADOPT if on the 2024 holdout REF improves margin RMSE ≥2% and ATS Brier ≥1% vs. Simple Mean **and** the medium-PS weeks (balanced regime) are the ones driving the gain — not just outlier-robustness weeks. REJECT if REF ≈ Simple Mean (within 0.5%) or if the tuned λ collapses to ≈0 or ≈∞ (degenerate to one information source), meaning GSE's data doesn't support the joint objective.

## 14. Improvement experiment
**Market-regime-conditioned λ.** The paper tunes λ per series/quarter but doesn't condition on *regime*. In NFL, the value of historical track record vs. current-week consensus plausibly shifts with market regime: early season (noisy priors, small samples) vs. late season (stable track records), and high-volatility weeks (injury news) vs. normal weeks. Fit λ as a function of observable regime features (week number, consensus dispersion, injury-report volume) via the same rolling-validation objective. Hypothesis: early-season λ favors current forecasts (PS low) while late-season λ favors history (PS high) — matching the paper's M5 finding that history's influence grows with pool size, but here driven by *sample depth* rather than k.
