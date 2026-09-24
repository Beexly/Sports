# [0351] From Sharp to Blur: Unsupervised Domain Adaptation for 2D Human Pose Estimation Under Extreme Motion Blur Using Event Cameras (arXiv:2507.22438v1)

**Citation:** Youngho Kim, Hoonhee Cho, Kuk-Jin Yoon (2025). *From Sharp to Blur: Unsupervised Domain Adaptation for 2D Human Pose Estimation Under Extreme Motion Blur Using Event Cameras*. arXiv:2507.22438v1. URL: https://arxiv.org/abs/2507.22438
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2567 lines incl. references).
**Verdict:** REJECT — technically strong, but the entire method is keyed to event-camera hardware co-located with RGB cameras; GSE has no event-camera data source and no pose-estimation program, so there is no adoption path without first acquiring a sensor modality that doesn't exist in NFL broadcast footage.

## 1. Research question
How can a 2D multi-human pose estimator trained on labeled *sharp* images be adapted to *motion-blurred* images where pose annotations are unobtainable? The authors introduce event cameras (per-pixel intensity-change sensors, blur-robust, high temporal resolution) as the bridge: they generate motion-aware blurred images from events for augmentation, and use a multi-modal student–teacher framework with mutual uncertainty masking to produce reliable pseudo-labels in the unlabeled blur domain.

## 2. Dataset / schema
- **EHPT-XC (Cho et al. 2025):** 158 diverse sequences from a triplet camera system with pixel-wise aligned, temporally synchronized event streams + sharp images + blurry images; 38K 2D keypoints, 14 keypoints per person, plus bounding boxes and track IDs. Split into train-source (47 sequences × 100 sharp image–event pairs, annotated), train-target (blurry, unlabeled, images+events), and test (26 sequences with synchronized sharp + blurry + events).
- **Access:** the EHPT-XC dataset is an external prior publication's asset (not released by this paper); the paper's own code is at https://github.com/kmax2001/EvSharp2Blur.

## 3. Method / model
- **Backbone:** DEKR (Geng et al. 2021) bottom-up pose estimator: outputs a center heatmap H_C, offset maps O (center-to-keypoint displacements), and keypoint heatmaps H_k; poses regressed from the center argmax via offsets, scored by averaged heat values.
- **Four-stage pipeline (Fig. 2):**
  - **Stage 1 — Teacher pretraining:** multi-modal teacher T_M = event-only sub-network T_E + image+event fusion sub-network T_{I+E} + refinement network T_R (channel-attention fusion of all sub-network outputs plus event-derived optical-flow magnitude as extra guidance). Trained ONLY on motion-aware blurred images synthesized from source-domain sharp images (no sharp images used), supervised by L_g.
  - **Motion-aware event-based blur augmentation (Fig. 3):** events sliced into 2N_E segments around the sharp image's center timestamp; a self-supervised event-based optical-flow network estimates flow per slice; flows forward-warp the sharp image to 2N_E+1 warped images; hole-aware averaging (δ_t = 0 at holes) forms the discrete blur; a blur-translation loss (from prior work [55]) closes the discrete-vs-continuous blur distribution gap. N_E = 5.
  - **Stage 2 — Student training:** student S (same architecture as T_{I+E}) trained on source annotations + teacher pseudo-labels on target; confidence-thresholded pixel masks (background mask 0.1 per DEKR) suppress unreliable pseudo-label loss.
  - **Stages 3–4 — Mutual uncertainty masking:** teacher and student cross-score each other's poses (C from own heatmaps, C′ from the other network's heatmaps); a region is kept only if min(C, C′) ≥ th′ for both networks; alternating teacher-then-student adaptation creates a feedback loop.
- **Implementation:** 512×512 inputs, top-30 center candidates with heat threshold 0.03, near(p) = 8×8 square, K=14 keypoints, λ_g = 0.03, LR 1e-3, 100 epochs, batch 5, 2× TITAN RTX; stages take 8/12/12/12 hours. Augmentations: rotation ±30°, flip p=0.5, scale 0.75–1.5, translation ±40 px. Thresholds: th = 0.1 (Stage 2), th′ = 0.1 (Stage 4), chosen via ablation (Table 6).

## 4. Equations & assumptions
Quoted from §3 (as numbered in the paper):
- Supervised DEKR loss: L_g = L_H + λ_g · L_O, where L_H is heatmap MSE and L_O is smooth-L1 offset loss; λ_g = 0.03. (1)
- Hole-aware blur synthesis: B̃^src(x,y) = Σ_t W_t(x,y)·δ_t(x,y) / (Σ δ_t(x,y) + ε); δ_t = 0 where the t-th warp has a hole, else 1; ε prevents division by zero. (2)
- Pose confidence: C(P_i) = H_c^T(p_c^i) · Σ_k H_k^T(p_k^i)/K. (3)
- Heatmap mask: near-set d_k(x,y)^H := {i | (x,y) ∈ near(p_k^i)} (4); M_k(x,y)^H = Π m with m = 1 if C(P_i) ≥ th else 0 (5); empty set → pixel is background, mask 0.1.
- Offset mask: M_k(x,y)^O = 1/min(Z_i), Z_i = {√(H_i²+W_i²) | (x,y) ∈ near(p_c^i)}; 0 if empty. (6)
- Masked pseudo-label losses: L_H = M^H · ‖H − H^T‖²_2 (7); L_O = M^O · SmoothL1(O − O_k^T) (8).
- Cross-network confidence: C′(P_i^S) = H_c^T(p_c^i) · Σ_k H_k^T(p_k^i)/K (9); C(P_i^S) = H_c^S(p_c^i) · Σ_k H_k^S(p_k^i)/K (10).
- Mutual mask: M′_k(x,y)^H = Π_{i∈T} m^T × Π_{j∈S} m^S (11), with m^T = 1 iff min(C(P_i^T), C′(P_i^T)) ≥ th′, else 0 (and symmetric for S).
- **Assumptions:** synchronized, pixel-aligned image–event pairs exist in both domains (triplet camera); motion during exposure is recoverable from events via self-supervised flow; pseudo-labels above confidence threshold are trustworthy; min(C, C′) agreement between networks implies correctness; offset definition O = {p_c^i − p_k^i} (center minus keypoint) per DEKR; "near" region = 8×8 px square.

## 5. Features / target
- Inputs: RGB image + event stream (sliced into 2N_E = 10 temporal segments) + event-derived optical-flow magnitude (refinement network only).
- Target: per-person 2D pose — center heatmap peak, K=14 keypoint offsets from center, keypoint heatmaps for scoring/ranking regressed poses.
- Task: unsupervised domain adaptation sharp→blur; evaluation on both domains (COCO-style mAP@0.5:0.95 / mAR@0.5:0.95).

## 6. Validation design
- **Setting:** unsupervised DA on EHPT-XC (source labels only; target unlabeled). Test on 26 sequences with both sharp and blurry images.
- **Baselines:** Base (I), Base (E), Base (I+E) networks — trained on source labels only, and in "oracle" settings trained on source + target labels; domain-adaptive pose methods DualTeacher [1] and UDA-HE [35] extended to image/event/multi-modal variants (their original augmentations replaced with standard ones).
- **Metrics:** mAP@0.5:0.95 and mAR@0.5:0.95 on sharp (source) and blur (target) test domains, plus average.
- **Ablations:** Table 2 (MBA augmentation × Stage 2 × Stages 3&4); Table 3 (motion augmentation vs + blur translation loss); Table 4 (teacher sub-network components); Table 5 (refinement-network fusion vs heatmap averaging vs spatial attention); Table 6 (threshold sensitivity th/th′ ∈ {0.05, 0.1, 0.2, 0.3}); Table 7 (image-only student at test time, distilled from the multi-modal teacher).
- Note: single dataset evaluation (EHPT-XC); no cross-dataset generalization test.

## 7. Numerical results / baselines
From Table 1 (mAP@0.5:0.95 / mAR@0.5:0.95; Source=Sharp, Target=Blur):
- **Ours (full, student after Stage 4):** sharp 64.2 / 68.1; **blur 51.6 / 57.5**; average 57.9 / 62.8.
- **Ours-Teacher:** blur 52.9 / 58.2 (sharp not evaluated — teacher never saw sharp images).
- **Oracle Base (I+E)** (trained with target labels): sharp 74.5 / 77.9; blur 58.8 / 65.1; average 66.6 / 71.5. The paper claims "comparable to oracle" — the actual gap is 7.2 mAP points on the blur domain, which is substantial but the best among label-free methods.
- **Base (I+E)** source-labels-only: blur 37.5 / 40.5 → our method gains **+14.1 mAP** on blur.
- **UDA-HE (I+E):** blur 36.4 / 40.6; **DualTeacher (I+E):** blur 34.6 / 37.5 — our method beats the adapted competitors by ~15 mAP points on blur.
- **Ablation (Table 2, blur):** (A) Base I+E 37.5/40.5 → (B) +MBA 40.4/46.5 → (C) +Stage 2 49.1/54.3 → (D) +Stages 3&4 50.4/55.5 → (E) full 51.6/57.5. Biggest single jump comes from Stage 2 pseudo-label training (+8.7 mAP), not the augmentation.
- **Motion augmentation alone (Table 3):** mAP 46.5 → 46.7 (+0.2), +blur-translation 46.9 (+0.4 total) — the event-based blur synthesis is a small contributor by itself.
- **Image-only student (Table 7):** trained with multi-modal teacher pseudo-labels, testable on plain RGB: blur mAP **46.0** (vs Base(I) source-only 28.6) — i.e., the framework can distill to an event-free model, but loses 5.6 mAP vs the multi-modal student (51.6).

## 8. Code / data availability
Code: https://github.com/kmax2001/EvSharp2Blur (stated). Data: EHPT-XC dataset from Cho et al. 2025 (external; the paper does not release it). All numbers above depend on that dataset.

## 9. Leakage & limitations
- **Single-dataset evaluation:** everything is on EHPT-XC (158 sequences); no cross-dataset or real-world (non-triplet-camera) validation. The method's core assumption — pixel-aligned synchronized event+RGB streams — holds only for purpose-built hardware.
- **Augmentation's standalone contribution is tiny** (Table 3: +0.2 mAP from motion-aware blur, +0.4 with blur-translation) — most gains come from pseudo-label student training, i.e., standard semi-supervised machinery, weakening the "event cameras as the bridge" narrative relative to the machinery around it.
- **Pseudo-label confirmation bias:** thresholds th/th′ = 0.1 selected by ablation on the test domain distribution; mutual masking assumes cross-network agreement implies correctness — both networks can be wrong in the same way on systematic blur artifacts.
- **"Comparable to oracle" is overstated:** 51.6 vs 58.8 mAP on blur is a 12% relative gap, not parity.
- **Train-source sequences:** 47 sequences × 100 pairs is modest for a pose DA claim; test set = 26 sequences, no reported CIs.
- **External validity to NFL:** NFL broadcast footage has no event-camera channel, and there is no practical way to obtain one — the method's sensor requirement is a hard precondition GSE cannot meet from public or broadcast data. The image-only distilled variant (46.0 blur mAP) shows the framework partially survives without events at test time, but it still *requires* events at training time, which GSE cannot source for NFL video.

## 10. GSE overlap
Per the existing-research-map: the **tracking/NGS lane** covers NGS metric taxonomy and STRAIN (tracking-based pass-rush); **pose estimation is not covered anywhere** in the repo, Drive dossiers, X sweeps, or Gmail threads — no pose model, no event-camera work, no blur-robustness research. So this is not a duplicate. However, it is also not an extension GSE can use: GSE's tracking-adjacent needs (NGS replacement spec, 2026-09-18) target reproducing NGS metrics from public data, and the paper's method requires an event-camera modality absent from every GSE data source (nflverse, FTN charting, odds APIs, broadcast video). The one transferable component — mutual uncertainty masking for pseudo-labeling — is a semi-supervised learning technique, not sports-specific, and GSE has no unlabeled-video training program to attach it to. Verdict: **no actionable overlap; rejected on sensor precondition, not on redundancy.**

## 11. GSE implementation spec
None warranted — REJECT. If GSE ever built a vision program with access to event-camera-equipped stadiums (not currently conceivable from public data), the Stage 2 + Stages 3–4 mutual-uncertainty-masking pipeline would be the portable piece (the +8.7 mAP contributor), distilled to an image-only student for deployment (46.0 vs 28.6 baseline on blur). No nflverse/FTN/odds data maps to this task; no effort is estimated because the sensor precondition fails first.

## 12. Reproducible test
Clone https://github.com/kmax2001/EvSharp2Blur; obtain the EHPT-XC dataset (external to the paper); run the 4-stage pipeline (N_E=5, λ_g=0.03, LR 1e-3, 100 epochs/stage, batch 5). **Metric:** mAP@0.5:0.95 on the 26-sequence test split, blur domain. **Baseline:** re-trained Base (I+E) source-labels-only (paper: 37.5). **Gate:** reproduced "Ours" blur mAP within ±3 points of 51.6. (Requires the external dataset and 2× TITAN RTX-class GPUs for ~44 h/stage-set.) This is a reproducibility check only — it confers no GSE value.

## 13. Acceptance / rejection gate
- **Reject** — decided before any numeric gate: the method's mandatory input is a synchronized event-camera stream, which no GSE data source (nflverse, FTN, odds APIs, broadcast video) provides and which cannot be retroactively synthesized for historical NFL footage. No performance threshold changes this.
- Had the sensor precondition been satisfiable, the gate would have been: adopt the mutual-uncertainty-masking stages if blur-domain mAP beats the source-only Base (I+E) by ≥ 10 points on a GSE-held NFL clip set — the paper clears this on its own data (51.6 vs 37.5), but the data can't exist for NFL.

## 14. Improvement experiment
Within the paper's own lane: replace the self-supervised event-flow + forward-warp blur synthesis (which adds only +0.2 mAP standalone) with a **learned blur operator trained on real blur–sharp pairs** (e.g., from the EHPT-XC triplet camera, which has genuine paired sharp/blurry frames) — train a small network to map sharp+events → realistic blur via direct supervision, then use it as the Stage 1 augmentation. Hypothesis: the current synthesis underperforms because forward warping + a translation loss only approximates the true continuous-blur formation process; a directly supervised blur generator would widen the Stage 1 teacher's blur-domain coverage and lift the Stage 2 starting point above 49.1 mAP. Second arm: ablate event data at training time entirely (train the 4-stage pipeline on RGB-only synthetic blur from a kernel-agnostic blur model) to test how much of the +14.1 mAP gain actually requires events vs. just being good semi-supervised practice.
