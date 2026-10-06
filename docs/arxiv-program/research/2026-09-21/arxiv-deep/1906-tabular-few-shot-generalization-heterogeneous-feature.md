# [1906] Tabular Few-Shot Generalization Across Heterogeneous Feature Spaces (arXiv:2311.10051v1)

**Citation:** Zhu, M., Kobalczyk, K., Petrovic, A., Nikolic, M., van der Schaar, M., Delibasic, B., Lio, P. (2023). *Tabular Few-Shot Generalization Across Heterogeneous Feature Spaces*. arXiv:2311.10051v1. URL: https://arxiv.org/abs/2311.10051v1
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** the only tabular few-shot meta-learner that transfers across *heterogeneous feature spaces*; GSE's eras have different feature sets (pre-NGS vs tracking era, college vs pro stats), and this is the machinery for bridging them.

## 1. Research question
Few-shot learning on tabular data is under-explored, and existing methods assume train/test share the same feature space. Tabular columns have no intrinsic cross-dataset meaning and are permutation-invariant. Can a meta-network — Dataset2Vec-style permutation-invariant dataset/column encoders + a weight-generating decoder + a Graph Attention Network target — meta-learn across datasets with *non-overlapping feature sets* and generalize to unseen tabular datasets from a few labeled rows?

## 2. Dataset / schema
- **118 UCI tabular classification datasets** (65 binarized one-vs-all); medical subset of 29 for the illustrative example; 65 datasets with ≥3 classes for the 3-class experiment.
- Protocol: N-fold over datasets (each fold's datasets = test collection); per task sample N^meta + N^target rows with binomial class sampling (realistic imbalance); columns standardized; feature-column subsampling as augmentation; global hyperparameters tuned on a 25%-datasets validation split.
- Baselines: LR, KNN, SVC, Random Forest, CatBoost, TabNet, FT-Transformer, STUNT, TabPFN, Iwata (heterogeneous meta-learner). No code URL stated in the paper.

## 3. Method / model
**FLAT.** Meta network = (1) dataset encoder **F: e = f₃((1/N^col)Σ_j f₂((1/N^meta)Σ_i f₁(x^meta_{i,j}, y^meta_i)))** — permutation-invariant over rows AND columns; (2) column encoder **G: p_j = g((1/N^meta)Σ_i f₁(x^meta_{i,j}, y^meta_i))** — per-column label-relationship embeddings; (3) weight decoder **H**: L MLPs h_l generating target-network weights **[ω_a^l, ω_b^l, ω_W^l] = h_l(e)**, L2-normalized with learnable scale θ. Target network Φ = fully-connected GAT over feature-nodes: attention **α_jk = exp(LReLU(a^{l⊤}[W^l h^l_j || W^l h^l_k])) / Σ_r …**, node update **h^{l+1}_j = Σ_k α_jk W^l h^l_k**, first-layer nodes **h^0_j = [p_j || x_j]** (column embedding + value); final prediction **softmax(W^L (1/N^col Σ_j h^{L-1}_j))**. **FLATadapt**: at inference only, a few gradient steps on e, p_j using the meta set's features+labels (all weights frozen).

## 4. Equations & assumptions
- Dataset embedding (Eq. 1): **e = f₃((1/N^col)Σ_j f₂((1/N^meta)Σ_i f₁(x^meta_{i,j}, y^meta_i)))**.
- Column embedding (Eq. 2): **p_j = g((1/N^meta)Σ_i f₁(x^meta_{i,j}, y^meta_i))**.
- Generated weights (Eqs. 3–4): **[ω_a^l, ω_b^l, ω_W^l] = h_l(e)**; **a^l = θ_a ω_a^l/||ω_a^l||** etc.
- GAT attention/update (Eqs. 5–6); prediction (Eq. 7): **p(ŷ^target) = softmax(W^L((1/N^col)Σ_j h^{L-1}_j))**.
Assumptions: (i) tasks' meta and target sets share a data distribution *within* a task; (ii) structural column-label relationships recur across datasets (gains are largest when they do — shown in Appendix A.4.3 toy); (iii) O((N^col)²) fully-connected GAT is affordable (authors flag this as the limitation); (iv) binary/multi-class classification only — regression left as future work ("we would also like to extend… to regression problems"); (v) no semantically meaningful column names needed (unlike TabLLM).

## 5. Features / target
Features: heterogeneous tabular columns (any count, any meaning). Target: binary label (main), 3-class (extension). Horizon: per-row classification.

## 6. Validation design
N-fold cross-validation *over datasets* (test datasets never seen in training); tasks sampled per dataset; N^meta ∈ {1,3,5,10,15}; accuracy averaged over folds and seeds. Baselines fitted per-task on D^meta only (except meta-learners). Imbalanced meta sets via binomial sampling (realistic); K-shot-balanced variant in appendix. Timing benchmark: 200 inference steps on 15 rows × 20 columns.

## 7. Numerical results / baselines
Numbers quoted exactly:
- **Medical 29 datasets, N^meta=3**: FLAT 66.54 ± 0.11 vs Iwata 65.82 ± 0.60, KNN 64.99 ± 0.27, STUNT 63.79 ± 0.28, FTT 63.73 ± 0.27, CatBoost 62.86 ± 0.28 (FLAT best; up to +2pp over best baseline). **N^meta=1**: FLAT **59.73 ± 0.18** vs Iwata 57.72 ± 0.64 (only meta-learners can even run; random = 50%).
- **All 118 datasets, N^meta=3**: FLAT 64.40 ± 0.13 vs Iwata 62.48 ± 0.31, KNN 62.54 ± 0.28, STUNT 61.28 ± 0.28; N^meta=5: FLAT 66.40 ± 0.14 vs Iwata 64.52 ± 0.31; **N^meta=10**: FLAT 69.86 ± 0.12 vs KNN 68.53 ± 0.27, STUNT 69.00 ± 0.26; N^meta=15: FLAT 71.50 ± 0.14 ≈ baselines (few-shot advantage decays, as designed).
- **FLATadapt**: +0.5–2.33pp over FLAT (all-118 N^meta=10: 70.35 ± 0.12; "exceeds all baselines by up to 2.33pp").
- **Median rank** over datasets: FLAT ranks #1 at all N^meta (Figure 2).
- **3-class**: FLAT beats all baselines at N^meta=3,5,10; FLATadapt adds up to +1.25pp.
- **Inference time** (200 steps, 15 rows, 20 cols): FLAT 0.45s (≈ LR 0.42s, KNN 0.22s), FLATadapt 8.65s, vs FT-Transformer 40.61s, TabNet 108.42s (refit-per-task baselines are orders of magnitude slower).
- t-SNE of dataset embeddings e: same-dataset tasks cluster increasingly cleanly as N^meta grows (Figure 3) — the encoder learns dataset identity.
*My inference:* the N^meta=1 result (59.7% vs 50% random) is the standout — one labeled game producing above-chance predictions on an unseen regime is exactly the rookie-QB Week 2 problem.

## 8. Code / data availability
No code URL stated ("None stated"). Data: 118 UCI datasets (public).

## 9. Leakage & limitations
- Classification only; regression explicitly future work — GSE's primary targets (margin, EPA) need a regression head; cover/no-cover and win/loss are the natural classification bridges.
- Column subsampling augmentation may inflate robustness vs. a fixed-schema deployment; real feature sets are stable within an era.
- The "heterogeneous" claim is across unrelated UCI datasets — sports regimes share far more structure, so transfer should be *easier*, but the paper's headline numbers are on the hard case.
- O((N^col)²) GAT: fine for ~50 game features, but a limitation at tracking-feature scale.
- Dataset embeddings need enough meta rows to stabilize (Figure 3: clusters form as N^meta grows); at N^meta=2–4 (our regime) embeddings are noisy — FLATadapt's inference-time gradient steps partially compensate.
- No calibration analysis; accuracy-only evaluation.

## 10. GSE overlap
No tabular meta-learning anywhere in Garrett's map; GSE's tabular models (XGBoost family) assume fixed schemas and need refitting per regime. **New capability**: cross-era/regime transfer where feature sets genuinely differ — pre-2016 (no NGS/tracking) → tracking era; college stats → NFL for rookies; preseason vs regular season feature sets. The dataset-embedding e is also a regime-similarity metric: "which historical team-seasons does this 2-game sample look like?" complements ledger 1905's z^t.

## 11. GSE implementation spec
1. Data: nflverse game-level tabular features 2015–2025; define tasks at team-season level, deliberately varying feature subsets per era (drop NGS columns pre-2018, drop tracking pre-2021) to exercise heterogeneous transfer.
2. Column encoder over game-stat columns; dataset encoder over the K-game support set; GAT target network with generated weights; binary head: win/loss and cover/no-cover; add a regression head (authors' stated future work — implement as linear head on pooled node states) for margin.
3. Meta-train across eras; meta-test on 2023–2025 new regimes.
4. FLATadapt at inference: 5–10 gradient steps on the support set's embeddings only (fast; 8.65s-equivalent is affordable weekly).
5. Serving: per-team weekly — encoder forward pass + generated GAT; no refit of the meta-network.
Effort: ~3 engineering weeks including the regression-head extension.

## 12. Reproducible test
Same meta-protocol as ledgers 1902–1905 (nflverse, LOSO, support = first K∈{2,4} games of new-regime teams). Baselines: (a) per-task XGBoost on support only (the "refit" baseline — should fail at K=2), (b) Iwata-style DeepSets meta-learner (paper's own heterogeneous baseline), (c) league-average prior. Metrics: accuracy/Brier on win and cover. Must run both homogeneous-schema and heterogeneous-schema (era-dropped features) variants — the heterogeneous case is this paper's unique claim.

## 13. Acceptance / rejection gate
ADOPT iff FLAT beats per-task XGBoost by **≥3pp accuracy** on new-regime win prediction at K∈{2,4} (2023–2025 LOSO) AND the heterogeneous-schema variant loses ≤1pp vs the homogeneous variant (proves cross-era transfer works). Reject if it can't beat plain XGBoost at K=4 — then tabular meta-learning isn't earning its complexity for GSE.

## 14. Improvement experiment
**Hybrid FLAT–NGGP head**: replace the softmax classifier with ledger 1902's flow-conditioned GP head — keep FLAT's heterogeneous tabular encoder and GAT, but output calibrated non-Gaussian predictive distributions over margin instead of class labels. Rationale: FLAT solves the *feature* problem, NGGP solves the *noise-shape* problem; GSE needs both. Test: same meta-protocol on margin regression; expect the hybrid to beat FLAT-regression-head on NLL (heteroscedastic regimes) while matching it on accuracy. Explicitly classification-only — the sports bridge runs through win/cover classification plus the proposed regression head; the honest version of this ledger says the regression extension is untested work.
