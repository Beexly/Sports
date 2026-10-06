# [1863] T-JEPA: A Joint-Embedding Predictive Architecture for Trajectory Similarity Computation (arXiv:2406.12913)

**Citation:** Lihuan Li et al. (UNSW) (2024). *T-JEPA: A Joint-Embedding Predictive Architecture for Trajectory Similarity Computation*. arXiv:2406.12913. URL: https://arxiv.org/abs/2406.12913
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
The AdjFuse local-neighborhood enrichment module is a standalone, directly reusable building block for noisy/sparse NFL tracking sequences; the JEPA pretraining loop itself is the single-scale base that the same group later extended in HiT-JEPA (ledger 1862).

## 1. Research question
Can Joint-Embedding Predictive Architecture (JEPA) — predicting masked portions in representation space rather than data space — replace manual data augmentation in contrastive trajectory representation learning, and can a local neighborhood fusion module (AdjFuse) stabilize embeddings under low/irregular GPS sampling?

## 2. Dataset / schema
- **Porto** (PKDD'15, Kaggle): 1.7M trajectories, 442 taxis, Porto, Jul 2013–Jun 2014. Train 200,000; test DB 100,000; queries 1,000.
- **T-Drive** (MSR Beijing taxis): 10,357 taxis, Feb 2–8, 2008, avg sampling 3.1 min. Train 70,000; test DB 10,000; queries 1,000.
- **GeoLife** (MSR, 182 users): Apr 2007–Aug 2012, "17,6212" trajectories [paper's text], 1–5 s sampling. Train 35,000; test DB 10,000; queries 1,000.
- **FourSquare-TKY** (573,703 check-ins) / **FourSquare-NYC** (227,428 check-ins), Apr 2012–Feb 2013. Trained by loading Porto weights and continuing (too short/sparse to train from scratch); test DBs 500 / 147.
Schema: GPS sequences (lon, lat), 20–200 points after preprocessing; study areas: Porto 183.13 km², Beijing 1949.26 km², Tokyo 1540.18 km²; 10% of train used for validation.

## 3. Method / model
**Cell representation:** study area partitioned into equally sized grid cells; node2vec pretrained on cell-adjacency graph G=(V,E) gives cell embeddings h_i. Point p_i → h_{δ(p_i)}; trajectory becomes H = (h_{δ(p_1)},…,h_{δ(p_n)}) ∈ R^{d}, d=256.
**AdjFuse:** learnable 3×3 kernel W over node neighborhood N(i)∪{i}; normalized W' = softmax over neighborhood; fused embedding h̃ = σ(Σ w'_j·h_j + b); final h'_i = h_i + W̃·h̃ (residual). Kernel slides along trajectory points, sharing weights across target/context branches. Applied only to sampled points on the context branch during training.
**JEPA:** target encoder E_{θ̄} extracts full-trajectory reps S_T = {S_{T1},…,S_{Tn}}; M=4 targets resampled with replacement via masks M_i, masking ratio drawn from {10%, 20%, 30%} per iteration, successive sampling prob p=50%. Context: initial mask M_T with p_γ ∈ [85%,100%], then one-by-one overlap removal against each target → M context inputs; each encoded by context encoder E_θ. Predictor D_φ (2-layer Transformer decoder, 8 heads) predicts each target from context + positional mask tokens z. Loss = SmoothL1(pred, target) summed over positions. 3-layer Transformer encoders (4 heads), learnable positional encoding; Adam, lr 1e-4 decaying by half every 5 epochs, 20 epochs max, batch 64, early stopping after 5 stagnant epochs, Nvidia V100. Target encoder params = EMA of context encoder.
**Inference:** F(T_i) = E_θ(g_W(T_i)) (AdjFuse + context encoder, no sampling); representations compared by distance for similarity search; encoder backbone can be concatenated with other models for transfer learning.

## 4. Equations & assumptions
- W' = exp(w_j) / Σ_{k ∈ N(i)∪{i}} exp(w_k); h̃ = σ(Σ_{j ∈ N(i)∪{i}} w'_j·h_j + b); h'_i = h_i + W̃·h̃.
- L = SmoothL1 distance between predicted S̃_T(i) and target S_T(i) per sampled position; predictor conditioned on mask tokens z + positional embeddings.
- Assumptions: grid-cell discretization + node2vec captures spatial relations adequately; masked representation prediction learns high-level trajectory semantics; per-point embeddings are comparable by simple distance; single moving object, no interactions; augmentation-free resampling generates sufficient target diversity.

## 5. Features / target
Inputs: grid cell IDs → node2vec embeddings → AdjFuse-enriched embeddings. Self-supervised targets: latent embeddings of M=4 randomly sampled trajectory segments (10/20/30% ratios), predicted from the complementary context. No labels used in pretraining.

## 6. Validation design
Self-similarity retrieval: query halves (odd-indexed points) vs DB containing even-indexed halves + random fillers; mean rank of true match (lower better) across DB fractions {20%,40%,60%,80%,100%}; robustness under downsampling ρ_s ∈ [0.1,0.5] and coordinate distortion ρ_d ∈ [0.1,0.5]. Downstream fine-tune: encoder FROZEN, 2-layer MLP decoder (embedding dim d) trained to approximate EDR, LCSS, Hausdorff, discrete Fréchet; metrics HR@5, HR@20, R5@20; splits 7:1:2 (random, not time-ordered). Baselines: t2vec, TrajCL (open-source repos, default params). Ablations: no-AdjFuse; sampling ratios {0.05,0.15,0.25} and {0.30,0.40,0.50} vs {0.10,0.20,0.30}.

## 7. Numerical results / baselines
- Self-similarity mean rank (Table 2): T-JEPA beats TrajCL on 4 of 5 datasets; T-Drive by 0.114, GeoLife by 0.158 (mean-rank units); TrajCL better on Porto by 0.044. On sparse check-in data: TKY — 6.88× better than t2vec, 2.92× better than TrajCL; NYC — 8.05× better than t2vec, 2.51× better than TrajCL.
- Downsampling (Table 3): on T-Drive, T-JEPA wins at ρ_s = 0.1–0.3 but loses at 0.4–0.5 (TrajCL trains with downsampling augmentation). On the other 3 sparse datasets T-JEPA best at all rates.
- Distortion (Table 4): T-JEPA beats TrajCL 1.62× on T-Drive, 10.92× on GeoLife, 3.04× on TKY, 2.53× on NYC; Porto 0.073 worse than TrajCL in mean rank.
- Fine-tuning frozen encoder + 2-layer MLP (Table 5): Porto — T-JEPA average 4.1% above TrajCL across 4 heuristics × 3 metrics (highest HR@5/HR@20/R5@20 in Porto and GeoLife except HR@20 on Fréchet); T-Drive — T-JEPA average 1.1% above TrajCL (wins EDR/LCSS, loses Hausdorff/Fréchet). t2vec collapses when its encoder is frozen (its paper tuned the last encoder layer).
- Ablations: removing AdjFuse → downsample-case mean rank 6.7, 74% worse than with AdjFuse (DB-size case improves by 0.05 without it); sampling ratios {10%,20%,30%} most robust; {30%,40%,50%} drops downsample performance 12.19%.

## 8. Code / data availability
None stated explicitly; paper says baselines run from their open-source repos. Datasets public (Kaggle Porto; MSR T-Drive/GeoLife; FourSquare). No T-JEPA code link found in the text read.

## 9. Leakage & limitations
- Odd/even query-DB construction makes the "retrieval" task near-duplicate matching; mean ranks ≈1 flatter real retrieval difficulty.
- Fine-tune targets (EDR/LCSS/Hausdorff/Fréchet) are deterministic functions of the same coordinates the encoder sees — approximating a formula, not generalizing to held-out semantics.
- Single-agent trajectories only; no interaction, no multi-scale structure (addressed later by HiT-JEPA).
- Fine-tune splits random 7:1:2, not time-ordered; no downstream task with real-world labels.
- NYC/TKY "improvements" measured on tiny DBs (147 / 500); the 8.05×/6.88× figures are relative to a weak t2vec baseline.
- No code link in the paper — reimplementation needed.

## 10. GSE overlap
Same UNSW group as HiT-JEPA (ledger 1862); T-JEPA is the single-scale predecessor. GSE has no JEPA or trajectory-embedding capability today (existing-research map: benchmark lane covers metric definitions only). AdjFuse is the separable new contribution: a plug-in local-smoothing layer for noisy tracking sequences — NFL tracking at 10Hz is dense, but NGS-style feeds, stadium occlusions, and interpolated frames create exactly the irregular/low-quality segments AdjFuse is designed for. Not duplicative of 1862 (different reusable unit).

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking (nflverse/BDB), per-play, all 22 agents + ball; also ingest the ~30% of frames with interpolated/filled positions as the "low-quality" regime.
2. Build AdjFuse as a preprocessing module: replace grid cells with a learned field graph (1-yard cells, node2vec on field adjacency or learned MLP embeddings); 3×3-equivalent kernel over field neighborhoods; residual fusion. Train standalone as a denoiser, or jointly inside a JEPA encoder.
3. Train T-JEPA (3-layer Transformer, d=256, M=4, ratios {10%,20%,30%}, p_γ ∈ [85%,100%]) on per-player per-play trajectories (~500K+ sequences), Adam 1e-4, batch 64, ~20 epochs, single A100/V100.
4. Downstream: frozen encoder → play-level pooled embeddings → features for GSE prop models (esp. rushing/receiving props driven by route shapes); also AdjFuse-only as a tracking denoiser feeding the existing pipeline.
5. Effort: ~1–2 engineer-weeks (simpler than HiT-JEPA; no hierarchy).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, train on weeks 1–12 (both seasons), test on weeks 13–18. Two tests: (a) denoising: AdjFuse-augmented embeddings — reconstruct held-out masked frames of player trajectories; metric = masked-position RMSE vs linear interpolation baseline; (b) retrieval: same-play-concept top-1 accuracy protocol as ledger 1862 (T-JEPA full embeddings vs raw DTW). Baseline: raw-DTW nearest neighbor. Run target: <24h on one GPU.

## 13. Acceptance / rejection gate
ADOPT if: (a) AdjFuse-augmented model achieves ≥15% lower masked-frame position RMSE than linear interpolation on held-out weeks, OR (b) T-JEPA embeddings reach same-play-concept top-1 accuracy ≥35% (vs ≤15% random, ≥10pp over raw-DTW). REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) conditioning the predictor on play-phase (pre-snap/snap/post-snap) mask tokens instead of generic mask tokens — the paper's mask tokens are phase-agnostic; NFL plays have rigid phase structure that should sharpen target prediction. (2) Replace fixed grid cells with continuous relative coordinates (player position relative to ball/line of scrimmage) as input to AdjFuse — the paper's absolute-grid embedding discards the relational structure that defines football plays. Hypothesis: relative-coordinate AdjFuse + phase-conditioned predictor lifts masked-frame RMSE another 10%+ over absolute-grid AdjFuse.
