# [0345] BasketLiDAR: The First LiDAR-Camera Multimodal Dataset for Professional Basketball MOT (arXiv:2508.15299v1)

**Citation:** Ryunosuke Hayashi, Kohei Torimi, Rokuto Nagata, Kazuma Ikeda, Ozora Sako, Taichi Nakamura, Masaki Tani, Yoshimitsu Aoki, Kentaro Yoshioka (2026). *BasketLiDAR: The First LiDAR-Camera Multimodal Dataset for Professional Basketball MOT*. arXiv:2508.15299v1. URL: https://arxiv.org/abs/2508.15299v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,839 lines).
**Verdict:** ADAPT — the dataset is basketball/indoor and the fusion gains are confounded, but the occlusion-triggered LiDAR→camera ReID-repair pattern is a portable design for any multi-sensor player-tracking stack; adopt the pattern, not the paper's specific pipeline or numbers.

## 1. Research question
Can LiDAR point clouds fused with camera imagery improve multi-object tracking (MOT) of professional basketball players under heavy occlusion, and what does the first synchronized LiDAR-camera basketball dataset look like? The paper releases BasketLiDAR and proposes two pipelines: LiDAR-only tracking (BEV projection + YOLOv11 + ByteTrack) and a fusion method that detects ID-switch-inducing occlusions from LiDAR track counts and repairs identities with camera-based ReID.

## 2. Dataset / schema
- **BasketLiDAR:** 4,445 frames, 397,757 bounding boxes, 3,105 IDs, 34 sequences (average 13.1 s each); professional B.League players; 5v5 and 3v3 games over two days.
- Sensors: three synchronized camera/LiDAR units at 10 fps. Camera: 4K, FOV 95°×78°, F2.6. LiDAR: Livox HAP — 0.18°×0.23° angular resolution, 144 lines, 452k pts/s, FOV 125°×25°, 150 m range.
- Split: 24 clips train / 10 clips test, difficulty-balanced.
- Access: "available upon request" at https://sites.google.com/keio.jp/keio-csg/projects/basket-lidar — the paper simultaneously promises future open-sourcing; as of the paper, access is gated, not open.

## 3. Method / model
LiDAR-only: calibrated multi-LiDAR point-cloud merge → court/height filtering → bird's-eye-view (BEV) projection → YOLOv11 detection on BEV → ByteTrack association. Fusion: monitor the active-ID count from LiDAR tracking; when it drops (occlusion signature), select clean pre/post-occlusion camera crops by projecting BEV voxels into camera views, extract ResNet-50 (Market1501-trained) ReID embeddings, and repair the switched IDs by cosine similarity. Camera-only baseline: detection + triangulation pipeline. All pipelines share the YOLO detector family but use different trackers/association logic.

## 4. Equations & assumptions
- Recovery rate: \(R_{ID} = N_{re}/N_{dis}\) (recovered IDs over disappeared IDs).
- ReID repair: cosine similarity between ResNet-50 Market1501 embeddings of pre/post-occlusion crops.
- Occlusion trigger: drop in active-ID count from the LiDAR tracker.
- Assumptions: (1) ID-count drops reliably signal occlusion (not detection failure); (2) pre/post-occlusion crops selected via BEV-voxel projection are "clean"; (3) Market1501 person-ReID embeddings transfer to basketball uniforms; (4) 10 fps is sufficient for tracking fast breaks.

## 5. Features / target
Input features: synchronized LiDAR point clouds (3 units) + 4K camera frames. Target: multi-object tracking — per-frame bounding boxes with persistent player IDs. Metrics: HOTA, IDF1, AssA, MOTA, DetA, fps; plus the recovery-rate metric R_ID.

## 6. Validation design
24 train / 10 test clips, difficulty-balanced. Metrics are standard MOT metrics (HOTA etc.) plus R_ID. Baselines: LiDAR-only, camera-only, fusion — but the three pipelines differ in tracker/association logic, not just sensor input, so sensor-attribution is confounded. Test set is tiny (10 short clips). Timing measured in ms/frame per pipeline stage.

## 7. Numerical results / baselines
- Overall — Fusion: **HOTA .917, IDF1 .930, AssA .881, MOTA .957, DetA .955, 6.34 fps**; LiDAR-only: **.917, .918, .877, .957, .955, 28.4 fps**; Camera-only: **.831, .868, .810, .842, .853, .218 fps**.
- Note: fusion and LiDAR-only are nearly identical on headline metrics (HOTA .917 both; MOTA .957 both) — the fusion gain shows up in association (IDF1 .930 vs .918, AssA .881 vs .877) and in the recovery rate: \(R_{ID}\) fusion **0.241** vs LiDAR-only **0.158**.
- Timing (ms/frame): camera detection+tracking 628.0 + triangulation 3954.5 = **4582.5** total; LiDAR-only **35.2**; fusion **157.8** (including 122.6 for ReID).
- So LiDAR-only runs at 28.4 fps with near-fusion accuracy; the camera pipeline is the bottleneck (0.218 fps); fusion costs 4.5× the LiDAR-only latency for a modest association gain.

## 8. Code / data availability
Data "available upon request" (https://sites.google.com/keio.jp/keio-csg/projects/basket-lidar); open-source release promised but not delivered as of the paper. Code: not stated (None stated).

## 9. Leakage & limitations
- **Confounded attribution:** the three pipelines use different trackers/association logic, so the fusion-vs-LiDAR-only comparison does not isolate the sensor contribution. The near-identical HOTA/MOTA (.917/.957 both) suggests most of the performance comes from the LiDAR+BEV+ByteTrack stack, not the fusion.
- **Tiny test set:** 10 clips averaging 13.1 s — the R_ID gain (0.241 vs 0.158) rests on a small number of occlusion events; no confidence intervals.
- **Gated data:** "upon request" plus a future-open-source promise — reproducibility is limited today.
- **Hardware specificity:** three fixed Livox HAP units around an indoor court; NFL stadiums are orders of magnitude larger, outdoor, with different occlusion geometry — the sensor geometry does not transfer.
- **10 fps** sampling misses fast basketball motion, let alone NFL-speed collisions; ReID embeddings from Market1501 (pedestrian) on basketball uniforms is an unvalidated transfer.
- The occlusion trigger (ID-count drop) cannot distinguish occlusion from detection failure — false triggers waste the 122.6 ms ReID budget.
- NFL external validity: indoor 5v5/3v3 basketball at 10 fps does not establish sideline/stadium transfer; NFL already has NGS tracking, so the marginal value of a LiDAR stack is unclear.

## 10. GSE overlap
Per the existing-research map: GSE's tracking lane is built on NGS tracking data (27-family taxonomy, NGS replacement spec `docs/research/2026-09-18-ngs-replacement-spec.md`) — GSE consumes tracking, it does not build tracking stacks. Multi-sensor fusion for player tracking is a **new capability** (upstream perception), not a duplicate. The portable insight is the occlusion-triggered repair pattern, not the basketball dataset.

## 11. GSE implementation spec
- **Purpose:** a design pattern for GSE's film-analysis tooling — when (not if) GSE builds or buys a video-based player-tracking layer to supplement NGS (e.g., for college film where NGS is unavailable), use the paper's occlusion-triggered repair architecture.
- Data: GSE college/broadcast film with occlusions; no LiDAR needed — adapt the pattern to camera-only multi-view (broadcast + All-22): primary tracker on the wide view, occlusion trigger on track-count drops, ReID repair from the alternate view.
- Model: detector (YOLO-family) + ByteTrack primary; ResNet-50/Market1501-style ReID head for repair; keep the paper's cost accounting (repair only on trigger, not per frame).
- Serving: offline batch on film ingest; repair module runs only on flagged occlusion events to bound compute.
- Estimated effort: 4–6 engineer-weeks for the trigger+repair module on top of an existing detection/tracking stack; the full LiDAR stack is NOT recommended for GSE (cost, stadium logistics, and NGS already covers the NFL).

## 12. Reproducible test
Dataset: 50 college-football plays with broadcast + All-22 synchronized film and hand-verified player IDs through occlusion events (pile-ups, line-of-scrimmage congestion). Metric: IDF1 and ID-switch count for (a) single-view ByteTrack baseline vs. (b) baseline + occlusion-triggered cross-view ReID repair. Window: one film batch, offline. Success = fewer ID switches at acceptable latency overhead.

## 13. Acceptance / rejection gate
**Adopt** the repair pattern if on the 50-play occlusion test it reduces ID switches by ≥30% vs. the single-view baseline with per-play latency overhead ≤2× the baseline pipeline. **Reject** if ID-switch reduction <30%, if the trigger fires on >20% of non-occluded frames (false-trigger waste), or if ReID repair accuracy on football uniforms (vs. Market1501 pedestrians) is <80% — the paper's ReID transfer is unvalidated and this is where it likely breaks.

## 14. Improvement experiment
Replace the paper's crude ID-count-drop trigger with a learned occlusion predictor: train a lightweight classifier on tracklet features (velocity discontinuity, bounding-box overlap spike, appearance-embedding drift) to predict imminent ID switches one second ahead, and pre-emptively cache clean crops for repair. Test whether predictive (vs. reactive) triggering raises R_ID above the paper's 0.241 while cutting false triggers — turning the paper's reactive repair into a proactive one.
