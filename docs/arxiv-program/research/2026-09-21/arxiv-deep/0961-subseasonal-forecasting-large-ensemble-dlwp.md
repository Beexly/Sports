# [0961] Sub-Seasonal Forecasting with a Large Ensemble of Deep-Learning Weather Prediction Models (arXiv:2102.05107)

## Citation / full-text source

- arXiv:2102.05107 — full text: https://arxiv.org/pdf/2102.05107
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Jonathan A. Weyn, Dale R. Durran, Rich Caruana, Nathaniel Cresswell-Clay (2021). *Sub-seasonal forecasting with a large ensemble of deep-learning weather prediction models*. J. Adv. Model. Earth Syst. (arXiv:2102.05107). URL: https://arxiv.org/abs/2102.05107
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — the ensemble-construction result transfers directly: ensembles built by **retraining with perturbed model weights ("stochastically perturbed", SP)** produce better spread and lower ensemble-mean RMSE than initial-condition-perturbation ensembles; GSE should prefer retrain-seed ensembles over pure data-bootstrap ensembles for NFL prediction. (The S2S weather application itself is only weather-lane-adjacent.)

## 1. Research question
Can a data-driven CNN weather model stepped forward like an NWP model produce skillful subseasonal-to-seasonal (2–6 week) ensemble forecasts, and how do initial-condition vs model-weight ensemble perturbations compare?

## 2. Dataset / schema
- ERA5 reanalysis training; ERA5's 10 perturbed 4DVAR members as initial conditions; bias-correction window 1991–2015; test set twice-weekly forecasts 2017–2018 (208 cases) verified against ERA5.
- Model: 6 prognostic 2-D fields (Z1000, Z500, 300–700 hPa thickness, T2, T850, total column water vapor) + 3 prescribed (land-sea mask, topography, TOA insolation) on a cubed sphere, 64×64 per face (~1.4°), 12-h steps from two 6-h input states. U-Net CNN (3×3 filters), ~2.68M parameters, leaky ReLU, trained with Adam → SGD to minimize 24-h MSE.

## 3. Method / model
- **SP (stochastically perturbed) ensemble:** 32 models from 8 training cycles with different random seeds; 4 checkpoints each (every 10 epochs after epoch 100) selected by 4-week T850 ACC; 3 members refined 2 extra SGD epochs to remove nonphysical fields.
- **Grand ensemble:** 32 SP models × 10 ERA5 ICs = 320 members (+ separately trained control).
- **Bias correction:** mean model bias from 1991–2015 reforecasts (28-day window around target date) removed from test forecasts.
- Metrics: RMSE, anomaly correlation (ACC), CRPS, ranked probability skill score (RPSS) with ensemble-size debiasing (eq. 8–9): RPSS = 1 − ⟨RPS⟩/(⟨RPS_C⟩ + D₀/M), D₀ = (K²−1)/(6K), terciles vs 1981–2010 climatology; 10,000-sample bootstrap CIs.

## 4. Equations & assumptions
- RPSS/RPS tercile formulation (eq. 5–9 in paper).
- Ideal-ensemble assumption: spread should match ensemble-mean RMSE (Fortin et al.).
- Checkpoint diversity ≈ independent retraining diversity (empirically verified: spread between checkpoints of one cycle ≈ spread between cycles).
- Assumes stationarity of model bias over the 1991–2015 window; SST-free atmosphere carries no ocean memory.

## 5. Features / target
- Inputs: 6 prognostic fields × 2 time levels + 3 static fields per forecast step.
- Targets: probabilistic forecasts of 1- or 2-week-averaged T2/T850 anomalies at 2–6 week leads.

## 6. Validation design
- 2017–2018 test set, twice weekly, global + regional (tropics, NH extra-tropics, land-only), DJF/JJA splits; bias-corrected and raw; compared vs ECMWF S2S 50-member ensemble, climatology, persistence; bootstrap 95% CIs on all scores.

## 7. Numerical results / baselines
- Compute: 320-member 6-week ensemble in **~3 min on one GPU**; one-week forecast in ~0.1 s on V100.
- **SP >> IC perturbations:** IC ensemble under-dispersive (spread << RMSE, spread shrinks first 36 h); SP ensemble spread ≈ **80% of RMSE at 8 d, 95% at 14 d**; SP ensemble-mean RMSE stays below climatology through 14 d vs 7–8 d for IC versions. Grand 320-member ensemble only marginally better than SP alone at 14 d, but better after bias correction at S2S leads.
- S2S skill: ensemble-mean RMSE skillful vs climatology beyond 2 weeks; ACC > 0.6 through 6 days; at weeks 5–6 the DLWP T850 ACC is in a **statistical tie with the full ECMWF S2S ensemble** (overlapping 95% CIs).
- RPSS (T2, debiased, 2017–2018): ECMWF / DLWP = 0.247/0.121 (days 12–18), 0.167/0.083 (19–25), 0.145/0.076 (26–32); bias-corrected weeks 5–6 global mean: 0.155 DLWP vs 0.287 ECMWF; over land only, the two are close (ECMWF's ocean skill comes from its coupled ocean model). DLWP beats the 2011-era ECMWF system at 19–32 d.
- Qualitative: 4.5-day forecast of Hurricane Irma reasonable; one-year free run spontaneously generates tropical cyclones and captures the seasonal cycle.

## 8. Code / data availability
ERA5 (public via Copernicus/ECMWF); ECMWF S2S database (public); no code link given in the arXiv text (model from Weyn et al. 2020 lineage).

## 9. Leakage
- Checkpoint ensemble selected by 4-week T850 ACC on the validation set — mild selection toward that metric; manual inspection of 416 forecasts for quality.

## Limitations
- No ocean coupling → weak SST regions and missed the 2018 El Niño onset; no precipitation field; 1.4° resolution; ERA5 ICs non-optimal (no singular vectors).
- Test set only 2 years (2017–2018); S2S skill varies year to year.

## 10. GSE overlap
Existing-research-map: weather lane covers forecast post-processing and weather-effect studies, but not DLWP/S2S modeling. **No duplication.** The transferable content is methodological (ensemble construction), not meteorological — S2S lead times have no NFL application.

## 11. GSE implementation spec
- Ensemble policy: when building prediction ensembles (spread/total/prop models), generate members by **retraining with different random seeds/checkpoint snapshots** (SP-style) in addition to data-level perturbations; validate the spread–RMSE relationship on holdout (spread should track RMSE by lead/coverage class).
- Data: existing GSE training pipelines; no new data needed.
- Effort: ~2–3 days (modify ensemble generation + add spread–skill diagnostics).

## 12. Reproducible test
Dataset: GSE spread/total model training data. Baseline: bootstrap-resampled ensemble (M = 32). Test: SP ensemble of 32 retrains; compare holdout log-loss/CRPS and spread–RMSE calibration curves; gate below.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if the SP-retrain ensemble improves holdout CRPS by ≥2% over the bootstrap ensemble AND its spread–RMSE ratio is closer to 1.0 (within ±0.15) than the bootstrap ensemble's. Otherwise keep data-bootstrap ensembles.

## 14. Improvement experiment
Combine both perturbation sources (SP × bootstrap, "grand ensemble" style) and test whether the combination beats either alone; also test snapshot ensembling (checkpoints within one training run) as a cheaper substitute for full retrains, mirroring the paper's checkpoint trick.

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
