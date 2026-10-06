# Deep Dive — HAW/THI Bachelor Thesis 2024: "AI-based classification of American football plays combining computer vision and historical play-by-play data" (Linus Paul Teklenburg)

## What was actually read + how obtained — GATED (abstract + metadata only)

- **The full text was NOT obtained.** Status: **GATED**, verified as not open access.
- What I tried, in order:
  1. The task-supplied file URL `https://opus4.kobv.de/opus4-haw/files/4745/I001915178Thesis.pdf` — the repository does not serve it (consistent with the prior pass's finding).
  2. The OPUS4 frontdoor page `https://opus4.kobv.de/opus4-haw/frontdoor/index/index/docId/4745` (found via web search) — read in full. It explicitly states **"Open Access: nein"** and **"Licence (German): Urheberrechtsschutz"** (full copyright protection). The page offers **no download link** — metadata and abstract only.
  3. Web search for an author-posted copy (university pages, Google Scholar, personal site) — none found.
  4. Web search for author code (GitHub) — no thesis repository by Teklenburg found.
- **What I DID read:** the complete frontdoor abstract (two paragraphs, English) + full metadata: Linus Paul Teklenburg, Bachelor Thesis (note: one citing paper mislabels it "Ph.D. Thesis" — the repository metadata is authoritative: Bachelor), Technische Hochschule Ingolstadt, Fakultät Informatik, Künstliche Intelligenz (B.Sc.), reviewers Torsten Schön and Marc Aubreville, first publication 2024/04/21, XII + 58 pages, URN `urn:nbn:de:bvb:573-47451`.
- Per the task's hard rules I did not attempt any login/paywall bypass. The abstract below is paraphrased/summarized, not copied.

## METHOD (from the abstract — paraphrased)

A two-stream multimodal system for predicting NFL plays:

- **Vision stream:** pre-snap NFL images are preprocessed and analyzed to extract visual features — player positions, formations, and field dynamics. Techniques named: optical character recognition (OCR), line extraction, and the YOLOv8 model architecture for object detection.
- **Text stream:** an XGBoost model trained on historical play-by-play descriptions, learning textual patterns associated with play outcomes (pass vs. run).
- **Fusion:** the visual features and the text-based predictions are integrated into a unified prediction pipeline. The fused model predicts pass vs. run.
- **Evaluation:** accuracy, precision, recall, F1. Reported results: **74.13% test accuracy, 73.78% validation accuracy** on pass/run classification. The abstract frames the contribution as demonstrating that visual + textual information combined beats either alone, aimed at coaches/analysts.

## DATASETS

- A dataset of NFL pre-snap images + historical play-by-play data, preprocessed by the author. Sizes, sources, labeling protocol, and splits are **unknown** (inside the gated text). No license information available.
- Treat as unavailable; GSE replicates the *idea* on its own data.

## GSE APPLICATION

Caution: abstract-level only, so every mapping below is marked with its confidence. The thesis is a *play-outcome* thesis (pass/run), not a tracking thesis — its CV-lane value is in the **pre-snap feature extractors**, not the XGBoost text model.

- **Gap (c) — field landmarks (MEDIUM confidence):** the abstract names **line extraction** as a visual feature source for formations/field dynamics. This independently corroborates the Sloan Hough-line direction (deep-dive-sloan2018.md, Kernel S1): two sources now point at "detect field lines pre-snap → derive geometry." If/when the thesis text is obtained, extract the exact line-extraction algorithm (Hough vs. LSD vs. learned) and compare against our `cv-field-lines.ts` spec.
- **Gap (a) — detector recall (MEDIUM):** the thesis uses **YOLOv8** as its detection architecture — same family as GSE's YOLOv8n file detector. Corroborates the architecture choice; the gated text presumably contains the training-data recipe and operating point, which is exactly what we need for the pile/ground-player recall problem. Unobtainable today — flagged as the single highest-value item to request from the author.
- **Novel kernel vs. the other three sources — OCR on the broadcast frame (MEDIUM-HIGH):** none of the other papers use OCR. Reading the broadcast scoreboard bug (down, distance, quarter, clock, score) pre-snap gives the pipeline *structured game-state context for free*: down/distance cross-checks the detected LOS yard line (gap c validation), and play-clock state can gate when pre-snap formation labeling runs. This is the most GSE-actionable idea extractable from the abstract.
- **Text stream (LOW relevance to CV lane):** the XGBoost-on-play-by-play-text model belongs to the engine's play-type prior work, not the CV lane. Noted for the record; not spec'd here.

## IMPLEMENTATION SPEC

### Kernel T1 — `cv-scoreboard-ocr.ts` (NEW): broadcast bug OCR → structured game state
Pseudocode (clean-room):
```
interface GameState { down: 1|2|3|4|null; distance: number|null; quarter: number|null;
                      clockSec: number|null; scoreHome: number|null; scoreAway: number|null;
                      confidence: number; }

function readScoreboard(frame: VideoFrame, bugRoi: BoundingBox): GameState
  // 1. Crop the scoreboard-bug ROI (broadcaster-specific; configured per feed,
  //    default: top-left 320x90 region heuristic with edge-density search)
  crop = cropFrame(frame, bugRoi)
  // 2. Preprocess: grayscale -> adaptive threshold -> upscale 2x
  // 3. OCR (Tesseract or cloud OCR behind an interface; local-first)
  text = ocr(crop)
  // 4. Parse with strict regexes: /(\d)(?:ST|ND|RD|TH)\s*&\s*(\d+)/ for down & distance,
  //    /(\d):(\d\d)/ for clock, /(\d+)\s*-\s*(\d+)/ for score
  // 5. Cross-check: parsed LOS yard line vs. homography-derived LOS;
  //    flag mismatch > 2 yards as LOW confidence rather than failing
  return { ..., confidence }
```
- Repo files: CREATE `packages/prediction-engine/src/tracking/cv-scoreboard-ocr.ts`; CREATE `cv-scoreboard-ocr.test.ts`. Consumed by `cv-pipeline.ts` as optional context (never blocks detection/association).
- TEST ASSERTIONS:
  - Synthetic scoreboard crop rendering "3RD & 7", "Q2", "08:41", "17 - 14": parses to `{down:3, distance:7, quarter:2, clockSec:521, scoreHome:17, scoreAway:14}` with confidence ≥ 0.9.
  - Garbage/no-text crop: returns all-null with confidence 0 (never throws, never hallucinates values).
  - LOS cross-check: OCR-derived LOS vs. homography LOS differing by 5 yards → confidence downgraded, pipeline continues.
- Done/verified: assertions green on synthetic fixtures; one real broadcast frame parsed and manually verified (logged accuracy, not gated).

### Kernel T2 — line-extraction comparison note (NO new code yet)
- When the thesis text becomes available: extract its line-extraction method and run it head-to-head against Sloan-style Hough (`cv-field-lines.ts` Kernel S1) on the same fixture set; keep the winner, keep the loser as fallback. Recorded here so the comparison isn't forgotten.
- TEST (when unblocked): both extractors on 20 fixture frames; assert the chosen one has ≥ the other's F1 on yard-line detection.

### Kernel T3 — YOLOv8 training-recipe request (process item, not code)
- The single most valuable gated item: the thesis's YOLOv8 training data composition and operating point for pre-snap NFL images. Action: polite author email requesting (a) the training-data recipe section, or (b) confirmation we may cite the method from the abstract. Do NOT ask for the PDF (respects the copyright status).

## IMPROVEMENT PATH (beyond the abstract)

1. Fuse OCR game-state *into* the tracking pipeline as a prior, not just a cross-check: down/distance constrains which yard line is the LOS (disambiguates the "nearest line to the offensive cluster" heuristic in Sloan S1 when the offense lines up across two yard lines).
2. The thesis's pass/run fusion (vision + XGBoost text) is a template for GSE's own multimodal play-type prior: replace their text stream with GSE's play-by-play + market features; keep the interface (vision features in, text features in, calibrated probability out).
3. OCR the play clock to detect snap timing — a pre-snap/post-snap segmenter for the video pipeline (currently the pipeline has no snap detector).

## Confidence + evidence

- **MEDIUM** on the method description (full abstract read, paraphrased; fine-grained details like YOLOv8 variant, fusion architecture, and dataset sizes are inside the gated text and are NOT claimed here).
- **HIGH** on the gated status (frontdoor page explicitly "Open Access: nein" / "Urheberrechtsschutz", no download offered; no author-posted copy found via two targeted searches).
- **HIGH** on the metadata (author, degree type, institution, reviewers, pages, URN — all from the repository frontdoor).
