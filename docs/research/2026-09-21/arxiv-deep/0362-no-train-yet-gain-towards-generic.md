# [0362] No Train Yet Gain: Towards Generic Multi-Object Tracking in Sports and Beyond (arXiv:2506.01373)

**Citation:** Stanczyk, T., Yoon, S., Bremond, F. (2025). *No Train Yet Gain: Towards Generic Multi-Object Tracking in Sports and Beyond*. arXiv:2506.01373 (June 2025). URL: https://arxiv.org/abs/2506.01373
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2397 lines).
**Verdict:** ADAPT — the regulated mask-cue fusion (ambiguity/isolation gating with mc/mf conditions) is a transferable design pattern for any GSE player-tracking stack, but the SAM+Cutie pipeline at 3–5 FPS is too heavy to adopt as-is; use the gating logic with a lighter segmentation backbone or offline processing.

## 1. Research question
Can temporally propagated segmentation masks serve as an *association cue* inside a training-free tracking-by-detection pipeline (McByte) to fix the two failure modes of IoU/Kalman association in sports — ambiguous overlaps (occlusions, players jammed together) and isolation (blur, abrupt camera motion) — without the per-video hyperparameter tuning that existing trackers require?

## 2. Dataset / schema
- **SportsMOT** (Cui et al. 2023): basketball, volleyball, football scenes; fast camera motion, variable player speeds; YOLOX detections pre-trained on SportsMOT.
- **DanceTrack** (Sun et al. 2021): dancers, non-linear motion, near-constant subject count; YOLOX pre-trained on DanceTrack.
- **SoccerNet-tracking 2022** (Cioppa et al. 2022): soccer broadcast videos, similar-appearance teammates, constant camera motion; oracle detections provided.
- **MOT17** (Milan et al. 2016): pedestrians, generalisation check; YOLOX pre-trained on MOT17.
- All datasets public; same community-standard detections used for McByte and all baselines (fair comparison). No new data collected.

## 3. Method / model
McByte = ByteTrack baseline (Kalman filter + IoU association + Hungarian matching, high/low-confidence detection split) + two additions:
1. **Mask cue:** SAM (ViT_b, original weights) creates a segmentation mask for each new tracklet; Cutie (base mega weights) temporally propagates each mask forward. The mask is *not* used blindly — it is applied only in two regulated cases: **ambiguity** (IoU-based cost below matching threshold for more than one tracklet–detection pair in a row/column) and **isolation** (all IoU costs above threshold, so no match possible).
2. **Regulated gating — 4 conditions must all hold** before a cost-matrix entry is updated: (1) the tracklet's TP mask is visible this frame; (2) mean pixel confidence of the mask > 0.6; (3) mask fill ratio of the detection box mf = |mask ∩ bbox|/|bbox| > 0.05; (4) bounding-box coverage of the mask mc = |mask ∩ bbox|/|mask| > 0.9. Update rule: costs^{i,j} = costs^{i,j}_{IoU} − mf^{i,j} if all conditions hold, else costs^{i,j}_{IoU}. mc gates but never directly modifies cost (multiple masks can fit in one box with mc=1.0 — misleading).
3. **Camera motion compensation:** ORB keypoints → warp matrix applied to Kalman-predicted tracklet boxes (following StrongSORT/DiffMOT practice).
4. Fixed detection threshold 0.6 and fixed mask thresholds (0.6/0.9/0.05) across *all* sequences and datasets — no per-sequence tuning, deliberately.

## 4. Equations & assumptions
- mc^{i,j} = |mask(tracklet_i) ∩ bbox_j| / |mask(tracklet_i)|, mc, mf ∈ [0,1].
- mf^{i,j} = |mask(tracklet_i) ∩ bbox_j| / |bbox_j|.
- costs^{i,j} = { costs^{i,j}_{IoU} − mf^{i,j}, if conditions (1)–(4) satisfied; costs^{i,j}_{IoU}, otherwise }.
- **Assumptions:** SAM masks initialised from detector boxes are trustworthy seeds; Cutie propagation stays identity-consistent across occlusions; ambiguity/isolation as defined from IoU thresholds capture the cases where masks help; thresholds (0.6/0.9/0.05) are dataset-generic (sensitivity analysis says performance is flat nearby).

## 5. Features / target
- **Inputs:** video frames; per-frame detection bounding boxes (YOLOX, community weights); per-tracklet SAM mask + Cutie-propagated mask; Kalman-predicted boxes; ORB camera-motion warp.
- **Outputs:** tracklets (persistent object IDs across frames) — standard MOT output.

## 6. Validation design
- **Splits:** dataset-standard test sets (SportsMOT test, DanceTrack test, SoccerNet-tracking 2022 test, MOT17 test); ablations on DanceTrack validation.
- **Metrics:** HOTA (primary), IDF1, MOTA.
- **Baselines:** ByteTrack (no per-sequence tuning variant too), MixSort-Byte/OC, OC-SORT, Deep OC-SORT, StrongSORT++, Hybrid-SORT, C-BIoU (implemented from paper, fixed hyperparams), GeneralTrack, DiffMOT; mask-based systems DEVA, Grounded SAM 2, MASA (original + YOLOX variants); transformer/joint/global methods listed for reference (MOTR, MOTIP, SUSHI, FairMOT, CenterTrack).
- **Key design choice:** same detections for all methods; no training of any component.

## 7. Numerical results / baselines
- **Ablation (DanceTrack val, HOTA/IDF1/MOTA):** baseline 47.1/51.9/88.2 → a1 (mask-only association) 48.6/**44.4**/80.8 (IDF1 *drops* — uncontrolled mask use is harmful) → a2 (mask-or-IoU) 45.3/41.5/82.2 → **a3 (+ambiguity/isolation fusion) 56.6/57.0/89.5** → a4 (+mask confidence) 57.3/57.7/89.6 → a5 (+mf check) 58.8/60.1/89.6 → a6 (+mc check) 62.1/63.4/89.7 → **McByte (+CMC) 62.3/64.0/89.8**.
- **SportsMOT test:** McByte **76.9/77.5/97.2** vs ByteTrack 64.1/71.4/95.9, OC-SORT 73.7/74.0/96.5, DiffMOT 76.2/76.1/97.1, Hybrid/MixSort-OC ~74. Transformers (MOTIP 71.9/75.0/92.9) and joint methods (FairMOT 49.3) trail.
- **DanceTrack test:** McByte **67.1/68.1/92.9**, best of all tracking-by-detection (Hybrid-SORT 65.7/67.4/91.8; Deep OC-SORT 61.3).
- **SoccerNet-tracking 2022 test:** McByte **85.0/79.9/96.8** vs OC-SORT 82.0/76.3/98.3 (MOTA 2nd; MOTA mostly reflects oracle detection quality).
- **MOT17 test (untuned):** McByte **64.2/79.4/80.2** — best among non-per-sequence-tuned trackers (ties DiffMOT 64.2 HOTA); MOTRv2 transformer 62.0/75.0/78.6.
- **vs mask-based trackers (SportsMOT val):** DEVA original 39.3/37.3/**−109.6** MOTA; Grounded SAM 2 +YOLOX 66.1/70.2/91.4; MASA +YOLOX 73.6/71.2/97.0; **McByte 83.9/83.6/98.9**.
- **Cost:** ~3–5 FPS on a single A100 — heavy vs ByteTrack-family baselines.

## 8. Code / data availability
"Code will be made available at https://github.com/tstanczyk95/McByte" (not yet released at paper time — verify before use). Datasets all public.

## 9. Leakage & limitations
- **Datasets double as the tuning surface:** thresholds were "chosen to be generic" but inevitably validated against these same four datasets — the no-tuning claim is weaker than stated.
- **Compute cost kills real-time use:** 3–5 FPS on an A100 for the association stage alone (SAM + Cutie per tracklet); a production pipeline would need lighter segmentation or offline batching.
- **Detector dependence:** all gains are conditional on community YOLOX weights; with a weak detector the mask cue inherits bad seeds (DEVA's negative MOTA shows how badly mask-only systems fail with poor detection).
- **No NFL evaluation:** sports tested are basketball/volleyball/soccer/dance — American football's 22 similar-uniform players + frequent pile occlusions are untested; mask propagation through a pile-up is exactly the failure mode the paper doesn't stress-test.
- **MOTA on SoccerNet:** oracle detections inflate the detection component; association gains (HOTA/IDF1) are the honest signal.
- **External validity to NFL/GSE:** the *pattern* (regulated auxiliary-cue fusion) transfers; the specific stack is too heavy and not football-validated.

## 10. GSE overlap
Garrett's corpus has no player-tracking CV work of its own: the NGS lane is taxonomy/inventory (2026-09-21), the NGS replacement spec (2026-09-18) is a *spec*, and the labelling-factory concept appears in ledgers 0359/0360 of this wave (tennis annotation tool, MLLM hybrid). McByte is the **association algorithm that would sit inside such a factory**: GSE's envisioned pipeline (papers 1–2: YOLO detection → pose) needs exactly a multi-player identity-tracking layer for 22-player NFL footage, and McByte's regulated mask fusion is the state of the art for the occlusion/blur cases that dominate football film (line play, pile-ups). Nothing in `docs/research/` covers MOT association methods. **New capability (component for the tracking/annotation lane).**

Per the existing-research map (2026-09-21, checked for multi-object tracking coverage): no prior coverage of MOT/association methods — new ground.

## 11. GSE implementation spec
- **Where it fits:** inside the GSE Labelling Factory (ledgers 0359/0360): YOLOv11 player detection on all-22/broadcast footage → McByte-style association (Kalman + IoU + regulated mask cue) → stable per-player tracklets → pose/trajectory features for NGS-equivalent metrics.
- **Adaptations:** (1) replace SAM-ViT_b + Cutie with a lighter segmenter (e.g. SAM 2 tiny / YOLO-seg) to get above real-time or batch-process offline overnight — the 3–5 FPS cost is the blocker; (2) keep the ambiguity/isolation gating + mc/mf conditions verbatim — that is the paper's real contribution; (3) add jersey-number OCR as a second disambiguation cue for same-uniform players (football-specific, untested in the paper); (4) validate on NFL all-22-style footage, especially goal-line pile plays.
- **Effort:** 3–4 weeks to wire an offline McByte-variant into the labelling factory; gated on code release (check https://github.com/tstanczyk95/McByte — if unreleased, reimplement the gating around an available VOS model).

## 12. Reproducible test
Take 3 NFL game-film segments with heavy occlusion (goal-line stands, screen passes with blockers). Run a YOLOv11 person detector → ByteTrack baseline association vs McByte-variant association (same detections, same Kalman); metric: IDF1 and ID-switch count on manually annotated player identities (annotate ~200 tracklets); report HOTA as secondary.

## 13. Acceptance / rejection gate
ADOPT the McByte gating pattern if the McByte variant reduces ID switches by ≥ 30% vs ByteTrack on the 3-segment window with HOTA ≥ baseline; REJECT (keep ByteTrack/OC-SORT) if the gain is < 10% or throughput falls below 10 FPS offline-batch equivalent without accuracy justification.

## 14. Improvement experiment
Fuse jersey-number OCR confidence as a third association cue alongside the mask: in ambiguity cases, prefer the tracklet–detection pair whose OCR number matches the tracklet's majority-vote number — testing whether a football-specific identity cue beats the generic mask cue in same-uniform pile situations where masks are least reliable.
