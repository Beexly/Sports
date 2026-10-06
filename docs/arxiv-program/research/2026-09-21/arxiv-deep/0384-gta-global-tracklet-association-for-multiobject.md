# [0384] GTA: Global Tracklet Association for Multi-Object Tracking in Sports (arXiv:2411.08216)

**Citation:** Jiacheng Sun, Hsiang-Wei Huang, Cheng-Yen Yang, Zhongyu Jiang, Jenq-Neng Hwang (2024). *GTA: Global Tracklet Association for Multi-Object Tracking in Sports*. arXiv:2411.08216. URL: https://arxiv.org/abs/2411.08216
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1084 lines).
**Verdict:** ADAPT — a plug-and-play tracklet refinement (DBSCAN splitter + hierarchical-clustering connector on OSNet ReID embeddings) that lifts any sports tracker by +3.7 to +10.2 HOTA points with open code; for GSE it belongs in a future video-tracking pipeline (the NGS-replacement lane), not in the current NGS-chip stack where there is nothing to refine.

## 1. Research question
Can the two dominant failure modes of sports multi-object tracking — **mix-up errors** (one tracklet containing multiple identities after occlusions) and **cut-off errors** (one identity fragmented into multiple tracklets after exiting/re-entering the camera view) — be fixed by a tracker-agnostic post-processing stage using global temporal information and appearance features? The paper proposes GTA: a Tracklet Splitter (DBSCAN on per-box OSNet ReID embeddings) followed by a Tracklet Connector (hierarchical clustering on a tracklet-distance matrix with temporal and spatial constraints), achieving SOTA 81.04% HOTA on SportsMOT.

## 2. Dataset / schema
- **SportsMOT** (Cui et al. 2023): 240+ video sequences across basketball, football (soccer), volleyball — fast close-quarters action, wide-field dynamics, rapid vertical motion; standard train/test split; YOLOX detections used on the test set.
- **SoccerNet** tracking (2022/2023): 100+ high-quality clips from professional soccer matches; the 2023 test set used, with oracle detections (following Deep-EIoU's protocol) for fair comparison.
- Both are public benchmarks. ReID model: OSNet (Zhou et al. 2019) trained on SportsMOT; box-grained embedding per detection box is the input to GTA.

## 3. Method / model
Plug-and-play post-processing applied to any online/offline tracker's output:

1. **Tracklet Splitter (§3.1):** for each tracklet T = {t_0, …, t_n}, extract per-box appearance embeddings from a CNN ReID model (OSNet); cluster with a modified **DBSCAN** (cosine distance) into identity-pure fragments. Modification vs. vanilla DBSCAN: outliers are assigned to their nearest cluster at the end (no detections discarded). Hyperparameters: min samples s = 5, max neighbor distance ε = 0.6 (cosine), max clusters k = 3 (if more clusters form, progressively merge until k remain).
2. **Tracklet Connector (§3.2):** (a) build a symmetric tracklet-pair distance matrix D_{i,j}: set to 1 if temporal spans overlap (Π_i ∩ Π_j ≠ ∅); otherwise the mean pairwise (1 − cosine similarity) over all box embeddings of the two tracklets (Eq. 1); (b) enforce spatial constraints: thresholds θ_hor = β·Δ_max,hor, θ_ver = β·Δ_max,ver (Eqs. 2–3), and set D_{i,j} = 1 if the exit→entry displacement of temporally adjacent tracklets exceeds either threshold (Eq. 4) — encodes that players don't teleport across the field; (c) hierarchical clustering merging until no pair distance exceeds threshold α.
3. Hyperparameters: s = 5, ε = 0.6, k = 3, α = 0.4; β = 1.0 (SportsMOT), 0.7 (SoccerNet).
4. Tested as refinement on SORT, ByteTrack, and Deep-EIoU.

## 4. Equations & assumptions
- (1) `D_{i,j} = 1 if i≠j and Π_i ∩ Π_j ≠ ∅; else (1/(N_i N_j)) Σ_{m∈Π_i} Σ_{n∈Π_j} (1 − F^i_m·F^j_n/(‖F^i_m‖‖F^j_n‖))` — mean pairwise cosine distance between tracklet embeddings.
- (2)–(3) `θ_hor = β·Δ_max,hor`, `θ_ver = β·Δ_max,ver` — spatial thresholds from max bounding-box extents in the video.
- (4) `D_{i,j} = 1 if Δ_{i,j,hor} > θ_hor or Δ_{i,j,ver} > θ_ver` — forbid merging tracklets whose exit/entry points are too far apart.

Assumptions: (a) appearance embeddings are identity-discriminative despite near-identical team uniforms (the hard case — Figure 2); (b) a fixed camera / bounded field, so exit–entry displacement is bounded (fails for moving broadcast cameras); (c) temporally overlapping tracklets are different identities (true for single-camera, false across camera cuts); (d) each bounding box is a valid detection (hence no outlier rejection); (e) no more than k = 3 identities per tracklet in the splitter.

## 5. Features / target
Input features: per-box OSNet ReID appearance embeddings for every detection in each input tracklet, plus bounding-box centers/spans for temporal–spatial constraints. Target: corrected tracklet-to-identity assignment — split tracklets at identity changes, merge fragments of the same identity across re-entries. Output: refined tracklets with consistent IDs. Horizon: N/A (offline post-processing over a full video sequence).

## 6. Validation design
Datasets: SportsMOT test, SoccerNet 2023 test (oracle detections). Baselines: SORT, ByteTrack, Deep-EIoU — each evaluated with and without GTA (the "before" is the paper's own reproduction). Metrics: HOTA (primary), AssA, IDF1, DetA, MOTA, IDs (ID switches), Frag. Ablation (Table 3): connector-only vs. splitter+connector on all three trackers × both datasets. No train/test leakage concern — GTA is unsupervised post-processing (no learned weights beyond the frozen ReID model); ReID trained on SportsMOT train.

## 7. Numerical results / baselines
Quoted exactly:

- **SportsMOT (Table 1):** SORT 56.28 → +GTA 66.52 HOTA (+10.24); AssA 42.67→59.59 (+16.92); IDF1 58.83→77.37 (+18.54); IDs 5180→3547 (−1633). ByteTrack 63.46→69.74 (+6.28); IDF1 70.76→83.16 (+12.40); IDs 3147→2107 (−1040). Deep-EIoU 77.21→**81.04** (+3.83, SOTA); AssA 67.63→74.51 (+6.88); IDF1 79.81→86.51 (+6.70); IDs 2909→2737 (−172). DetA/MOTA essentially unchanged (as expected — GTA doesn't touch detections).
- **SoccerNet (Table 2):** SORT 65.89→72.73 (+6.84); ByteTrack 67.30→71.97 (+4.67); Deep-EIoU 79.41→83.11 (+3.70); IDs drop 1907/1409/615 respectively.
- **Ablation (Table 3):** connector alone on SORT: +9.15 HOTA (SportsMOT), +5.85 (SoccerNet); adding the splitter: +10.24 / +6.84. Connector does most of the work; splitter adds ~1 pp.
- Paper's claim: "significant and consistent improvements across different trackers and datasets" — supported by all six tracker×dataset cells.

## 8. Code / data availability
Code: https://github.com/sjc042/gta-link.git (stated in abstract). Datasets SportsMOT and SoccerNet are public. Hyperparameters fully documented (§4.2).

## 9. Leakage & limitations
- **Oracle detections on SoccerNet** inflate absolute scores; the *delta* from GTA is the valid signal, and it holds on SportsMOT with a real detector (YOLOX) too.
- **Spatial constraints assume a fixed camera** (Eqs. 2–4 use field-bounded displacement); NFL broadcast cameras pan/zoom/cut — exit–entry displacement in image coordinates is meaningless across cuts, so the connector's spatial gate needs re-derivation in field coordinates (requires field registration, e.g., the "No bells just whistles" line of work cited in the paper).
- **Uniform-appearance limit:** teammates in identical kits are the stated hard case; OSNet embeddings on NFL jerseys (numbers visible, but small at broadcast distance) may be less discriminative — the paper doesn't test American football.
- **k = 3 cap** on identities per tracklet is a heuristic that could under-split chaotic pile-up tracklets.
- **Offline only:** the connector needs the full sequence; no use for live in-play products.
- **External validity to NFL:** directly applicable *only if* GSE builds a video-tracking pipeline. Today GSE consumes NGS chip tracking — there are no tracklets to refine. The paper's value is conditional on the NGS-replacement lane (video-derived tracking), where it would sit between the detector/tracker and the analytics.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: (a) **2026-09-18 NGS replacement spec** — building NGS equivalents from public data; a video-tracking pipeline is the natural foundation of that lane, and GTA would be its refinement stage; (b) **2026-09-21 NGS profile deep-dive** — GSE's current tracking source is NGS chips, which need no ReID; (c) multi-object tracking appears nowhere else in the in-depth reads. Status: **new capability, conditional** — it enables (does not duplicate) a future video-tracking lane; it has zero application in the current chip-based stack.

## 11. GSE implementation spec
- **Placement:** in the NGS-replacement video pipeline: detector (YOLOX fine-tuned on NFL broadcast frames) → online tracker (ByteTrack or Deep-EIoU) → **GTA refinement** (this paper's code, adapted) → field-coordinate projection → play segmentation → analytics. GTA is the cheapest high-leverage component: plug-and-play, no training, +4 to +10 HOTA points in the paper's sports.
- **Adaptations needed:** (1) re-derive the spatial gate (Eqs. 2–4) in field coordinates via field registration, since broadcast cameras move; (2) retrain OSNet (or a stronger ReID backbone) on NFL crops — jersey numbers are the discriminative signal, so train with number-visibility augmentation; (3) tune s, ε, k, α, β on NFL broadcast validation clips (start from the paper's values); (4) handle camera cuts by resetting temporal adjacency at cut boundaries.
- **Effort:** ~1 engineer-week to integrate the open repo on a labeled NFL validation set; 2–3 weeks for the ReID retrain + field-coordinate spatial gate. Do this only inside the NGS-replacement lane, gated on that lane being active.

## 12. Reproducible test
Dataset: 20 labeled NFL broadcast game segments (All-22 preferred — fixed camera, matching the paper's spatial assumptions; broadcast as the stretch goal), with per-player track IDs, game-disjoint from any ReID training data. Pipeline: YOLOX + ByteTrack → GTA (paper hyperparameters) → HOTA/IDF1/IDs vs. ByteTrack alone. Baseline: ByteTrack without refinement. Runnable: requires building the NFL validation set (the one real cost); the model side needs no training.

## 13. Acceptance / rejection gate
**Adopt GTA into the NGS-replacement tracking pipeline if** it improves HOTA by ≥3 points and reduces ID switches by ≥15% on the All-22 validation set with the paper's default hyperparameters; **reject if** it fails either, or if the gains vanish once the spatial gate is re-derived in field coordinates (the honest version of the paper's fixed-camera assumption). Do not adopt for the current NGS-chip stack under any numbers — there is no tracklet problem there.

## 14. Improvement experiment
Beyond the paper: **jersey-number-aware ReID for the connector.** The paper's ReID treats appearance holistically; for NFL, fine-tune the embedding model with an auxiliary jersey-number classification head (multi-task: identity embedding + number OCR), so the distance matrix (Eq. 1) separates teammates by number rather than kit color. Test: connector HOTA/IDs on broadcast (moving-camera) clips with the field-coordinate spatial gate, comparing number-aware vs. vanilla OSNet embeddings. Hypothesis: most residual ID switches after GTA are same-team confusions, and number supervision cuts them disproportionately — the experiment that makes video tracking actually viable for NFL's 22-near-identical-athletes problem.
