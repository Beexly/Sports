# CV Corpus 2026-10-01 — Research Matrix

**Lane:** Beexly/Sports CV (PR #986, branch `motif/cv-pipeline-2026-09-30`)
**Corpus date:** 2026-10-01
**Lane state at corpus time:** YOLOv8n detector landed at `c2e091c` — precision 1.00 / recall 0.74 on 57 hand-labeled people. IoU tracklet association fragments on broadcast pace (52–65 tracklets from ~6 players, median life 0.6–0.8s). DLT homography fails on yard-lines-only input (needs true 2D landmarks; v1 fallback = ~30s hand-seed per game window).

**The three open gaps every source was checked against:**
- **(a)** Detector recall on piles / ground players
- **(b)** Motion-aware tracklet association for broadcast pace
- **(c)** Automatic 2D field-landmark detection for homography

**House rule:** code/datasets with restrictive or unknown licenses are RESEARCH/learn-only (per 2026-09-28 INGEST-AND-LEARN doctrine) — never copied into the repo. License recorded per source; AGPL/unknown flagged.

**Count note:** the drop is numbered 1–29 (29 items; an earlier working note said 27 — the numbered list itself contains 29). Coverage: 21 fetched/read (2 abstract-only), 6 gated, 2 skipped (URL not recoverable verbatim from context; guessed reconstructions 404'd).

---

## Source-by-source

### 1. Sloan Sports Analytics Conference paper — Omar Ajmeri Ali Shah, "Using Computer Vision and Machine Learning to Automatically Classify NFL Game Film and Develop a Player Tracking System" (2018 Research Papers Competition, Paper ID #5571)
- **Status:** FETCHED (full text via #19 — same paper; the sloansportsconference.com link and the fourtverts S3 PDF are the same work)
- **Method:** All-22 pipeline — Hough Lines → rotation correction → line-of-scrimmage detection (proximity to O-line) → camera rotation via arccos(x); extraneous image regions (NFL logo) removed. Formation ID from pre-snap coordinates relative to QB: CART 86.5% QB position (Shotgun/Under Center/Pistol), 72.3% formation across 29 classes; Naïve Bayes/SVM/kNN/logreg all worse. Player tracking at 5 fps with continuous X/Y; per-screenshot yard calibration derived from 5-yard line spacing; reference-point anchoring of the highest full-field-line point in frame 1 to correct camera-follow drift; speed = distance/frame-rate → yards → mph.
- **Gap (a):** indirect — jersey-color player ID breaks under shadows/sunlight RGB variance (their stated limitation).
- **Gap (b):** DIRECT — per-frame yard calibration + drift reference point is a concrete recipe for scale-stable tracklets under a moving camera.
- **Gap (c):** DIRECT — automatic line detection + rotation correction is the classical-geometry half of homography; their rotation math (arccos of LOS vs perpendicular) is implementable.
- **Kernels:** (i) per-screenshot yard calibration from 5-yard line spacing; (ii) frame-1 reference-point drift correction; (iii) formation-from-coordinates CART baseline (72.3%).
- **Also:** route case studies give GSE metric shapes — Jackson 26.2 mph top speed; Jackson 22.4 vs Harris 19.3 mph in first 0.6s off the line; Garçon ran 1.3 fewer yards than Jackson on mirrored comeback routes (break-angle precision as a measurable trait). Full game (~50 offensive plays) labeled in <5 min.
- **License:** competition paper, no code attached — method intel only.

### 2. nfl.com — NFL + AWS AI challenge awards page
- **Status:** GATED (nfl.com blocked by access policy; not retried).

### 3. github.com/ruidazeng/the-playmakers — Brown University YOLOv8, 8 position classes
- **Status:** FETCHED (repo README + GitHub API)
- **Method:** YOLOv8 trained on 503 annotated images (Super Bowl + championship games); 8 classes (WR/CB/Safety/LB/RB/QB/TE/FB); mAP@0.5 0.759, F1 0.62, WR 94.2% precision. Dataset hosted on Roboflow (cs-1430/wr-finder).
- **Gap (a):** DIRECT — 503-image position-class detector is the closest public analog to our 57-frame hand-labeled set; their class breakdown shows which positions are easy/hard.
- **Gap (b/c):** none.
- **Kernels:** position-class detector training recipe; 503-image dataset as augmentation source for our detector (verify license first).
- **License:** ⚠️ README badge claims MIT but GitHub API reports `license: null` and no LICENSE file exists in the repo → **license UNKNOWN → RESEARCH-only until verified.**

### 4. nfl.com — NFL + AWS challenge press release
- **Status:** GATED (nfl.com blocked by access policy; not retried).

### 5. huddlevision.ai — commercial CV service
- **Status:** FETCHED (marketing/product pages)
- **Method:** field registration, player detection/tracking, speed/acceleration metrics, fine-tuning on client footage.
- **Gaps:** none directly (proprietary, no method detail, no code).
- **Use:** competitive intel only — confirms the commercial shape of "field registration + tracking + speed" as a product bundle.

### 6. Kaggle — NFL impact detection competition (2020)
- **Status:** FETCHED (competition page)
- **Method:** helmet-impact detection in NFL play videos; $75K prize; 2,849 entrants.
- **Gap (a):** indirect — impact/pile frames are the hard subset; competition datasets contain exactly the occlusion-heavy frames our detector misses.
- **Kernels:** dataset exists behind Kaggle competition access — candidate hard-negative mining source.
- **License:** Kaggle competition Terms → research-only; no redistribution.

### 7. AWS SageMaker blog — football detection via transfer learning
- **Status:** FETCHED
- **Method:** YOLOv3 vs Faster-RCNN vs SSD transfer learning. **Key empirical finding: Faster-RCNN best on small objects (the football); SSD underperforms on small objects.** Error analysis stratified by occlusion / size / aspect / camera angle / contrast to target data collection.
- **Gap (a):** DIRECT — the occlusion-stratified error analysis is exactly the diagnostic our 0.74-recall detector needs; two-stage detectors deserve an eval for pile recall.
- **Kernels:** (i) occlusion/size/aspect/angle/contrast error stratification protocol; (ii) Faster-RCNN-vs-YOLO small-object tradeoff note for a v2 detector eval.
- **License:** AWS blog content — method intel only.

### 8. zacyauney.com — Madden formation/play classifier
- **Status:** FETCHED
- **Method:** Inception v3 → 4 formation classes; ResNet18 per-frame classifier + voting across the play sequence → play classes (Inside Zone, Y-Sail, Mesh Spot, scramble).
- **Gaps:** downstream of a/b/c (classification, not detection/tracking).
- **Kernels:** formation→play two-stage pattern with per-frame voting — ADAPT-worthy for the tendency layer once tracking is solid.
- **License:** personal blog — method intel only.

### 9. Roboflow — NFL competition dataset (~10,000 images, helmet classes)
- **Status:** FETCHED (dataset page)
- **Method:** ~10,000 images of players in game play; classes: Helmet, Helmet-Blurred, Helmet-Difficult, Helmet-Partial, Helmet-Sideline. BibTeX citation provided.
- **Gap (a):** DIRECT — Helmet-Blurred/Difficult/Partial are pre-labeled hard subsets for occlusion-robust detector training.
- **Kernels:** training-data source for detector v2 (blurred/partial/occluded positives).
- **License:** listed as open-source on Roboflow; verify the per-dataset license file before ingesting (Roboflow public datasets are typically CC BY 4.0 — confirm at pull time).

### 10. LinkedIn — Harsh Raj, "Tracking American Football Players with Computer Vision" (2026)
- **Status:** FETCHED (full post text)
- **Method:** practitioner stack that works on broadcast footage today — ~30 frames annotated semi-supervised on Roboflow → **RF-DETR segmentation** as the per-frame seer → **Meta SAM 2 with an adapted memory bank** for pile-ups → **OpenCV classical geometry to cancel camera motion** (no neural net, no training) → **small OCR pass on a few sharp crops for long-gap reappearances** (jersey numbers). Team-level and player-level tracking; every player holds one identity through the play; 3D mesh rebuild + joint angles frame by frame.
- **Key insight (verbatim spirit):** "Appearance was the first dead end — everything I tested confuses two same-uniform players. So identity came from motion and continuity instead. Cancel the camera out, and every player's path tells you where he could be and where he couldn't. A player buried in a pile-up never left the frame, so follow his pixels through it instead of trying to recognize him after. You can't confuse two identical twins if you never took your eyes off one of them."
- **Gap (a):** DIRECT — SAM 2 with adapted memory bank for pile-up segmentation; RF-DETR as the per-frame segmenter.
- **Gap (b):** DIRECT — the single best practitioner answer in the corpus to our fragmentation problem: motion-continuity identity + camera-motion cancellation + jersey-digit OCR for re-ID on long gaps. This is the blueprint for replacing IoU-only association.
- **Gap (c):** partial — classical-geometry camera-motion cancellation is the same math family as homography (motion model without learning).
- **Kernels (ADOPT queue):** (i) motion-compensated tracklet stitching (cancel camera motion, then gate on reachable paths); (ii) jersey-number OCR on sharp crops for re-identification after occlusion gaps; (iii) RF-DETR eval vs YOLOv8n for pile recall; (iv) SAM 2 memory-bank adaptation for through-pile pixel following.
- **License:** practitioner writeup, no code — method intel only. (Component licenses for later: RF-DETR is Apache-2.0; SAM 2 is Apache-2.0 — verify at adoption time.)

### 11. leadersinsport.com — Genius Sports broadcast CV (Prime Video / NFL+)
- **Status:** FETCHED
- **Method:** real-time CV + Next Gen Stats sync for broadcast overlays (BetVision).
- **Gaps:** none directly — commercial/proprietary, no method detail.
- **Use:** competitive intel only — confirms the "CV + NGS synced to broadcast" product shape.

### 12. OPUS4/HAW — Linus Paul Teklenburg, "AI-based classification of American football plays combining computer vision and historical play-by-play data" (Technische Hochschule Ingolstadt, bachelor thesis, 2024, 58 pp)
- **Status:** FETCHED (frontdoor page + full abstract; full PDF **not open access**)
- **Method:** YOLOv8 visual features from NFL pre-snap images + OCR / line extraction (player positions, formations, field dynamics) + XGBoost on historical play-by-play text → unified run/pass pipeline: **74.13% test accuracy, 73.78% validation.**
- **Gap (a):** indirect — YOLOv8 + OCR feature extraction recipe.
- **Gap (c):** indirect — "line extraction" for field dynamics is the same landmark family we need.
- **Kernels:** visual + text fusion pattern (XGBoost on top of CV features + play-by-play) for the tendency layer; OCR + line-extraction as field-feature extractors.
- **License:** ⚠️ Urheberrechtsschutz (all rights reserved), not open access → **method intel only, RESEARCH-only; do not copy figures/text.**

### 13. MDPI Electronics 12(3):726 — pre-play formation analysis from overhead image (Madden NFL 2020 data)
- **Status:** FETCHED (open access)
- **Method:** >90% player detection/labeling; 84.8% formation ID across 25 formation classes (5 families × 5); 12 positions grouped to 8 labels; occlusion handling discussion.
- **Gap (a):** indirect — occlusion handling discussion + 12→8 position grouping (a label-design kernel: coarser position classes train better on small data).
- **Kernels:** position-label coarsening (12→8) for small-data detector training; formation-family taxonomy.
- **License:** MDPI open access (verify CC BY on the article page before reusing figures).

### 14. miguel-mendez-ai.com — NFL field mapping homography tutorial
- **Status:** FETCHED
- **Method:** NFL pitch template 120×53.3 (1px = 1 yard); OpenCV `findHomography`; 4-point minimum; **colinear-point failure mode**; p_t = H·p_i projection.
- **Gap (c):** DIRECT — documents the exact colinearity failure our eval found, and the 120×53.3 template matches our hand-seed v1 geometry.
- **Kernels:** 120×53.3 yard-template convention; colinearity guard (reject near-colinear point sets before DLT) — implement as a pre-check in the homography path.
- **License:** tutorial blog — method intel only.

### 15. policycommons.net
- **Status:** GATED (403 access denied; not retried).

### 16. Amazon Science — Next Gen Stats decade retrospective
- **Status:** FETCHED
- **Method:** pose estimation — 29 body parts, x/y/z at 60fps from 16 angles; hybrid RFID (center of mass) + optical skeleton; 75+ ML models (tackle probability, defensive alerts); Big Data Bowl pipeline (RYOE example).
- **Gaps:** strategic context, not implementable — data is internal to the NFL.
- **Use:** sets the ceiling; hybrid RFID+optical is the architecture to reason about, not replicate.

### 17. AWS — Digital Athlete blog
- **Status:** FETCHED
- **Method:** 38 synchronized 5k cameras at 60fps per stadium; 6.8M frames/week; skeleton tracking; helmet-impact CV models.
- **Gaps:** methods intel only — the synchronized multi-camera rig is not replicable from broadcast.
- **Use:** scale reference for what "enough data" looks like.

### 18. cs.brown.edu — John Chung, "Using Computer Vision and Machine Learning to Predict Offensive Play Calls in College Football" (Brown Sc.B. honors thesis, May 2024)
- **Status:** FETCHED (full PDF text)
- **Method:** semi-automated pipeline for collecting labeled formation images from college game footage (Notre Dame 2021–22 home games). **Formation extraction: YOLOv3 player detection + yard-line detection via Hough transform + hash-mark line detection (Laplacian-of-Gaussian blobs + Hough) + yard-line labeling.** Preprocessing: score-bug masking, field-boundary detection. Model: formation images + play-by-play → run/pass prediction, beating either source alone. Related-work numbers: Craig et al. 75% play-type prediction (NN on 130,344 NFL plays); Goyal 80% (4 ML models); Newman et al. 85% formation classification on 25 classes (Madden data); Atmosukarto et al. 67% on 5 classes (real footage, SVM); Siddiquie 72% on 7 play types (fixed camera); Li 70% camera-independent probabilistic model.
- **Gap (a):** indirect — YOLOv3 detection recipe on real broadcast frames.
- **Gap (c):** DIRECT — this is the missing machinery for our homography gap: automatic yard-line + hash-mark detection + labeling gives true 2D correspondences without the ~30s hand-seed. Score-bug masking is a required preprocessing step we don't have yet (broadcast graphics poison line detection).
- **Kernels (ADOPT queue):** (i) Hough yard-line detection; (ii) LoG-blob + Hough hash-mark detection; (iii) yard-line labeling (number OCR / line indexing); (iv) score-bug masking before any line detection.
- **License:** © 2024 John Chung — thesis, no code license → **method intel only, RESEARCH-only.**

### 19. fourtverts S3 PDF — same as #1 (Sloan 2018, Paper #5571, Omar Ajmeri Ali Shah)
- **Status:** FETCHED (full text, 415 lines) — canonical copy of the #1 paper.
- **Adds beyond #1:** limitation/future-work section — jersey-color tracking breaks under shadows/sunlight; defensive formations + kickoff/punt coverage as extensions; NCAA/high-school applicability given stationary cameras.
- **License:** competition paper — method intel only.

### 20. YouTube (tIDJDkRTRPQ)
- **Status:** GATED (429 from YouTube; title/content UNVERIFIED — no claims made about it).

### 21. geeklocker.substack.com — Hawk-Eye math / tracking-tech accuracy ladder
- **Status:** FETCHED
- **Method:** accuracy ladder — GNSS ±12", LPS/UWB ±4", **CV ±0.1" at 300+fps**; NFL uses Sony Hawk-Eye for first-down measurement (line-to-gain only, not ball spotting); Zebra RFID ±6"; multi-camera calibration method (pixel→known fixed locations, YOLO detection, triangulation, frame sync critical).
- **Gaps:** calibration context for (b)/(c) — triangulation + frame-sync notes are relevant if we ever fuse multi-angle sources.
- **Kernels:** accuracy-ladder numbers for GSE calibration claims; "Hawk-Eye measures line-to-gain, not ball spotting" (honest-limit kernel for any officiating-adjacent claims).
- **License:** newsletter — intel only.

### 22. Microsoft — Game Analytics Dashboard (Seahawks)
- **Status:** FETCHED — tangential; analytics story, no CV method. Noted for completeness.

### 23. researchgate.net — "Player Tracking Data in Sports" (publication 365009557)
- **Status:** FETCHED (abstract/landing page; **full text gated** — author-request only)
- **Method:** broad review; mostly basketball-focused citing works. Notable football item: Schilling et al. safe-target-area analysis on 2018 NFL data — passes to a physics-identified "safe" area completed 89% vs 59%; only 2 of 410 INTs on safe passes; data-driven method +2.02 YPA / +0.25 EPA per attempt.
- **Gaps:** downstream analytics, not detection/tracking.
- **Use:** safe-target-area numbers are a reasoning input for the passing model, not the CV lane.

### 24. stellantis.com — Wonderlic test story
- **Status:** SKIPPED — exact URL not recoverable verbatim from context; reconstructed URL returned 404 (not a real fetch of the intended page). Subject (NFL combine cognitive testing) is tangential to CV regardless.

### 25. safetyact.gov — DHS SAFETY Act
- **Status:** FETCHED — stadium security technology listings. **Irrelevant to CV.** Noted for completeness.

### 26. securitysystemsnews.com
- **Status:** SKIPPED — exact URL not recoverable verbatim from context; reconstructed URL returned 404. Subject (stadium security tech) tangential to CV regardless.

### 27. x.com/GeniusSports
- **Status:** GATED — no X read path available to this agent (no X CLI/skill for reads; x-poster is a posting skill). Not attempted.

### 28. PMC13471965
- **Status:** FETCHED — ALS vital-capacity clinical paper. **IRRELEVANT — wrong link in the drop (not sports).** Noted so it isn't chased again.

### 29. MDPI 2673-8392/6/10/213
- **Status:** GATED (403 from MDPI; not retried).

---

## Datasets surfaced (with licenses)

| Dataset | Size / content | License | Verdict |
|---|---|---|---|
| the-playmakers (Brown YOLOv8) | 503 annotated images, 8 position classes | **UNKNOWN** (badge claims MIT; no LICENSE file; API: null) | RESEARCH-only until verified |
| Roboflow NFL competition set | ~10,000 images; Helmet/Blurred/Difficult/Partial/Sideline | Open-source per Roboflow; verify per-dataset file (typically CC BY 4.0) | Verify, then usable |
| Kaggle NFL impact detection | Helmet-impact video frames (competition) | Kaggle competition Terms | Research-only; hard-negative mining candidate |
| Chung thesis frames | Notre Dame 2021–22 formation images | © 2024 (thesis, no grant) | Method only — do not scrape |
| Sloan 2018 paper data | WAS home-game screenshots @5fps | Not released | Method only |

No AGPL-licensed code was encountered in this corpus. No code at all was copied — all kernels below are method descriptions for clean-room re-implementation.

## Gated / skipped summary
- **Gated (6):** nfl.com ×2 (policy-blocked), policycommons.net (403), YouTube video (429, unverified), MDPI 2673-8392/6/10/213 (403), x.com/GeniusSports (no read path). HAW thesis full PDF + ResearchGate full text are paywalled/author-gated (abstracts read).
- **Skipped (2):** stellantis.com Wonderlic, securitysystemsnews.com — URLs not recoverable verbatim; subjects tangential to CV.
- **Irrelevant (2):** safetyact.gov, PMC13471965 (wrong link).
