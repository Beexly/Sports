# [1580] Ensemble weather forecast post-processing with a flexible probabilistic neural network approach (arXiv:2303.17610)

**Citation:** Mlakar, P., Merše, J. & Faganeli Pucer, J. (2023). *Ensemble weather forecast post-processing with a flexible probabilistic neural network approach*. arXiv:2303.17610. URL: https://arxiv.org/abs/2303.17610
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, Sections 1–5 + discussion + references, ~840 lines).
**Verdict:** ADAPT
ADAPT — one sentence: joint multi-station multi-lead-time post-processing with normalizing spline flows is the right architecture for GSE's game-day weather calibration, but it is validated only on European 2 m temperature, so wind/precipitation and US stadiums need re-training and re-validation.

## 1. Research question
Can neural-network ensemble post-processing be improved by (a) predicting all stations and all lead times jointly in one model, and (b) replacing parametric (e.g. normal) predictive distributions with normalizing spline flows that model the exact target density?

## 2. Dataset / schema
- EUPPBench benchmark: ECMWF ensemble 2 m temperature, 229 stations in western Europe.
- D11 (train): 11-member 20-year reforecasts for 2017–2018, 209 time samples/year.
- D51 (test): 51-member operational forecasts for 2017–2018, 730 time samples/year; 167,170 total forecasts.
- Per-station predictors: station/model altitude, longitude, latitude, land usage; seasonal encoding cos(2πd/365), d = day of year. 21 lead times.

## 3. Method / model
- ANET1: per-lead-time shared encoder → dynamic attention over ensemble members → mean encoding → regression head outputting additive corrections to ensemble mean/std; predictive distribution = Normal(μ, σ). One model for all stations/lead times.
- ANET2: 6-layer dense residual network (SiLU activations, dropout 0.2 before middle layers) on [ensemble mean, ensemble variance (21-dim each), station predictors, seasonal encoding]; outputs, per lead time, parameters of a normalizing spline flow: composition of 4 rational-quadratic spline transforms × 5 knot-value pairs each (840 total distributional parameters = 21 lead times × 10 × 4). Knots/values monotone via CumSum(1e-3 + Softplus(raw)); derivatives computed from knots/values (Gregory et al. scheme) to guarantee smooth densities.
- Two ablations: ANET2_NORM (same net, normal output: μ = μ_e + μ′, σ = σ_e + Softplus(σ′)) and ANET2_BERN (Bernstein polynomial quantile regression, degree 12, 13 coefficients/lead time, trained on quantile loss over 100 equidistant quantiles).
- Training: ANET1 — random 80/20 split (unstable, overfit-prone); ANET2 variants — year-2016 holdout validation, Adam, batch 256, lr 1e-3, weight decay 1e-6, lr × 0.9 after 10-epoch plateau, early stopping; loss = NLL (ANET1/ANET2/NORM) or quantile loss (BERN).

## 4. Equations & assumptions
- Flow density: p_temp(x;θ) = p_norm(T̃_θ(x)) · ∂T̃_θ(x)/∂x; base = N(0,1).
- NLL loss: L = T̃_θ(x_i)²/2 − ln(∂T̃_θ(x_i)/∂x).
- Transform composition: T_Θ = T̃_{θ_l}(T̃_{θ_{l−1}}(…)).
- Knot/value monotonicity: k_l := CumSum([k′_{l,1}, 1e-3 + Softplus(k′_{l,[2,5]})]); same for v_l.
- Derivatives: d_{l,i} = (Δ_{l,i}·Δ_{l,i−1})/δ_{l,j} (i=2..4); d_{l,1} = Δ_{l,1}²/δ_{l,2}; d_{l,5} = Δ_{l,4}²/δ_{l,4}; Δ_{l,j} = (v_{j+1}−v_j)/(k_{j+1}−k_j); δ_{l,j} = (v_{j+1}−v_{j−1})/(k_{j+1}−k_{j−1}).
- NORM residual: μ = μ^e + μ′; σ = σ^e + Softplus(σ′) (residual-on-ensemble-statistics predicted better than direct prediction).
- Assumptions: ensemble mean + variance carry sufficient signal (min/median/max/members added nothing); knots need no fixed interval; BERN quantile coefficients left unconstrained (crossing "rare in practice").

## 5. Features / target
Features: per-lead-time ensemble mean and variance (21-dim each), station altitude (station + model), lon, lat, land use, seasonal cos encoding. Target: full predictive distribution of 2 m temperature at each station/lead time; evaluated via CRPS, bias, quantile loss, rank histograms.

## 6. Validation design
Time-ordered design: train on D11 (2017–2018 11-member reforecasts), validate on held-out year 2016, test on D51 (51-member 2017–2018 forecasts) — no leakage across years; baselines: ANET1 (previous SOTA on EUPPBench), ANET2_NORM, ANET2_BERN. Metrics: CRPS, bias, QL, QSS (ANET1 as reference), rank histograms, per-altitude QSS in 3 altitude bands, per-station CRPS ranking.

## 7. Numerical results / baselines
- Table 1 (D51 test, averaged over all stations/samples/lead times): ANET2 CRPS **0.923**, bias 0.069, QL 0.363; ANET1 CRPS **0.988**, bias 0.092, QL 0.386; ANET2_BERN CRPS 0.935, bias 0.076, QL 0.367; ANET2_NORM CRPS 0.940, bias **0.038** (lowest), QL 0.373. ANET2 ≈ 6.6% CRPS gain over ANET1.
- ANET2 best CRPS at 204 of 229 stations; BERN at 18; NORM at 7; ANET1 at 0.
- Rank histograms: ANET2 most uniform; normal-output variants show over-dispersion hump at quantiles 20–40.
- Per-altitude QSS: ANET2 beats ANET1 at all altitude bands; note ANET1's CRPS advantage at high-altitude stations (>1000 m) over other EUPPBench methods persisted.
- Inference cost (Quadro P400): NORM 2.87 s / BERN 7.14 s / ANET2 36.08 s for 167,170 forecasts; distributional params: 42 / 273 / 840.

## 8. Code / data availability
None stated (no repo link in paper; EUPPBench data is public via the benchmark).

## 9. Leakage & limitations
- Temperature-only, Europe-only; wind speed and precipitation (the two variables that move NFL totals) have non-Gaussian, bounded, zero-inflated distributions — spline flows should handle them but are untested here.
- Reforecast-vs-operational mismatch: trained on 11-member reforecasts, tested on 51-member forecasts; member-count generalization handled by mean/variance encoding but not deeply stressed.
- BERN quantile-crossing concession; ANET2 5× slower inference than BERN.
- Station density (229) is modest; US stadium application has ~30 locations — different sparsity regime.
- Per-station predictors are static geography; stadium microclimate (bowl effects) not modeled.
- External validity to NFL: calibration quality at 2 m temperature over Europe says nothing about kickoff-time wind at an open NFL stadium.

## 10. GSE overlap
Extension of the calibration lane, new capability for weather. Per `docs/research/2026-09-21/arxiv-program/state/existing-research-map.md`, the calibration stack covers CQR, grouping loss, temperature scaling, LRD, ECE — all for *model probabilities*; nothing covers *weather forecast calibration* feeding the totals model. This fills the "game-day weather prediction" half of my lane brief and pairs with ledgers 1578–1579 (physics corrections need calibrated weather inputs).

## 11. GSE implementation spec
- Build `weather/postprocess.py`: train ANET2_NORM-style model first (fastest, lowest bias — best MVP) on GEFS or ECMWF-IFS ensemble reforecasts for 30 NFL stadium coordinates: targets = game-time 2 m temperature, 10 m wind speed, precipitation rate. Inputs: ensemble mean/variance at ~6-hour lead times bracketing kickoff, stadium altitude/lon/lat, day-of-year encoding.
- Upgrade to full ANET2 spline-flow output once the NORM baseline validates; use CRPS + rank histograms as acceptance metrics.
- Serve: nightly batch job producing calibrated predictive distributions per Sunday game; feed P(wind > 15 mph), E[precip], temp quantiles into the totals/spread model as features.
- Effort: 1–2 weeks (data plumbing for ensemble archives dominates; model code is a straightforward dense net).

## 12. Reproducible test
Dataset: GEFS 0.25° reforecast archive (or ECMWF open data) 2020–2024 + NOAA stadium-observation ground truth for 30 NFL venues. Baseline: raw ensemble mean (deterministic) and EMOS-normal post-processing. Test: train ANET2_NORM on 2020–2022, validate 2023, test 2024. Metric: CRPS on wind speed and temperature at kickoff ±3 h windows. Gate below.

## 13. Acceptance / rejection gate
ADOPT if the post-processed model beats EMOS by ≥ 5% CRPS on wind speed AND ≥ 5% on temperature on the 2024 holdout with rank histograms visibly more uniform than raw ensembles. REJECT if CRPS gain < 5% on either variable or rank histograms show the same over-dispersion as raw — then GSE stays with off-the-shelf weather APIs.

## 14. Improvement experiment
Add stadium-bowl microclimate: augment per-station predictors with bowl openness index (open / partial roof / dome), field orientation, and surrounding elevation from a DEM, letting the network learn per-stadium bias corrections (e.g., Soldier Field lake-effect gusts). Then test whether the joint multi-lead-time structure lets the model borrow strength across the Thursday–Monday game slate — a direct transfer of the paper's lead-time-dependency finding to the weekly NFL schedule.
