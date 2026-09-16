# C3-ensemble-cept: Ensemble / CEPT (heterogeneous experts)

## Mission (code this)

Combine incompatible experts with learned/BMA weights — not naive product. Odds as ensemble member optional.

## Code focus

- `prediction-engine ensemble`
- `CEPT docs`
- `offline weight estimation`

## Done when

Offline BMA/weight schedule proposal; common target defined; no live weight changes without tests.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `2206.13246` — Prediction of Football Player Value using Bayesian Ensemble Approach — **[C8]** B2B valuation widget only. Not C1/C2. **NEXTWAVE-YES**
- `2001.00878` — Predicting competitions by combining conditional logistic regression a — **[C3]**. A documented way to put an expert-rating model *in the ensemble* without letting it dominate: conditional logit likelihood is already a multiplicative contribution — CEPT
- `2608.21530` — Multimodal Injury Risk and Performance Prediction in Tennis Using Weig — **[C3][C5]**. Pattern: **learned ensemble weights by modality**, with injury as a *confidence downgrade* not a point-estimate hack. Maps to bootstrap-mode when a starter is questio
- `2203.07029` (see High dossiers)

## Medium priority (implement from these first)

- `2008.04216` (score 12) Using Experts' Opinions in Machine Learning Tasks — Formally incorporate The Odds API's market-implied probabilities as an explicit ensemble member (not just a benchmark for CLV), directly targeting the calibration gate via odds-anchored blending.
- `2203.07029` (score 13) SuperCone: Unified User Segmentation over Heterogeneous Experts via Co — Use SuperCone's heterogeneous-expert attention mechanism as the technical blueprint for the CEPT multiplicative-weight ensemble, letting GSE combine structurally different models per sport without for
- `2103.13736` (score 13) Deep Similarity Learning for Sports Team Ranking — Benchmark triplet-loss Siamese ranking against GSE's current prediction engine on held-out picks, potentially adopting it as one arm of the multiplicative-weight ensemble if it improves MAE.

## Full Medium assigned to this category (75)

SEE_SOURCE_FILE
