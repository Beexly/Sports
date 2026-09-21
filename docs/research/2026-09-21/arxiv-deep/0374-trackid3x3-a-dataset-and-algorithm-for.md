# [0374] TrackID3x3: A Dataset and Algorithm for Multi-Player Tracking with Identification and Pose Estimation in 3x3 Basketball Full-court Videos (arXiv:2503.18282v2)

**Citation:** Qingrui Hu, Li Yin, Kazuhiro Yamada, Ning Ding, Shunsuke Iwashita, Jun Ichikawa, Kiwamu Kotani, Calvin Yeung, Keisuke Fujii (2025). *TrackID3x3: A Dataset and Algorithm for Multi-Player Tracking with Identification and Pose Estimation in 3x3 Basketball Full-court Videos*. arXiv:2503.18282v2. URL: https://arxiv.org/abs/2503.18282
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1916 lines).
**Verdict:** REJECT for GSE implementation — 3x3 basketball with 6 players and no football transfer path; bank only the TI-HOTA metric design notes as a possible template for evaluating any future GSE video-tracking lane.

## 1. Research question
Can multi-player tracking with identification and 2D pose estimation be fully automated from simple fixed-camera footage (smartphone/consumer/drone) in 3x3 basketball — a reduced-occlusion setting proposed as a stepping stone toward automated analytics in less-mainstream sports — and can a public dataset + benchmark (TrackID3x3, the Track-ID task, the TI-HOTA metric) establish that foundation?

## 2. Dataset / schema
- **TrackID3x3 (155,797 frames total, released at https://github.com/open-starlab/TrackID3x3 — dataset + code, stated in abstract):**
  - Indoor: 7,531 frames, 45,186 bboxes, 2,601 pose frames; university gymnasium (9.50×15.05 m court), Sony HDR-CX680 (1280×720), 42 videos, 6 female university players, fixed roles/offense-defense assignments (ball handler #1 fixed; no jersey numbers on bibs).
  - Outdoor: 143,276 frames, 859,656 bboxes, 3,600 pose frames; iPhone 13 (3840×2160), 12 videos, 14 male players / 4 teams (green, purple, pink, yellow bibs), double round-robin, 5-min games, official FIBA 3x3 rules; court 11.05×15.05 m.
  - Drone: 4,999 frames (from 92 min), 29,994 bboxes, 500 pose frames; DJI Air 2S (3840×2160), 16 male players / 4 teams (black/white bibs); field info NOT annotated (wind-induced drift).
- Pose schema: 10 keypoints per player (head, shoulders, elbows, wrists, ankles, hip-midpoint center) — reduced from COCO-17; 6,701 pose frames total. Field keypoints annotated for Indoor/Outdoor only. Written informed consent; ethics approvals (Nagoya University, Ryutsu Keizai University, Anhui Normal University).

## 3. Method / model
- **Track-ID task:** simplified game-state reconstruction for fixed cameras (no field detection, no referees, max 6 detections/frame). Indoor identification = (team ∈ {offense, defense}, initial_position ∈ {top, left, right}) (Eq. 1); Outdoor = (team, jersey_number) (Eq. 2); localization = court_x, court_y from homography of manually annotated court keypoints (bbox bottom-edge midpoint).
- **Baseline pipeline:** BoT-SORT-ReID (pre-trained YOLOX, no fine-tuning) → homography to court coords → rule-based on-court classification (Indoor: 1-m virtual court line margin, cap at 6 by distance to end line; Outdoor: drop detections never in-court >10 consecutive frames) → appearance features: Detectron2 segmentation + temporal-median 8×8×8 color histograms (Indoor) or jersey-number recognition (Koshkina & Elder 2024) + torso color histograms (Outdoor) → tracklet integration via Jensen-Shannon divergence of histograms → team assignment from opening-frame geometry (Indoor: closest pairs, nearer-to-endline-midpoint = defense) or from first offensive tracklet + histogram similarity (Outdoor).
- **Metric:** TI-HOTA = (1/19) Σ_{α∈{0.05,…,0.95}} √(DetA_α × AssA_α) (Eq. 3–6); similarity Sim = LocSim × IdSim, LocSim = exp(ln(0.05)·‖P−G‖²/τ²) (Eq. 8), IdSim = 1 iff all ID attributes match else 0 (Eq. 9); τ = 0.5 m.
- **Drone tracking baselines:** ByteTrack vs BoT-SORT-ReID, standard HOTA + FN/FP/ID switches. **Pose baselines:** RTMPose, HRNet, SwinPose (top-down, no fine-tuning), PDJ at 0.5 threshold normalized by torso diameter, plus AUC of PDJ curve (0–0.5, max 0.5).

## 4. Equations & assumptions
- Indoor: d_i^t = {court_x, court_y; team, initial_position}. (Eq. 1)
- Outdoor: d_i^t = {court_x, court_y; team, jersey_number}. (Eq. 2)
- TI-HOTA = (1/19) Σ √(DetA_α × AssA_α); DetA = |TP|/(|TP|+|FP|+|FN|); AssA = (1/|TP|) Σ_c A(c); A(c) = |TPA|/(|TPA|+|FPA|+|FNA|). (Eq. 3–6)
- Sim_{TI-HOTA}(P,G) = LocSim(P,G) × IdSim(P,G). (Eq. 7)
- LocSim(P,G) = e^{ln(0.05) ‖P−G‖²/τ²}; IdSim = 1 if all attributes match else 0. (Eq. 8–9)
- Stated assumptions: fixed camera (manual single-image court annotation); max 6 on-court players; referees excludable (3x3-specific); bbox bottom-midpoint ≈ player position (authors admit this is not robust to arm/leg movement); color histograms sufficient for ReID (chosen for compute cost over deep features).

## 5. Features / target
Input: fixed-camera RGB video (720p–4K). Targets: per-frame (court_x, court_y, team, initial_position or jersey_number) for ≤6 players; 10-joint 2D pose on annotated frames. Horizons: Indoor clips ~179 frames, Outdoor segments ~1,203 frames.

## 6. Validation design
- Track-ID: in-play frames only (Indoor all frames; Outdoor split into check-ball vs free-throw segments); TI-HOTA at τ=0.5 m reported as mean±SD over videos; sub-scores DetA/AssA/FN/FP.
- Drone: 4 four sequences, manual filtering of non-players, default-parameter ByteTrack vs BoT-SORT-ReID.
- Pose: PDJ (threshold 0.5, torso-normalized) and AUC across all three subsets; COCO-17 outputs reduced to the 10 annotated joints. No train/test ML splits (off-the-shelf models, no fine-tuning).

## 7. Numerical results / baselines
- Track-ID (Table 3, mean±SD at τ=0.5): Indoor — TI-HOTA 80.75±13.16, DetA 79.46±14.42, AssA 82.11±11.88, FN 155.81±140.10, FP 133.81±135.11 (video length 8.98±3.24 s); Outdoor — TI-HOTA 46.11±20.55, DetA 42.94±20.87, AssA 49.81±20.54, FN 3695.74±4280.34, FP 3558.19±4154.12 (video length 40.11±34.23 s). Paper's explanation: Indoor wins via shorter videos + easier attributes; ID switches in tracking cascade into DetA failure for the rest of the video.
- Drone (Table 4): ByteTrack HOTA 47.92±5.98, FN 211.25, FP 28.25, IDs 19.75±4.92; BoT-SORT-ReID HOTA 50.64±3.03, FN 214.75, FP 19.5, IDs 15.5±1.91 — ReID reduces ID switches but "considerable room" remains due to occlusions.
- Pose (Table 5, mean PDJ / AUC): Outdoor — RTMPose 89.43%/45.12% (best), HRNet 88.51%/45.21%, SwinPose 89.27%/45.03%; Drone — RTMPose 83.45%/42.07%, HRNet 84.07%/42.38% (best), SwinPose 83.88%/42.28%; Indoor — RTMPose 73.28%/36.90% (best), HRNet 77.26%/36.06%, SwinPose 71.21%/35.86%. Indoor is worst: paper attributes to 720p resolution and head keypoints annotated on the forehead (not nose) inflating error. RTMPose Outdoor 89.43% "highly comparable" to 89.51% reported in AutoSoccerPose. Stable joints: ankles, shoulders, center; weak: elbows, wrists (occlusion, motion blur).

## 8. Code / data availability
Stated: "Dataset and code will be available at https://github.com/open-starlab/TrackID3x3" (abstract). Note: the org is open-starlab — same group as the OpenSTARLab soccer paper (0377 in this wave); worth cross-referencing.

## 9. Leakage & limitations
- Indoor roles were *fixed by experimental design* (ball handler fixed, start positions assigned) — identification is partly a memorization of the protocol, not a general solution; Outdoor needed real jersey-number recognition and collapsed to 46.11 TI-HOTA.
- Enormous variance: Outdoor FP 3558±4154, FN 3695±4280 — the mean is barely informative; some games fail catastrophically.
- Manual court localization and manual non-player filtering in the Drone evaluation — not a fully automated pipeline despite the framing.
- No fine-tuning of any model — all baselines are off-the-shelf, so this benchmarks transfer, not the state of the art for this data.
- Bbox bottom-midpoint position is admitted fragile (limb movement); authors suggest pose-informed positions as future work.
- Head annotation inconsistency (forehead vs nose) between subsets is a dataset defect the authors disclose.
- External validity to NFL: none. 6 players, half-court, fixed camera, 720p–4K, basketball kinematics. No transfer path to 22-player broadcast football.

## 10. GSE overlap
No overlap — new domain, and correctly so: GSE has no basketball tracking lane and no video-tracking lane at all. The open-starlab org connection to paper 0377 (OpenSTARLab soccer) is the only cross-reference worth noting. The TI-HOTA construction (LocSim × all-attributes-match IdSim) is a reasonable evaluation template if GSE ever scores a video-tracking prototype — file it as a metric note, not an implementation.

## 11. GSE implementation spec
Do not implement. If GSE ever builds fixed-camera tracking (e.g., practice-film analysis): the portable components are (a) the TI-HOTA metric with τ scaled to football (τ ≈ 1.0 m given field scale), and (b) the tracklet-integration-via-histogram-similarity trick for jersey-number-less settings. Effort to port the metric: <1 day. Full pipeline port: not applicable (basketball-specific geometry).

## 12. Reproducible test
Download from https://github.com/open-starlab/TrackID3x3; verify the Indoor Track-ID result by running their released code (if code is actually present) and checking TI-HOTA lands within ±5 pp of 80.75 at τ=0.5; verify pose PDJ on Outdoor RTMPose within ±1 pp of 89.43. If the repo is empty (common for "will be available"), mark the dataset claim unverified.

## 13. Acceptance / rejection gate
REJECT as a GSE build — no football content, no transferable model. The only adoptable artifact is the TI-HOTA metric definition, and only if a future GSE video lane needs a tracking+ID evaluation score.

## 14. Improvement experiment
The paper's biggest admitted weakness (bbox bottom-midpoint positions) suggests the fix: replace bottom-midpoint with the pose-estimated hip-midpoint ("center" keypoint) projected via the same homography, and re-run the Track-ID evaluation — test whether TI-HOTA improves on Outdoor (46.11) where arm/leg motion is largest. This directly tests the authors' own future-work hypothesis with zero new data.
