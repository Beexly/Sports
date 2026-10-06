# [0346] Bridging the Gap: Doubles Badminton Analysis with Singles-Trained Models (arXiv:2508.13507v1)

**Citation:** Seungheon Baek, Jinhyuk Yun (2026). *Bridging the Gap: Doubles Badminton Analysis with Singles-Trained Models*. arXiv:2508.13507v1. URL: https://arxiv.org/abs/2508.13507v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 694 lines).
**Verdict:** REJECT — the doubles "validation" is two matches with thresholds tuned on the same data, so the transfer claim is unsupported; the pipeline is standard components with no transferable novelty for GSE.

## 1. Research question
Can models trained on singles badminton (abundant broadcast footage) transfer to doubles (scarce footage) for shot classification? The pipeline does player tracking (YOLOv11x + BoT-SORT), court-ROI detection, constant-velocity ID repair, pose estimation (ViT-Pose, 17 COCO joints), contrastive pose embeddings (ST-GCN + NT-Xent), and a two-layer Transformer shot/not-shot classifier — trained on singles, evaluated on doubles.

## 2. Dataset / schema
- **Training:** 40 ShuttleSet singles videos; shot/not-shot labels on 15-frame sequences; normalized relative pose; separate front/back-court models; horizontal-flip augmentation. Training class balance: 30 male / 10 female videos.
- **Doubles validation:** one men's match + one women's match; balanced shot/not-shot sampling; 1,698 frames (men) and 1,276 frames (women).
- Access: code/weights at https://github.com/100-heon/badminton_double_analysis (stated).

## 3. Method / model
YOLOv11x detection + BoT-SORT tracking; court ROI detector restricts to in-court players; constant-velocity ID repair: predicted center \(S(t_s+t) = S(t_s) + [S(t_s)-S(t_s-1)]t\), reassigning within 200 pixels (typical gaps <10 frames). ViT-Pose extracts 17 COCO joints per player; a 4-block ST-GCN produces 64-d contrastive embeddings (NT-Xent); a two-layer Transformer classifies 15-frame sequences as shot/not-shot with cross-entropy. Separate models for front-court and back-court.

## 4. Equations & assumptions
- ID repair prediction: \(S(t_s+t) = S(t_s) + [S(t_s)-S(t_s-1)]t\) (constant-velocity extrapolation), reassignment within 200 pixels.
- Assumptions: (1) singles-trained pose embeddings transfer to doubles configurations; (2) shot mechanics are view- and formation-invariant enough for the classifier to generalize; (3) the 200-pixel reassociation threshold is appropriate (resolution- and camera-dependent — not normalized); (4) doubles can be evaluated with the same shot/not-shot framing as singles.

## 5. Features / target
Input features: 15-frame sequences of normalized relative 2D pose (17 joints) per tracked player, as 64-d ST-GCN embeddings. Target: binary shot/not-shot classification per sequence. No temporal localization beyond the 15-frame window.

## 6. Validation design
Singles: threshold .50 for "Ours", .57 for the YOLO baseline (thresholds stated, selection protocol not). Doubles: threshold .86 for "Ours" — **optimized on the same two-match validation set it is evaluated on**. Only two doubles matches total (one men's, one women's); no independent test set; no cross-validation. The "19.3% vs 39.9% degradation" framing compares models at different, separately-tuned thresholds.

## 7. Numerical results / baselines
- Singles — Ours (thr .50): **accuracy .8617, precision .8977, recall .8973, F1 .8975**; YOLO baseline (thr .57): **.9876, .9880, .9874, .9877**.
- Doubles (all) — Ours (thr .86): **accuracy .6686, precision .6311, recall .8124, F1 .7104**; men: **.7020/.6644/.8163/.7326**; women: **.6389/.6028/.8182/.6941**; YOLO baseline: **.5941/.5962/.5837/.5899**.
- Authors' framing: degradation of 19.3% (ours) vs 39.9% (YOLO). Note the YOLO baseline is far stronger on singles (.9876 accuracy) and collapses harder — but both thresholds were tuned per-set, so the comparison is not clean.

## 8. Code / data availability
Code/weights: https://github.com/100-heon/badminton_double_analysis (stated). ShuttleSet data: public (cited).

## 9. Leakage & limitations
- **Threshold tuning on the test set:** the doubles threshold (.86) was optimized on the same two matches used for evaluation — the reported doubles numbers are in-sample for the threshold and cannot be trusted as transfer performance.
- **Two matches total:** one men's, one women's — no basis for a generalization claim; no independent test set.
- **Training imbalance:** 30 male / 10 female singles videos; the women's doubles result is worse (.6389 vs .7020 accuracy) and the paper does not examine whether this reflects the training skew.
- **200-pixel reassociation rule** is resolution- and camera-dependent, not normalized — brittle across broadcast setups.
- **Broadcast-angle dependence:** all footage is broadcast badminton; no test of viewpoint robustness.
- The YOLO baseline comparison is apples-to-oranges (different per-set thresholds; YOLO is a detector repurposed as a classifier baseline).
- NFL external validity: badminton doubles formation transfer has no NFL analog; the components (BoT-SORT, ViT-Pose, ST-GCN, Transformer classifier) are all standard with no novel transfer mechanism demonstrated.

## 10. GSE overlap
Per the existing-research map: GSE's video/perception work is nascent and the NGS lane works from tracking data, not pose-based shot classification. This would nominally be a **new capability** (pose-based event classification from broadcast), but the transfer claim — the paper's entire point — is invalidated by test-set threshold tuning. There is no reliable finding to port. No duplication; no adoption.

## 11. GSE implementation spec
None recommended — REJECT verdict. The general idea (train event classifiers on abundant single-entity data, transfer to multi-entity) is not demonstrated here. If GSE ever pursued pose-based event detection from NFL film, the correct protocol would be: fixed thresholds from validation, a held-out test set of ≥20 games, and per-formation (not per-match) evaluation — i.e., a different study.

## 12. Reproducible test
Not applicable (REJECT). The paper's own evaluation protocol (tune threshold on the eval set) is the flaw; re-running it would reproduce the flaw, not test the claim.

## 13. Acceptance / rejection gate
**Reject.** Reference gate for any future singles→doubles-style transfer claim: fixed decision threshold from a validation split, evaluation on ≥10 held-out matches never used in tuning, and reported per-match variance. This paper (threshold tuned on 2 eval matches, no held-out test) fails that gate by design.

## 14. Improvement experiment
The honest version of this paper: freeze the singles-trained classifier and its threshold on singles validation, then evaluate zero-shot on 20+ held-out doubles matches with per-match F1 and a formation-conditioned analysis (does transfer fail on specific doubles rotations?). Then test whether a small amount of doubles fine-tuning (few-shot, 1–5 matches) closes the gap — distinguishing "transfer works" from "fine-tuning works," which the current paper conflates.
