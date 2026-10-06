# [2165] Sparse Identification of Nonlinear Dynamics with Conformal Prediction (arXiv:2507.11739v1)

**Citation:** Urban Fasel (2025). *Sparse Identification of Nonlinear Dynamics with Conformal Prediction*. arXiv:2507.11739v1. URL: https://arxiv.org/abs/2507.11739
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADOPT — brings distribution-free coverage guarantees to SINDy via conformal prediction, directly solving GSE's calibration problem: every published equation and forecast gets honest uncertainty intervals that hold even under non-Gaussian noise.

## 1. Research question
SINDy discovers sparse governing equations but its uncertainty quantification (Bayesian, ensemble) rests on distributional assumptions and its coefficient intervals fail under process noise or non-Gaussian measurement noise. Can conformal prediction — which guarantees P(Y ∈ C_α) ≥ 1−α under exchangeability alone — be integrated with Ensemble-SINDy for three purposes: (1) honest time-series prediction intervals, (2) library feature importance for model selection, (3) uncertainty intervals on the discovered coefficients themselves?

## 2. Dataset / schema
Synthetic, fully reproducible:
- **Stochastic predator–prey** (Eq. 19): ẋ₁ = αx₁ − βx₁x₂ + w₁, ẋ₂ = δx₁x₂ − γx₂ + w₂, y = x + v; true params [α,β,γ,δ] = [1, 0.1, 1, 0.1]; Gaussian measurement + process noise, plus a non-zero-mean gamma observation-noise variant; dt=0.1; small quadratic library; weak-form SINDy used (no derivative computation on noisy data).
- **Appendix:** longer-horizon (10-step) predator–prey; Lorenz (3 ODEs, 2nd-order polynomial); hyperchaotic Rössler variant (2+ positive Lyapunov exponents); quadrupole boson Hamiltonian (4 eqs, 3rd-order polynomials).
No external data; code: https://github.com/urban-fasel/SINDyCP_tutorials.

## 3. Method / model
**Ensemble-SINDy** (Fasel et al. 2022): B bootstrap resamples of [Ẋ, Θ(X)] rows → B SINDy fits → median/mean coefficient aggregation + inclusion-probability thresholding. Three conformal integrations:
1. **EnbPI + E-SINDy for time-series prediction:** each ensemble member = SINDy equation + RK4 integrator + Savitzky–Golay state estimator, forecasting t_p steps ahead; non-conformity scores s_t^(b) = |y_t − f̂_b(x_t)| (Eq. 8) computed only with models that did NOT train on x_t (out-of-sample); interval C_{n+1} = [f̄ − q_{1−α}, f̄ + q_{1−α}] (Eqs. 9–10); sliding calibration window of size l_r, recalibrated online.
2. **Conformal PID control + E-SINDy:** quantile q_t adapted by PI controller on miscoverage error g_t = err_t − α: q_{t+1} = ηg_t (P) + r_t(Σg_i) (I) (Eq. 11); long-run coverage (1/T)Σ err_t = α + o(1) (Eq. 7) under bounded scores — no exchangeability needed.
3. **LOCO / LOCO-path for library feature importance:** refit SINDy without feature j (Eq. 12); excess error Δ_j = ‖ẋ−ΘΞ^(−j)‖₁ − ‖ẋ−ΘΞ‖₁ (Eq. 13) via jackknife+; LOCO-path variant T_j = Σ_λ ‖Ξ^(−j)(λ) − Ξ(λ)‖₁ (Eq. 14) — importance across the whole λ path, no λ selection needed.
4. **Feature-CP for coefficient uncertainty:** jackknife ensemble; surrogate SINDy model per excluded point via constrained least squares Θ(x_i)ξ_k = ẋ_i (Eqs. 15–17, KKT system); non-conformity s_i = ‖Ξ̃_i − Ξ_i‖₁ (Eq. 18); quantiles → 90% intervals on coefficients.

## 4. Equations & assumptions
- SINDy: ẋ = f(x) (Eq. 1); Ẋ = Θ(X)Ξ (Eq. 2); Ξ = argmin ‖Ẋ−ΘΞ̂‖²₂ + λ‖Ξ̂‖₀ (Eq. 3); STLSQ solution.
- Coverage target P(Y_{n+1} ∈ C_α(X_{n+1})) ≥ 1−α (Eq. 4); split-CP interval C_α = [f̂ − q_{1−α}, f̂ + q_{1−α}] (Eqs. 5–6); long-run CP-PID coverage (Eq. 7).
- Predator–prey ground truth (Eq. 19) with [1, 0.1, 1, 0.1].
- Assumptions: EnbPI needs exchangeability-ish residuals ("approximately valid" under mild estimator assumptions); CP-PID needs only bounded scores for long-run coverage; LOCO sensitive to correlated features (compensating covariates underestimate importance); post-selection inference caveat for feature-CP acknowledged (no formal finite-sample guarantees claimed for the SINDy-specific procedures).

## 5. Features / target
Library features = candidate nonlinear functions evaluated on state snapshots (quadratic terms for predator–prey; polynomial up to 2nd/3rd order for chaotic systems); targets = time derivatives (finite-difference or weak-form). Prediction target = future state trajectory over horizon t_p.

## 6. Validation design
100 repeated noise realizations; coverage measured over trailing 50-step windows; target coverage levels swept (Figure 3); noise levels swept (low/high measurement + process); compared EnbPI vs CP-PID; LOCO/LOCO-path vs E-SINDy inclusion probabilities over training-data length; feature-CP vs standard E-SINDy intervals vs true coefficients, plus appendix comparison to WENDy (errors-in-variables) and BSINDy (Bayesian) over 100 realizations.

## 7. Numerical results / baselines
- **Time-series prediction:** both EnbPI and CP-PID achieve the 90% target coverage in the low-data regime with narrow intervals; CP-PID starts wide (adapts aggressively) then converges; EnbPI oscillates conservatively around target. Target coverage matched at all tested levels under both noise regimes; longer horizons (10 steps) and chaotic systems (Lorenz, hyper-Rössler, quadrupole) still hit target coverage with wider intervals (Figure A.1).
- **Feature importance:** LOCO, LOCO-path and inclusion probabilities all stabilize rapidly in the low-data regime; true active terms score consistently higher than irrelevant library terms (averaged over 100 realizations).
- **Coefficient uncertainty (Figure 5):** standard E-SINDy intervals cover true coefficients (α=1, β=−0.1, γ=−1, δ=0.1) under low Gaussian noise but FAIL under larger noise, gamma noise, or process noise; feature-CP intervals are wider but cover the truth across all noise types.

## 8. Code / data availability
Tutorials: https://github.com/urban-fasel/SINDyCP_tutorials. Built on PySINDy-style tooling; data simulated in-paper.

## 9. Leakage & limitations
Adversarial notes: (a) No formal coverage theorems for the SINDy-specific LOCO/feature-CP procedures — guarantees inherited heuristically, not proved. (b) LOCO/LOCO-path require retraining SINDy per jackknife resample per left-out feature — expensive for large libraries; correlated features bias importance downward. (c) Feature-CP intervals are conservative/wide; authors suggest denoising-first as a fix. (d) EnbPI's "approximately valid" coverage rests on mild estimator assumptions; CP-PID needs bounded scores. (e) All validation on synthetic systems with known ground truth — real-world (noisy, misspecified-library) coverage not demonstrated. Still, the mechanism is exactly what GSE needs for calibrated publishing.

## 10. GSE overlap
GSE's calibration lane (Mimo, CQR work) covers prediction intervals for point forecasts, but NOT for discovered equations or their coefficients — nothing in GSE puts honest uncertainty on a *structural* claim like "win prob = σ(0.3ΔELO + …)". Wave-5a's symreg round had no conformal/UQ angle. This is the missing layer: GSE publishes equations publicly (per the @GalaxySportsHQ mandate — every pick public, every result posted), so coefficient intervals and forecast intervals with guaranteed coverage are a trust asset, not just statistics. Pairs directly with ledgers 2163/2164 (the SINDy discovery pipeline).

## 11. GSE implementation spec
1. Extend the 2163 SINDy pipeline with E-SINDy (B=100 bootstraps; PySINDy supports this natively).
2. **EnbPI for game-state forecasts:** per-game win-prob trajectory forecasts with 90% conformal bands; sliding calibration window over the most recent 4 weeks (adapts to mid-season regime shifts — the paper's non-stationarity case); publish the band alongside the point pick.
3. **Feature-CP for the discovered equation:** after SINDy-SI (2164) selects the sparse "laws of the game" equation, report 90% conformal intervals per coefficient (Eqs. 15–18); any term whose interval covers zero is flagged for removal — a principled, coverage-backed sparsity decision replacing hand-tuned λ.
4. **LOCO-path for feature importance:** rank candidate sports features (ΔELO, rest, pace, EPA terms) across the λ path; publish the importance ranking as GSE's transparent "what drives the model" page.
5. CP-PID for live in-game updating: as plays arrive, the interval quantile adapts via Eq. 11 — honest live win-prob bands during games.
Effort: ~4–6 engineer-days (EnbPI/feature-CP on top of 2163's pipeline). No new data cost.

## 12. Reproducible test
Dataset: 2022–2024 nflverse game-state trajectories; rolling-origin evaluation on 2025 season (train through week w, forecast weeks w+1..w+4, recalibrate). Metrics: empirical coverage of 90% EnbPI bands on realized win-prob trajectories (must be in [88%, 95%]); mean interval width vs a naive residual-quantile baseline (must be narrower or equal); feature-CP intervals must contain the full-season refit coefficients ≥ 90% of the time.

## 13. Acceptance / rejection gate
**ADOPT if:** EnbPI 90% bands achieve empirical coverage in [88%, 95%] on the 2025 rolling-origin test with mean width ≤ the naive baseline AND ≥ 80% of SINDy equation terms survive the feature-CP zero-exclusion check across all 2025 windows (stability). **REJECT if:** coverage < 85% (intervals untrustworthy), or intervals so wide they're useless (mean width > 0.40 win-prob units), or feature-CP flags > 50% of terms as zero-covering (the "law" is noise). Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **cross-fitted EnbPI across seasons** — the paper's EnbPI uses one ensemble with out-of-bag residuals; for NFL, train one E-SINDy ensemble per season (2022, 2023, 2024) and build the conformal residual distribution from *cross-season* out-of-sample errors, which captures structural regime change (rule changes, scheme evolution) that within-season bootstraps cannot. Test whether cross-season calibration yields narrower 90% bands at the same coverage than within-season EnbPI on 2025 — if yes, GSE's published bands honestly price season-to-season non-stationarity, a first in public sports modeling.
