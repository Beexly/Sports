# [0201] Selective Mask Propagation for Multi-Object Tracking (arXiv:2606.13033v3)

**Citation:** Alexander Holmberg (2026). *Selective Mask Propagation for Multi-Object Tracking*. arXiv:2606.13033v3. URL: https://arxiv.org/abs/2606.13033v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, v2 text fully read; v3 text verified 2026-09-21 — abstract, §1 and §3.1 confirm the 87.2 HOTA SportsMOT headline and the assignment-margin definition m_j* = C_i*,j* − min_i≠i* C_i,j* match what was read from v2).
**Verdict:** ADAPT — the margin-dispatched, gated-correction VOS design plus the jersey-number/team global track association is the right architecture pattern for GSE's video→tracks lane; adopt the dispatch and identity logic, not the SAM 3 weights or thresholds.

## 1. Research question
Can a lightweight base tracker's failure mode (identity switches under occlusion/close interaction) be fixed by dispatching an expensive video object segmentation (VOS) model *only* to temporal windows where the base tracker is provably ambiguous — keeping the base output everywhere else — so that VOS-level identity preservation is achieved at near-base-tracker cost, with the method training-free and black-box in both components?

## 2. Dataset / schema
- **SportsMOT** (Cui et al., ICCV 2023): large multi-object tracking dataset in sports scenes; basketball, football, volleyball scenes. Used for the main evaluation (test set).
- **DanceTrack** (Sun et al., 2022): uniform-appearance, diverse-motion tracking; **validation set (25 sequences)** used for the cross-tracker generalization study.
- Exact video counts, frame counts, track counts, train/val/test splits: **Not stated in paper** as recoverable from this reading (datasets are cited as prior work).
- Access: public benchmarks.

## 3. Method / model
Instantiated as **SAM-Deep-EIoU**: base tracker = Deep-EIoU [10] (expanded IoU + appearance, no Kalman), VOS = SAM 3 [3] (SAM 2 also ablated).

1. **Window creation (dispatch).** The base tracker runs on every frame and supplies the default output. Primary signal = **assignment margin** in the Hungarian cost matrix: for a matched pair (i*, j*), the margin m_{j*} is the second-best minus best assignment cost (see §4). A window opens when m_{j*} < τ_entry for any matched pair. Additional signals: **gap signal** (a track disappears for ≥ G frames and reappears — may have reattached to the wrong person) and **witness windows** (nearby tracks overlapping a primary window at entry, since the nearby track is often the counterpart in an identity switch).
2. **Seeding.** Each window needs a clean seed frame before the ambiguity: walk backward from the entry frame to find N_seed consecutive frames with margin ≥ τ_seed and no nearby overlapping boxes (high margin = confident assignment; isolation = unambiguous pixels for SAM init). Windows without a valid seed are discarded.
3. **Mask propagation.** SAM is seeded from the seed frame and propagates masks forward through the ambiguous window.
4. **Exit conditions.** A window exits when all of the following hold for N_exit consecutive frames: (1) the mask is contained by a single track (IoMA ≥ τ_IoMA), (2) that track's assignment margin has recovered above τ_exit, (3) the track's box is spatially isolated from other boxes, (4) the mask is isolated from other active masks. Where IoMA(M,B) = |M ∩ B| / |M| (intersection over mask area; M = mask pixels, B = box pixels).
5. **Asymmetric decision rule.** If the mask settled into a *different* track than seeded on → exit as **SWAP** and track IDs are renamed from the swap frame (the frame the mask first settled into the matched track). If it returned to the same track → **CLEAN**, no modification. Early terminations: **STALE** (seed invalidated — IoMA < τ_IoMA at entry, or the base tracker reassigned the seeded identity between seed and entry), **DEGRADED** (two masks converge on the same person → both discarded; or mask area collapsed vs. seed), **EDGE** (mask reached frame border and disappeared — person left the scene), **END** (propagation reached the last frame). STALE/DEGRADED/EDGE/END leave the base output untouched. The paper's stated guarantee: the *only* way the method can harm the base tracker is a false-positive SWAP; all other outcomes preserve base output.
6. **Global track association (GTA)** (sports configuration, operates on finished tracklets, offscreen re-identification): jersey numbers extracted via OCR on pose-guided torso crops [11] + team classification + appearance embeddings; hierarchical merging — tracklets with the same jersey number and team merged first, then remaining tracklets merged by appearance similarity with vetoes for temporal overlap, opposite-edge transitions, and conflicting identities; gaps filled with linear bounding-box interpolation.
- Training: none — training-free. Hyperparameters: τ_entry = 0.05 used throughout (ablated at 0.01/0.025); τ_seed, τ_IoMA, τ_exit, N_seed, N_exit, G: **Not stated in paper** as recoverable (named in algorithm/pseudocode, values not given).

## 4. Equations & assumptions
From the paper's §3 (notation as in the paper; the PDF text extraction garbled one equation — flagged below):

**Assignment margin (dispatch signal):**
- Given cost matrix C ∈ R^{N×M} with C_{i,j} the cost of assigning track i to detection j, let (i*, j*) be a matched pair from the Hungarian solution. The margin for detection j* is: m_{j*} = min_{i≠i*} C_{i,j*} − C_{i*,j*} — i.e., second-best minus best assignment cost. **(UNCERTAIN reconstruction: the PDF extraction garbled the subscripts; the semantic reading "difference between the second-best and best assignment cost" is stated verbatim in the prose, which is what I rely on.)**
- Window opens when m_{j*} < τ_entry for any matched pair.

**Mask containment:**
- IoMA(M,B) = |M ∩ B| / |M| (Eq. 2), where M = set of mask pixels, B = set of pixels within the bounding box.
- Exit condition (1): mask contained by a single track, IoMA ≥ τ_IoMA.

**Assumptions (paper's):** (a) frame difficulty in MOT is heavy-tailed — most frames are easy for a lightweight tracker (Figure 1, derived from base-tracker assignment margins on SportsMOT); (b) assignment ambiguity read from the cost matrix is a reliable proxy for identity-switch risk; (c) the VOS model, when confident, preserves identity through occlusions where box association fails; (d) asymmetric gating (only contradicting confident VOS predictions modify output) bounds the relative failure mode to false-positive SWAPs; (e) for sports: jersey numbers + team classification + appearance are stable identity cues across offscreen gaps (GTA).

## 5. Features / target
- **Inputs:** per-frame detector boxes (same detections as the base tracker — DanceTrack experiments use the same YOLOX detections across all three base trackers), the base tracker's Hungarian cost matrices and tracklets, VOS mask propagations.
- **Target:** corrected tracklet identities (rename log from SWAP windows), evaluated as identity-preservation tracking quality. No learned target — the method is training-free.
- **Prediction horizon:** n/a (offline/global pass over finished tracklets for GTA; windows are processed streaming-to-end over the sequence).

## 6. Validation design
- DanceTrack **validation set (25 sequences)**: three base trackers (SORT, ByteTrack, Deep-EIoU) with the *same* YOLOX detections, **no per-tracker tuning** — the only addition is the margin-dispatched mask propagation. No GTA or sports module here.
- SportsMOT **test set**: full sports instantiation (Deep-EIoU + selective mask propagation + GTA) vs. published methods.
- Metrics: HOTA, AssA, IDF1, MOTA. No ablations of the four exit conditions or the seed-search parameters in the recoverable text. Statistical significance testing: **Not stated in paper**.
- Train/val/test contamination: method is training-free (SAM 3 and base trackers are pretrained on other data); whether SAM 3's training data includes SportsMOT: **Not stated in paper**.

## 7. Numerical results / baselines
Quoted exactly from the paper's tables (paper claims; v3 headline numbers verified against the v3 PDF, matching the v2 text read):

**Table 1 — DanceTrack validation set, same detections, no per-tracker tuning:**
- SORT: base HOTA 39.8 → +SAM 2 45.0 (+5.2) → +SAM 3 46.1 (+6.2); AssA 23.8 → 29.9 (+6.1) → 31.1 (+7.3)
- ByteTrack: HOTA 54.6 → 60.3 (+5.7) → 61.2 (+6.6); AssA 39.0 → 46.9 (+7.9) → 48.2 (+9.2)
- Deep-EIoU: HOTA 51.7 → 57.7 (+6.0) → 59.7 (+8.0); AssA 36.7 → 44.9 (+8.2) → 47.7 (+11.0)
- Largest gains on AssA (association), consistent with the method's purpose. SAM 3 beats SAM 2 on every base tracker → supports the modular "swap in a better VOS" claim.

**Table 2 — τ_entry ablation (DanceTrack val, Deep-EIoU + SAM 3, single RTX 5090):**
- τ_entry 0.01: ΔHOTA +6.0, windows 1009, SWAPs 119, SAM seconds/frame 0.154
- τ_entry 0.025: ΔHOTA +8.0, windows 1203, SWAPs 138, SAM s/frame 0.165
- τ_entry 0.05: ΔHOTA +8.2, windows 1375, SWAPs 142, SAM s/frame 0.171
- Stricter threshold misses 23 SWAP outcomes vs. the most relaxed, costing 2.2 HOTA. Used τ_entry = 0.05 throughout.

**Table 3 — SportsMOT test set (method, HOTA / AssA / IDF1 / MOTA):**
- CenterTrack 62.7 / 48.0 / 60.0 / 90.8; MeMOTR 70.0 / 59.1 / 71.4 / 91.5; MotionTrack 74.0 / 61.7 / 74.0 / 96.6; ByteTrack 64.1 / 52.3 / 71.4 / 95.9; OC-SORT 73.7 / 61.5 / 74.0 / 96.5; DiffMOT 76.2 / 65.1 / 76.1 / 97.1; Deep-EIoU 77.2 / 67.7 / 79.8 / 96.3; NOOUGAT 85.6 / 83.0 / 92.3 / 95.9; SAM 2-Deep-EIoU 85.5 / 81.7 / 91.2 / 97.3; **SAM 3-Deep-EIoU 87.2 / 84.2 / 93.6 / 98.1** — claimed state-of-the-art across all four shown metrics. SAM 3 over SAM 2: +1.7 HOTA with dispatch/window logic fixed.

**Table 4 — per-sport breakdown (SportsMOT val, SAM 2-Deep-EIoU + GTA; superscripts = deltas over Deep-EIoU + GTA, isolating selective mask propagation):**
- Basketball: HOTA 89.9 (+5.5), AssA 88.7 (+7.0), IDF1 97.4 (+11.0)
- Football: HOTA 85.2 (+2.0), AssA 83.6 (+3.0), IDF1 91.4 (+5.0)
- Volleyball: HOTA 85.5 (+3.7), AssA 82.7 (+4.5), IDF1 92.0 (+9.0)
- Basketball benefits most (close cameras, frequent interactions); football improves least (wider views, fewer close occlusions) but still improves.

**Window outcome distribution (Figure 4):** the base output is left unchanged by ~93% of windows on SportsMOT and ~75% on DanceTrack (CLEAN/STALE/EDGE/END groupings); SWAP is the only identity-modifying outcome; DEGRADED windows are discarded without effect.

## 8. Code / data availability
**Not stated in paper** as recoverable from this reading (no code URL recovered).

## 9. Leakage & limitations
- **Pretrained-component leakage:** training-free ≠ leakage-free. SAM 3's training corpus is not disclosed in the paper; if it contains sports footage resembling SportsMOT, the SOTA number is inflated. The margin signal itself is computed from the base tracker on the eval data, which is legitimate (unsupervised at test time), but the VOS backbone is a giant pretrained model — the "no training" claim elides this.
- **Version drift resolved:** assignment lists v3; full text was read from v2, and v3's abstract/§1/§3.1 were verified to retain the 87.2 HOTA SportsMOT headline and the assignment-margin definition, so the ledger's core numbers match v3. (v1 claimed 86.8 HOTA.) The margin equation's sign convention in the PDF extraction is garbled; the qualitative definition — gap between best and second-best assignment costs, window opens when margin < τ_entry — is confirmed in v3 prose. No v3 content contradicts the ledger.
- **Football is the weakest sport:** +2.0 HOTA on football vs +5.5 on basketball — and SportsMOT "football" is soccer, not American football. NFL broadcast footage (22 players, heavy line-of-scrimmage occlusion, fast pans) is untested and strictly harder.
- **GTA depends on jersey-number OCR quality:** the offscreen re-identification module inherits OCR failure modes; no OCR accuracy numbers are reported in the recoverable text.
- **Compute is the stated primary limitation:** SAM seconds/frame ~0.15–0.17 on an RTX 5090 (DanceTrack val, amortized) — fine for batch processing, not real-time; no full-pipeline FPS reported.
- **False-positive SWAPs:** the paper's own admitted relative failure mode; no false-positive SWAP rate is quantified in the recoverable text.
- **Threshold sensitivity:** six named hyperparameters (τ_entry, τ_seed, τ_exit, τ_IoMA, N_seed, N_exit, G) with only τ_entry ablated and valued; the rest are unreported.

## 10. GSE overlap
- Existing-research-map review: no existing GSE research builds a video→tracks extractor; tracking work covers metrics on existing feeds (STRAIN etc.). This paper is a **new capability** candidate for the same lane as ledger 0008 (SportMamba): both address extracting player trajectories from raw video for sports analytics. This paper's dispatch-by-uncertainty + gated-correction pattern is complementary to 0008's Mamba motion model — 0008's pipeline could *use* this paper's margin signal to decide when to invoke expensive components.
- The GTA jersey-number OCR + team classification design directly matches the improvement experiment proposed in ledger 0008 (jersey-number-conditioned association), independently validating that direction — cite Koshkina & Elder [11] (CVPRW 2024) as the OCR framework reference.
- Not among the 64 deeply covered papers; no duplication.

## 11. GSE implementation spec
1. **Use as the orchestration pattern for GSE's broadcast-footage tracking lane:** base tracker (ByteTrack or 0008's SportMamba-style pipeline) runs every frame; expensive modules (VOS mask propagation, jersey OCR) fire only on margin-signal windows with τ_entry tuned per sport.
2. **Adopt the asymmetric decision rule verbatim:** the expensive model's output only overrides the base when it is confident *and* contradicts the base assignment — this bounds regression risk on plays the base tracker already handles.
3. **GTA for NFL:** jersey-number OCR on pose-guided torso crops (Koshkina & Elder 2024) + team (jersey-color) classification + appearance embeddings, hierarchical merge (number+team first, then appearance with temporal-overlap/opposite-edge/conflicting-identity vetoes), linear interpolation gap-fill. This handles broadcast camera cuts and offscreen exits.
4. **Seed/exit thresholds:** re-derive τ_entry/τ_exit/N_exit on NFL All-22-style footage — do not port the 0.05 value; football's wide views produce fewer near-tied assignments.
5. **Effort:** moderate — the algorithm is specified as pseudocode (Appendix A) and is training-free; the work is engineering (SAM integration, OCR, NFL-tuned thresholds) plus annotation for evaluation.

## 12. Reproducible test
- **Dataset:** GSE-annotated set of ~200 NFL broadcast plays (balanced run/pass, heavy-occlusion line plays included), ground-truth boxes at ~10 Hz.
- **Metric:** HOTA and AssA (the paper's association-sensitive metrics).
- **Baseline to beat:** the same base tracker *without* selective mask propagation, same detections — measure ΔHOTA on NFL footage specifically.
- **Window:** fixed annotation set; also reproduce the τ_entry ablation (0.01/0.025/0.05) to verify the compute-vs-recall tradeoff holds on football.

## 13. Acceptance / rejection gate
- **ADAPT the dispatch + gated-correction design** if, on the NFL annotation set, adding margin-dispatched VOS improves AssA by ≥ 3.0 points over the base tracker with the same detections, and false-positive SWAPs (measured by manual review of a SWAP sample) stay below 10% of SWAP windows.
- **REJECT** if ΔAssA < 3.0 points, if the SWAP false-positive rate ≥ 10%, or if per-play VOS compute exceeds the batch-processing budget — the paper's own limitation is compute, and NFL footage has more players per frame than SportsMOT scenes.

## 14. Improvement experiment
Beyond the paper: **learned dispatch calibration.** Replace the fixed τ_entry with a small calibrated classifier (logistic regression on margin, box overlap count, occlusion duration, camera-motion magnitude) trained to predict whether a window will exit as SWAP, using the paper's own window outcomes as labels. Why it might win: Figure 4 shows 75–93% of windows leave the base output unchanged — a learned dispatcher could cut VOS invocations substantially below the fixed-threshold frontier, directly attacking the paper's stated primary limitation (compute) while preserving SWAP recall.
