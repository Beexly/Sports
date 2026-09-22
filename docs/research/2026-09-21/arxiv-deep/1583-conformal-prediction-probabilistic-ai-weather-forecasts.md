# [1583] Rigorous uncertainty quantification of probabilistic AI weather forecasts with conformal prediction (arXiv:2606.19642)

**Citation:** Asch, A., Rossellini, R., Hassanzadeh, P. & Willett, R. (2026). *Rigorous uncertainty quantification of probabilistic AI weather forecasts with conformal prediction*. arXiv:2606.19642. URL: https://arxiv.org/abs/2606.19642
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, Sections 1–4 + Open Research + supplement refs, ~1,050 lines).
**Verdict**: ADOPT
ADOPT — one sentence: This is the operationally simplest, theoretically guaranteed coverage fix for ensemble weather forecasts — a one-scalar online update (η = 0.01) that converges to target coverage within days, beats EMOS on reliability diagrams with no CRPS loss, works on any forecast model, and slots directly on top of the GSE weather post-processing stack to guarantee calibrated game-day uncertainty; adopt it as the final calibration layer.

## 1. Research question
State-of-the-art AI weather models (GenCast, NeuralGCM, AIFS-ENS) are "often considered well-calibrated" — are they, measured by statistical coverage (the ultimate measure of calibration), especially on extremes? Can online conformal prediction fix coverage with a mathematical guarantee and no distributional assumptions?

## 2. Dataset / schema
- GenCast (diffusion; 52/56 members), AIFS-ENS (transformer, CRPS-trained, fine-tuned on IFS; 25 members), NeuralGCM (dynamical core + learned closures; 51 members, precip from IMERG).
- Variables: near-surface temperature + 12 h total precipitation; lead times 1–15 days (5 d primary); test 2022–2024 (2021 = calibration), ERA5 ground truth (IMERG for NeuralGCM precip).
- Extremes: truth above the 95th percentile of location+calendar-date climatology (ERA5 1979–2018; IMERG 2000–2018 for NeuralGCM precip).
- Baseline: EMOS (Gaussian for temperature; left-censored GEV for precipitation).

## 3. Method / model
- Online adaptive conformal prediction (Angelopoulos et al. 2023 / ref 17 style, modified for operational delay): per grid point, lead time, variable, and quantile pair, form interval Ĉ_t = [q̂_lo − c_t, q̂_hi + c_t]; after verification at t+τ compute err_t = 𝟙{Y ∉ Ĉ_t}; update c_{t+τ} = c_{t+τ−1} + η(err_t − α) with η = 0.01, using the most recent padding available (operational timing: outcome known only at t+τ).
- Calibrate at many α levels to fix the whole distribution. Miss: c grows by η(1−α); hit: c shrinks by ηα (at α=0.1, one miss = nine hits).
- They mirror ref 17 by adapting in quantile space (dimensionless step size, climatology-neutral); quantile-space fitting is what makes per-location deployment trivially parallel.

## 4. Equations & assumptions
- Interval: Ĉ_t(X_t) = [q̂_lo(X_t) − c_t, q̂_hi(X_t) + c_t] (Eq. 2).
- err_t = 𝟙{Y_{t+τ} ∉ Ĉ_t(X_t)} (Eq. 3); c_{t+τ} = c_{t+τ−1} + η(err_t − α) (Eq. 4).
- Coverage guarantee: (1/T)Σ err_t = α + (c_{T+τ} − c_τ)/(ηT) → α as T→∞ (bounded Y ⇒ bounded c). Empirical: within 0.01 of target coverage in days, 0.001 after a month.
- ppi_i = |raw coverage_i − 0.9| − |conformalized coverage_i − 0.9| (Eq. 7), area-weighted.
- Assumptions: bounded Y; per-location/lead/variable/quantile fits (breaks spatial covariance — the cost of the distribution-free guarantee); exchangeability not needed thanks to the online/asymptotic form.

## 5. Features / target
No feature engineering — post-processing of forecast quantiles. Target: coverage of true outcomes at specified α levels, including conditional coverage on extreme events.

## 6. Validation design
2022–2024 global evaluation, 2021 calibration data, η = 0.01, most-recent-year nonconformity window; compares raw vs conformalized vs EMOS; reliability diagrams across target levels and lead times 1–15 d; CRPS/SSR on quantile-based forecasts to check for skill loss; extreme-conditional coverage analysis.

## 7. Numerical results / baselines
- Raw AI ensembles systematically undercover (intervals too narrow), worse on extremes (95th-percentile conditional coverage uniformly worse than unconditional).
- Conformalized forecasts achieve near-exact marginal coverage at all target levels and lead times 1–15 d; reliability diagrams hug the perfect model; EMOS also improves but conformal is near-perfect and has the guarantee; ppi maps (Figs. 2–3) show improvement at the vast majority of grid points (e.g., GenCast 2m temp over Andes/India, AIFS-ENS over central Africa, NeuralGCM precip over Sahara).
- CRPS essentially unchanged after conformalization; SSR generally improves (closer to 1). No skill penalty.
- Extremes: coverage improves for extreme temperature but is not perfected; extreme precipitation improvement is marginal.
- Residual over-coverage where truth and both quantiles are identically 0 (e.g., NeuralGCM precip over Antarctica) — authors refuse empty intervals.
- Bigger M (ensemble size) doesn't fix it: as M→∞ the empirical distribution still differs structurally from truth, so massive AI ensembles still need this.

## 8. Code / data availability
"Code that produces the results in this paper will be provided upon acceptance." Data: ERA5 via Copernicus CDS; IMERG DOI; GenCast via WeatherNext Gen; NeuralGCM checkpoints; AIFS-ENS on HuggingFace (ecmwf/aifs-ens-1.0).

## 9. Leakage & limitations
- Corrects only the spread, not the bias — pairs with a bias-correction step (1581's LGBM, EMOS) rather than replacing it.
- Per-location/lead/variable/quantile fitting breaks spatial covariance and cross-variable dependence; multivariate guarantees are an open problem.
- Extreme-precipitation conditional coverage remains weak; separate upper/lower corrections (ref 44) suggested but not tested.
- Asymptotically valid, not finite-sample: needs days–weeks of burn-in per stadium/game slot.
- Gaussian-EMOS baseline details are in the supplement; weather-model authors are not operational-GSE-scale (global 0.25°).

## 10. GSE overlap
Directly targets the 2026-09-20 Drive-deep finding: the conformal audit of GSE's own cqr.ts caught a live bug (clamping rank to n−1, falsely certifying 90% coverage at 83.33%). That audit already fixed the interval construction; this paper supplies the production-grade adaptive wrapper: an online conformal layer on top of any GSE weather forecast (the LGBM post-processor from 1581, the ANET2 flow from 1580) that guarantees long-run coverage of kickoff weather prediction intervals at zero modeling cost. Not a duplicate — it's the calibration layer the stack was missing.

## 11. GSE implementation spec
- Add `weather/conformal.py` implementing exactly Eq. 2–4: for each stadium × lead time × variable (temp, wind, precip), maintain c_t at α = 0.1 (and 0.2 for the 80% band); wrap the 1580 ANET2 flow's quantile output; η = 0.01; calibration window = trailing 365 days of verified forecasts.
- Use the quantile-space variant (ref 17 mirror) so η stays dimensionless across stadiums with different climatologies.
- Pair with the 1581 LGBM bias correction (bias fix first, conformal spread second — the paper's own limitation ordering).
- Effort: ~1 day; real-time update is a quantile + one scalar add/subtract per stadium.

## 12. Reproducible test
Dataset: GSE stadium weather forecasts (2022–2025 archive) + NOAA observations. Baseline: raw ensemble intervals at 80/90% and EMOS. Test: sequential online walk-forward from 2024–2025; metric = empirical coverage of truth at each α (must be within 0.02 of nominal by 30 days, per the paper's days-to-0.01 finding) + CRPS vs raw (must not degrade). Gate below.

## 13. Acceptance / rejection gate
ADOPT if, within 30 days of simulated burn-in, empirical coverage at 90% lands within ±0.02 of nominal for temperature and wind across ≥ 25/30 stadiums, with CRPS no worse than raw. REJECT the layer only if the per-stadium burn-in never converges (then fall back to the fixed-rank correction from the cqr.ts audit) — but on the paper's evidence this is unlikely.

## 14. Improvement experiment
The paper's open problem is exactly the GSE-relevant one: extremes (95th percentile) still undercover. Implement separate upper/lower conformal corrections (ref 44's idea, left untested) for wind speed and precipitation — the two variables where extreme games move totals — and test conditional coverage on the top-5% wind/precip games specifically. Second: stack the EECRPS metric (1582) as the evaluation of conformalized extreme-weather intervals, making the improvement experiment scoreboard what actually matters for the totals lane.
