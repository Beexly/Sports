# [2191] Feature Selection for Multivariate Time Series via Network Pruning (NFS) (arXiv:2102.06024v3)

**Citation:** Kang Gu, Soroush Vosoughi, and Temiloluwa Prioleau (2021, Dartmouth College). *Feature Selection for Multivariate Time Series via Network Pruning*. arXiv:2102.06024v3. URL: https://arxiv.org/abs/2102.06024
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* NFS turns feature selection into an end-to-end gradient problem: per-stream temporal CNNs with batch-norm scaling factors reused as importance scores under an L1 penalty. It improved every downstream model on all four MTS benchmarks, beat the SOTA on glucose forecasting, and beat the unsupervised AgnoS selector nearly everywhere. Adapt as the supervised pruning stage that sits downstream of the tsflex (2188) / signature (2190) / TCTO (2189) feature factories and learns which streams actually earn their place.

## 1. Research question
Multivariate time series (MTS) are high-dimensional; deep MTS work focuses on architectures, not on selecting which streams matter. Can feature selection be made end-to-end — a neural component (Neural Feature Selector, NFS) that learns per-stream importance scores jointly with the downstream task via network pruning, outperforming both full-feature training and unsupervised selectors?

## 2. Dataset / schema
Four real-world MTS datasets (Table I): OhioT1DM (8 weeks, 5-min granularity, 19 variables, diabetes CGM/insulin/activity — train/test split from the benchmark); Favorita (365 days, daily, 15 variables, retail unit sales); PhysioNet 2012 (48 hours, hourly, 37 variables, ICU mortality); Face Detection (1.5 s MEG, 144 channels). Preprocessing follows dataset-native conventions (e.g., first-order interpolation + median filter for OhioT1DM missing CGM). Every model trained 5×, averaged.

## 3. Method / model
**NFS architecture:** decomposed convolution — each of the d univariate streams passes through its own temporal CNN independently, then an aggregating CNN merges streams for the downstream network.
**Importance scores:** reuses the batch-norm affine scale α_i per stream as the importance score — no extra parameters:
z_norm^i = (z_in^i − μ_i)/√(σ_i² + ε); z_out^i = α_i·z_norm^i + β_i.
**Training objective:** L = Σ l(f(x,W),y) + γ·Σ_i |α_i|, γ = 0.001 (Lasso on importance scores pushes most streams to ~0).
**Selection:** top-k α_i streams retained; k per dataset (OhioT1DM 5/19, Favorita 5/15, PhysioNet 16/37, Face Detection 32/144). NFS module is plug-in: tested with LSTM, ResNet, MCNN, MCDCNN, t-LeNet, Transformer downstream.

## 4. Equations & assumptions
- L = Σ_{x,y} l(f(x,W),y) + γ Σ_i |α_i|, γ = 0.001; l = MSE (regression) or cross-entropy (classification); plus an L2 penalty coefficient 0.01 on weights.
- Assumptions: (i) BN scale magnitude is a faithful proxy for stream utility — inherits BN's batch-statistics dependence; (ii) per-stream independent temporal CNNs suffice to judge a stream (cross-stream interactions only enter at aggregation, so a stream useful *only* jointly may be pruned); (iii) L1 on α yields a clean top-k cut.

## 5. Features / target
Features: raw MTS streams (selection over streams, not engineered features). Targets: glucose mg/dL (RMSE), unit sales (MAE), ICU mortality (AUC), face-detection class (accuracy).

## 6. Validation design
NFS-selected subsets vs full feature set vs AgnoS (autoencoder-based unsupervised selector) across 6–7 downstream architectures per dataset; 5 runs averaged; comparison to published SOTA per dataset (NPE+LSTM, LSTNet, TADA, GRU-D, SNN).

## 7. Numerical results / baselines
- **OhioT1DM (5/19 streams):** NFS+LSTM RMSE **17.50** vs full set 17.80 vs AgnoS 19.52 vs published SOTA NPE+LSTM 17.80 — NFS beats SOTA by 0.30 with 26% of streams. NFS+t-LeNet: 22.33 vs 28.05 full (−5.72). NFS beat AgnoS on 4/6 downstream models; average margin over AgnoS: 0.86 RMSE.
- **Favorita (5/15):** NFS+LSTM MAE — Δ=2d: **4.441** vs 4.877 full vs 5.044 AgnoS; Δ=4d: 4.584 vs 4.900; Δ=8d: 4.791 vs 5.112. Average margin over AgnoS: 0.60 MAE.
- **PhysioNet 2012 (16/37):** NFS+t-LeNet AUC **0.9179** vs 0.9045 full vs 0.9032 AgnoS vs GRU-D 0.8424 (+0.075 over prior SOTA). NFS best on all 7 downstream models; average AUC 0.8860 vs AgnoS ~0.8660.
- **Face Detection (32/144):** NFS+MCDCNN accuracy **0.636** vs 0.629 full vs 0.598 AgnoS vs SNN 0.57 (+10%+ over prior SOTA). NFS best on all models; average 0.595 vs AgnoS 0.545.
- Consistent pattern: NFS ≥ full-set on every model/dataset (pruning never hurts, usually helps); supervised gradient selection ≫ unsupervised AgnoS.

## 8. Code / data availability
All four datasets public (OhioT1DM, Favorita, PhysioNet 2012, Face Detection/MEG). No repo link extracted from this read — reimplementation from the paper's equations is straightforward.

## 9. Leakage & limitations
Adversarial read: (i) α_i from BN couples importance to batch statistics — small-batch or non-stationary sports seasons could make scores noisy; (ii) per-stream independence assumption means jointly-useful streams can be pruned (the aggregation CNN sees them only after selection); (iii) no temporal validation: selection learned on the same period as training risks selecting era-specific streams — the 2184/2185 shift-robustness concern applies directly; (iv) k is a hand-set hyperparameter per dataset, not learned; (v) MCNN "did not converge" on Face Detection and is dropped — selective reporting on a weak baseline; (vi) comparison to AgnoS flatters NFS (unsupervised vs supervised is an uneven fight).

## 10. GSE overlap
GSE's feature count is exploding: 40 gse-lab metrics + catch22 windows (2182) + tsfresh (2183) + signatures (2190) + TCTO crosses (2189) = hundreds of streams with no supervised pruning stage. NFS is the **learned gate at the end of that pipeline**: per-metric-stream temporal CNNs over trailing game windows, BN-α importance under L1, top-k retained for the spread/total models. It replaces today's implicit selection (whatever the modeler hand-picks) with a gradient-disciplined, reproducible cut — and the α ranking itself is a publishable "which stats actually matter" artifact for GSE content. Overlaps 2185 (SHAPEffects) as a complementary selector — NFS is in-training/gradient-based, SHAPEffects is post-hoc/error-based; use both and keep the intersection.

## 11. GSE implementation spec
1. Reimplement NFS: per-stream 1D-CNN (kernel covering ~4 games) over each candidate feature stream (trailing-17-game window), BN layer, α extraction, L1 γ=0.001, aggregation CNN → LightGBM/MLP head predicting spread cover.
2. Train on 2015–2022, select top-k (k ∈ {15, 25, 40} by validation), freeze selection, retrain downstream on selection.
3. Guard the BN assumption: use large batches (full seasons) and season-wise standardization so α reflects signal, not batch noise.
4. Combine with 2185: keep streams that survive BOTH NFS top-k and SHAPEffects backward elimination — the doubly-robust feature set.
5. Effort: ~4 engineer-days (PyTorch reimplementation + integration with the gse-lab feature matrix).

## 12. Reproducible test
Dataset: gse-lab team-game feature matrix (all streams from 2182/2188/2189/2190 program, ~200 streams), 2015–2024, spread-cover label. Protocol: NFS selection on 2015–2021, downstream LightGBM trained 2015–2022, tested 2024. Baselines: (A) all streams, (B) AgnoS-style unsupervised selection (PCA-variance top-k), (C) hand-picked current GSE features. Report 2024 log-loss for k ∈ {15, 25, 40}.

## 13. Acceptance / rejection gate
**Accept iff** NFS top-k (best k) improves 2024 held-out log-loss by ≥ 0.003 over both baseline A (all streams) and baseline C (hand-picked), with k ≤ 40 (deployment discipline). Reject if NFS selection underperforms the full set (pruning hurts — the independent-stream assumption is biting), if the selected set is unstable across 5 seeds (Jaccard < 0.5 — BN noise), or if it merely rediscovers the hand-picked set with no lift (no marginal value).

## 14. Improvement experiment
Beyond the paper: make α **season-adaptive**. The paper learns one static α per stream; GSE eras shift (2184). Train NFS with a hierarchical α_{i,s} = α_i · δ_{i,s} where δ is a per-season multiplier learned with its own sparsity penalty — streams can be globally useful but seasonally muted (e.g., pace features matter less in bad-weather December). The δ matrix becomes a "feature regime map" of the NFL, publishable as content and usable as a regime-shift alarm when a new season's δ deviates from history.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2102.06024 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
