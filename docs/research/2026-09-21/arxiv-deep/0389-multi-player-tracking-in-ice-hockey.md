# [0389] Multi Player Tracking in Ice Hockey with Homographic Projections (arXiv:2405.13397v1)

**Citation:** Harish Prakash, Jia Cheng Shang, Ken M. Nsiempba, Yuhao Chen, David A. Clausi, John S. Zelek (2024). *Multi Player Tracking in Ice Hockey with Homographic Projections*. arXiv:2405.13397v1. URL: https://arxiv.org/abs/2405.13397v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3361 lines).
**Verdict:** ADAPT — the homography-footpoint + graph-MPN association pipeline is a portable way to derive clean positional tracklets from monocular broadcast footage; GSE should adapt the concept to football-field geometry (not adopt the hockey-trained model) for generating tracking-like data where NGS/All-22 is unavailable, pending legal review of broadcast-footage processing.

## 1. Research question
Given only a monocular broadcast feed, can multi-object tracking (MOT) declutter occluded players and track their movements with high fidelity? The paper proposes formulating ice hockey MOT as a bipartite graph matching problem infused with homography: mapping player foot keypoints to an overhead rink template and encoding the projected positions into a graph network so that overlapping players in broadcast view become spatially separable in the top-down view. (Abstract, §I)

## 2. Dataset / schema
Two datasets (§IV-A):
- **Broadcast Tracking Dataset [Vats et al. 19]:** 84 broadcast clips sampled from 25 NHL games, ~36 s average per clip, 1280×720p at 30 fps, train:validation:test split of 58:13:13. Annotations: frame ID, player ID, bounding box {x, y, wd, ht}, annotation confidence, homography footpoint coordinates {x^proj, y^proj}.
- **VIP-HTD [51] (public benchmark):** 22 broadcast hockey clips from 8 NHL games, 30 and 60 Hz frame rates, 1280×720p. Used only for cross-dataset validation: model trained on the broadcast dataset, tested on all 7 test clips of VIP-HTD. 13,011 frames in the reported test evaluation.
- Homography footpoints were generated with the off-the-shelf "Rink-agnostic hockey rink registration" model [22], pre-trained on an NHL top-view rink template.

## 3. Method / model
**Pipeline (§III):** tracking-by-detection. Faster R-CNN [25] for detections (ground-truth annotations also evaluated). Each frame is a bipartite graph; nodes = players, edges = candidate associations to nodes in the adjacent frame.
- **Node features (§III-A):** concatenation of frame ID, 512-D OSNet [48] ReID appearance vector (ImageNet pre-trained), and 2-D homographic footpoint projection p_i = H_i(f_l, f_r) where footpoint = bottom-mid of bounding box (f_l = x_i + wd_i/2, f_r = y_i + ht_i), projected via a 3×3 homography H estimated by the off-the-shelf rink registration model [22].
- **Edge features (Eq. 3–4):** Δr^id_ij = [‖r^id_i − r^id_j‖_1, cosine_similarity(r^id_i, r^id_j)]; Δp_ij = [‖p_i − p_j‖_1, ‖p_i − p_j‖_2].
- **Temporal aggregation (§III-C):** the learned graph G^T_{t−1} is correlated with the next graph G_t to form G^T_t (Algorithm 1, `w = 2` window per algorithm pseudo-code).
- **Message passing (§III-D):** standard MPN [23, 24]: node init h^(0)_{v_i} = f^{FE}_v([r^{id}_{v_i}, p_{v_i}]), edge init h^(0)_{e_ij} = f^{FE}_e([Δr^{id}_{e_ij}, Δp_{e_ij}]); L = 6 edge updates (Eq. 8) and node updates (Eq. 9) with separate FC+GELU MLPs (Table I: node-FE 515→128, edge-FE 4→8, node-ME 38→64→64→32, edge-ME 70→32→32→6, classifier 6→4→FC+Sigmoid→1).
- **Training:** sigmoid focal loss [50] summed over L iterations (Eq. 13), Adam [53] no weight decay, LR 0.01 with 10-epoch warmup then cosine annealing (min LR 0.001), 30 epochs, batch size 16, one NVIDIA RTX 4090 (24 GB), validation every 2 epochs.
- **Inference post-processing (§III-E):** prune edges below ξ = 0.9, resolve many-to-one violations, assign tracklet IDs by connected components (Eq. 11–12).

## 4. Equations & assumptions
Key equations quoted faithfully from the paper:
- (1) r^id_i = ReID(b_i|_crop): OSNet ReID features from the cropped bounding box.
- (2) p_i = H_i(f_l, f_r): footpoint projection via homography.
- (3) Δr^id_ij = [‖r^id_i − r^id_j‖_1, cosine_similarity(r^id_i, r^id_j)].
- (4) Δp_ij = [‖p_i − p_j‖_1, ‖p_i − p_j‖_2].
- (5) p_i = s[P'_x, P'_y, 1]^T = H[P_{f_x}, P_{f_y}, 1]^T with H = [[h_11,h_12,h_13],[h_21,h_22,h_23],[h_31,h_32,1]].
- (6–7) Node/edge initialization MLPs.
- (8–9) MPN edge and node updates.
- (10) ŷ_{e_ij} = f^{cls}(h_{e_ij}) — link-prediction classifier.
- (11) Pruning threshold ξ = 0.9; (12) tracklet ID assignment.
- (13) Focal loss over L iterations; (14) binary ground-truth indicator.
- (15) MOTA = 1 − Σ_t(FN_t + FP_t + IDsw_t) / Σ_t GT_t; (16) IDF1 = 2·TP_id / ((2·TP_id) + FP_id + FN_id).
Stated assumptions: foot keypoint (bottom-mid of bounding box) represents the player's point of contact with the ice; camera parameters of broadcast feeds are unknown, so H must come from a learned rink-registration model; homography to a flat plane is valid (ice is planar); at most one connection per node pair (bipartite uniqueness).

## 5. Features / target
- Input features: bounding boxes (from Faster R-CNN or ground truth), OSNet 512-D ReID embeddings, homography-projected 2-D footpoints; derived edge features (appearance distances, positional distances).
- Target: binary edge labels y_{e_ij} = 1 if v_i = v_j (same player identity across consecutive frames), else 0 (Eq. 14). No prediction horizon beyond frame-to-frame association (online association of a `w = 2` window, though the paper frames the graph as reasoning over the sequence).

## 6. Validation design
- Train/validation/test: 58/13/13 clip split of the 84-clip broadcast dataset, same scheme as the SOTA benchmark [19] for direct comparison; metrics computed on the 13 test videos (14,337 frames).
- Two evaluation regimes: ground-truth detections († rows) and Faster R-CNN detections, matching [19]'s protocol. Metrics: MOTA (with detector-confounding caveat), plus IDF1 and IDsw as the primary association-quality metrics (§IV-C).
- Cross-dataset: trained-on-broadcast, tested-on-VIP-HTD (7 test clips, 13,011 frames, mixed 30/60 Hz).
- Baselines: SORT, DeepSORT, FairMOT, Tracktor, Hockey MOT [19] (reproduced by the authors on the same hardware for fairness).

## 7. Numerical results / baselines
**Broadcast dataset test set, ground-truth detections (Table II):** Ours† — IDsw = 151, IDF1 = 95.1%; benchmark Hockey MOT† [19] — IDsw = 1056, IDF1 = 71.8%. Paper claims: "a large 23.3% ↑ in IDF1 score, and 10× ↓ in IDsw" (§IV-D; the "23.3%" is the percentage-point difference 95.1 − 71.8; interpret as percentage points, not a relative gain).
**With Faster R-CNN detections (Table II):** Ours — MOTA 95.4%, FP 1924, FN 4323, IDsw 453, IDF1 71.3%; Hockey MOT [19] — MOTA 94.5%, FP 1653, FN 4394, IDsw 431, IDF1 62.9%. Paper claims 8.4 percentage-point IDF1 improvement over [19] with detector inputs. Note: with detections, their model incurs more IDsw (453) than the benchmark (431) — the headline IDsw improvement is from the ground-truth-detections regime (§IV-D).
**Cross-dataset VIP-HTD (Table III):** Ours — 60 total IDsw, mean IDF1 92.84%; Hockey MOT — 787 IDsw, mean IDF1 80.2% (e.g., PIT vs SJ: 7 IDsw/97.4 IDF1 for ours vs 164/70.1).
**Ablations (Supp. Table IV):** on 13 test videos, appearance-only vs appearance+homography: e.g., video 1: 31→8 IDsw, 94.8→95.7 IDF1; video 5: 53→13 IDsw, 89.2→97.5; homography consistently reduces IDsw and raises IDF1.
**Message-passing depth (Supp. Table V, one random sequence):** L=2: IDsw 173, IDF1 85.5; L=4: 51/93.4; L=6: 27/94.1 (chosen); L=8: 34/92.2; L=10: 42/84.7; L=12: 107/67.4; L=14: 388/43.3 — sharp degradation beyond L=6 (overfitting).

## 8. Code / data availability
None stated. No GitHub/code URL appears in the text; the VIP-HTD dataset [51] is described as public ("Vip-htd: A public benchmark for multi-player tracking in ice hockey", 2024), but no download link is given in this paper. Off-the-shelf components named: homography model [22] "Rink-agnostic hockey rink registration", OSNet [48], Faster R-CNN [25].

## 9. Leakage & limitations
- Training uses ground-truth annotations including player IDs; the headline results (151 IDsw, 95.1 IDF1) are in the ground-truth-detections regime, which removes detector noise and flatters association quality. With real detections, the IDsw edge over the benchmark disappears (453 vs 431) — the method wins on IDF1 consistency but not on raw identity switches under real detector noise.
- Homography quality is inherited from the off-the-shelf model [22]; footpoint = bottom-mid of bounding box is a crude proxy that fails when players are airborne, fallen, or occluded at the bottom of the frame — errors here propagate into node features uncorrected.
- Small evaluation scale: 13 test clips, one sport (ice hockey), and cross-dataset on 7 clips — external validity to American football (bigger players, pile-ups, different occlusion regime) is untested.
- Hockey players wear bulk gear with similar team colors; the paper notes ReID ambiguity. NFL jerseys have numbers — a football adaptation could add jersey-number OCR as a node feature, which this pipeline doesn't consider.
- Adversarial note: Table VI compares their model against the benchmark only on ground-truth annotations ("± denotes current sota benchmark results"); detector-based video-wise comparison is absent.
- For GSE specifically: building this requires processing NFL broadcast footage — the NFL is the most aggressive rights enforcer in sports (per GSE's own enforcement research). Legal review is a hard precondition, not an afterthought.

## 10. GSE overlap
New capability — no duplication. The existing-research map covers: the NGS metric taxonomy (2026-09-21, 27 families — consumption of tracking data, not generation), the STRAIN pass-rush tracking paper (2305.10262), and NGS replacement spec (2026-09-18 — "build equivalents from public data"). GSE currently consumes nflverse/FTN/NGS tracking data; it has no in-repo broadcast-video→tracking pipeline. This paper's transferable asset is the *methodology* (homography footpoint projection + bipartite-graph MPN association for decluttering occlusions), not the hockey-specific artifact. Overlap is conceptual only: it sits adjacent to the NGS replacement spec's intent but addresses the video side, not the public-data side.

## 11. GSE implementation spec
Concrete adaptation plan (hockey model is not directly usable; adapt the architecture to football):
1. **Homography module:** train or license an NFL-field registration model (analogous to the paper's [22]) that maps broadcast frames to a top-down field template using field markings (yard lines, hash marks) as correspondences. Deliverable: per-frame 3×3 H and per-player footpoints in field coordinates.
2. **Detection:** fine-tune a detector (Faster R-CNN or YOLO variant) on football broadcast frames; consider jersey-number OCR as an extra node feature (NFL advantage over hockey).
3. **Association:** replicate the paper's bipartite-graph MPN: nodes = 512-D appearance (or a lighter embedding) + 2-D homography footpoints; edges = relative appearance/positional distances; L = 6 message-passing steps; focal-loss training; ξ = 0.9 pruning; connected-component ID assignment.
4. **Training data:** need an annotated football broadcast-tracking dataset (NFL broadcast clips with per-frame player boxes + identities) — no public equivalent of VIP-HTD exists for NFL; this is the project's gating dependency (budget for in-house annotation of ~80–100 clips).
5. **Serving:** offline batch pipeline (not real-time): ingest game footage → tracklets → bird's-eye positional trajectories → feed into GSE's tracking-data consumers (NGS replacements, CFB games without tracking data).
Estimated effort: 6–10 engineer-weeks for a prototype (excluding annotation), blocked on legal review of NFL broadcast-footage processing rights and on annotated training data.

## 12. Reproducible test
Reproduce the paper's core claim on public data before any GSE build: implement the graph-MPN association head (their Table I architecture, L=6, focal loss, ξ=0.9 pruning) and train on the broadcast hockey dataset with homography features from the [22] rink-registration model (obtainable from that paper's artifacts), then evaluate on the VIP-HTD 7 test clips. Dataset: VIP-HTD public benchmark (13,011 test frames). Metric: IDF1 and IDsw vs the Hockey MOT [19] baseline (787 IDsw / 80.2 mean IDF1 on VIP-HTD). Success: reproduce IDF1 ≥ 90 and IDsw ≤ 100 with homography features, and confirm the appearance-only ablation underperforms — validating that the *concept* (homography + graph association) transfers, before investing in football geometry.

## 13. Acceptance / rejection gate
ADOPT the football adaptation only if ALL hold: (a) legal review clears processing of broadcast footage for the target sport/league (NFL excluded unless licensed — CFB or other leagues first); (b) a reproduction of the homography+MPN concept on public hockey data achieves IDF1 ≥ 90 with ≥5 percentage-point gain over the appearance-only ablation (confirming the mechanism, not the hockey artifact); (c) an annotated football pilot set (≥10 games of broadcast clips) yields IDsw per game below a SORT-on-broadcast baseline by ≥50%. Reject otherwise — especially if legal review fails, since that is a hard stop.

## 14. Improvement experiment
Two concrete improvements beyond the paper: (1) **Jersey-number OCR as a node feature** — football's numbered jerseys give a near-deterministic identity signal unavailable in hockey; concatenate a number-embedding to node features and re-run the L=6 MPN; expect the focal-loss classifier to approach the ground-truth-detection regime even with noisy detections, collapsing the detector-vs-ground-truth performance gap the paper suffers. (2) **Camera-motion-compensated homography refinement** — the paper uses per-frame independent homography estimates; add a temporal smoothing term (Kalman filter on the H matrix sequence, or joint optimization over a clip) so pan/tilt/zoom jitter doesn't inject noise into footpoint trajectories; test on fast-panning football broadcast sequences where the paper's per-frame approach would jitter most.
