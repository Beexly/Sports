# [0387] A Simple and Effective Temporal Grounding Pipeline for Basketball Broadcast Footage (arXiv:2411.00862)

**Citation:** Levi Harris (2024). *A Simple and Effective Temporal Grounding Pipeline for Basketball Broadcast Footage*. arXiv:2411.00862. URL: https://arxiv.org/abs/2411.00862
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1259 lines).
**Verdict:** ADAPT — a simple, open-source video↔play-by-play temporal grounding recipe (fine-tuned YOLOv8l detects semantic scorebug text regions directly; PaddleOCR reads them; linear-trend denoising + interpolation fills gaps) that is exactly the data-infrastructure step GSE's NGS-replacement video lane needs: aligning broadcast film to event logs before any video analytics. Adapt the ROI classes to the NFL scorebug.

## 1. Research question
How can basketball broadcast footage be temporally aligned to pre-labeled play-by-play annotations — cheaply, generally across broadcasters, and at cluster scale — so that labeled video segments for action-recognition datasets can be retrieved without manual indexing? The paper's answer: skip clock localization; fine-tune YOLOv8l to detect *semantic* text regions (quarter, time-remaining) directly, read them with out-of-the-box PaddleOCR, then denoise/interpolate using the known linear clock trend. 91/97 ≈ 93.81% of sampled frames read perfectly before post-processing.

## 2. Dataset / schema
- **Custom text-ROI dataset:** ~30,000 frames sampled from Hudl basketball broadcasts spanning NBA, WNBA, Euroleague, NCAA, WNCAA, and US high-school leagues; each frame labeled (CVAT) with quarter and time-remaining bounding boxes. Annotation accelerated via the static-clock property (define ROI once, propagate across frames).
- **Evaluation corpus:** a pre-segmented (by period) basketball broadcast corpus at 30 fps; 97 randomly sampled frames used for the headline accuracy figure.
- Proprietary (Hudl-sourced); the trained pipeline code is public but the 30k-frame label set is not stated to be released.

## 3. Method / model
- **Stage 1 — semantic ROI detection (§III-B):** YOLOv8l fine-tuned 130 epochs (Ultralytics defaults, heavy augmentation, ~8 h on a single T4) to directly output *quarter* and *time-remaining* boxes — unlike prior work ([6] Shah et al. 2021) which detects generic clocks then maps strings to semantics via knowledge constraints. Confidence gate: detection accepted when C = Pr(object) × IoU exceeds threshold T for both regions; empty dict if none found. Frames read at fixed step interval t.
- **Stage 2 — OCR (§III-C):** PaddleOCR out-of-the-box (its own text detection disabled), crops resized to **90 DPI**, no other preprocessing — "far better in practice for digital text recognition than PyTesseract and EasyOCR" per the author.
- **Stage 3 — denoising + interpolation (§III-D):** two-stage: (a) outlier removal against the expected negative linear clock trend at 30 fps (Eqs. below); (b) interpolation across monotonically decreasing values to fill occlusions/missing detections.
- **Stage 4 — parallelization (§III-E):** multi-threaded frame processing; linear speedup (2 workers → 50% runtime reduction, 4 → 75%) on a MacBook M3.

## 4. Equations & assumptions
- Expected clock trend: `T = T₀ − (1/30)·n`, T₀ = period-start time remaining, n = frames elapsed (30 fps).
- Outlier removal: `T′ = {t ∈ T : |t − t̂| < θ}`, t̂ = temporally consistent estimate, θ = threshold.
- Interpolation: `T_interp = interp(T′, x)`.
- Detection confidence: `C = Pr(object) × IoU`, accept if C > T.

Assumptions: (a) the scorebug clock is visible most of the time (videos with persistently missing clocks are discarded — "very challenging," left to future work); (b) game clock follows the known linear trend (fails during ad breaks — corpus is pre-segmented by period); (c) text ROIs are static within a broadcast (brief occlusions handled by interpolation); (d) 90-DPI crops are sufficient for OCR across broadcast resolutions.

## 5. Features / target
Input features: raw broadcast video frames (30 fps). Target: per-frame (quarter, time-remaining) timestamps → video-to-play-by-play alignment index. Horizon: N/A (offline corpus processing).

## 6. Validation design
No formal benchmark table and no external baseline comparison — the paper explicitly states "this work does not represent an advancement to the state of the art." Validation: (a) 97 randomly sampled frames, 91 read perfectly (93.81%) before post-processing; (b) "passes visual inspection" aligning footage to 2D player positions "in most cases"; (c) anecdotal: best on high-resolution homogeneous broadcasts; noisy/occluded clocks handled by interpolation, missing clocks force discarding. Comparison to prior work ([5], [6], [7]) is qualitative/methodological (simplicity, generality) rather than numeric.

## 7. Numerical results / baselines
Quoted exactly:

- **91/97 (≈93.81%)** of randomly sampled basketball broadcast frames yield perfectly extracted text before any post-processing.
- Training: 130 epochs, ~8 hours on a single T4 GPU, ~30,000 annotated frames.
- Parallelization: 2 workers → 50% runtime reduction; 4 workers → 75% reduction (linear scaling on MacBook M3).
- No precision/recall/F1 on ROI detection, no OCR character-error rate, no end-to-end alignment accuracy vs. ground-truth timestamps — the quantitative evidence is the single 91/97 figure plus visual inspection.

## 8. Code / data availability
Code: https://github.com/leharris3/contextualized-shot-quality-estimation/tree/temporal-grounding-pipeline (stated in abstract). Label set (~30k Hudl frames) not stated to be released.

## 9. Leakage & limitations
- **Single accuracy number, no error analysis:** 91/97 on an unspecified sample; no breakdown by league/broadcaster/resolution, no detection mAP, no CER — cannot assess where it fails.
- **Basketball-only ROI classes:** quarter + time-remaining. NFL needs down/distance, quarter, game clock, play clock — a different (larger) label set; the *recipe* transfers, the trained model doesn't.
- **Discards hard cases:** videos with missing/persistently occluded clocks are dropped, not solved — NFL RedZone-style whip-around and highlight packages often lack a persistent scorebug.
- **Pre-segmented input assumed:** the linear-trend denoiser needs period boundaries; NFL broadcasts need commercial-break and quarter-break segmentation first.
- **30 fps assumption** is hardcoded in the trend equation; 60 fps or variable-frame-rate sources need re-derivation.
- **External validity to NFL:** the method is broadcaster-agnostic by design (trained across 6 league levels), which is encouraging for NFL's multi-network broadcasts (CBS/FOX/NBC/ESPN/Amazon each have distinct scorebugs) — but NFL scorebugs are denser and more dynamic (down/distance updates every play), so the label set and interpolation logic need redesign, not just retraining.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: (a) **2026-09-18 NGS replacement spec** — building NGS equivalents from public data; temporally grounding broadcast film to play-by-play is the *first* pipeline step of that lane (no alignment → no labeled video → no video analytics); (b) **0384 GTA** (this wave) — tracker refinement that consumes aligned video; this paper supplies the alignment GTA would need; (c) **2026-09-21 NGS profile deep-dive** — the event logs to align against (play-by-play) are abundant and public. Status: **new infrastructure capability, no duplication** — nothing in the repo does video↔PBP alignment.

## 11. GSE implementation spec
- **Placement:** stage 0 of the NGS-replacement video pipeline: ingest broadcast film → detect NFL scorebug ROIs (quarter, game clock, play clock, down, distance, possession) with a fine-tuned YOLOv8l → PaddleOCR → trend-based denoising (game clock linear within a drive-aware segmentation; play clock resets) → align to nflverse play-by-play → emit per-play video segments for all downstream video analytics (tracking in §0384, pose in §0383, action labels in §0379).
- **Adaptations:** (1) new label set (down/distance/line-to-gain are the hard ROIs — small text, update every play); (2) commercial-break/quarter-break segmentation before trend denoising; (3) per-network scorebug fine-tuning or domain-adversarial training across CBS/FOX/NBC/ESPN/Prime; (4) play-clock reset logic replaces the monotonic basketball trend.
- **Effort:** 2–3 engineer-weeks: annotate ~5–10k NFL scorebug frames (CVAT, same static-ROI trick), fine-tune YOLOv8l, wire PaddleOCR + interpolation, validate against nflverse timestamps. Cheap for what it unlocks.

## 12. Reproducible test
Dataset: 10 full NFL broadcast games (2 per network: CBS, FOX, NBC, ESPN, Prime), game-disjoint from training frames. Pipeline: YOLOv8l scorebug detection + PaddleOCR + trend denoising → per-play segment boundaries. Metric: segment-boundary accuracy vs. nflverse play timestamps — % of plays whose extracted (quarter, game-clock) matches PBP within ±2 s, and ROI detection mAP. Baseline: the paper's exact recipe retrained on NFL labels (the test *is* the adaptation). Runnable once the NFL label set is annotated.

## 13. Acceptance / rejection gate
**Adopt as the video lane's alignment stage if** ≥90% of plays align within ±2 s of nflverse timestamps on held-out networks (a network not in training must be in the test set — the generality claim is the whole point); **reject if** per-network retraining is required (that would make it a per-broadcaster snowflake, defeating the paper's generality argument) or if scorebug-absent segments (RedZone, highlights) dominate the target corpus. Do not adopt for any non-video purpose — it is data infrastructure, not a model.

## 14. Improvement experiment
Beyond the paper: **event-driven scorebug reading.** The paper reads every frame and interpolates; for NFL, scorebug *changes* are the signal (down/distance updates discretely per play). The experiment: a change-detection front end that only OCRs frames where the scorebug region's frame-difference exceeds a threshold, then diffs consecutive reads to emit a discrete event stream (Q2, 3:42, 3rd&7) — cutting OCR compute ~10× and producing play boundaries directly instead of via timestamp matching. Test: event-stream F1 vs. nflverse play starts, and GPU-hours per game vs. the paper's every-frame recipe. This is the version that scales to a full season of film.
