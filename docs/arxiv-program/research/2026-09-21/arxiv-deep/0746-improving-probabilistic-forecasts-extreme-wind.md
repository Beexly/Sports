# [0746] Improving Probabilistic Forecasts of Extreme Wind Speeds by Training Statistical Post-Processing Models with Weighted Scoring Rules (arXiv:2407.15900)

**Citation:** Jakob Benjamin Wessel, Christopher A. T. Ferro, Gavin R. Evans, Frank Kwasniok (2024). *Improving probabilistic forecasts of extreme wind speeds by training statistical post-processing models with weighted scoring rules*. arXiv:2407.15900. URL: https://arxiv.org/abs/2407.15900
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — training post-processing models with threshold-weighted CRPS (twCRPS) buys large, quantified tail improvements (~1.3–2.5% at the 90th percentile) at a small body cost, and the linear-pool trick (λ=0.6) keeps most of the tail gain while controlling the body loss. Directly transferable to GSE's tail-sensitive forecasts (blowouts, shootouts, ceiling projections for DFS). The wind application is not adopted.

## 1. Research question
Standard EMOS post-processing minimizes CRPS, which rewards body-of-distribution fit and underweights extremes. Can training the SAME models with threshold-weighted CRPS (twCRPS) — which emphasizes outcomes above high thresholds — materially improve extreme-event forecasts, and what is the body-vs-tail trade-off?

## 2. Dataset / schema
**MOGREPS-G** 18-member ensemble, 124 UK stations, 48h lead time. Training: 2019-04-01–2020-12-31; test: 2021-01-01–2022-03-31. Target: 10m wind speed. Baselines: raw ensemble, EMOS trained with CRPS, EMOS trained with NLL, climatology.

## 3. Method / model
**EMOS** (ensemble model output statistics): truncated-normal and truncated-logistic predictive distributions with location linked to ensemble mean, scale to ensemble SD, plus sine/cosine seasonal terms. Three training objectives: CRPS, NLL, twCRPS with threshold weight functions w(z)=1{z>t} at high quantile thresholds. Then **linear pooling**: F_pool = λ·F_twCRPS + (1−λ)·F_CRPS to combine the tail-focused and body-focused models.

## 4. Equations & assumptions
twCRPS(F,y;w) = ∫ w(z)·(F(z) − 1{y≤z})² dz with w(z) = 1{z > t}. EMOS: y|x ~ TN(μ = a + b·x̄, σ = c + d·s) (truncated at 0). Linear pool: F_λ = λF_tail + (1−λ)F_body. Assumptions: EMOS parametric family adequate; threshold t fixed ex ante (80th/90th percentile of climatology); twCRPS propriety holds for the weighted functional.

## 5. Features / target
Features: 18-member ensemble mean/SD, seasonal harmonics. Target: observed 10m wind speed at 124 stations. Horizon: 48h.

## 6. Validation design
Fixed train/test time split (train through 2020-12-31, test 2021-01–2022-03); skill scores (twCRPSS, CRPSS) relative to baselines, aggregated over stations; threshold-specific evaluation at 80th/90th percentile thresholds.

## 7. Numerical results / baselines
twCRPS-trained EMOS vs. CRPS-trained: twCRPS skill improvements average **~0.8% at the 80th-percentile threshold** and **~1.3% at the 90th**, with maxima **~1.4% and ~2.5%** across stations/models. Cost: body CRPS degrades slightly (the trade-off is real but small). **Linear pool at λ=0.6** (60% twCRPS model + 40% CRPS model) retains most of the tail improvement while controlling much of the body loss — the paper's recommended operating point. NLL training is competitive on the body but worse in the tail.

## 8. Code / data availability
None stated. MOGREPS-G/UK station data via UK Met Office channels.

## 9. Leakage & limitations
(a) Fixed single train/test split — no rolling validation; 2021–2022 test may not represent other periods. (b) Threshold t chosen from climatology — in deployment the "extreme" threshold must be fixed before seeing test extremes. (c) Gains (~1–2.5%) are modest in absolute terms; statistical significance across 124 stations is not formalized with multiplicity control. (d) Truncated-normal/logistic families may misfit heavy tails — the weighting helps estimation but not misspecification. (e) Pooling weight λ=0.6 is empirically chosen, not optimized.

## 10. GSE overlap
Existing-research-map.md: EMOS-style post-processing and weighted scoring rules are **not** in the map; CRPS appears only as a generic metric. GSE's calibration work focuses on the body (Platt/isotonic, CQR). Tail-emphasis training for extreme outcomes (blowouts/shootouts that decide DFS slates and high-leverage bets) is a new capability.

## 11. GSE implementation spec
(1) For GSE's game-total and margin distribution models, add a **twCRPS training objective** with thresholds at climatological 80th/90th percentiles (e.g., totals above ~52, margins above ~17); (2) train twin models (CRPS + twCRPS) and **linear-pool at λ=0.6**; (3) evaluate with twCRPS at the same thresholds + body CRPS on 2024–2025 holdout. Effort: ~4–5 days.

## 12. Reproducible test
Dataset: 2015–2025 NFL games; train ≤2022, validate 2023, test 2024–2025. Targets: game total, margin. Metrics: twCRPSS at 80th/90th percentile thresholds + CRPSS (body). Baselines: CRPS-trained EMOS-style model, climatology. Success = pooled model matches the paper's pattern: ≥1% twCRPS skill gain at the 90th percentile with ≤0.3% body CRPS degradation.

## 13. Acceptance / rejection gate
ADOPT the twCRPS + pooling pipeline if the 90th-percentile twCRPS skill gain is ≥1% with body degradation ≤0.5% on the 2024–2025 test; REJECT pure-twCRPS training (no pooling) if body CRPS degrades >1% — the paper's own trade-off finding says the unpooled tail model is not deployable alone.

## 14. Improvement experiment
**Value-weighted thresholds**: instead of climatological quantiles, set the twCRPS weight threshold at the point where betting value concentrates (e.g., totals near key numbers, or the region where GSE's edge is historically largest) — the paper weights statistical extremes; GSE should weight economic extremes, and the two need not coincide.
