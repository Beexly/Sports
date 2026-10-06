# [0370] Towards Unconstrained 2D Pose Estimation of the Human Spine (arXiv:2504.08110v1)

**Citation:** Muhammad Saif Ullah Khan, Stephan Krauß, Didier Stricker (2025). *Towards Unconstrained 2D Pose Estimation of the Human Spine*. arXiv:2504.08110v1. URL: https://arxiv.org/abs/2504.08110
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1394 lines).
**Verdict:** ADAPT — spine-curvature keypoints (C1…L5) are a novel biomechanical feature source for QB throwing-mechanics / OL posture analysis from video, but GSE has no video-pose pipeline today, so this is an idea to bank for future computer-vision content rather than an immediate build.

## 1. Research question
Can fine-grained 2D spine pose (nine vertebral keypoints: C1, C4, C7, T3, T8, L1, L3, L5, sacrum) be estimated in unconstrained in-the-wild images — where existing datasets collapse the spine to a single rigid segment — via a new dataset (SpineTrack) and a distillation-based model extension (SpinePose), without degrading standard body-pose performance?

## 2. Dataset / schema
- **SpineTrack-Unreal (synthetic, ~25k frames):** Unreal Engine 5, 16 diverse avatars × 10 motion sequences (walk, run, jump, stretch, twist), 5 calibrated camera views; keypoints from UE5 skeleton projected to 2D, biomechanically aligned via OpenSim IK on a scaled model; backgrounds composited with 1,000 real indoor/outdoor images via SAM segmentation of OpenImagesV7.
- **SpineTrack-Real (real, 33k+ annotations):** images sourced from COCO and YogaPose datasets; pseudo-labels from RTMPose-L (body/feet) + curve-fit spine guesses sampled at fixed inter-vertebral intervals from shoulder/hip-driven curves; active-learning loop — train spine-aware model, human-correct low-confidence batches, fine-tune, repeat.
- Total: 50,962 images, 58,766 annotated humans, 35 keypoints (17 COCO + head top + 6 feet + 9 spine + 2 sternoclavicular). Annotations biomechanically validated: triangulated keypoints vs OpenSim IK joint positions, RMSE 2–4 cm reference range; any spine keypoint >10 cm RMSE was manually refined until matching baseline accuracy. Project page: https://saifkhichi96.github.io/research/spinepose/ (stated in affiliation block; no GitHub code link stated in text).

## 3. Method / model
**SpinePose:** teacher–student distillation extending RTMPose. Teacher T (Body8-pretrained) outputs body heatmaps; student S is the same architecture with the final heatmap layer expanded to the extended skeleton K_student = K_body ∪ K_spine (Eq. 1); new head rows initialized from a normal distribution with statistics of existing weights (not zeros, unlike Khan et al. 2024). Training objective L_total = α L_pos + β L_distill + γ_1 L_structure + γ_2 L_spine (Eq. 9):
- L_pos = Σ_{k∈K_student} KL(p_{s,k}, g_k), KL divergence vs ground-truth heatmaps (Eq. 2);
- L_distill = Σ_{k∈K_body} KL(p_{s,k}, p_{t,k}) — distill teacher on body joints (Eq. 3);
- L_structure = (1/(π|B|)) Σ_{b∈B} |Δφ_b|, bone-angle orientation penalty, Δφ_b = atan2(sin(φ^p_b − φ^g_b), cos(φ^p_b − φ^g_b)) vs horizontal (Eq. 4–5);
- L_spine = MSE({s_i}, {s̃_i}), differentiable smoothing s̃_i = s̃_{i−1} + w_i(s_i − s̃_{i−1}), w_i = 1 − 0.5σ(α(‖s_i − s̃_{i−1}‖ − T)) — dampens abrupt spinal bends (Eq. 6–8).
Training: 10 epochs fine-tune, AdamW, LR 4e−3, 1000-iteration linear warmup, cosine annealing to 5% of initial LR, effective batch 1024, input 256×192 (some 384×288). GT bboxes for SpineTrack, 56.4-AP detector for COCO/Halpe26, flip test.

## 4. Equations & assumptions
- K_student = K_body ∪ K_spine, K_body ∩ K_spine = ∅. (Eq. 1)
- L_pos = Σ_{k∈K_student} KL(p_{s,k}, g_k). (Eq. 2)
- L_distill = Σ_{k∈K_body} KL(p_{s,k}, p_{t,k}). (Eq. 3)
- Δφ_b = atan2(sin(φ^p_b − φ^g_b), cos(φ^p_b − φ^g_b)); L_structure = 1/(π|B|) Σ_b |Δφ_b|. (Eq. 4–5)
- s̃_i = s̃_{i−1} + w_i(s_i − s̃_{i−1}); w_i = 1 − 0.5σ(α(‖s_i − s̃_{i−1}‖ − T)); L_spine = MSE({s_i}, {s̃_i}). (Eq. 6–8)
- L_total = α L_pos + β L_distill + γ_1 L_structure + γ_2 L_spine; ablations use α=5, β=2.5, γ_1=0.1, γ_2=0.5. (Eq. 9)
- Stated assumptions: teacher heatmaps approximate the true body-joint distribution; constant inter-vertebral distance for initial spine pseudo-labels; sigmoid gating threshold T separates legitimate curvature from noise; 10-epoch fine-tune sufficient given teacher initialization.

## 5. Features / target
Input: single RGB image (person crop). Target: heatmaps for 37 keypoints (17 COCO body + 2 feet subset reported separately in tables, 6 feet, 9 spine, plus head top/sternoclavicular per text). Evaluated per subset (Body/Feet/Spine/Overall) with COCO-style AP/AR.

## 6. Validation design
Evaluated on SpineTrack val (GT bboxes; body/feet/spine/overall AP/AR) vs same-family RTMPose baselines (t/s/m/l/x sizes) and on COCO and Halpe26 val (pretrained-detector crops) to test retention of in-the-wild performance after only 10 epochs of fine-tuning. Ablation of the four loss components with fixed weights (α=5, β=2.5, γ_1=0.1, γ_2=0.5). Qualitative sports validation on hockey tackle, squat, diving, archery images.

## 7. Numerical results / baselines
- Table 1 — SpineTrack Spine AP: SpinePose-s 89.6 (AR 90.7), SpinePose-m 91.4 (92.5), SpinePose-l 91.0 (92.2), SpinePose-x 89.3 (91.0); overall AP: s 84.2, m 88.0, l 88.4, x 88.3. Baselines score 0.0 on spine (they lack the keypoints).
- Retention on benchmarks (paper's key claim): SpinePose-l — COCO AP 75.2 / AR 79.5 vs RTMPose-l 76.9/81.5; Halpe26 AP 77.0 / AR 81.1 vs RTMPose-l 78.4/82.9; SpinePose-m — COCO 73.0 vs RTMPose-m 75.1; Halpe26 75.0 vs 76.7. So the spine extension costs ~1.5–2.1 AP points vs the same-size RTMPose.
- Table 2 ablation (SpinePose-l, COCO / Halpe26 / SpineTrack AP): no-distill/no-special baseline 69.6 / 72.2 / 87.0; +distill 70.8 / 73.2 / 87.3 (+1.0–1.2 on benchmarks, +0.3 SpineTrack); +distill+spine-smooth 74.7 / 76.6 / 88.7 (spine smoothness adds +1.4 SpineTrack and +3.9/+3.4 benchmarks — my interpretation: the anatomical regularizer's benchmark boost is the paper's most surprising claim, attributed to "rule-based knowledge" preventing interference); +distill+structure 71.2 / 73.4 / 87.7; all losses 75.2 / 77.0 / 88.4 (best on all three).
- Note: ablation COCO numbers (69.6–75.2) differ from Table 1 (75.2 for SpinePose-l matches the full-config row — consistent; lower rows are loss-ablated, not comparable to Table 1 baselines).

## 8. Code / data availability
Project page: https://saifkhichi96.github.io/research/spinepose/ (stated). No code repository link stated in the text. Dataset: SpineTrack (50,962 images / 58,766 humans, synthetic + real) — presented as released via the project page.

## 9. Leakage & limitations
- Spine pseudo-labels for real images are model-generated then human-corrected; residual systematic bias toward the curve-fit prior (constant inter-vertebral distance) could inflate AP on SpineTrack-Real.
- Validation on SpineTrack uses GT bounding boxes — real-world (detector) performance will be lower than reported overall AP.
- 10-epoch fine-tune is only credible because of Body8 teacher init; from scratch, the spine labels alone would not train this.
- Biomechanical "validation" (RMSE vs OpenSim IK) uses triangulation from the same 2D models under evaluation — partially circular.
- Qualitative sports evidence only (hockey, squat, dive, archery) — no quantitative sports-specific benchmark.
- External validity to NFL: spine curvature estimation from broadcast video (helmets, pads, jerseys occlude torso landmarks entirely) is a harder domain than the hockey/diving examples; pads likely defeat the visual cues the model relies on. The method's value for GSE is as an idea (trunk-posture features), not a directly portable model.

## 10. GSE overlap
New capability — no duplicate in the research map. No existing GSE work on video pose estimation or spine biomechanics (map §1 has no video/CV lane; NGS taxonomy covers tracking *data*). The closest existing asset is the 2026-09-18 NGS-replacement spec (`2026-09-18-ngs-replacement-spec.md`) — spine curvature features could one day feed it, but there is no overlap today. Track as future CV idea.

## 11. GSE implementation spec
Do not build now. If GSE launches a video analysis lane (e.g., All-22 film study for QB mechanics): (1) adopt SpineTrack dataset or regenerate NFL-padded-torso annotations (pads occlude keypoints — new labels needed); (2) take an RTMPose Body8-pretrained checkpoint, expand head to add spine keypoints, initialize new rows from weight statistics; (3) fine-tune 10 epochs with α=5, β=2.5, γ_1=0.1, γ_2=0.5; (4) derive trunk-flexion/torsion angles from the nine vertebral keypoints as features for QB mechanics or injury-risk models. Estimated effort: 3–6 weeks if the dataset is usable as-is; 2–3 months with NFL-specific re-annotation.

## 12. Reproducible test
If the SpineTrack dataset is downloadable from the project page: replicate the Table 1 SpinePose-l row — train per §3.2 protocol (Body8 teacher, 10 epochs, α=5, β=2.5, γ_1=0.1, γ_2=0.5, GT bboxes) and verify SpineTrack overall AP within ±1.0 pp of 88.4 and COCO AP within ±1.0 pp of 75.2. Requires Body8-pretrained RTMPose weights (from the RTMPose authors).

## 13. Acceptance / rejection gate
ADOPT the SpinePose fine-tune recipe for a GSE video lane only if replication lands within the §12 tolerances AND the model yields ≥85 AP on a held-out set of football-pad torso images annotated with the nine spine keypoints; otherwise REJECT — pads likely invalidate the in-the-wild generalization the paper claims.

## 14. Improvement experiment
Add a pad-occlusion augmentation: during fine-tuning, randomly mask the torso region (jersey-colored rectangles, as pads hide vertebral cues) and supervise spine keypoints with higher uncertainty — test whether the model can infer curvature from shoulder/hip cues alone. If that fails, couple the 2D spine predictions with a temporal consistency term across video frames (penalize frame-to-frame spine curvature jumps), since single-frame occlusion is the failure mode, and sports video is inherently multi-frame.
