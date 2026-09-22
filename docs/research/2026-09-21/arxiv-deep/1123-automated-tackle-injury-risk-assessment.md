# [1123] Automated Tackle Injury Risk Assessment (arXiv:2104.10916v1)

**Citation:** (authors as listed on arXiv). *Automated Tackle Injury Risk Assessment*. arXiv:2104.10916v1. URL: https://arxiv.org/abs/2104.10916
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; entire paper including references read).
**Verdict:** REJECT — replaced by reserve ledger 1312 (arXiv:2608.21530v1). A REJECT never counts toward the 750 target.

## 1. Research question
Can computer vision automatically assess head-injury risk in rugby tackles from broadcast video — detecting players and the ball (YOLOv4), tracking them (Kalman filtering/smoothing), locating heads (OpenPose), and flagging tackles where the ball carrier's head enters a fixed "high-risk" height region?

## 2. Dataset / schema
- Ball detector trained on **551 images**. Evaluation corpus: **109 front-on one-on-one tackle clips**.
- Only **58** clips ran without intervention; 6 more required manual parameter changes → **64/109** evaluated successfully. (45 clips — 41% — could not be processed even with manual tuning.)

## 3. Method / model
- Pipeline: YOLOv4 ball/person detection → Kalman filter/smoother tracking → OpenPose head centers → fixed head-height thresholds defining "risk regions" (15% and other levels) → binary high/low-risk label per tackle.

## 4. Equations & assumptions
- No novel equations stated; standard YOLO/Kalman/OpenPose components. Assumptions: (a) fixed head-height thresholds define injury risk; (b) a heuristic high/low-risk label is a valid proxy for injury; (c) manual parameter tuning on evaluation clips is acceptable.

## 5. Features / target
- Features: video frames of tackles. Target: heuristic binary high/low injury-risk label (no prospective injury data — no actual concussions/injuries observed).

## 6. Validation design
- Evaluated on 64 successful clips (of 109); manual tuning allowed on 6 of them. Metrics: accuracy, F1, Cohen's κ.

## 7. Numerical results / baselines
- At the 15% risk region: accuracy **62.50%** on the 64 successful clips; **36.70%** counted over all 109; **F1 0.50**; **Cohen's κ 0.28** (fair agreement).

## 8. Code / data availability
- None stated in paper.

## 9. Leakage & limitations (reasons for rejection)
- **41% processing failure rate** (45/109 clips unusable) — the pipeline does not work on nearly half its own small corpus. **Manual parameter changes on evaluation clips** — test-set tuning. No prospective injury target — the label is a heuristic, not an outcome. κ = 0.28, F1 = 0.50 — weak even on the selected 64. Small selected sample (n=64), rugby (not NFL), fixed thresholds with no calibration. Nothing here meets the bar for GSE value: it is a fragile proof of concept, not a portable method.

## 10. GSE overlap
- Related injury ledgers: `0768-early-detection-injuries-mlb-pitchers-video.md`, `0772-multimodal-injury-risk-prediction-in-tennis.md`, `1120-predicting-ulnar-collateral-ligament-injury-rookie.md`. Even within the injury cluster this paper adds nothing portable — the method is the failure.

## 11. GSE implementation spec
- None — rejected. No implementation recommended.

## 12. Reproducible test
- Not applicable — rejected.

## 13. Acceptance / rejection gate
- **REJECT.** Fails every gate: success rate too low, evaluation compromised by manual tuning, no real injury target, weak metrics, no portable method.

## 14. Improvement experiment
- Not applicable — rejected. (The reserve replacement, 1312, is the path forward for the injury-prediction slot.)
