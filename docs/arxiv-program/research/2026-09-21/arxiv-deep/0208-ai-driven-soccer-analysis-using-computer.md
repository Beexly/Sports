# [0208] AI Driven Soccer Analysis Using Computer Vision (arXiv:2604.08722v1)

**Citation:** Manchado, A., Cellio, T., Keane, J., & Wang, Y. (2025). *AI Driven Soccer Analysis Using Computer Vision*. arXiv:2604.08722v1. URL: https://arxiv.org/abs/2604.08722v1 (Milwaukee School of Engineering, Department of Computer Science and Software Engineering; dated March 22, 2025; undergraduate applied project paper)
**Ledger completed:** 2026-09-21. **Read:** full text (versioned PDF, https://arxiv.org/pdf/2604.08722v1, 574 lines).
**Verdict:** REJECT for adoption — this is an undergraduate systems-integration paper (the paper itself cites the standard registration pipeline as "fairly common") with no novel method, tiny labeled data, and no end-to-end per-player tracking results; it confirms the video→tracks pipeline pattern GSE already covers via 0201 (Selective Mask Propagation). Follow-up flag: the paper's own references to stronger primary sources — Chu et al. 2022 (keypoint-aware field registration), PnLCalib (Gutiérrez-Pérez & Agudo, 2024), TVCalib (Theiner & Ewerth, 2022) — are the correct papers to deep-read instead. NOTE: the ledger originally listed "Zhang et al. 2024" as a 95.62%-accuracy keypoint primary, but the paper's bibliography maps that citation to an underwater-image-enhancement paper — a citation mismatch in the source paper itself, so Zhang is REMOVED as a validated follow-up if GSE pursues broadcast-to-pitch-coordinates.

## 1. Research question
Can an off-the-shelf pipeline (pretrained object detectors + SAM2 + a small custom keypoint CNN + homography) produce a usable 2D field representation of player positions from raw, unlabeled game footage, for a resource-limited program (MSOE men's soccer) that cannot afford sensors or manual annotation at scale? The stated contribution is demonstrating the standard pattern on completely raw data, not a new method.

## 2. Dataset / schema
- 10 home games of the 2024 MSOE men's soccer season, recorded on an elevated BePro camera (dynamic pan/tilt/zoom), covering daytime, nighttime, and rainy conditions.
- Ground-truth boxes: 390 consecutive frames labeled by prompting SAM2 with YOLO detections (manually reviewed), then reverse-engineering minimum bounding-box rectangles from the SAM2 masks. Challenge noted: player entry/exit from frame reduces ground-truth points per player.
- Keypoints: 146 frames manually labeled with 12 field keypoints (92 frames glare conditions, 54 overcast), typically 4–12 visible per frame; keypoints chosen at intersections of field markings (penalty arc, center circle, midfield line) plus non-intersecting points defining a perpendicular axis at midfield.
- No dataset or code released.

## 3. Method / model
- Player detection + tracking: a pretrained object detector runs on the first frame; box centers prompt SAM2, which segments and tracks via its streaming-memory mechanism; YOLO is then used only once for initialization (claimed advantage over DeepSORT: pixel-accurate masks, no continuous detection needed). Re-identification on exit/re-entry is explicitly unresolved.
- Team classification: K-means (k = 2) on RGB vectors from a 5×5 pixel patch at each box center — fully unsupervised, no supervised classifier.
- Keypoint model: multitask CNN predicting visibility probability and normalized coordinates for 12 predefined keypoints; preprocessing isolates white field lines (thresholding → dilation → overwrite with bright white pixels), resized to 710×400; augmentation = horizontal flip (1−x, left/right swap), 80/20 split; custom loss = MAE over visible keypoints (weight 10) + binary cross-entropy on visibility (weight 1); Adam with exponential-decay LR; Bayesian hyperparameter search over dropout, layer size, learning rate.
- Homography: DLT (Direct Linear Transformation, SVD) estimated from predicted keypoints ↔ 2D field template whose real dimensions came from Google Maps API + official NCAA soccer field rules.

## 4. Equations & assumptions
- Eq. (1): masked MAE — mean over visible keypoints only (v_ij visibility indicator, (−1,−1) imputed for absent points); weighting 10 for coordinate loss vs 1 for visibility BCE.
- Eq. (2): visibility accuracy — fraction of rounded visibility predictions matching labels.
- PDF extraction garbled the exact summation notation of both equations; structures above are recoverable from the text but exact symbols are flagged as uncertain.
- Assumptions: SAM2 masks from YOLO prompts are reliable enough to serve as ground-truth boxes (evaluation is against their own model's masks — circularity the paper acknowledges via manual review); homography DLT assumes all input keypoints are accurate and ignores outliers (paper admits sensitivity).

## 5. Features / target
- Inputs: raw RGB game video frames.
- Targets: player bounding boxes (detection), 12 keypoint locations + visibility, team cluster assignment, then derived speed / distance / heatmaps.

## 6. Validation design
- Detector comparison on 390 SAM2-derived frames: Faster R-CNN, YOLOv5x, YOLOv8x, YOLOv11x (all extra-large variants), metrics F1 / IoU / recall / precision. Authors' priority order: F1 > recall > precision > IoU.
- Keypoint CNN: 80/20 split of 146 frames, train vs test visibility accuracy and masked MAE (normalized and pixel).
- System-level: MAE of projected keypoints in meters, predicted-vs-ground-truth homography projection error. No quantitative evaluation of tracking identity persistence (MOTA/IDF1 absent), no evaluation of derived speed/distance statistics against ground truth, no per-player stats (explicitly deferred to future work).

## 7. Numerical results / baselines
- Table 1 (detection): Faster R-CNN IoU 0.6837 / recall 0.6574 / precision 0.7942 / F1 0.7194; YOLOv11x 0.7934 / 0.6805 / 0.9229 / 0.7834; YOLOv8x 0.7466 / 0.8152 / 0.8765 / 0.8447; YOLOv5x 0.7644 / 0.7995 / 0.8963 / 0.8451. YOLOv5x selected ("YOLOv5 indicated the best balance between precision and recall"); all YOLOs beat Faster R-CNN on every metric.
- With YOLOv5x, 17/22 players identified with no fine-tuning (no metric reported beyond this count).
- Table 2 (keypoint CNN): visibility accuracy 99.89% train / 97.18% test; masked MAE 0.0107 train / 0.0138 test (normalized); 5.96 px train / 7.65 px test.
- System-level: keypoint MAE 0.225 m (ground truth) / 0.26 m (predicted); average projection error 0.499 m between predicted and ground-truth homographies.
- Qualitative failures (authors' own): false positives (ballboy, referee detected); K-means team assignment flips players under glare/shadows; keypoint errors distort the top-down view; "the system is not completely ready yet."

## 8. Code / data availability
No code repository or dataset link stated. Acknowledgments: coach Rob Harrington and MSOE men's soccer players provided footage.

## 9. Leakage & limitations
- Adversarial: (a) ground-truth boxes are derived from SAM2 masks prompted by YOLO — the evaluated detectors are compared against labels generated with the help of one of their own class, a circularity partially mitigated by manual review; (b) keypoint CNN trained and tested on 146 frames from 2 games on one home field — authors admit overfitting to MSOE's camera/field, no away-game generalization; (c) no jersey-number identification, no ball detection (deferred), no occlusion re-ID, no quantitative tracking metrics — the "player statistics" promised in the abstract are not demonstrated at the player level; (d) K-means on jersey color is brittle (authors' own glare/shadow failures) and fails for teams with similar colors; (e) the 17/22 "identified players" number has no precision/recall framing; (f) no method novelty — the paper's own §4.1–4.3 restate the standard pipeline and §2 points to the real advances.

## 10. GSE overlap
- GSE's map confirms no existing video-to-tracks capability, so the pipeline pattern is relevant — but paper 0201 (Selective Mask Propagation for Multi-Object Tracking, already deep-read in this wave) covers the tracking lane with a genuinely novel method. This paper adds nothing beyond 0201's foundations and is weaker on every axis (no occlusion handling method, no identity metrics, single fixed camera).
- The paper's own related-work pointers (Chu et al. 2022 registration pipeline; PnLCalib; TVCalib) are non-duplicated and are the correct next reads. NOTE: the source paper also cites a "Zhang et al. 2024" for 95.62% keypoint accuracy, but its bibliography entry for that citation is an underwater-image-enhancement paper — a reference mismatch; that Zhang follow-up is unvalidated and REMOVED.

## 11. GSE implementation spec
- None adopted from this paper. If GSE builds broadcast-to-field-coordinates: skip this paper; implement the Chu et al. 2022 keypoint-aware registration pipeline with a modern keypoint detector (TVCalib or a validated SoccerNet keypoint model), then track with the 0201 mask-propagation approach. Team/jersey identification must be supervised (jersey-number OCR + appearance embeddings), not K-means on color patches.

## 12. Reproducible test
- Not applicable (nothing adopted). For the replacement primaries: reproduce Chu et al. 2022's registration pipeline on a public soccer broadcast dataset (e.g., SoccerNet) and require ≥95% keypoint detection accuracy at 5-px tolerance before any GSE integration.

## 13. Acceptance / rejection gate
REJECTED as an adoption target: the paper demonstrates a plausible student pipeline but reports no tracking metrics, no ball detection, no jersey ID, no generalization beyond one field, and no method beyond the cited primaries. It is rejected for GSE adoption even in full (numeric gate: it would need ≥0.85 MOTA-style tracking persistence and multi-venue evaluation to qualify, neither of which exists). The replacement flag stands: deep-read Chu et al. 2022 instead (Zhang et al. 2024 removed — the source paper's citation maps to an unrelated underwater-image-enhancement paper).

## 14. Improvement experiment
Not applicable to GSE from this paper. The experiment worth running on the cited primaries: a head-to-head on NFL broadcast footage (All-22) comparing (a) keypoint+DLT field registration à la Chu et al. 2022 against (b) direct camera-pose estimation (TVCalib-style), measuring projection error of yard lines in pixels across zoom/pan sequences — the winner becomes GSE's broadcast-registration module, which the video-to-tracks lane (0201) requires.
