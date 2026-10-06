# CV Corpus 2026-10-01 — Research Matrix (REDO, full-read pass)

**Lane:** Beexly/Sports CV (PR #986, branch `motif/cv-pipeline-2026-09-30`)
**Corpus date:** 2026-10-01 · **This file:** second pass, rewritten after Garrett rejected the abstract-level first pass.
**Lane state:** YOLOv8n detector (`yolo-detect.py` + `yolo-adapter.ts`, verified on branch) — precision 1.00 / recall 0.74 on 57 hand-labeled people. IoU tracklet association fragments on broadcast pace (52–65 tracklets from ~6 players, median life 0.6–0.8s). DLT homography fails on yard-lines-only input (needs true 2D landmarks; v1 fallback = ~30s hand-seed per game window).

**The three open gaps every source was checked against:**
- **(a)** Detector recall on piles / ground players
- **(b)** Motion-aware tracklet association for broadcast pace
- **(c)** Automatic 2D field-landmark detection for homography

**House rule:** code/datasets with restrictive or unknown licenses are RESEARCH/learn-only (2026-09-28 INGEST-AND-LEARN doctrine) — never copied into the repo. License recorded per source. No code was copied from any source in this pass; all kernels are clean-room method descriptions.

**Read-status convention:** FULL = full text read, sections noted. GATED = legitimate access attempts failed, attempts listed. Every ranked kernel in `top-kernels.md` cites the deep-dive file behind it.

**Deep-dive files (all under `docs/research/2026-10-01/cv-corpus/`):** `deep-dive-sloan2018.md` · `deep-dive-fourtverts-sloan.md` · `deep-dive-chung-brown.md` · `deep-dive-mendez-homography.md` · `deep-dive-mdpi-electronics.md` · `deep-dive-mdpi-2673.md` · `deep-dive-haw-thesis.md` · `deep-dive-aws-sagemaker.md` · `deep-dive-the-playmakers.md` · `deep-dive-roboflow-helmet.md` · `deep-dive-kaggle-impact.md` · `deep-dive-harshraj-linkedin.md` · `deep-dive-zacyauney-madden.md` · `deep-dive-geeklocker-hawkeye.md` · `deep-dive-corpus-remainder.md` · `dataset-licenses.md`

---

## Source-by-source

### 1. Sloan 2018, Paper #5571 — Omar Ajmeri Ali Shah, "Using Computer Vision and Machine Learning to Automatically Classify NFL Game Film and Develop a Player Tracking System"
- **Status:** FULL (complete 9-page paper, all sections; obtained from two independent public hosts — fourtverts S3 and the Sloan conference's own CDN — cross-checked identical; text extracted locally via pdftotext). Deep dive: `deep-dive-sloan2018.md` (+ `deep-dive-fourtverts-sloan.md` second read).
- **Method:** All-22 pipeline — Hough Lines → rotation correction (arccos formulation; paper underspecified, reconstruction marked `[RECONSTRUCTED]`) → line-of-scrimmage detection via O-line proximity → formation ID from pre-snap coordinates relative to QB: CART 86.5% QB position (Shotgun/Under Center/Pistol), 72.3% formation across 29 classes (Naïve Bayes/SVM/kNN/logreg worse). Tracking at 5 fps with continuous X/Y; **per-screenshot yard calibration from 5-yard line spacing**; **frame-1 reference-point anchoring** (highest full-field-line point) to cancel camera-follow drift; speed = euclidean distance / frame-rate → yards → mph (26.2 mph worked example). Route case studies: Jackson 22.4 vs Harris 19.3 mph in first 0.6s; Garçon 1.3 fewer yards than Jackson on mirrored comebacks (break-angle precision as a measurable trait). Full game (~50 offensive plays) labeled in <5 min.
- **Gap (a):** indirect — jersey-color player ID breaks under shadows/sunlight RGB variance (their stated limitation).
- **Gap (b):** DIRECT — per-frame yard calibration + drift reference point = scale-stable tracklets under a moving camera; the cheap camera-follow fallback when dense motion compensation is unreliable.
- **Gap (c):** DIRECT — arccosine rotation rectification + per-frame yard-scale affine fallback ("2D affine suffices for yard-line shifts" converges with the MDPI finding): when DLT landmarks are missing, build an affine pixels→yards map from yard-line spacing instead of failing.
- **License:** competition paper, no code — method intel only.
- **Caveat:** All-22 footage, not broadcast — only the narrow kernels transfer (noted in deep dive).

### 2. nfl.com — NFL + AWS AI challenge awards page
- **Status:** FULL (via curl retry after prior policy-block; details in `deep-dive-corpus-remainder.md`). Challenge context: $100K for automated film-analysis approaches. Competitive intel; no method detail.

### 3. github.com/ruidazeng/the-playmakers — Brown YOLOv8, 8 position classes
- **Status:** FULL (repo README + GitHub API + Roboflow dataset page). Deep dive: `deep-dive-the-playmakers.md`. License sidecar: `dataset-licenses.md`.
- **Method:** YOLOv8, 503 claimed images (443 on Roboflow v3) of Super Bowl + championship games; 8 classes (WR/CB/Safety/LB/RB/QB/TE/FB); mAP@0.5 0.759, F1 0.62 @ conf 0.229, WR 94.2% precision.
- **License verdict: code/notebooks/PDFs = RESEARCH-ONLY** (README MIT badge hyperlinks to a LICENSE file that doesn't exist; GitHub API `license: null`; 5 commits, none ever touched LICENSE; single branch `main` — the badge is a dead link, not a grant). **Dataset (cs-1430/wr-finder on Roboflow) = USABLE — page explicitly states "License: CC BY 4.0"** (attribution required). Separate artifact from the code.
- **Gap (a):** DIRECT — closest public analog to our 57-frame set; CC BY 4.0 position-class images as augmentation source.
- **Kernel:** position-class detector training recipe; dataset ingestion spec in deep dive.

### 4. nfl.com — NFL + AWS challenge press release
- **Status:** FULL (via curl retry). Challenge launch context; no method detail.

### 5. huddlevision.ai — commercial CV service
- **Status:** FULL (70 lines, product pages). Field registration + player tracking + speed/acceleration metrics, fine-tuning on client footage. Proprietary — competitive intel only.

### 6. Kaggle — NFL impact detection competition (2020)
- **Status:** FULL on overview + public label/metric write-ups; **GATED on Rules/Data subpages** (Rules tab crashed the fetcher; direct curl of `/rules` returned only the JS app shell — 2 attempts; competition terms UNVERIFIED). Deep dive: `deep-dive-kaggle-impact.md`.
- **Method:** helmet-impact detection; $75K; 2,849 entrants. Label schema: image/video/tracking levels. Metric: F1@IoU0.35 ±4 frames. Winner's recipe: 2-stage detector + oversampling (positives 0.18%) + temporal-window rescoring.
- **Gap (a):** DIRECT — impact/pile frames are the hard subset; the winner's **temporal-window rescoring** (2N+1 frame-stack pile classifier re-scoring only sub-threshold detections) is the cheap version of through-pile tracking. Hard-negative-mining candidate.
- **License:** competition terms unverified → treat as research-only; no redistribution.

### 7. AWS SageMaker blog — football detection via transfer learning
- **Status:** FULL. Deep dive: `deep-dive-aws-sagemaker.md`.
- **Method:** YOLOv3 vs Faster-RCNN vs SSD transfer learning. **Honest accounting: no per-architecture or per-stratum numbers exist in the text** — the "Faster-RCNN best on small objects (the football); SSD underperforms on small objects" finding is qualitative in the source. HPO: 100 jobs, Bayesian, lr 0.001–0.1, resnet50_v1b/resnet101_v1d, mAP objective.
- **The real kernel:** the 5-axis error-stratification protocol with exact strata — occlusion high/low, box size small/large, aspect tall/wide, camera endzone/sideline, contrast high/low. This is the diagnostic our single-number 0.74 recall needs: it tells us *where* recall dies (piles vs small players vs angles), which decides "more data" vs "different architecture."
- **Gap (a):** DIRECT — `cv-eval-stratification.ts` spec in deep dive, with a decision rule for a Faster-RCNN-vs-YOLO v2 eval.
- **License:** AWS blog — method intel only.

### 8. zacyauney.com — Madden formation/play classifier
- **Status:** FULL. Deep dive: `deep-dive-zacyauney-madden.md`.
- **Method:** Inception v3 → 4 shotgun-variant formation classes; ResNet18 per-frame classifier + voting across the play sequence → play classes (Inside Zone, Y-Sail, Mesh Spot, scramble). Vote formula unspecified on page — recorded as plain-majority assumption; deep dive adds phase-weighted voting as our improvement.
- **Gaps:** downstream of a/b/c (tendency layer, not detection/tracking).
- **Kernel:** formation→play two-stage pattern with per-frame voting — the tendency-model blueprint once tracking is solid.
- **License:** personal blog — method intel only.

### 9. Roboflow — NFL competition dataset (home-mxzv1/nfl-competition)
- **Status:** FULL (dataset page read). Deep dive: `deep-dive-roboflow-helmet.md`. License sidecar: `dataset-licenses.md`.
- **License verdict: USABLE — page explicitly states "License: Public Domain"** (verified on the fetched page; the earlier "typically CC BY 4.0" assumption was wrong).
- **Data:** 9,947 images, 193,736 helmet boxes; 33% hard labels (Blurred/Difficult/Partial/Sideline). **TRAP: Helmet-Sideline (7.76%) = non-player sideline personnel — must be excluded from person positives** (ingestion spec + batch-sampler test in deep dive).
- **Gap (a):** DIRECT — pre-labeled hard positives for occlusion-robust detector training; oversample Blurred/Difficult/Partial 3:1 in v2 mix; helmet-head stage for low-confidence pile frames.

### 10. LinkedIn — Harsh Raj, "Tracking American Football Players with Computer Vision" (2026)
- **Status:** FULL post text (all claims verified against visible text in a 10-claim verification table — nothing demoted); **comments GATED** (HTTP 999, 1 attempt). Deep dive: `deep-dive-harshraj-linkedin.md`.
- **Method (verified):** ~30 semi-supervised Roboflow frames → RF-DETR segmentation as per-frame seer → SAM 2 with adapted memory bank for pile-ups → OpenCV classical geometry to cancel camera motion (no learning) → small OCR pass on sharp crops for long-gap re-ID (jersey digits). Key insight: appearance ReID is a dead end in identical uniforms; identity from motion continuity instead; follow pixels through piles rather than re-recognizing after.
- **Gap (a):** DIRECT — SAM 2 adapted memory bank for through-pile segmentation; RF-DETR eval protocol vs YOLOv8n.
- **Gap (b):** DIRECT — the best practitioner answer in the corpus to our fragmentation: stabilize foot points via inter-frame field-plane homography, replace IoU with constant-velocity prediction gated by sprint-reach radius, coast through occlusions (15 frames vs our current 5). Deep dive includes a fragmentation-reproduction test (legacy path yields ≥20 tracklets on a 6-player pan fixture; new path yields 6).
- **Gap (c):** partial — classical-geometry camera-motion cancellation is the same math family as homography.
- **License:** method intel only (RF-DETR and SAM 2 are Apache-2.0 — verify at adoption time).

### 11. leadersinsport.com — Genius Sports broadcast CV
- **Status:** FULL (71 lines). Real-time CV + Next Gen Stats sync for broadcast overlays (BetVision). Proprietary — competitive intel only.

### 12. OPUS4/HAW — Teklenburg, "AI-based classification of American football plays combining computer vision and historical play-by-play data" (THI bachelor thesis, 2024, 58 pp)
- **Status:** GATED after 4 legitimate attempts (task-supplied file URL; OPUS4 frontdoor page explicitly "Open Access: nein", "Urheberrechtsschutz", no download offered; author-posted-copy search; GitHub search). Abstract + metadata read in full. Deep dive: `deep-dive-haw-thesis.md`.
- **From abstract:** YOLOv8 visual features from pre-snap images + OCR/line extraction (player positions, formations, field dynamics) + XGBoost on historical play-by-play text → run/pass 74.13% test / 73.78% validation.
- **Use:** visual+text fusion pattern for the tendency layer; queued for re-attempt if the thesis opens.

### 13. MDPI Electronics 2023, 12(3), 726 — "Automated Pre-Play Analysis of American Football Formations Using Deep Learning"
- **Status:** FULL (all 750 extracted lines, 7 sections + references; CC BY 4.0 open access). Deep dive: `deep-dive-mdpi-electronics.md`.
- **Method:** YOLOv3 single-class detector (0.35 operating point from 0.05–0.95 sweep); ResNet-152 per-player labeling with green/yellow dot representation + centroid normalization; **12→8 label grouping (exact mapping extracted)**; 25 formations (5 families × 5; Table 3 body absent from extraction — I-form and Singleback confirmed in prose, MEDIUM confidence on the rest); 4 augmentations (yard-line affine kept, count-modification rejected); QB/OL/RB occlusion rules (**QB rule +4pp measured**: enforce exactly one QB pre-snap). Results: 90.3%/98.8%/99.2% module-wise, 84.8% end-to-end.
- **Gap (a):** DIRECT — §5.1 eval harness spec (`detector-eval.ts`): GT-visible-player ↔ nearest-detection matching at 20-px center threshold, confidence sweep 0.05→0.95, operating point at max F1; must reproduce our baseline (precision 1.00 / recall 0.74 on the 57) before tuning. Occluded-player point-labeling protocol (≤5-px boxes, never guessed full boxes).
- **Gap (b):** count guardrails (`formation-guardrails.ts`): exactly-one-QB rule, exactly-11 invariant by merging duplicate tracklets.
- **Kernels:** position-label coarsening (12→8) for small-data training; formation-family taxonomy; affine-fallback convergence with Sloan ("2D affine suffices for yard-line shifts").
- **License:** CC BY 4.0 (verify on article page before reusing figures).

### 14. miguel-mendez-ai.com — NFL field mapping homography tutorial
- **Status:** FULL (all 202 lines). Deep dive: `deep-dive-mendez-homography.md`.
- **Method:** NFL pitch template 120×53.3 (1px = 1 yard); OpenCV `findHomography`; 4-point minimum; `homography.empty()` colinearity guard; p_t = H·p_i and the inverse direction.
- **Gap (c):** DIRECT — documents the exact colinearity failure our eval found. Deep dive derives the underlying math (DLT design-matrix rank collapse → κ(AᵀA)→∞) and generalizes Mendez's binary guard into `checkCorrespondenceGeometry()`: ≥4 points, 2×2 covariance eigenvalue ratio l2/l1 ≥ 1e-3 on both src and dst sets, absolute spread floors, convex-hull area backstop — throwing named `DegenerateCorrespondencesError` (colinear-src | colinear-dst | insufficient-spread | too-few) instead of emitting garbage. Also the src/dst direction regression test (Mendez computes template→image; we need image→template).
- **License:** tutorial — method intel only.

### 15. policycommons.net — "How the NFL is using AI to evaluate players"
- **Status:** GATED (403 via browser.open; 403 via curl retry — 2 attempts; nothing established).

### 16. Amazon Science — Next Gen Stats decade retrospective
- **Status:** FULL (158 lines). Pose estimation: 29 body parts, x/y/z at 60fps from 16 angles; hybrid RFID (center of mass) + optical skeleton; 75+ ML models. NFL-internal — ceiling reference, not replicable from broadcast.

### 17. AWS — Digital Athlete blog
- **Status:** FULL (90 lines). 38 synchronized 5k cameras at 60fps per stadium; 6.8M frames/week; skeleton tracking; helmet-impact CV. Scale reference for "enough data."

### 18. Brown thesis — John Chung, "Using Computer Vision and Machine Learning to Predict Offensive Play Calls in College Football" (Sc.B. honors thesis, May 2024)
- **Status:** FULL (30-page PDF, all chapters incl. §3.2.2 preprocessing, §3.5 formation extraction, Ch 4 results/limitations). Deep dive: `deep-dive-chung-brown.md`.
- **Method:** semi-automated labeled-formation pipeline from Notre Dame 2021–22 home games: YOLOv3 detection + **yard-line detection via Hough transform** + **hash-mark detection (LoG blobs + Hough)** + yard-line labeling; preprocessing: score-bug masking, field-boundary detection. Formation images + play-by-play → run/pass, beating either source alone. Related-work anchors: Craig 75% (130k NFL plays), Goyal 80%, Newman 85% formation (Madden), Atmosukarto 67% (real footage), Siddiquie 72%, Li 70%.
- **Honest parameter accounting:** the thesis contains ZERO numeric parameters (no rho/theta, no Hough thresholds, no LoG sigma, no HSV bounds — verified by full-text search). Every numeric value in the deep-dive specs is explicitly marked `[DERIVED]` — first tuning run on our footage is mandatory.
- **Gap (c):** DIRECT — the correspondence-production recipe: score-bug mask FIRST, then field-boundary mask (Chung's preprocessing order); white-filter → Hough → angle-filter vertical (yard lines); LoG blobs → small-radius only → Hough → angle-filter horizontal (hash-mark line — the only source solving hash marks under player noise); Sloan arccos deskew before angle filtering (±6–8° tolerances); intersections = true 2D correspondences → existing `Correspondence` interface → `fitHomographyDLT` unchanged. Labeling: anchor nearest detected line to play-context LOS, propagate at 5-yard intervals, resolve the 50-side via play direction (Chung's labeling is the documented-unsolved residual risk; the LOS-anchor is our design).
- **License:** © 2024 John Chung — method intel only, RESEARCH-only. Dataset not redistributable.

### 19. fourtverts S3 PDF — Sloan 2018, Paper #5571 (same paper as #1)
- **Status:** FULL (9 pages). Deep dive: `deep-dive-fourtverts-sloan.md` (second independent read; cross-checked identical with the Sloan CDN copy).
- **Adds:** limitation/future-work section — jersey-color tracking breaks under shadows/sunlight; defensive formations + kickoff/punt coverage as extensions; NCAA/high-school applicability with stationary cameras.
- **License:** competition paper — method intel only.

### 20. YouTube — tIDJDkRTRPQ
- **Status:** title verified via oEmbed — **"AWS re:Invent 2020: How the NFL builds computer vision training datasets at scale"** (AWS Events). Video content UNVERIFIED. Follow-up: transcript search.

### 21. geeklocker.substack.com — Hawk-Eye / tracking-tech accuracy ladder
- **Status:** FULL (206 lines). Deep dive: `deep-dive-geeklocker-hawkeye.md`.
- **Method:** accuracy ladder — GNSS ±12", LPS/UWB ±4", CV ±0.1" @300+fps, Zebra RFID ±6"; NFL uses Sony Hawk-Eye for first-down measurement (**line-to-gain only, not ball spotting**); multi-camera calibration (pixel→known fixed locations, YOLO detection, triangulation, frame sync critical); the 2,700/7,680 = 0.35"/pixel arithmetic.
- **Gaps:** calibration context for (b)/(c) — `claimablePrecisionM` per-frame meters-per-pixel + reprojection error; 1-inch-per-pixel sideline sanity anchor pinned in tests. Honest-limit kernel for officiating-adjacent claims.
- **License:** newsletter — intel only.

### 22. Microsoft — Game Analytics Dashboard (Seahawks)
- **Status:** FULL (120 lines). Analytics story, no CV method. Tangential — noted for completeness.

### 23. researchgate.net — "Player Tracking Data in Sports" (365009557)
- **Status:** abstract/landing page read; **full text gated** (author-request only). Broad review, basketball-heavy; football item: Schilling et al. safe-target-area analysis (safe passes 89% vs 59% completions; 2 of 410 INTs on safe passes; +2.02 YPA / +0.25 EPA). Downstream analytics — routed to passing-model notes, not the CV lane.

### 24. stellantis.com — Wonderlic story
- **Status:** FULL (done properly this pass). NFL combine cognitive testing — tangential to CV, noted for completeness.

### 25. safetyact.gov — DHS SAFETY Act
- **Status:** FULL (homepage). Stadium security tech listings. Irrelevant to CV — noted so it isn't chased again.

### 26. securitysystemsnews.com — "In brief: NVIDIA secures agents, Mercury reveals gap, ZeroEyes enters UK"
- **Status:** FULL (sports-relevant portion read; done properly this pass). ZeroEyes (CV gun detection) is the only sports-adjacent item — competitive awareness, not our lane.

### 27. x.com/GeniusSports
- **Status:** GATED — no X read path available to this agent (x-poster is a posting skill, not a read path). Not attempted.

### 28. PMC13471965
- **Status:** FULL — confirmed ALS vital-capacity clinical paper. **Irrelevant — wrong link in the drop.** Noted so it isn't chased again.

### 29. MDPI 2673-8392/6/10/213
- **Status:** CORRECTED this pass. Identified via public Crossref metadata as **"Sports Data: Sources, Infrastructure, and Governance in AI Era"** (Jerred Junqi Wang, Univ. of New Mexico, *Encyclopedia* 2026, 6, 213, published 2026-10-01, CC BY 4.0) — **a survey entry, not a CV methods paper**; computer vision appears only as one of six listed data sources. Abstract read via Crossref. **Do not cite it as CV evidence.** Deep dive: `deep-dive-mdpi-2673.md`. (A runtime constraint in the worker session forbade curl/UA/API retries after the initial 403; the Crossref identification stands on public metadata.)

---

## Datasets surfaced (with verified licenses)

| Dataset | Size / content | License | Verdict |
|---|---|---|---|
| the-playmakers dataset (cs-1430/wr-finder, Roboflow) | 443 images (README claims 503), 8 position classes | **CC BY 4.0** (explicit on page; attribution required) | USABLE with attribution |
| Roboflow home-mxzv1/nfl-competition | 9,947 images, 193,736 helmet boxes, 33% hard labels | **Public Domain** (explicit on page — not CC BY) | USABLE; exclude Helmet-Sideline |
| Kaggle NFL impact detection | Helmet-impact video frames; labels: image/video/tracking | Competition terms UNVERIFIED (JS shell) | Research-only; hard-negative mining candidate |
| Chung thesis frames | Notre Dame 2021–22 formation images | © 2024, no grant | Method only — do not scrape |
| Sloan 2018 paper data | WAS home-game screenshots @5fps | Not released | Method only |

No AGPL-licensed code encountered. No code copied from any source. License sidecar: `dataset-licenses.md`.

## Gated / corrected summary
- **Gated after legitimate retries (5):** HAW thesis full text (4 attempts — OPUS4 "Open Access: nein"); policycommons.net (2 attempts); Kaggle Rules/Data subpages (2 attempts); LinkedIn comments (HTTP 999); x.com/GeniusSports (no read path).
- **Corrected this pass:** #29 is a survey entry, not a CV paper; Roboflow helmet set is Public Domain, not CC BY; the-playmakers code ≠ dataset licenses; YouTube title identified via oEmbed.
- **Irrelevant (3):** safetyact.gov, PMC13471965 (wrong link), stellantis Wonderlic (tangential).
