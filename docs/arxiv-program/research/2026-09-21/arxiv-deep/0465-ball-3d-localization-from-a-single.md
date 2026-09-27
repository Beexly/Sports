# [0465] 3D Ball Localization From A Single Calibrated Image (arXiv:2204.00003v3)

**Citation:** Van Zandycke, G., De Vleeschouwer, C. (2022). *3D Ball Localization From A Single Calibrated Image*. arXiv:2204.00003v3. URL: https://arxiv.org/abs/2204.00003v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1635 lines).
**Verdict:** REJECT — a solid single-frame basketball ball-depth estimator (diameter regression + camera geometry), but its ~2 m error, annotation-by-motion-model circularity, and basketball-only evidence give it no path into GSE's probability engine, which consumes tracking data rather than extracting it from broadcast video.

## 1. Research question
Can the 3D position of a ball be estimated from a **single** calibrated monocular image — without ballistic/trajectory assumptions or multi-view geometry — by training a CNN to regress the ball's apparent diameter in pixels and converting diameter to depth via the known real ball diameter and camera calibration?

## 2. Dataset / schema
- **DeepSport:** 314 panoramic basketball images, 15 scenes, ball sizes 14–37 px, 2–5 Mpx; ground-truth 3D via a motion-model fit on ballistic sequences (the same team's earlier dataset).
- **Extended DeepSport:** 1,514 images, 49 scenes, 14–45 px (under NDA — not public).
- **High-quality evaluation set:** 233 images from 35 ballistic trajectories, 2 scenes, 19–40 px, 2336×1752 — the clean benchmark.
- **APIDIS:** 4,019 images, 1 scene, 5–27 px, 800×600 (cross-dataset generalization check).
- Schema: image, camera calibration matrix K, ball 2D center, annotated diameter (px), 3D position.

## 3. Method / model
- **BallSeg** detector generates ball candidates; a **VGG16-based CNN** (ImageNet-pretrained) takes 64×64 crops and jointly (a) regresses ball diameter in pixels and (b) classifies ball vs non-ball.
- **Loss:** binary cross-entropy for presence + Huber loss (δ=1.0) for diameter, weighted by α=0.5 (paper's Eqs. 1–3).
- **Training:** batch 16 (4 images × k=4 candidates), 100 epochs, Adam starting lr 1e-4 halved every 2 epochs from epoch 50; 8 repetitions; mean ± std reported.
- **Geometry:** diameter → depth via calibrated projection (paper's Eqs. 4–7: camera matrix K, ray back-projection, 3D position from apparent size).
- **Baseline:** Hough Circle Transform (HCT, ρ=37, τ_l=10, τ_h=20) diameter estimator + the same geometry; plus an "Oracle" detector variant (perfect candidates) to isolate regression error.

## 4. Equations & assumptions
Paper's equation spine: combined detection+regression loss L = BCE + α·Huber(δ=1.0) (Eqs. 1–3, α=0.5); camera projection with calibration matrix K (Eq. 4); ray back-projection from the ball center (Eqs. 5–6); 3D position from apparent diameter d and known real diameter D (Eq. 7); ballistic motion model F used for annotation (Eq. 8); least-squares trajectory fit (Eq. 9); candidate selection by argmax of the ball-presence score (Eq. 10). Stated assumptions: camera calibration K is known; the real ball diameter D is known and constant; the ball is approximately spherical (basketball); candidates from BallSeg contain the true ball; annotation-by-motion-model (frictionless free fall) is accurate enough for ground truth.

## 5. Features / target
- **Input:** 64×64 RGB image patches (ball candidates from BallSeg).
- **Target:** ball diameter in pixels (regression) + ball/no-ball label (classification); downstream 3D position via Eq. 7.
- Horizon: single frame; no temporal information.

## 6. Validation design
- DeepSport fold A as test (arena-exclusive); extended DeepSport for training scale; the 233-image high-quality set as the clean benchmark; APIDIS for cross-dataset generalization.
- 8 training repetitions; metrics: true-positive rate, MAE in pixels, MAE in meters, MAE in relative %.
- Ablations isolating the detector (BallSeg vs Oracle) and the regressor (CNN vs HCT).

## 7. Numerical results / baselines
Paper's Table 2 (exact, mean ± std over 8 runs):
| Setting | TP | MAE [px] | MAE [m] | MAE [%] |
|---|---|---|---|---|
| DeepSport, BallSeg+HCT | 47±7 | 4.9±.8 | 6.3±1.0 | 28±5 |
| Eval set, BallSeg+HCT | 83±2 | 4.6±.5 | 5.1±.5 | 24±4 |
| DeepSport, BallSeg+CNN | 47±7 | 1.6±.1 | 2.3±.2 | 10±.9 |
| Eval set, BallSeg+CNN | 83±2 | 1.6±.2 | 1.8±.2 | 10±.7 |
| DeepSport, Oracle+CNN | 100±0 | 1.9±.1 | 2.8±.2 | 12±.6 |
| Eval set, Oracle+CNN | 100±0 | 1.5±.1 | 1.7±.1 | 10±.5 |
Headline: the CNN cuts diameter MAE from ~4.9 px (HCT) to 1.6 px, which projects to <2 m 3D error and ~10% relative error (paper's Figure 4). All numbers are the paper's claims.

## 8. Code / data availability
Code stated: https://github.com/gabriel-vanzandycke/deepsport. Ballistic raw sequences stated: https://www.kaggle.com/gabrielvanzandycke/ballistic-raw-sequences. (Links as stated in the paper; not fetch-verified in this offline review.)

## 9. Leakage & limitations
- **Annotation circularity:** ground-truth 3D positions are produced by fitting a frictionless-free-fall motion model — the same physics the method claims not to need at inference. Systematic model error (drag, spin) is baked into the "truth."
- **Error scale:** ~1.8–2.3 m MAE even with the CNN; for NFL applications (catch point, goal-line, first-down marker) this is an order of magnitude too coarse.
- **Basketball-only:** spherical ball, indoor lighting, constrained court; American footballs are prolate spheroids whose apparent "diameter" varies with orientation — the core geometric assumption breaks.
- **Calibration requirement:** needs per-image camera calibration K; NFL broadcast feeds have zooming/panning cameras with unknown per-frame intrinsics.
- **Detector bottleneck:** BallSeg true-positive rate is only 47±7 on DeepSport (83±2 on the clean eval set) — the pipeline misses most balls in the wild before regression even runs.
- **APIDIS generalization** is reported weakly; cross-arena robustness is unproven at the level a production system needs.
- External validity to NFL probability modeling: none — GSE consumes tracking data; it does not extract ball positions from video.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's video/perception work is nonexistent — the tracking lane is a consumer taxonomy (NGS 27 families) plus an NGS-replacement spec that deliberately builds from public *data* rather than video. The companion paper in this same wave (0461, context-aware displacement regression by the same authors) is the related work, not a GSE duplicate. This paper is therefore **not a duplicate** of anything in the map, but it answers a question GSE isn't asking: the engine needs better probabilities from tracking features, not ball positions from pixels. Verdict rationale: reject for the engine; file as a reference for a hypothetical future broadcast-video extraction lane.

## 11. GSE implementation spec
No build for the probability engine. If a broadcast-video lane is ever authorized: replicate the BallSeg + diameter-regression pipeline on NFL All-22/broadcast frames, replacing the spherical-ball assumption with an orientation-aware ellipsoid model and estimating per-frame calibration from field-line homographies; training data would need manual 3D annotation (e.g., from synchronized multi-angle replays). Effort: 6–10 engineer-weeks for a prototype, high risk. Explicitly out of current scope.

## 12. Reproducible test
Run the authors' released `deepsport` code on their 233-image evaluation set and check that BallSeg+CNN reproduces MAE 1.6±0.2 px / 1.8±0.2 m within one standard deviation. If it fails to reproduce, the paper's headline numbers are unreliable even in-domain. (Cheap verification; no GSE data needed.)

## 13. Acceptance / rejection gate
**Adopt** (into a future video lane) only if an NFL-adapted prototype achieves median 3D catch-point error ≤ 0.5 m on a held-out game with broadcast camera motion — the threshold for first-down-line features. **Otherwise reject.** The paper's own 1.8 m best-case error already fails this gate by ~4×, so the lane stays closed pending a fundamentally better method.

## 14. Improvement experiment
Attack the paper's two bottlenecks jointly: (a) replace single-frame diameter regression with a **short temporal clip** (5–9 frames) and a small 3D-CNN/temporal head, letting motion disambiguate ball vs clutter and smoothing depth — test whether TP rate rises from 47±7 toward the Oracle 100 on DeepSport; (b) replace annotation-by-free-fall with **multi-view triangulation** on the ballistic set to remove the circularity, then re-measure MAE — if the error drops, the original numbers were pessimistic about the method but optimistic about the truth, and the field needs the corrected benchmark.
