# [2187] FRANS: Automatic Feature Extraction for Time Series Forecasting (arXiv:2209.07018v1)

**Citation:** Alexey Chernikov, Chang Wei Tan, Pablo Montero-Manso, and Christoph Bergmeir (2022, Monash / U. Sydney). *FRANS: Automatic Feature Extraction for Time Series Forecasting*. arXiv:2209.07018v1. URL: https://arxiv.org/abs/2209.07018
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* self-supervised CNN static-feature extractor (surrogate "each series is a class" classification) producing 16 domain-free features that beat 42 handcrafted tsfeatures inside the FFORMA meta-learner on 8/10 datasets; GSE adapts it as an automatic series-level embedding for team-season trajectories feeding a model-combination meta-learner.

## 1. Research question
Handcrafted time-series features (tsfeatures' 42 statistics) require domain knowledge, fail on short series, and may not transfer across datasets; autoencoders produce *dynamic* (window-local, cross-series-averaged) features that blur series identity. Can a fully automatic, domain-knowledge-free method extract *static* features — describing a series as a whole, unique per series — via a self-supervised CNN, and do those features improve forecasting accuracy when plugged into the FFORMA meta-learning framework in place of handcrafted features?

## 2. Dataset / schema
- **M4 competition** (100K series, mixed frequencies/domains; pre-defined train/test): Yearly 23000 (len 19–841), Quarterly 24000 (24–874), Monthly 48000 (60–2812), Daily 4227 (107–9933), Hourly 414 (748–1008). Weekly subset also reported.
- **CIF2016_Monthly:** 72 monthly series (banking/simulated), len 120.
- **NN5:** 111 daily ATM-withdrawal series, len 791.
- **Ausgrid_Weekly:** 299 weekly solar-home electricity series, len 156.
- **Traffic_Weekly:** 862 weekly freeway-traffic series (Caltrans PeMS), len 104.
Non-M4: last block as test (24/7/8 points for hourly/weekly/monthly). Metric: sMAPE.

## 3. Method / model
**Static vs dynamic features** (core conceptual contribution): static features describe a series as a whole (unique per series, stable over time — right for forecasting); dynamic features describe a window at a moment in time (what windowed autoencoders produce — cross-series-averaged, good for compression/denoising, wrong for forecasting identity).
**FRANS** (Feature Retrieving Autoregressive Network for Static features):
1. Split each series into sliding windows; treat **each series as its own class** (windows of TS_k labeled "TS_k" — no external labels needed; generalizes to sets of series per class, e.g. IoT devices).
2. Train a 1D-CNN classifier (Fawaz et al. 2019 TSC architecture + inserted feature layer of dimension = desired feature count, here 16; **sparse** categorical cross-entropy to handle 40K+ classes without one-hot RAM blowup).
3. Remove the output dense layer; the penultimate layer outputs per-window features.
4. Stabilize: mean and medoid of per-window features across all windows → final static feature vector per series.
**FFORMA integration:** replace the 42 tsfeatures with the 16 deep features as input to the XGBoost meta-learner that predicts combination weights over base forecasters (Naïve, AutoARIMA, Theta, ETS, STLM, TBATS, NNETAR, etc.). Everything else identical.

## 4. Equations & assumptions
- sMAPE = (200/n) Σ_t |y_t - ŷ_t| / (|y_t| + |ŷ_t|) (Eq. 1).
- No equations stated for the CNN training beyond sparse categorical cross-entropy (standard); feature aggregation = window-wise mean/medoid.
- Assumptions: (i) windows of one series share a latent "series identity" learnable by classification; (ii) discriminative training (series-as-class) yields features that separate behaviorally different series while clustering similar ones — verified via window-cluster distance analysis (§4.4); (iii) static features are the right representation for the meta-learner (vs dynamic); (iv) 16 features suffice (2.5× reduction claimed as an advantage).

## 5. Features / target
Input: raw univariate series → sliding windows → 16-dim static feature vector per series (learned, no handcrafting). Meta-learner target: optimal combination weights over the base-forecaster pool. Forecast horizon: M4-specified per frequency; 24/7/8 points for hourly/weekly/monthly on other sets.

## 6. Validation design
M4's official train/test splits; block-from-end test sets elsewhere. Baselines: FFORMA_orig (42 tsfeatures) + every base model individually (Naive2, RandomWalkDrift, SeasonalNaive, Auto.arima, ETS, NNETAR, STLM, TBATS, THETAF). Metric sMAPE. Feature-quality analysis (§4.4, M4_Monthly 48K series): within-series window-feature dispersion (stability) and between-series cluster separation via dimensionality reduction/clustering.

## 7. Numerical results / baselines
Table 2 sMAPE (Proposed = 16 FRANS features; FFORMA_orig = 42 tsfeatures):
- M4_Daily: 3.020 vs 3.060 | M4_Hourly: 11.622 vs 11.670 | M4_Monthly: 12.806 vs 12.741 (orig wins) | M4_Quarterly: 9.846 vs 9.848 | M4_Weekly: 6.729 vs 6.838 | M4_Yearly: 12.950 vs 13.011 | NN5: 21.084 vs 21.083 (orig wins by 0.001) | Traffic: 12.208 vs 12.350 | Ausgrid: 24.410 vs 24.601 | CIF2016: 6.556 vs 6.688.
- Proposed beats FFORMA_orig on **8/10** datasets (the 2 losses are marginal: +0.065 on M4_Monthly, +0.001 on NN5) and beats **all** individual base models on all datasets.
- Bonus robustness: on M4_Yearly, the full tsfeatures set fails to compute on ~4,000/23,000 series (>25%, short-series dominated); FRANS has no minimum-length constraint beyond the window size.
- Feature-space analysis: within-series window features cluster tightly; inter-cluster distances reflect behavioral similarity (interpretability claim, figure-based).

## 8. Code / data availability
None stated. Datasets public (M4, CIF2016, NN5, Ausgrid, PeMS traffic). Method reimplementable from the Fawaz et al. 2019 1D-CNN reference + described modifications.

## 9. Leakage & limitations
Adversarial read: (i) the series-as-class classifier is trained on windows from the *full* series including the test block — windows overlapping the held-out forecast horizon leak future information into the "static" features (paper does not state a train-only windowing cutoff; FFORMA's meta-learner then sees future-contaminated features — the 8/10 wins may be partly leakage); (ii) improvements over FFORMA_orig are small in absolute sMAPE (e.g., 9.848→9.846 quarterly) — several wins are within noise; (iii) 16-dim feature space chosen, not tuned; (iv) no comparison against modern deep forecasters (only classical base pool + NNETAR); (v) interpretability analysis is qualitative (cluster plots), no quantitative interpretability metric; (vi) for GSE: 32 teams × short 17-game seasons = few "classes" with tiny window counts — the discriminative training signal is far weaker than on 48K M4 series.

## 10. GSE overlap
GSE has no learned series-embedding lane (existing-research map: hand-built metrics; representation learning on play-by-play is a commissioned-but-unresulted ML-brief topic). The static/dynamic distinction is directly relevant: GSE's rolling-window features today are effectively *dynamic* (window-local); nothing describes a team's season-trajectory *as a whole* in a learned space. FRANS offers a concrete recipe for that. Also relevant to the engine's model-combination layer: GSE runs multiple sub-models (existing ensemble theory lane "CEPT" in docs/research/cept/) — a meta-learner weighting members per matchup from static series features is a natural extension of the current ensemble practice.

## 11. GSE implementation spec
1. Data: per-team per-season game sequences (2009–2026, nflverse): EPA/play, success rate, pressure rate, turnover margin as multivariate input (extend the 1D-CNN to multi-channel).
2. Surrogate task: each team-season = one class (32×18 = 576 classes, no leakage if windows exclude the forecast horizon — **cut windows strictly before the prediction week**, fixing the paper's leakage flaw).
3. Architecture: Fawaz-style 1D-CNN + feature layer (dim 24), sparse categorical cross-entropy; per-window features → mean/medoid → static team-season embedding.
4. Use: feed embeddings into the engine's meta-learner (LightGBM/XGBoost) that combines sub-model outputs per game; also as similarity features ("this team's trajectory resembles 2019 49ers") for the DFS packet narrative.
5. Effort: ~4 engineer-days (multi-channel CNN + leakage-safe windowing + meta-learner plumbing).

## 12. Reproducible test
Dataset: nflverse 2015–2025 team-game sequences. Train FRANS embeddings on seasons ≤ 2023 with windows cut before each season's final 4 games (no future leak). Meta-learner test: predict game ATS cover by combining 3 sub-model outputs (EPA-based, market-based, Elo-based) with XGBoost, features = sub-model outputs ± 24-dim FRANS embedding of each team's season-to-date trajectory; baseline = same meta-learner with 42 tsfeatures-style handcrafted stats. Walk-forward: train meta-learner 2015–2023, test 2024–2025. Metric: log-loss. Leakage audit: verify no window used in an embedding extends past the game being predicted.

## 13. Acceptance / rejection gate
**Adopt FRANS embeddings iff** the meta-learner with FRANS features beats the handcrafted-feature meta-learner by ≥ 0.004 log-loss on 2024–2025 walk-forward AND the leakage audit passes (zero windows crossing the prediction boundary) AND per-team-season embedding stability holds (mean pairwise cosine distance of window features within a team-season < 0.5× the between-team-season distance, mirroring the paper's §4.4 check). Reject if the win is smaller than the paper's typical margin (the M4 wins were often <1% relative — noise), if embeddings collapse (all teams map near-identically given only 17-game seasons), or if the leakage-safe windowing destroys the signal.

## 14. Improvement experiment
Beyond the paper: **combine static + dynamic features** (the authors' own stated future work) in a two-tower meta-learner — static tower = FRANS team-season embedding (identity: "who are they this year"), dynamic tower = windowed autoencoder features of the last 4 games (momentum: "how are they playing right now"). For NFL this maps exactly onto the scout's mental model (season identity vs recent form), and the interaction between the towers (identity × momentum) is where matchup-specific edges should live. Test whether the two-tower meta-learner beats either tower alone on the same walk-forward protocol.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2209.07018 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
