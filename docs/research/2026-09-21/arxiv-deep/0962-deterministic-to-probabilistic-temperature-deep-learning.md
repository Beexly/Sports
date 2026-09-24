# [0962] Leveraging Deterministic Weather Forecasts for In-Situ Probabilistic Temperature Predictions via Deep Learning (arXiv:2406.02141)

## Citation / full-text source

- arXiv:2406.02141 — full text: https://arxiv.org/pdf/2406.02141
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** David Landry, Anastase Charantonis, Claire Monteleoni (2024). *Leveraging deterministic weather forecasts for in-situ probabilistic temperature predictions via deep learning*. arXiv:2406.02141. URL: https://arxiv.org/abs/2406.02141
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — deterministic-to-probabilistic recipe: a Bernstein Quantile Network (BQN) turns a single deterministic forecast into a calibrated probabilistic one (no ensemble needed), with joint multi-lead-time training + lead-time embeddings; directly applicable to GSE's stadium weather pipeline (wind/gust/temp distributions feeding totals models).

## 1. Research question
Can a neural network recover a deterministic NWP forecast's uncertainty by training on past observations — producing calibrated probabilistic forecasts without running an ensemble — and which uncertainty representation (parametric vs quantile vs Bernstein quantile function) plus which lead-time conditioning works best?

## 2. Dataset / schema
- GDPS (Global Deterministic Prediction System, Environment Canada) deterministic surface-temperature forecasts, 00/12 UTC init, up to 10-day lead; targeting **1,066 METAR stations** across Canada and the US.
- **18 NWP-dependent predictors** (albedo, 2-m dew point, geopotential 1000/850/500, MSLP, precip rate, 2-m RH, specific humidity 850/500, temperature 2-m/850/500, U/V wind 10-m/500, wind speed 10-m) + **7 NWP-independent** (lead time, day-of-year sin/cos, time of day, lat, lon, elevation).
- Train 2019–2020 (GDPS 25→15 km upgrade July 2019 retained in data), test Jan–Nov 2021 (includes Feb 2021 Texas cold wave, June–July 2021 western heat wave — outside training distribution).
- ENS10 (10-member ECMWF IFS reforecast, 1998–2017) for the ensemble-member ablation.
- Code: https://github.com/davidlandry93/pp2023/.

## 3. Method / model
- **Baseline:** naive probabilistic — station/init-hour/lead-time/month-debiased NWP + Normal(0, error SD).
- **Predictive models:** linear (per station/init/lead-time coefficients, MOS-style) and MLP (4×256, SiLU, batch norm; station + lead-time embeddings added after the first linear layer = one-hot-equivalent with small memory footprint).
- **Uncertainty representations:** deterministic (RMSE loss); EMOS/DRN (Normal via eq. 1, CRPS loss); LQR/QRN (quantile regression, quantile loss, n quantiles at τ = i/(n+1)); LBQ/BQN (Bernstein polynomial quantile function eq. 2, degree 16, coefficient sorting for monotonicity, sampled at 98 τ values, quantile loss). NNs trained 5× and parameter-averaged (Vincentization for quantiles).
- Training: PyTorch, Adam, 100 epochs, OneCycleLR (LR 1e-3 linear / 5e-4 NN), weight decay 1e-5.

## 4. Equations & assumptions
- (1) Y_obs ∼ N(θ₁x_nwp + θ₂, exp(θ₃ log σ̂ + θ₄)); σ̂ = error SD when no ensemble.
- (2) Q(τ) = Σ_{j=0}^{d} θ_j C(d,j) τ^j (1−τ)^{d−j} (Bernstein quantile function, d = 16; sorted θ ⇒ monotone Q).
- (3) CRPS_norm = σ[(y−μ)/σ·(2F((y−μ)/σ)−1) + 2f((y−μ)/σ) − 1/√π].
- (4) CRPS_ens = (1/n)Σ|e_i − y| − (1/2n²)ΣΣ|e_i − e_j|.
- (5) CRPSS = 1 − CRPS_model/CRPS_baseline; (6) cosine similarity of lead-time embedding vectors.
- Assumptions: station×lead-time structure shared via embeddings; past error distribution ≈ future (stationarity except noted extremes); 16th-degree Bernstein suffices.

## 5. Features / target
- Inputs: 25 predictors (18 NWP-dependent + 7 independent, incl. lead time).
- Target: probabilistic forecast of observed 2-m temperature at station (Normal params / quantiles / Bernstein coefficients).

## 6. Validation design
- Train on days 1–25 of each month (2019–2020), validate on remaining days; test Jan–Nov 2021.
- Metrics: CRPS (closed form or ensemble form), CRPSS vs naive, RMSE, 5%/95% quantile loss, composite 80% spread, rank histograms (calibration); paired bootstrap (Hamill 1999, 100 resamples) for CI; extremes stratified by NWP-forecast percentile bins.

## 7. Numerical results / baselines
- CRPS (all stations × lead times): raw 2.925 → naive 1.921 → MOS 2.467 → **EMOS 1.700** → DNN 2.315 → **DRN 1.633, BQN 1.622 (best), QRN 1.635**. CRPSS vs naive: EMOS 0.115, DRN 0.150, **BQN 0.156**, QRN 0.149. **NN BQN ≈ 15–16% CRPS reduction vs naive probabilistic**; NN gains over EMOS significant at early leads, shrinking to ~2.5% at late leads. Bias < 0.3 K at long leads.
- **Lead-time conditioning (Table 4):** joint training with Pred+Emb beats per-lead-time partitioning (DRN: 1.655 → 1.634; BQN: 1.641 → 1.622); embedding alone ≈ predictor alone; joint best in central lead times.
- **ENS10 ablation:** adding the 2nd ensemble member gives a sharp CRPSS jump even with postprocessing; diminishing returns after; member impact grows with lead time.
- Calibration: all models flatten central rank histograms vs naive; BQN's Bernstein edges show slight artifacts. Extremes: all models degrade at forecast tails; Feb 2021 Texas cold event was out-of-distribution (CRPSS collapse in low winter percentiles).

## 8. Code / data availability
https://github.com/davidlandry93/pp2023/ (PyTorch). GDPS via Meteorological Service of Canada open data; METAR via Iowa State IEM (public); ENS10 public.

## 9. Leakage
- Train/validation split not fully independent (late leads of training days overlap early leads of validation days).

## Limitations
- Bernstein degree chosen by validation (16); coefficient sorting is an empirical monotonicity hack.
- Feb 2021 Texas cold snap: out-of-distribution failure — the model cannot invent tails it hasn't seen; no extreme-value machinery.
- Single-target (temperature) on deterministic global input; spread-from-deterministic relies on stationarity of error distributions.

## 10. GSE overlap
Existing-research-map: 1805.09091 (NN post-processing of ensembles) is now a Reader-15 ledger (0960); this paper is **complementary, not duplicative**: deterministic-input (no ensemble needed) + distribution-free Bernstein quantile representation + lead-time embedding study. Weather lane has no deterministic-to-probabilistic work.

## 11. GSE implementation spec
- Data: deterministic high-res forecast grids (e.g., HRRR/NAM) at 30 NFL stadiums + ASOS/METAR obs.
- Steps: (a) build the 25-style predictor set for wind speed, gusts, temperature, precip at kickoff lead times; (b) train one BQN (d = 16) with stadium + lead-time embeddings on all lead times jointly; (c) output per-stadium calibrated quantile functions for kickoff conditions; (d) pipe into the totals/spread weather adjustment model.
- Effort: ~1 week (repurpose the published repo; retrain on stadium data).

## 12. Reproducible test
Dataset: HRRR deterministic + ASOS at 30 NFL stadiums, 2022–2024 seasons. Baseline: naive probabilistic (debiased + climatological error SD). Test: BQN CRPS/CRPSS vs naive and vs EMOS on a holdout season; gate below.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if the BQN achieves ≥10% relative CRPS improvement over the naive probabilistic baseline on a holdout season AND rank histograms are flatter (central-bin deviation from uniformity reduced by ≥30%). Otherwise fall back to EMOS.

## 14. Improvement experiment
Add ensemble members (GEFS) as extra inputs (paper shows the 2nd member is the high-value one) and test CRPS gains vs the deterministic-only BQN; also extend Bernstein degree by validation and add an EVT tail model for extreme cold/heat games (the Texas-2021 failure mode).

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
