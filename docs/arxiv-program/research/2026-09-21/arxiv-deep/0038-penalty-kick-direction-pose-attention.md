# [0038] Predicting Penalty Kick Direction Using Multi-Modal Deep Learning with Pose-Guided Attention (arXiv:2509.26088v1)

**Citation:** Pasindu Ranasinghe and Pamudu Ranasinghe (2025). *Predicting Penalty Kick Direction Using Multi-Modal Deep Learning with Pose-Guided Attention*. arXiv:2509.26088v1. URL: https://arxiv.org/abs/2509.26088
**Ledger completed:** 2026-09-21. **Read:** full local text (534 lines: abstract, introduction, related work, §3 methodology, §4 results, discussion, limitations, conclusion, references).
**Verdict:** REJECT — soccer penalty-kick broadcast-video classification with pose estimation; GSE has no video/computer-vision lane and the NFL has no analogous task.

## 1. Research question
Can a real-time, multi-modal deep learning framework predict the direction of a soccer penalty kick (left / middle / right, from the goalkeeper's perspective) **prior to ball contact**, by fusing visual scene context (RGB frames) with the kicker's biomechanical pose dynamics — and does pose-guided spatial attention add value over visual-only or pose-only baselines? (Abstract, §1)

## 2. Dataset / schema
Custom **penalty-kick event dataset** curated from real match footage (§3.1):
- 154 match highlight videos (broadcasting platforms, publicly available datasets; international fixtures and top-tier club competitions) + 12 full match recordings from online sports archives.
- 755 distinct penalty-kick scenarios, manually identified and extracted; each annotated with final ball placement (left / middle / right from the goalkeeper's perspective) plus frame-level object-detection and pose annotations.
- Object-detection training set: ~4,000 RGB frames manually annotated with bounding boxes for 4 classes (penalty shooter, goalkeeper, net, ball) → augmented (rotation, blurring, scaling, shearing, brightness/saturation) to 6,300 frames; split 70/15/15.
- Final model input: fixed-length sequences of **8 frames** uniformly sampled across each segment (skipping idle early frames; e.g., frames 1, 15, 29, 43, 57, 71, 85, 99 of a 100-frame segment), each frame a 224×224×3 RGB image plus a (17, 2) keypoint tensor. Frame replaced by nearest valid neighbor if YOLOv8-Pose average keypoint confidence ≤ 0.6.
- Final dataset split: 70% train / 15% validation / 15% test → test set **113 samples**.
- Sequence segmentation: distance-based threshold — foot-to-ball distance expressed as a ratio relative to the ball-to-net reference distance (camera-invariant normalization, since pixel distances vary with zoom/angle). Three threshold configurations evaluated: 0.15, 0.25, 0.35.

## 3. Method / model
Dual-branch hybrid CNN–LSTM with pose-guided attention, implemented in TensorFlow Functional API; **57 million trainable parameters** (§3.2):
1. **Spatial feature branch:** each frame processed by a MobileNetV2 CNN in a time-distributed layer → pose-guided attention refinement → global average pooling → multi-head self-attention (temporal dependencies) → LSTM → single visual summary vector.
2. **Skeletal feature branch:** 17 2D keypoints per frame (YOLOv8-Pose: ankles, knees, hips, shoulders, elbows, wrists, neck, head), flattened into vectors → temporal sequence → multi-head attention → LSTM → pose summary vector.
3. **Pose-guided spatial attention module:** pose features transformed and combined with visual feature maps via convolutional layers, generating per-frame dynamic attention maps acting as spatial filters (highlights kicking foot, ball–foot interaction zone, plant foot, body orientation, goalkeeper/goal positioning).
4. **Late fusion + classification head:** concatenated summary vectors → batch normalization, dense layers, dropout → softmax over three goal zones.
- Input shapes: (B, 8, 224, 224, 3) RGB; (B, 8, 17, 2) keypoints.
- Training: end-to-end, Adam optimizer, learning rate 0.001, categorical crossentropy, batch size 32, up to 100 epochs, early stopping on validation loss (patience 10), lowest-validation-loss checkpoint saved.

## 4. Equations & assumptions
No equations stated in the paper. Key assumptions: 8 uniformly-sampled frames capture the informative preparatory motion; the 0.15 foot-to-ball ratio marks the informative biomechanical window; 3 coarse direction classes suffice; broadcast footage of penalties generalizes across competitions; pose keypoints (confidence > 0.6) are reliable proxies for biomechanical intent; goalkeeper-perspective left/middle/right labels are learnable from pre-contact frames.

## 5. Features / target
Features: 8-frame RGB sequences (224×224) + 17-keypoint (x, y) pose trajectories. Target: **penalty-kick direction — left / middle / right** (from goalkeeper's perspective), predicted **prior to ball contact**. No prediction horizon beyond the kick instant.

## 6. Validation design
Held-out test set (113 samples) from the 70/15/15 split; metrics: accuracy, confusion matrices per threshold (Fig. 3), object-detection mAP/precision/recall. Baselines: (a) three temporal-threshold configurations (0.15/0.25/0.35); (b) four-way ablation — visual-only, pose-only, dual-branch without pose-guided attention, full model; (c) related-work context: Chakraborty et al. (YOLOv4+OpenCV+LSTM, 79.05% one second before kick). No time-ordered split (clips are independent events), no cross-validation reported.

## 7. Numerical results / baselines
- Object detection (custom YOLOv8): mAP@0.5 **0.935**, precision **0.984**, recall **0.916** on test set (§4.1).
- Threshold comparison (Table 1, test accuracy, 113 samples): 0.15 → **89.38%** (77 training iterations); 0.25 → **76.11%** (72 iterations); 0.35 → **60.18%** (75 iterations). Trend: closer-to-kick segmentation → higher accuracy; even at 0.35 the model performs well above chance.
- Ablation study (Table 2, threshold 0.15): visual-only **75.22%**; pose-only **68.14%**; dual-branch without attention **82.30%**; full proposed model **89.38%** — fusion adds ~7–14 points over single modalities; pose-guided attention adds ~7 points over attention-less fusion.
- Inference: **22 ms** per segment on NVIDIA RTX 4080 (end-to-end pipeline: detection → distance-ratio monitoring → 8-frame extraction → prediction).
- Abstract's headline: **89% accuracy**, outperforming visual-only and pose-only baselines by 14–22% (consistent with 89.38 vs. 75.22 = +14.16 and vs. 68.14 = +21.24).

## 8. Code / data availability
None stated in the paper — no code link, no dataset link (custom-curated, proprietary to the authors).

## 9. Leakage & limitations
- Stated limitations (§6): depends on clear visibility of goalpost, ball, goalkeeper, shooter — camera angle, occlusion, zoom degrade detection/pose; only three coarse direction classes; domain generalizability across leagues/player styles/live broadcasts uncertain; training on curated segments.
- Additional adversarial notes: test set is 113 samples (thin for an 89.38% headline); no cross-validation; class balance of the 755 events not reported (penalties skew right/left by footedness); the 0.15 threshold that "wins" is the closest to contact — prediction lead time is minimal (milliseconds before the kick), limiting real goalkeeper utility; early-stopping "training iterations" in Table 1 (~72–77) is ambiguous (epochs?); no code or data for reproduction.
- External validity to NFL: none — soccer penalty kicks are a keeper-vs.-kicker anticipation duel with no NFL equivalent.

## 10. GSE overlap
No duplication and no transfer. The existing-research map's tracking lane is NGS **coordinate** tracking (27-family taxonomy, STRAIN pass-rush metric) — GSE operates no broadcast-video computer-vision lane, and there is no NFL task analogous to predicting a penalty kick's direction from kicker biomechanics. The closest NFL set piece, the field goal, is a distance/accuracy event from snap-hold with no keeper-anticipation duel, and GSE models it (per the map's kickers metric family) from tabular data, not video pose. Pose-guided spatial attention is a CV architecture pattern with no tabular-data transfer.

## 11. GSE implementation spec
None. No implementation is warranted: no video lane, no NFL analog task, no dataset, no code released.

## 12. Reproducible test
None applicable to GSE's stack. (The paper's own test — threshold sweep on 113 held-out penalty events — is fully specified but not reproducible by GSE: no code, no public data.)

## 13. Acceptance / rejection gate
**Rejected outright:** the paper's entire pipeline (YOLOv8 detection, pose estimation, MobileNetV2 visual branch, pose-guided attention) serves a soccer broadcast-video classification task GSE does not and will not run. No equation, feature, or protocol transfers to NFL spread/total/moneyline or prop prediction. No further work.

## 14. Improvement experiment
None applicable to GSE. (For the paper's own domain: finer-grained targets — shot height, ball spin, impact location — plus ball tracking and cross-league validation, as the authors themselves propose in §6.)
