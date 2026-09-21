# 1031 — Video Pose Distillation for Few-Shot, Fine-Grained Sports Action Recognition (2109.01305)

## Citation / full-text source
James Hong, Matthew Fisher, Michaël Gharbi, Kayvon Fatahalian, "Video Pose Distillation for Few-Shot, Fine-Grained Sports Action Recognition", ICCV 2021. arXiv:2109.01305. Full text: export.arxiv.org/pdf/2109.01305 (16+ pages incl. appendix, PDF parsed in full).

## Research question
Off-the-shelf pose estimators fail on fast sports video (motion blur, occlusion, domain shift), yet pure end-to-end RGB models overfit to context when labels are scarce. Can a student network distilled from a noisy pose teacher on *unlabeled* sport-specific video produce robust pose descriptors that beat both the teacher's pose output and end-to-end models on few-shot, fine-grained sports action recognition, retrieval, and detection?

## Dataset / schema
Four real-world fine-grained sports datasets:
- **FSJump6** (new): 371 singles figure-skating short programs, Olympics 2010–18 + Worlds 2017–19, 17 video hours; 6 ISU jump types; 2018 routines (134, 520 jumps) held out for test; remaining split 743/183 train/val.
- **Tennis7**: 9 singles matches (Wimbledon/US Open), 7 swing classes labeled at ball-contact frame; train/val 4,592/1,142 from 5 matches, test 2,509 from 4 remaining matches.
- **FX35** (FineGym floor exercise): 1,214 routines, 34 hours, 35 classes, 7,634 actions.
- **Diving48**: 16,997 annotated dive instances, 48 classes (V2 corrected labels).
All extended with automatic athlete tracking boxes; pose confidence filtering at mean joint score < 0.5 (0.7 for tennis) excludes frames from weak supervision.

## Method
Video Pose Distillation (VPD): a ResNet-34 student F takes RGB crop x_t (128×128) + RAFT optical flow φ_t (5 input channels) around the athlete and outputs descriptor F(x_t, φ_t) ∈ R^d. An auxiliary FC decoder D (2 hidden layers × 128) regresses the teacher's normalized pose p_t AND temporal derivative Δp_t = p_t − p_{t−1}. Training objective (Eq 1):
min_{Student, PoseDecoder} Σ_t || D(F(x_t, φ_t)) − [p_t; Δp_t] ||²₂
Distilled on large uncut *unlabeled* target-sport corpora using only high-confidence teacher frames. After training, D is discarded; only F is used. Two teacher variants: **2D-VPD** (d=26: HRNet normalized 2D joint coords) and **VI-VPD** (d=64: VIPE* view-invariant embedding; d=128 on Diving48 with vertical-flip concat). Horizontal flips applied to both student inputs and teacher targets (re-embedding flipped poses through VIPE*).
Downstream action recognition: fixed F features → sequences → 2-layer BiGRU (h=128), max-pool over time, BN-Dropout-FC head; plus nearest-neighbor search with DTW alignment cost. Chirality handled by embedding regular + flipped frames.

## Equations / assumptions
- Distillation loss: min Σ_t ||D(F(x_t,φ_t)) − [p_t; Δp_t]||²₂ (Eq 1).
- Student trains from random init; no fine-tuning of features after distillation.
- Confidence threshold (0.5, 0.7 tennis) + 20% random frames withheld for student validation; epoch selected by validation loss.
- Assumptions: athlete bounding box / track is available per frame (heuristic Mask R-CNN + tracking, auto-computed); distillation works on single-athlete motion (multi-person scenes out of scope); teacher ambiguity wrt camera view tolerated via view-invariant VIPE* teacher.

## Features / target
Features: 5-channel RGB+flow athlete crops (128×128). Target (weak supervision): teacher pose p_t and pose-velocity Δp_t (no human labels). Downstream: per-frame d-dim pose descriptors → sequence classifiers for action class, retrieval ranking, or temporal detection.

## Validation
Few-shot protocol: k = 8/16/32/64 examples per class (full train set also), 5 fixed random subsets per k, mean top-1 accuracy on full test set. Baselines: TSN, TRNms (2-stream), GSM (end-to-end, InceptionV3, 16-frame), ST-GCN, MS-G3D ensemble (skeleton), normalized 2D joints, VIPE* teacher — all given the same tracked/cropped inputs. Retrieval: precision@1/10/50 via DTW alignment. Detection: AP at tIoU 0.3–0.7, few-shot (5 routines / 5 points).

## Exact results / baselines
- **Few-shot:** on Diving48, VI-VPD beats next-best by 6.8–22.8% top-1 (k=8–64); on FX35 by 5.0–10.5%; on FSJump6/Tennis7 slight improvement over VIPE* (similar). Pose-based baselines beat end-to-end in few-shot everywhere except Diving48.
- **Full-data top-1 (Table 1):** FSJump6 97.4% (VI-VPD, SOTA, +0.6 over VIPE*), Tennis7 93.3% (SOTA, +1.5), FX35 94.6% (SOTA, +1.0 over GSM crop 93.6), Diving48 88.6% (trails GSM w/o crop 90.2 by 1.6pp, but +8.4 over MS-G3D ensemble 80.2).
- **Ablations (Table 2, 16-shot):** distillation alone from RGB gives +7.9/+19.9% (full/16-shot) on Diving48 and +2.7/+7.7% on FX35 over teacher; adding motion decoder D adds +1.1–2.1% (full) / +1.5–3.9% (16-shot); flow input helps inconsistently; distilling on uncut video beats action-only segments.
- **Retrieval (Table 3):** VPD beats teachers at all cutoffs on all 4 datasets; e.g. Diving48 P@1 60.9 (VI-VPD) vs 36.1 (VIPE*), P@10 40.9 vs 24.1; FX35 P@1 80.8 vs 72.2.
- **Detection (Table 4):** FS jumps VI-VPD AP@0.5 60.7 vs VIPE* 59.3 (+1.4), vs pretrained R3D 23.1; tennis swings VI-VPD AP@0.5 58.6 vs VIPE* 51.2 (+7.4), vs R3D 29.9.
- Costs: student training ~8 h on one Titan V; downstream BiGRU 7–100 min/dataset; student inference = ResNet-34 on 128×128 crops.

## Code / data
No code URL stated in the paper text. New FSJump6 figure-skating dataset contributed; tracking extended on all four datasets. Reproducible from public HRNet/RAFT/MS-G3D/TSN implementations + Eq 1 recipe + protocol details in Appendix A–F.

## Leakage
Test-set frames are never used for distillation except in the explicit unlabeled-corpus ablation (Table 2c, ≤1.5% gain — no leakage benefit found). Diving48 V2 corrected labels used. Train/test splits are by routine/match (FSJump6 2018 held out; Tennis7 split by match video), so no identity leakage within reported numbers.

## Limitations
- Requires per-frame athlete identification/tracking; multi-person action scenes explicitly out of scope (only single athlete or synchronized divers).
- Distillation is offline; cannot adapt online to evolving domains.
- 2D teacher ambiguity w.r.t. camera view only partly handled via VIPE*; no depth.
- Gains are largest where pose is worst; on datasets with reliable pose and clean full-frame views (FSJump6/Tennis7), improvement over the teacher is small.
- Tracking errors hurt (GSM-w/o-crop beats VI-VPD on Diving48, attributed partly to their tracking limitations).

## GSE overlap
Direct: GSE's NFL content/video pipeline and any athlete-motion analytics (mechanics, technique breakdowns, highlight retrieval/detection) face exactly this problem — generic pose models fail on fast broadcast sports video and labels are scarce. VPD's recipe (distill noisy pose into a sport-specific ResNet-34 on unlabeled broadcast corpus) is label-free after the teacher, needs only tracks — which GSE's tracking data already provides.

## Implementation (GSE adaptation)
VPD-NFL lane: (a) build uncut unlabeled corpus of NFL broadcast All-22 + sideline video; (b) run HRNet/RTMPose as teacher, confidence-filter at 0.5; (c) train ResNet-34 student (5ch RGB+RAFT flow) to regress (p_t, Δp_t) per Eq 1, validating on 20% frames; (d) extract descriptors per play; (e) downstream: BiGRU/DTW-NNS for fine-grained action retrieval (e.g., route-type retrieval, tackle-technique classification), few-shot classifier head for novel fine-grained labels (e.g., new celebration/penalty motions). Start single-athlete (QB throwing mechanics) before multi-player.

## Reproducible test
Distill VPD on ~10 hours of unlabeled All-22 video; hand-label k=16–64 examples each of 6–8 fine-grained QB actions (throw types / movements). Train BiGRU on frozen VPD descriptors vs frozen teacher-pose features; compare top-1 accuracy.

## Numeric gate
VI-VPD descriptors must beat the raw teacher-pose baseline by ≥5 percentage points top-1 in the 16-shot setting (the paper's own margin on its hardest datasets) before any production adaptation is approved. If <3pp, drop (teacher pose + augmentation suffices).

## Improvement experiment
Swap the ResNet-34 student for a lightweight temporal ViT that consumes 8-frame clips and regresses (p_t, Δp_t) sequence-wide; test whether temporal-student descriptors close the remaining gap to end-to-end GSM on the Diving48-style hardest subset. Also: replace the 0.5 fixed confidence gate with a per-joint learned reliability weighting.

## Verdict
ADAPT
