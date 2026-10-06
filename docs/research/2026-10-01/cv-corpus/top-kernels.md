# CV Corpus 2026-10-01 — Top Kernels (REDO: every kernel cites its full read)

Ranked by verification strength × impact on the three open gaps in the CV lane (PR #986, `motif/cv-pipeline-2026-09-30`):
**(a)** detector recall on piles/ground players · **(b)** motion-aware tracklet association for broadcast pace · **(c)** automatic 2D field-landmark detection for homography.

All kernels are clean-room method descriptions — no code or text copied from any source. Each cites its deep-dive file, which holds the full method, math, implementation spec (pseudocode, exact repo files, test assertions), and improvement path.

---

## Tier 1 — build next (all from FULL reads)

### K1. Automatic yard-line ∩ hash-mark correspondences → gap (c) — THE binding-gap fix
**Source:** FULL — Chung Brown thesis (30-page PDF, all chapters) · `deep-dive-chung-brown.md`, with Mendez's guard (`deep-dive-mendez-homography.md`) and Sloan's deskew (`deep-dive-sloan2018.md`).
**The kernel:** score-bug mask FIRST (bug text = white Hough false votes), then field-boundary mask; white-filter (HSV) → Canny → Hough → angle-filter vertical → yard lines; LoG blob detection → small-radius only (rejects players/paint) → Hough → angle-filter horizontal → hash-mark line (the only source solving hash marks under player noise); Sloan arccos deskew *before* angle filtering so tolerances hold at ±6–8°; **intersections = true 2D correspondences**, non-colinear by construction → existing `Correspondence {xPx,yPx,xM,yM}` interface → `fitHomographyDLT` unchanged. Labeling: anchor the detected line nearest the known play-context LOS, propagate at 5-yard intervals, resolve the 50-side via play direction (Chung's labeling is the documented-unsolved residual — the LOS-anchor is our design, needs validation).
**Guard (Mendez, generalized):** `checkCorrespondenceGeometry()` — ≥4 points, 2×2 covariance eigenvalue ratio l2/l1 ≥ 1e-3 on both src and dst, absolute spread floors, convex-hull area backstop — throws named `DegenerateCorrespondencesError` (colinear-src | colinear-dst | insufficient-spread | too-few) instead of emitting garbage. Underlying math derived in the deep dive: DLT design-matrix rank collapse → κ(AᵀA)→∞.
**New files:** `packages/prediction-engine/src/tracking/cv-field-landmarks.ts` (pipeline + `landmarksToCorrespondences`), `cv-rotation-deskew.ts`, `cv-template.ts` (meter template, NFL hash-mark offsets, `YARDS_TO_METERS`); modify `cv-homography.ts` (guard), `cv-pipeline.ts` (wire landmarks in, hand-seed as fallback).
**Tests (in order):** (1) 4 colinear points → throws `DegenerateCorrespondencesError(colinear-src)` — regression test for the current DLT failure; (2) 1.5px orthogonal spread → `insufficient-spread`; (3) synthetic broadcast frame (6 yard lines + hash marks + noise + fake score bug) through known H_gt → ≥4 intersections, mean reprojection error < 2.0 px over 20 held-out points; (4) score-bug ablation (mask on/off); (5) src/dst direction regression (Mendez computes template→image; we need image→template); (6) mislabeled-yard-line scale cross-check via Sloan px/yard. **Done = all six green + `cv-pipeline.ts` end-to-end on one real clip with zero hand-seeded points, held-out reprojection < 3 px.**
**Honesty notes:** Chung's thesis contains ZERO numeric parameters (verified by full-text search) — every numeric value in the specs is marked `[DERIVED]`; first tuning run on our footage is mandatory. Sloan is All-22, not broadcast — only the deskew/calibration kernels transfer.

### K2. Camera-motion cancellation + reachable-set gating → gap (b)
**Source:** FULL post text — Harsh Raj LinkedIn (10-claim verification table, all verified; comments gated at HTTP 999) · `deep-dive-harshraj-linkedin.md`.
**The kernel:** appearance ReID is a dead end in identical uniforms — identity from motion continuity instead. Stabilize foot points via inter-frame field-plane homography (OpenCV classical geometry, no learning); replace IoU matching with constant-velocity prediction gated by sprint-reach radius; coast through occlusions (15 frames vs our current 5); follow pixels through piles instead of re-recognizing after. Jersey-digit OCR on sharp crops (Laplacian-variance sharpest frame) as fail-closed re-ID for long-gap reappearances, matched against roster numbers.
**Why it matters:** directly replaces our fragmenting IoU matcher (52–65 tracklets from ~6 players). The camera-cancellation step also serves gap (c)'s motion model.
**Tests:** fragmentation-reproduction fixture — legacy path yields ≥20 tracklets on a 6-player pan fixture; new path yields 6. Jersey-OCR stitch test on a synthetic long-gap reappearance.
**License:** method intel only (RF-DETR and SAM 2 are Apache-2.0 — verify at adoption time).

### K3. Occlusion-stratified eval harness → gap (a)
**Source:** FULL — AWS SageMaker blog · `deep-dive-aws-sagemaker.md` + FULL — MDPI Electronics §5.1 · `deep-dive-mdpi-electronics.md`.
**The kernel:** (i) AWS's 5-axis error-stratification protocol — occlusion high/low, box size small/large, aspect tall/wide, camera endzone/sideline, contrast high/low — applied to our 57-frame eval, so the single 0.74 recall number becomes a per-cell diagnosis that decides "more data" vs "different architecture." (ii) MDPI's eval harness: GT-visible-player ↔ nearest-detection matching at 20-px center threshold, confidence sweep 0.05→0.95, operating point at max F1 — **must reproduce our baseline (precision 1.00 / recall 0.74) before any tuning.** Their occluded-player point-labeling protocol (≤5-px boxes, never guessed full boxes) for the next labeling batch. Their YOLOv3 single-class operating point (0.35, swept 0.05–0.95) as the tuning template.
**Honesty note:** the AWS "Faster-RCNN beats YOLO on small objects" finding is qualitative in the source — no per-architecture numbers exist. The deep dive carries a decision rule for a real Faster-RCNN-vs-YOLO v2 eval rather than asserting the outcome.
**New file:** `packages/prediction-engine/src/tracking/cv-eval-stratification.ts`.

### K4. Public-Domain helmet hard-labels as pile positives → gap (a)
**Source:** FULL — Roboflow dataset page · `deep-dive-roboflow-helmet.md` (+ `dataset-licenses.md`).
**The kernel:** 9,947 images, 193,736 helmet boxes, 33% hard labels (Blurred/Difficult/Partial/Sideline), **Public Domain** (verified on page — the earlier CC BY 4.0 assumption was wrong). Ingest excluding Helmet-Sideline (7.76% = non-player sideline personnel — the exclusion trap), oversample Blurred/Difficult/Partial 3:1 in the v2 training mix; helmet-head stage for low-confidence pile frames. Ingestion spec + batch-sampler test in the deep dive.
**Also:** the-playmakers dataset (443 images, 8 position classes) is **CC BY 4.0** (explicit on Roboflow page; README's 503 claim vs 443 on v3 noted) — USABLE with attribution. The repo's *code* is RESEARCH-ONLY (MIT badge is a dead link: no LICENSE file ever existed in 5 commits).

### K5. Per-frame yard-scale affine fallback + rotation rectification → gap (c)
**Source:** FULL — Sloan 2018 (two independent hosts, cross-checked) · `deep-dive-sloan2018.md` + FULL — MDPI Electronics · `deep-dive-mdpi-electronics.md`.
**The kernel:** when DLT landmarks are missing, don't fail — build an affine pixels→yards map from per-screenshot 5-yard line spacing (Sloan) with arccosine rotation rectification; MDPI independently converges ("2D affine suffices for yard-line shifts"). Frame-1 reference-point anchoring (highest full-field-line point) cancels camera-follow drift — doubles as the cheap fallback when K2's dense motion compensation is unreliable.
**Tests:** synthetic field with 7.3° rotation → recovered within ±0.5°, yard scale within 1%; known-homography reprojection < 2.0 px.
**New file:** `packages/prediction-engine/src/tracking/cv-field-lines.ts`.

### K6. Temporal-window rescoring classifier → gap (a)
**Source:** FULL on public write-ups — Kaggle NFL impact detection · `deep-dive-kaggle-impact.md` (Rules/Data subpages gated: JS shell only, 2 attempts — competition terms UNVERIFIED, treat as research-only).
**The kernel:** the winner's recipe — 2-stage detector + oversampling (positives 0.18%) + **temporal-window rescoring**: a 2N+1 frame-stack pile classifier re-scores only sub-threshold detections. The cheap version of SAM-2 through-pile tracking, implementable without new architecture. Label schema (image/video/tracking) and metric (F1@IoU0.35 ±4 frames) recorded for our own pile-eval design.

## Tier 2 — schedule after Tier 1 (all from FULL reads)

### K7. Count guardrails: exactly-one-QB + exactly-11 → gaps (a)/(b)
**Source:** FULL — MDPI Electronics · `deep-dive-mdpi-electronics.md`. Their QB rule measured +4pp: enforce exactly one QB pre-snap (insert at formation centroid as structurally-marked untrusted marker if missing; keep most-central if multiple); enforce the exactly-11 invariant by merging duplicate tracklets. New file: `formation-guardrails.ts`.

### K8. Position-label coarsening (12→8) for small-data training → gap (a)
**Source:** FULL — MDPI Electronics · `deep-dive-mdpi-electronics.md` (exact 12→8 mapping extracted; 25-formation taxonomy partially extracted — I-form/Singleback confirmed in prose, rest MEDIUM confidence). Our 57-frame set is tiny; coarser labels train more robustly, and the-playmakers' 8-class scheme independently converged on the same granularity.

### K9. Formation→play two-stage classification with per-frame voting → tendency layer
**Source:** FULL — zacyauney Madden page · `deep-dive-zacyauney-madden.md`. Inception v3 → 4 shotgun variants; ResNet18 per-frame + voting → Inside Zone / Y-Sail / Mesh Spot / scramble. Vote formula unspecified on page — recorded as plain-majority assumption; our improvement: phase-weighted voting. Related-work anchors (from Chung's bibliography, FULL read): Craig 75% (130k NFL plays), Goyal 80%, Newman 85% formation (Madden), Atmosukarto 67% (real footage), Siddiquie 72%, Li 70%. Sloan's CART baseline: 86.5% QB position / 72.3% formation over 29 classes.

### K10. Calibration report with honest precision floor → gaps (b)/(c)
**Source:** FULL — Geeklocker Hawk-Eye · `deep-dive-geeklocker-hawkeye.md`. Per-frame meters-per-pixel + reprojection error → `claimablePrecisionM`; 1-inch-per-pixel sideline sanity anchor pinned in tests. Accuracy ladder for all GSE tracking claims: GNSS ±12" / LPS-UWB ±4" / CV ±0.1" @300+fps / Zebra RFID ±6". Hawk-Eye measures line-to-gain, NOT ball spotting — the honest limit for officiating-adjacent claims.

## Calibration / doctrine (adopt as standing rules)

- **K11.** RF-DETR segmentation eval vs YOLOv8n for pile recall (Harsh Raj, FULL post text; Apache-2.0 — verify at adoption) — cheapest architectural experiment for gap (a), ~30-frame annotation budget.
- **K12.** SAM 2 adapted memory bank for through-pile pixel following (Harsh Raj, FULL post text; Apache-2.0 — verify at adoption) — pairs with K2.
- **K13.** Break-angle precision as a measurable WR trait (Sloan FULL: Garçon 1.3 fewer yards than Jackson on mirrored comebacks) — GSE derived-metric shape, consistent with the adopted @fieldcoachai reel intel.

## Explicitly NOT adopted / corrected this pass
- HAW thesis (GATED — OPUS4 "Open Access: nein"; abstract only: YOLOv8 + XGBoost 74.13% test) — queued for re-attempt if it opens.
- MDPI 2673-8392/6/10/213 — **corrected: it's a survey entry ("Sports Data: Sources, Infrastructure, and Governance in AI Era"), not a CV methods paper. Do not cite as CV evidence.**
- the-playmakers CODE — RESEARCH-ONLY (dead MIT badge). The DATASET is CC BY 4.0 — usable.
- HuddleVision / Genius Sports (#5, #11): proprietary, no method — competitive intel only.
- NGS pose architecture (#16) / Digital Athlete rig (#17): NFL-internal — ceiling reference, not replicable from broadcast.
- YouTube "AWS re:Invent 2020: How the NFL builds computer vision training datasets at scale" — title verified via oEmbed; content UNVERIFIED. Follow-up: transcript search.
- policycommons.net (GATED ×2), LinkedIn comments (HTTP 999), x.com/GeniusSports (no read path), Kaggle competition terms (JS shell).
- Irrelevant/wrong-link: safetyact.gov, PMC13471965 (ALS paper), stellantis Wonderlic (tangential), securitysystemsnews (only ZeroEyes note, tangential).
