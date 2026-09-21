# [0359] Enhancing Sports Strategy with Video Analytics and Data Mining: Automated Video-Based Analytics Framework for Tennis Doubles (arXiv:2507.02906)

**Citation:** Chen Jia Wei (2025). *Enhancing Sports Strategy with Video Analytics and Data Mining: Automated Video-Based Analytics Framework for Tennis Doubles*. arXiv:2507.02906. URL: https://arxiv.org/abs/2507.02906
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1431 lines).
**Verdict:** ADAPT — the annotation-tool + taxonomy + transfer-learning CNN pipeline is a working blueprint for a GSE "labelling factory" for tracking-style data, but the tennis-doubles results themselves do not transfer to football.

## 1. Research question
How to build a comprehensive video-based analytics framework for tennis doubles — a strategically complex, multi-player sport with no standardised annotation methodology — covering a doubles-specific annotation taxonomy, an intuitive labelling tool (manual + semi-automated), and automated CV models (player detection/tracking, pose estimation, shot-type/formation/outcome classification) that progressively reduce manual annotation effort.

## 2. Dataset / schema
- **Source videos:** 8 doubles matches, two strata: (a) 4 professional matches from YouTube (Granollers/Zeballos vs Arevalo/Rojer Toronto 2023 SF; Kyrgios/Kokkinakis vs Sock/Isner Indian Wells 2022; Ram/Salisbury vs Puetz/Venus Cincinnati 2022 F; Salisbury/Ram vs Krawietz/Puetz Toronto 2023 SF); (b) 4 semi-professional NCAA doubles videos obtained directly from the Louisiana State University (LSU) team (anonymised IDs).
- **Size:** ~2,055 annotated events total (Train/Val counts: 101, 110, 141, 251, 247, 243; Test: 88 professional + 177 NCAA). Held-out test videos: Salisbury_Ram vs Krawietz_Puetz Toronto 2023 SF (professional) and VUPKfQgXy8g (NCAA) — held out at the video level to avoid leakage.
- **Annotation schema (standardised framework, four categories):**
  - *Player information:* player description (P1–P4), dominant hand.
  - *Positional information:* net position; court position (Far Deuce, Far Advantage, Near Deuce, Near Advantage).
  - *Frame information:* player bounding boxes; pose estimations (17-keypoint YOLO-Pose skeleton).
  - *Rally information:* rally start/end frames; number of hitting moments; position of hitting player; per-hitting-moment labels: Shot Type (Serve, Second-Serve, Return, Volley, Lob, Smash, Swing), Shot Side (Forehand/Backhand), Shot Direction (serves: T/B/W; non-serves: CC/DL/II/IO), Formation (Conventional, I-Formation, Australian, Non-serve), Outcome (In, Win, Error).
- **Access:** self-labelled by the author + 2 collaborators; released initial dataset referenced but URL not given in the text (tool code: "Tennis Annotation Tool"; prediction code: https://github.com/jiaawe/tennis-prediction).

## 3. Method / model
Three layers:
1. **Annotation tool** (React/Vite/DaisyUI/Tailwind frontend, Flask + FFmpeg + PyTorch backend): pages for player annotation (bounding boxes, COCO format export), Training & Inference (GroundingDINO fine-tuning), rally analysis (net position, rally start/end, hitting-moment marking), label generation (Random/CNN/Gemini models), label confirmation (rule-based tennis validation). Non-functional requirements: <200 ms response, <0.5 s frame load, <5 min inference per 100 frames, <1 crash per 8 h. Optimisations: CNN model hot-loading (54 rallies: cold start 12 min 35 s vs hot-load 54 s inference), multi-threaded GroundingDINO frame extraction, async processing.
2. **Detection/tracking pipeline:** GroundingDINO zero-shot phrase grounding ("tennis player") → bounding boxes → YOLO-Pose per-box 2D keypoints, fine-tuned on 10–30 annotated frames per player via descriptive text prompts (e.g. "red-shirt tennis player"), enabling player identity disambiguation across rallies.
3. **Classification models (per hitting moment):** Single-Pose GCN (17-node skeleton graph of the hitting player), Double-Pose GCN (two parallel GCN backbones: hitting player + partner, or hitting player at impact and n=10 frames ahead), Single-Image CNN (ResNet-50 ImageNet pre-trained backbone, hitting player crop with 2× margin, 224×224, augmentation: random crops/horizontal flips/color jitter, class-weighted CrossEntropy, AdamW, differential LR: backbone 1e-5, head 1e-4, early stopping patience 20), Double-Image CNN (dual ResNet-50 backbones, 2048-d features concatenated, MLP 512 units + ReLU + dropout 0.3).

## 4. Equations & assumptions
- Single-Pose GCN propagation rule, stated explicitly:
  H^(l+1) = σ(D^(-1/2) A D^(-1/2) H^(l) W^(l)) (Eq. 4.1), with A = skeletal adjacency matrix, D = degree matrix, H^(l) = node features (17 nodes × (x, y, confidence)), W^(l) = learnable weights.
- MotionAGFormer 2D→3D (exploratory): input X ∈ R^(T×J×3) (T frames, J joints, x/y/confidence); multi-person extension X_m ∈ R^(T×4J×3); loss = position loss + velocity loss. Not integrated (too slow/distorted for far players).
- **Assumptions:** hitting-moment frame is correctly identified by the annotator; handedness rules map Court-Side-Direction combinations deterministically (right-handed: Ad-side backhand = CC/DL, forehand = II/IO, etc.); serve formation always Conventional/I-Formation/Australian, non-serves "Non-serve" formation; 10–30 labelled frames suffice to fine-tune GroundingDINO per player.

## 5. Features / target
- GCN features: 17 YOLO-Pose keypoints × (x, y, confidence) per hitting player (single) or per hitting player + partner / current + future (double).
- CNN features: raw pixels of the hitting-player bounding box (2× margin), 224×224.
- Targets (one classifier per label): shot side (backhand/forehand), shot type (serve vs non-serve; serve/second-serve/return/volley/lob/smash/swing), shot direction (T/B/W vs CC/DL/II/IO granularity variants), formation (conventional/I-formation/Australian), outcome (in/win/error).

## 6. Validation design
- **Split:** 70-30 train/validation within each event set, plus strict video-level holdout (2 full matches held out as test — one professional, one NCAA).
- **Metrics:** macro-averaged precision, recall, AUC (chosen for class imbalance, e.g. smash/lob rare); also accuracy. Tracking evaluation: per-player detection rate per frame (P1–P4) on two rallies (NCAA 952 frames, highlights 451 frames).
- **Baselines compared:** YOLOv11 + DeepSORT (tracking), Florence-2 Large (phrase grounding), YOLO-Pose alone, GCN variants vs CNN variants.

## 7. Numerical results / baselines
Tracking (Table 4.4, NCAA 952-frame rally): YOLOv11+DeepSORT — P1 100%, P2 95.6%, P3 43.4%, P4 0.1% (130 s); Florence-2 Large — P1 87.3%, P2 85.6%, P3 0.1%, P4 0.0% (2150 s); YOLO-Pose — P1 100%, P2 94.3%, P3 0.0%, P4 0.0% (170 s); **GroundingDINO + YOLO-Pose — P1 100%, P2 100%, P3 69.8%, P4 64.3% (1436 s)**, and only it supports player identification. On pro highlights (Table 4.5): GroundingDINO + YOLO-Pose P3 89.4%, P4 84.1%.
Classification (Pro / NCAA; key results):
- Side (backhand/forehand): Single-Pose GCN AUC 68.42%/70.22%; **Single-Image CNN accuracy 75.00%/70.06%, AUC 75.75%/71.82%**.
- Shot type serve-vs-non-serve: GCN AUC 42.72%/57.22% (worse than random on pro); **Single-Image CNN 100.00%/90.40% accuracy**.
- Shot type (all): Single-Image CNN accuracy 80.68%/75.71%, AUC 86.65%/83.11%.
- Shot direction (all): GCN 55.19%/45.86% AUC vs **Single-Image CNN 74.05%/73.75% AUC, Double-Image CNN 72.43%/70.98%**.
- Formation: Double-Pose GCN AUC 53.58%/48.51% vs **Double-Image CNN accuracy 94.28%/87.57%, AUC 99.25%/96.92%**.
- Outcome: Double-Pose GCN AUC 37.93%/54.27% vs Double-Image CNN AUC 69.41%/65.56%.
- Tool optimisation: CNN hot-loading — 54 rallies: cold start 12 min 35 s → hot-load 54 s inference (startup 20 s vs 5 s; GPU 3.2 GB vs 0.8 GB).
Paper's conclusion: transfer-learned CNNs beat pose-GCNs trained from scratch on a tiny dataset; single-image CNN used for side/type/direction, double-image CNN for formation/outcome.

## 8. Code / data availability
Prediction models: https://github.com/jiaawe/tennis-prediction. Tennis Annotation Tool source/demo links present in text but URLs not reproduced in extract ("Tennis Annotation Tool" hyperlinks). Dataset: initial labelled set referenced but no public URL given in the full text. No stated availability for the fine-tuned GroundingDINO models.

## 9. Leakage & limitations
- **Tiny dataset:** ~2,055 events across 8 videos; some labels (smash, lob, I-formation) have very few examples. Test set is only 2 videos (265 events). 100% serve-vs-nonserve accuracy on pro test is almost certainly small-sample luck on a trivial binary.
- **Manual hitting-moment frames:** the human annotator identifies the hitting moment, so models get the hard temporal-localisation problem solved for them — numbers overstate end-to-end automation.
- **Selection bias in videos:** pro data are YouTube *highlights*, not full matches — highlights over-represent rallies with dramatic outcomes, biasing outcome classification; far-player pose quality collapses in NCAA video (missing in up to 16% of frames for P4).
- **Direction/outcome are inherently weak:** single-image CNN can't capture outcome (AUC 56–62%), and direction remains poor (AUC 70–80%) because ball trajectory — the informative signal — is unused.
- **No blind test on a third video;** validation procedure inside train/val not detailed (70-30 split method unspecified).
- **External validity to NFL:** nil directly. The transferable pieces are methodological: the taxonomy/annotation-tool workflow and the transfer-learning-from-tiny-data result.

## 10. GSE overlap
Garrett's corpus has an NGS/tracking lane (2026-09-21 27-family taxonomy, NGS replacement spec 2026-09-18) and GSE consumes FTN charting — but GSE has no internal labelling/annotation tooling and no computer-vision pipeline of its own. This dissertation is the **annotation-tool workflow** blueprint (taxonomy design → tool → semi-automated labelling → model training → human-in-loop confirmation), not duplicate of anything in `docs/research/`. Related: the 2026-09-17 X-sweep and NGS inventory show GSE buys rather than builds tracking data. The STRAIN paper (2305.10262, read) built one pass-rush metric from tracking data — a labelling factory of this kind is the infrastructure that would let GSE build its own such metrics instead of waiting on NGS/FTN. **Verdict: extension / new capability (labelling infrastructure).**

Per the existing-research map (2026-09-21, checked for tennis annotation/labeling-factory coverage): no prior coverage of sports annotation tooling or labeling workflows — this is new ground.

## 11. GSE implementation spec
- **Goal:** a GSE "Labelling Factory" for building proprietary charting-equivalent labels from broadcast/all-22-style footage, to prototype features before buying or to label what FTN doesn't (e.g. pre-snap OL splits, DB technique at snap, pressure-path geometry).
- **Components:** (1) taxonomy spec per label family (NFL analogue of §4.1: formation, personnel, pre-snap motion, pressure type, coverage shell); (2) annotation web tool — actually: prefer forking CVAT (already cited in the paper) with custom NFL label schema + a tennis-style rally-analysis page for play segmentation; (3) auto-labelling stack: YOLOv11 + DeepSORT or GroundingDINO + YOLO-Pose for player localisation (per-player description grounding to resolve jersey-number identity), TrackNet-style ball tracking; (4) transfer-learned CNN classifiers per label (ImageNet backbone, differential LRs, class-weighted loss, early stopping) on GSE-annotated plays.
- **Effort:** medium-large — 4–6 weeks for a working internal labelling UI + first auto-labelling models (reuse CVAT, don't rebuild the tool from scratch); the paper's own lesson is to start with transfer-learned CNNs, not from-scratch GCNs.

## 12. Reproducible test
Use 2 full NFL games from a public source (e.g. a YouTube broadcast full game); annotate pre-snap formation (3 classes: 11/12/21 personnel groups) on 200 plays with the taxonomy workflow; fine-tune a ResNet-50 single-image classifier (ImageNet backbone, differential LR 1e-5/1e-4, class-weighted CE, 70-30 split within games, 1 full game held out); metric: macro AUC on the held-out game vs a random baseline and vs a from-scratch small CNN.

## 13. Acceptance / rejection gate
ADOPT the labelling-factory approach if, on the held-out game, the transfer-learned CNN reaches macro AUC ≥ 0.80 for personnel/formation classification AND annotation throughput (labelled plays/hour) is ≥ 2× the unaided manual rate; otherwise REJECT the tooling lane and keep buying charting.

## 14. Improvement experiment
Replace the per-frame image classifiers with a temporal video model (SlowFast or TimeSformer) on the hitting-moment clip ±10 frames, feeding it the GroundingDINO + YOLO-Pose skeleton *alongside* pixels (two-branch fusion like the paper's proposed future work) — testing whether temporal context closes the direction/outcome gap that single-frame models hit (AUC ~0.70 ceiling).
