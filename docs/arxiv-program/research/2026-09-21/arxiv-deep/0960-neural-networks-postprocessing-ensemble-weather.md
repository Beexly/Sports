# [0960] Neural Networks for Post-Processing Ensemble Weather Forecasts (arXiv:1805.09091)

## Citation / full-text source

- arXiv:1805.09091 — full text: https://arxiv.org/pdf/1805.09091
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Stephan Rasp, Sebastian Lerch (2018). *Neural Networks for Post-Processing Ensemble Weather Forecasts*. Monthly Weather Review (arXiv:1805.09091). URL: https://arxiv.org/abs/1805.09091
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — NN distributional regression with closed-form Gaussian CRPS loss + entity (station) embeddings for probabilistic weather forecasting; directly feeds GSE's weather-impact lane (wind/rain effects on totals/spreads), where stadium-level forecast calibration is a first-order input.

## 1. Research question
Can neural networks do statistical post-processing (bias correction) of ensemble weather forecasts better than traditional distributional-regression methods (EMOS/BMA), by flexibly ingesting auxiliary predictors and station-specific information and learning link functions data-drivenly?

## 2. Dataset / schema
- ECMWF **50-member ensemble**, 00 UTC init, 48 h lead, TIGGE archive, 0.5°×0.5° grid, bilinearly interpolated to station locations; 3 Jan 2007 – 31 Dec 2016, daily.
- Target: 2-meter temperature; observations at **537 DWD surface stations in Germany** (499 with data in the 2016 validation year).
- Features: per variable, ensemble **mean + standard deviation** of t2m, CAPE, surface pressure, total cloud cover, sensible/latent heat flux, u10, v10, dew point, short/long-wave radiation flux, soil moisture, 500/850 hPa winds, 500 hPa geopotential, 850 hPa specific humidity → p = 42 predictor vector, plus station-specific features (station altitude, model-grid orography, lat, lon).
- Splits: **2016 held out as validation** (182,218 samples after missing-data removal); training 2007–2015 (1,626,724 samples) and 2015-only (180,849) to test training-size sensitivity.
- Code: https://github.com/slerch/ppnn (Python Keras/TensorFlow + R).

## 3. Method / model
- **Benchmarks:** raw ensemble; EMOS-gl (global EMOS); EMOS-loc (per-station); **EMOS-loc-bst** (local EMOS with component-wise boosting for predictor selection, Messner et al.; affine link on μ, exp-affine on log σ, MLE-estimated); local quantile regression forest (QRF).
- **NN models:** output layer = Gaussian distribution parameters (μ, σ) with no activation; loss = **closed-form CRPS of a Gaussian** (eq. B2) — a proper scoring rule used as the SGD loss. Variants: FCN (no hidden layer, t2m predictors only), FCN-aux, FCN-emb, FCN-aux-emb, NN-aux (1 hidden layer, ReLU), NN-aux-emb. **Station embeddings**: station ID → 2-dim latent vector (n_emb = 2) concatenated with predictors, trained jointly. No hidden layer needed for FCN-emb (linear ≡ EMOS-gl structure but global+embeddings).
- Regularization: early stopping on a 20% training holdout (dropout/weight decay failed to help); **ensemble of 10 NNs with different inits**, averaging distribution-parameter estimates. Adam optimizer. One hidden layer; deeper nets overfit without gain.
- **Permutation feature importance** (Breiman-style, on validation CRPS): top predictors after t2m mean — station altitude, orography, shortwave radiation flux, 850 hPa specific humidity (used by the NN as a cloud-cover proxy); ensemble σ unimportant (spread–error correlation only r = 0.15; post-processing almost doubles spread, spread-error ratio 0.51 → 0.95, mostly additive).

## 4. Equations & assumptions
- (1) y_{s,t} | X_{s,t} ∼ F_{θ_{s,t}}; (2) θ_{s,t} = g(X_{s,t}) — EMOS distributional-regression frame.
- (3) EMOS link: (μ, σ) = (a_s + b_s·x̄^{t2m}, c_s + d_s·s^{t2m}).
- (4) Boosting link: (μ, σ) = ((1,X)^T β, exp((1,X)^T γ)).
- (5) NN node: Σ_j w_j z_j + b; ReLU(z) = max(0, z).
- Importance(v) = mean CRPS increase under permutation of feature v.
- CRPS significance: Diebold-Mariano tests + Benjamini–Hochberg correction (temporal/spatial dependence).
- Assumptions: temperature | predictors ≈ Gaussian; CRPS proper for training; stations exchangeable conditional on embeddings.

## 5. Features / target
- Inputs: 42 ensemble summary + station features (Table 1); X_{s,t}^{t2m} subset for the linear-only models.
- Target: predictive distribution of 2-m temperature at station s, time t (i.e., its (μ, σ)).

## 6. Validation design
- Chronological block split: train on 2007–2015 (or 2015), validate on all of 2016; no leakage of validation into tuning (early stopping on a training subset).
- Calibration checks: PIT/verification-rank histograms.
- Significance: Diebold-Mariano + BH across stations.

## 7. Numerical results / baselines
- Mean CRPS (2015 training / 2007–2015 training): raw 1.16/1.16 → EMOS-gl 1.01/1.00 → EMOS-loc 0.90/0.90 → EMOS-loc-bst 0.85/0.80 → FCN-aux-emb 0.88/0.87 → NN-aux 0.90/0.86 → **NN-aux-emb 0.82/0.78**. **Best NN improves 29% over raw ensemble and 3% over the best benchmark (EMOS-loc-bst)**. QRF: 0.95 → 0.81 (needs the long training window; still worse than NN-aux-emb).
- NN-aux-emb best at **65.9% of stations (2015) / 73.5% (2007–2015)**; vs EMOS-loc-bst it is **significantly better at 30% of stations and worse at ≤2%** (both periods).
- Long training period helps nonlinear models most: EMOS-loc-bst and NNs gain 4–5%; linear models gain ~nothing.
- Cost: NN-aux-emb **≥2× faster than EMOS-loc-bst** incl. the 10-run ensemble; QRF ~10× slower than EMOS-loc-bst; GPU ≈6× CPU speedup for the complex nets.
- Calibration: raw ensemble under-dispersed (U-shaped rank histogram); all post-processed distributions well calibrated.

## 8. Code / data availability
Python + R code: https://github.com/slerch/ppnn. TIGGE/ECMWF ensemble (public), DWD observations (public).

## 9. Leakage
- No validation leakage: chronological split with calendar-year 2016 fully held out; early stopping monitored on a training subset, not the validation set.

## Limitations
- NNs have more negative outliers vs raw-ensemble CRPSS than EMOS/QRF — some stations with strongly local error structure are handled worse; longer training mitigates this.
- Single variable (temperature), single lead time (48 h), single region — transfer to wind/precipitation and other grids not demonstrated in this paper (authors flag distribution choice as the hard part for wind/precip).
- Temporal dependencies ignored (rolling windows / RNNs tried, no gain, more overfitting); univariate only.
- Station embeddings conflate geography with climatology; embedding dim selection was heuristic.

## 10. GSE overlap
Existing-research-map: weather lane is one of the program's open keyword areas; corpus has wind/temperature total adjustments and rain-spread work but no distributional post-processing of forecast ensembles. **No duplication**: this is calibration machinery (CRPS-trained probabilistic forecasts with entity embeddings), not a weather-effect study. Complements the weather-effect ledgers: they model what weather does to outcomes; this models how to obtain calibrated game-time weather distributions in the first place.

## 11. GSE implementation spec
- Data: forecast ensembles for NFL stadiums (GEFS/ECMWF ensemble grids) + station/ASOS observations at stadium locations.
- Steps: (a) pull ensemble mean/σ of wind speed, gusts, precipitation, temperature, humidity for each stadium grid cell at kickoff-relevant lead times; (b) build NN-aux-emb-style regressor with stadium-ID embeddings → calibrated Gaussian (or truncated-normal for wind, Gamma for precip) predictive distributions; (c) train with closed-form CRPS loss; (d) feed predictive distribution moments/quantiles into the totals/spread weather model (wind affects punts/FG/passing more than temperature).
- Effort: ~3–5 days (data pulls + training loop; architecture is a one-hidden-layer MLP).

## 12. Reproducible test
Dataset: GEFS 30-member ensemble + ASOS observations at the 30 NFL stadiums, 2022–2025 seasons, kickoff window lead times. Baseline: EMOS-gl (linear CRPS-trained). Test: mean CRPS on a holdout season; DM tests vs baseline per stadium; gate below.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if NN-aux-emb achieves ≥5% relative mean-CRPS improvement over EMOS-gl on a holdout season AND is significantly better (DM+BH) than EMOS-gl at ≥15% of stadiums while significantly worse at ≤5%. Otherwise ship the EMOS-gl linear model.

## 14. Improvement experiment
Extend to wind gust + precipitation with appropriate parametric families (truncated Gaussian / Gamma with closed-form CRPS), and to a multivariate output capturing wind–temperature dependence; test whether the joint calibrated weather distribution improves holdout log-loss of an NFL totals model that already uses raw weather point forecasts.

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
