# [2193] Online Sparse Streaming Feature Selection with Uncertainty (OS2FSU) (arXiv:2208.01562v2)

**Citation:** Feilong Chen, Di Wu, Jie Yang, and Yi He (2022, Chongqing Univ. of Posts and Telecommunications / CAS / Old Dominion Univ.). *Online Sparse Streaming Feature Selection with Uncertainty*. arXiv:2208.01562v2. URL: https://arxiv.org/abs/2208.01562
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF; ar5iv HTML conversion unavailable — fatal error).
**Verdict:** ADAPT

*Rationale:* the only OSFS method that treats missingness as a first-class problem: latent-factor-analysis imputation of sparse streaming features, then fuzzy-logic-regulated significance thresholds plus neighborhood-rough-set dependency scoring to absorb imputation uncertainty. Best on 6/6 datasets at every missing rate, statistically significant by Wilcoxon. GSE adapts the LFA-impute + fuzzy-select loop for new metrics and market features that arrive with short/gappy histories.

## 1. Research question
Online streaming feature selection (OSFS) assumes complete streaming features, but real streams (healthcare platforms, and by extension any live data operation) have missing data. Prior work (LOSSA) imputes via latent factor analysis but ignores the uncertainty between imputed values and labels. Can an algorithm that (1) LFA-imputes missing entries and (2) explicitly models selection uncertainty via fuzzy logic + neighborhood rough sets beat existing OSFS methods on sparse streams?

## 2. Dataset / schema
Six real datasets (Table II): mfeat-factors (217 feats × 2000), SMK-CAN-187 (19993 × 187), lung (3312 × 203), USPS (256 × 9298), COIL (241 × 1500), Isolet (617 × 1560). Training data sparsified at missing rates θ = 0.1–0.9; test data complete. Evaluation: average accuracy of KNN + SVM + Random Forest, 5-fold CV. Baselines: LOSSA, fast-OSFS, SAOLA, OSFASW, SFS_FI (the last four run on zero-filled (_Z) or mean-filled (_M) data — 9 competitors total).

## 3. Method / model
**Phase I — LFA imputation:** buffer Bs=15 streaming features into matrix B (M×Bs); factorize R̂ = PQᵀ minimizing L(P,Q) = ½‖W⊙(R−PQᵀ)‖²_F + (λ/2)(‖P‖²_F + ‖Q‖²_F) (Eq. 1) via SGD; W masks observed entries; completed matrix B̂ = PQᵀ.
**Phase II — selection** (per feature F̂_j in B̂):
- *Online relevance:* Fisher's-z test (continuous) / G² test (discrete) → re-Dep(C, F̂_j|∅) vs re-Ind.
- *Online redundancy I/II:* Markov-blanket-style — discard F̂_j if ∃S ⊆ SF with P(C|F̂_j,S) = P(C|S); re-check incumbents for redundancy after adding.
- *Fuzzy correlation analysis:* trapezoidal membership function lets the significance threshold μ float in [0.01, 0.1] instead of fixed 0.01/0.05; features with μ < p ≤ 0.1 are "fuzzy relevance features," scored by neighborhood-rough-set dependency γ_{F̂_j}(C) = |R̲_G D|/|U| (Eq. 7), top |SF|/2 added to SF.
**Complexity:** O(M·T·(1−θ)·d + |RF−RF₁|^ω·|SF| + |RF₁|·|SF|^ω·|SF|).

## 4. Equations & assumptions
- LFA loss (Eq. 1) above; per-entry SGD objective (Eq. 8).
- Neighborhood δ_h^G(x) = {y : Δ(x,y) ≤ h} (Eq. 5); lower/upper approximations (Eq. 6); dependency degree γ_G(D) (Eq. 7).
- Assumptions: (i) missingness is recoverable by low-rank structure (LFA); (ii) imputation error is the dominant uncertainty source, addressable by softening α; (iii) buffer Bs=15 gives enough co-occurrence for factorization; (iv) test data complete (train-only missingness).

## 5. Features / target
Features: arriving sparse feature vectors (selection over streaming features). Targets: dataset class labels (classification accuracy).

## 6. Validation design
θ = 0.1 head-to-head on all 6 datasets (Table IV); D1 sweep θ = 0.1→0.9 (Table V); all-datasets × θ sweep (Fig. 3); selected-feature counts (Table III); Wilcoxon signed-rank test per θ (Table VI, α = 0.1, reject if R_m ≤ 2 with N=6).

## 7. Numerical results / baselines
- **θ = 0.1: OS2FSU best on 6/6 datasets** (Table IV). Exact accuracies: D1 90.05 ± 0.56 (vs LOSSA 83.95, best baseline); D2 72.78 ± 1.57 (vs 69.84); D3 89.64 ± 1.22 (vs 86.48); D4 86.26 ± 2.48 (vs 77.44); D5 82.8 ± 8.01 (vs 71.97); D6 73.25 ± 3.19 (vs 50.66 — a 22.6-point gap). Average 82.46 vs LOSSA 73.39 vs SAOLA_M 62.65 (paper: +10.29 pp over runner-up, +19.81 pp over last).
- **D1 across θ (Table V):** OS2FSU best at every θ from 0.1 (90.05) to 0.9 (61.05); average 85.26 vs LOSSA 77.53. Accuracy flat-to-improving for θ ≤ 0.6 (90.05 → 87.95), then drops rapidly (77.47 at 0.8, 61.05 at 0.9) — imputation error dominates past 60% missingness.
- **Wilcoxon (Table VI):** R⁻ = 0 (OS2FSU never loses a dataset) at nearly all θ ≤ 0.7 vs every competitor → statistically significant.
- **Selection size (Table III, θ=0.1):** OS2FSU selects a moderate 16.73 features on average (vs LOSSA 8.97, SAOLA_Z 15.77) — the fuzzy band admits useful marginal features rather than over-pruning.

## 8. Code / data availability
Datasets public (ASU, OpenML, UCI). Hyperparameters given (Bs=15, λ=0.01, η=0.00001). No public repo link extracted from this read.

## 9. Leakage & limitations
Adversarial read: (i) test data is complete while train is sparse — flatters imputation methods vs the zero/mean-fill baselines, which face the same asymmetry but with cruder fill; (ii) low-rank missingness assumption untested — if missingness is structured (not-at-random), LFA bakes in bias; (iii) accuracy collapses past θ=0.6 for ALL methods — the operating envelope is bounded; (iv) fuzzy threshold [0.01, 0.1] and top-|SF|/2 rule are heuristics without ablation; (v) redundancy analysis is exponential in |SF| subsets (ω term) — fine for |SF|~17, untested at GSE's larger pools; (vi) classification-only, no regression/log-loss validation.

## 10. GSE overlap
GSE's feature pool has exactly this missingness structure: new metrics (NGS-derived, market-derived) arrive with short histories; props features are sparse by market; injury designations are sporadic. Today's options are dropping gappy features or crude fills. OS2FSU gives a principled third way — **LFA-impute the sparse newcomers, then select with uncertainty-aware (fuzzy) thresholds** so imputed features must clear a softer-but-explicit bar. Complements 2192 (online screening assumes complete streams) and 2191 (NFS assumes complete matrices): this is the layer that makes incomplete streams eligible for those selectors. No existing GSE component does imputation-aware selection.

## 11. GSE implementation spec
1. Reimplement Phase I: buffer each week's new/sparse features (Bs=8 weeks), LFA via SGD (rank d=8, λ=0.01) to impute missing team-game entries.
2. Phase II: Fisher's-z relevance on imputed features vs cover label; fuzzy band μ ∈ [0.01, 0.1] via trapezoidal MF; neighborhood-rough-set dependency γ for fuzzy-band features (k-NN neighborhoods on the completed matrix).
3. Feed the selected sparse features into the 2191 NFS gate alongside complete features — imputed features carry an "imputed" flag so downstream can down-weight.
4. Effort: ~4 engineer-days (LFA-SGD ~150 lines; rough-set γ ~100 lines; integration with the weekly feature matrix).

## 12. Reproducible test
Dataset: gse-lab features 2015–2024 with artificial sparsification — randomly mask 30% of entries in 10 chosen metrics (simulating short-history newcomers), train 2015–2022, test 2024 cover log-loss. Arms: (A) drop masked features, (B) mean-fill + standard selection, (C) OS2FSU (LFA-impute + fuzzy select). Report 2024 log-loss and retained-feature counts.

## 13. Acceptance / rejection gate
**Accept iff** arm C beats both A and B on 2024 log-loss by ≥ 0.002 AND retains ≥ 5 of the 10 masked features (it's actually recovering signal, not just dropping them). Reject if C ≤ B (LFA adds nothing over mean-fill — then the complexity isn't justified), if imputation on real (non-simulated) sparse features produces unstable selections across seeds, or if θ > 0.6 missingness on any real feature (outside the paper's operating envelope — drop the feature instead).

## 14. Improvement experiment
Beyond the paper: make the fuzzy band **missingness-adaptive**. The paper floats μ in a fixed [0.01, 0.1]; instead, scale the band by each feature's imputation confidence (LFA reconstruction error on held-out observed entries): high-confidence imputations get the strict band, low-confidence ones the wide band with heavier γ requirements. This turns the paper's uniform uncertainty handling into per-feature uncertainty pricing — and the confidence scores double as data-quality monitoring for the weekly pipeline (a metric whose imputation confidence decays week-over-week is a degrading data source).

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2208.01562 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
