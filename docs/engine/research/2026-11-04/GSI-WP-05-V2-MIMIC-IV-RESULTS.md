# GSI-WP-05 v2.0 - MIMIC-IV demo results (honest report)

**Date:** 2026-11-04. **Bucket note:** filed under `docs/engine/` (clinical Conformal-OT is the engine's research arm).
**Code:** `packages/galaxy-conformal-ot/galaxy_conformal_ot/wasserstein_mahalanobis_whitening.py`,
`packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v2_benchmark.py`,
raw output `benchmarks/results_clinical_mimic_iv_v2.json`. Tests: `tests/test_wasserstein_mahalanobis_whitening.py` (22/22 pass with the existing suite).

## Headline

**The v2 multi-frame / kernel-Mahalanobis engine did NOT beat the baseline on this data, and did not approach 0.9344.**
Scored strictly out-of-fold (10 x 5-fold stratified CV), v2 AUC is 0.49-0.58 across horizons, at or near chance and
below the trivial mean-shock-index anchor (0.62-0.69) at every horizon. The conformal wrapper works as designed
(held-out coverage 0.89-0.92 against the 0.90 target) but detection of positives is low (5-21 %) because the underlying score has little signal.

| Horizon | n stays / positives | Shock index (anchor) | v2 logistic | v2 RFF-Mahalanobis | v2 logistic coverage / detection |
|---|---|---|---|---|---|
| first 6 h | 129 / 36 | 0.615 | 0.540 +/- 0.017 | 0.489 +/- 0.027 | 0.891 / 0.083 |
| first 12 h | 136 / 37 | 0.641 | 0.495 +/- 0.033 | 0.494 +/- 0.018 | 0.924 / 0.014 |
| first 24 h | 137 / 37 | 0.657 | 0.540 +/- 0.032 | 0.536 +/- 0.018 | 0.919 / 0.124 |
| full stay | 137 / 37 | 0.694 | 0.569 +/- 0.030 | 0.579 +/- 0.024 | 0.919 / 0.205 |

Bootstrap 95 % CIs (full stay): anchor [0.595, 0.782], v2 logistic [0.455, 0.687], v2 RFF [0.462, 0.706] - all wide; n = 37 positives.

## Why the numbers differ from "0.7721"

* v1's 0.7721 is a **single in-sample score on the full 138-stay cohort with hand-picked weights** (`w = [0.30, 0.25, 0.20, 0.12, 0.13]`), not cross-validated.
  It is not evidence of out-of-sample skill, and v2's CV numbers are not directly comparable to it. The like-for-like anchor in this report is the shock index
  computed on the same cohort under the same protocol (0.694 full stay).
* A diagnostic (not used to select features - selecting on it would leak) showed that individual v2 features carry modest signal (univariate AUC 0.62-0.69,
  best: shock-index velocity 0.685), the same range as the shock index itself, and that `n_hours` (length of observed stay) alone has AUC 0.678.
  Stay length is a confounder for a label that includes in-hospital death. Combining ~36 correlated features into one model on 37 positives overfits.

## Do not use these numbers or charts

* **0.9344 AUC is not supported.** It appears in `Downloads/gsi_whitepaper_camera_ready.tex` line 63 (`Discriminative ROC-AUC & 0.7721 & \textbf{0.9344}`),
  and in the two charts (adaptive-bound curves, "Baseline Floor -> Phase 1 -> Phase 2 -> Full Production Mesh" staircase). Nothing in this repo computes it. The intermediate
  "Phase 1 / Phase 2" points have no computation behind them. **Remove or replace before the paper, any grant (Emergent Ventures / FRO / ONR / NSF) or any public post uses it.**
* The chart's "Localized Prediction Error vs Conformal bound" curve over 100 ICU time steps is illustrative, not derived from MIMIC-IV.

## Known limitations of this benchmark

* Label = sepsis ICD OR in-hospital death for the whole admission; ICD codes are assigned post hoc. Prospective horizons truncate features only, so even "first 6 h" predicts a
  retrospective label. A clean early-warning label (e.g. Sepsis-3 onset time) needs hourly SOFA from labs/vasopressors, which the demo's `chartevents` subset does not supply here.
* MIMIC-IV demo is 100 patients' worth of stays; the full MIMIC-IV requires credentialed PhysioNet access. Conclusions about 'does v2 work' need that, not this pilot.
* Rolling windows are in HOURS (charting is ~hourly), not the minutes in the original spec. Labs were not used.
* Feature set, K in {4, 8, 12}, C = 0.05, RFF dim = 32 were fixed before running and **not tuned** after seeing the results. Tuning on 37 positives with CV would overstate skill.

## What is implemented vs. the approved plan

Implemented and tested: causal hourly state matrix; multi-frame rolling covariance features (trace, log-det, concentration, coupling, localized whitened surge);
velocity/acceleration; RFF kernel-Mahalanobis (fit on reference only); finite-sample split-conformal threshold; entropic-OT counterfactual projection + log-domain Sinkhorn plan;
out-of-fold benchmark across 4 horizons.

**Not built:** FastAPI/Gunicorn service, Kafka/Ray topology, GitHub Actions workflow, NFL pocket-collapse backtest rig, `gse_gsi_unified_hyperloop.py`. Split *CQR* is also not
implemented: CQR is a regression-interval method and this task is binary classification, so class-conditional split-conformal on negatives is used instead. Those items add
infrastructure around a score that does not yet show skill, so building them first would be backwards.

## Suggested next step (needs a decision)

Either (a) get credentialed full-MIMIC-IV access and a proper Sepsis-3 onset label and re-run this exact frozen protocol, or (b) drop the clinical performance claim and keep
the work as a methods/engineering contribution with this negative pilot result stated openly.
