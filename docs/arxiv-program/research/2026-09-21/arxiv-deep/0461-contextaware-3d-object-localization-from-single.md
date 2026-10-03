# [0461] Context-Aware 3D Object Localization from Single Calibrated Images (arXiv:2309.03640v1)

**Citation:** Caio, M. D., Van Zandycke, G., De Vleeschouwer, C. (2023). *Context-Aware 3D Object Localization from Single Calibrated Images*. arXiv:2309.03640v1. URL: https://arxiv.org/abs/2309.03640v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1028 lines).
**Verdict:** REJECT — a competent basketball ball-localization regressor, but its error scale (meters) and broadcast-camera geometry have no transfer path to GSE's NFL probability engine, which consumes tracking data rather than producing it from video.

## 1. Research question
Given a single calibrated camera image, can a CNN that predicts the pixel displacement from the ball to its vertical ground projection — using a ball-centered image crop as context — reconstruct the ball's 3D position more accurately than the standard diameter-based baseline (which infers depth from apparent ball size)?

## 2. Dataset / schema
- **DeepSport:** 364 panoramic professional-basketball images, 15 arenas, ~4500×1500 px; ball annotated by center + vertical ground projection. Arena-exclusive cross-validation folds; fold A held out as test.
- **Ballistic test set:** 233 images (2336×1756), 2 arenas, balls on free-flight trajectories (ground truth via motion-model fitting).
- **Key schema:** image, camera calibration, ball center (px), ground-projection point (px), derived 3D position.
- Access: DeepSport is public (Kaggle); the ballistic set was constructed by the authors.

## 3. Method / model
- CNN with ImageNet-pretrained backbone + 3-layer regression head; predicts the 2D pixel displacement vector from ball center to its ground projection, given a ball-centered crop; camera geometry then lifts the projection to 3D.
- Training: 100 epochs, Adam with learning rate 1e-4, Huber loss (δ=1.0); 8 random head initializations; means ± std reported over runs.
- Baseline: diameter-based method (apparent ball size → depth via known real ball diameter).

## 4. Equations & assumptions
The model regresses a displacement Δ = (Δx, Δy) in pixels from the ball center to its ground projection; with calibrated camera geometry, the 3D position follows from back-projecting the ground point and intersecting with the known court plane, then lifting by the displacement direction. Training minimizes the Huber loss (δ=1.0) on the displacement error. Stated assumptions: camera calibration is known and accurate; the court plane geometry is known; the ball is visible enough to center a crop on it; the displacement from ball to ground projection is learnable from local image context (player pose, shadows, occlusion cues).

## 5. Features / target
- **Input:** ball-centered image crop (RGB pixels around the detected ball).
- **Target:** pixel displacement vector from ball center to its vertical projection on the ground; downstream 3D position via camera calibration.
- Horizon: single-frame (no temporal information).

## 6. Validation design
- Arena-exclusive folds on DeepSport (tests cross-venue generalization); fold A held out.
- Independent ballistic test set (233 free-flight images) to check distribution shift — notably, 102/233 ballistic balls are above 3 m vs only 60/801 DeepSport training samples, creating a deliberate height-distribution shift.
- 8 head initializations; mean ± std reported.
- Ablations: crop size (64–800 px), image downscaling (1×–1/8), balancing training samples above/below 2 m.

## 7. Numerical results / baselines
Paper's Table 1 (DeepSport test, proposed vs diameter baseline), exact:
- MAE [px]: 34±3 (proposed) vs N/A (baseline)
- MAPE [m]: 1.25±0.11 vs 2.88±0.22
- Median APE [m]: 0.92±0.15 vs 2.10±0.38
- MA3DE [m]: 1.29±0.10 vs 2.97±0.23
- Median A3DE [m]: 0.95±0.16 vs 2.18±0.40
Crop-size ablation (MAPE / MA3DE): 64: 1.71±0.17/1.75±0.17; 96: 1.52±0.13/1.56±0.13; 128: 1.46±0.06/1.50±0.06; 256: 1.04±0.11/1.07±0.12; 320: 1.17±0.09/1.20±0.10; 480: 1.18±0.07/1.21±0.07; 512: 1.25±0.11/1.22±0.11 (paper table); 640: 1.16±0.07/1.20±0.08; 800: 1.08±0.06/1.11±0.06.
Image scaling MAPE: 1×: 1.25±0.11; 1/2: 1.33±0.11; 1/4: 1.32±0.08; 1/8: 1.22±0.07.
Ballistic set: MAPE 2.68±0.12; after balancing above/below-2m training samples: 2.21±0.27. All numbers are the paper's claims.

## 8. Code / data availability
Code: https://github.com/gabriel-vanzandycke/deepsport (stated). DeepSport dataset public via Kaggle.

## 9. Leakage & limitations
- **Error scale:** ~1.25 m MAPE on in-distribution data, ~2.2–2.7 m under height shift — for NFL use (e.g., first-down line, catch-point localization), meter-scale errors are too coarse to feed a probability engine.
- **Distribution shift is severe:** the ballistic test shows the model degrades badly when ball height exceeds the training distribution; NFL balls routinely exceed 3 m on punts/deep passes.
- **Calibration dependence:** requires accurate per-camera calibration; broadcast NFL feeds have moving/zooming cameras with unknown intrinsics per frame — the paper's static panoramic setup does not transfer.
- **Sport specificity:** basketball's constrained court geometry and single ball; no evidence for football-shaped balls, 22-player occlusion, or outdoor lighting.
- **No temporal modeling:** single-frame only; tracking pipelines already do better with multi-frame association.
- External validity to NFL probability modeling: none — this is a perception paper, and GSE consumes tracking data rather than extracting it from video.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's tracking/NGS lane is a *consumer* taxonomy (27 metric families inventoried 2026-09-21; NGS replacement spec builds equivalents from public data) — GSE does not do broadcast-video ball extraction, and the map lists no video-perception work. This paper is therefore **not a duplicate**, but it is also not a capability GSE needs: the NGS replacement spec explicitly builds from public data precisely to avoid depending on fragile video pipelines. Verdict rationale: reject for near-term engine work; at most a far-future reference if GSE ever builds its own broadcast-video tracking extraction.

## 11. GSE implementation spec
No build recommended for the probability engine. If Garrett ever greenlights a broadcast-video tracking lane: replicate the displacement-regression head on NFL broadcast frames with per-frame camera calibration (e.g., from field-line homography estimation), training on annotated catch-point frames; expect 4–8 engineer-weeks for a prototype. This is explicitly out of scope for the current engine roadmap.

## 12. Reproducible test
Not applicable to the engine — but to verify the paper's claim cheaply: run the authors' released code (`deepsport` repo) on their ballistic test split and check that MAPE reproduces 2.68±0.12 within one standard deviation. If it does not reproduce, the paper's numbers are suspect even within basketball.

## 13. Acceptance / rejection gate
**Adopt** (into a future video-tracking lane) only if a replication on NFL broadcast frames achieves catch-point 3D error ≤ 0.5 m median on a held-out game — the threshold at which the output becomes usable for first-down/catch-probability features. **Otherwise reject** — the paper's own ~1.25 m in-distribution error already fails this gate, so the lane stays closed.

## 14. Improvement experiment
The paper's key weakness is height-distribution shift. A direct follow-up: train the displacement head with **physics-informed augmentation** — synthetically re-render training balls at sampled heights (2–8 m) using the camera model to warp the crop context, forcing the regressor to see the full height distribution. Test whether ballistic-set MAPE drops from 2.68±0.12 toward the in-distribution 1.25±0.11 without hurting DeepSport test performance — if it does, the method becomes viable for punting/deep-ball scenarios.
