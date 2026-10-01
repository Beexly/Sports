# Deep-Dive: Roboflow NFL-competition helmet dataset (home-mxzv1/nfl-competition)

**Source:** https://universe.roboflow.com/home-mxzv1/nfl-competition
**What was read (2026-10-01):** dataset page HTML fetched via curl with a browser UA; page text extracted after stripping scripts/styles. Verified verbatim on the page: **"Task: Object Detection License: Public Domain"**, 9,947 images, 2 dataset versions, classes (5): Helmet, Helmet-Blurred, Helmet-Difficult, Helmet-Partial, Helmet-Sideline; "Updated 4 years ago"; BibTeX citation block (author "home", year 2022, visited 2026-10-01).
**Cross-reference:** the AWS "Helmet detection error analysis in football videos using Amazon SageMaker" blog (found via search) describes this exact dataset: **9,947 labeled images (4,958 sideline + 4,989 end zone), 193,736 helmets (114,986 sideline + 78,750 end zone), 9,825 unique plays**, in `image_labels.csv` with boxes as left/width/top/height. Label mix: Helmet **66.98%**, Helmet-Blurred **17.31%**, Helmet-Sideline **7.76%**, Helmet-Partial **4.55%**, Helmet-Difficult **3.39%**.
**Also noted:** a Hugging Face mirror (keremberke/nfl-object-detection) lists License: Public Domain, 9,947 images, pre-processing "Resize to 1280x720 (Stretch)", splits train 6,963 / valid 1,989 / test 995 — the uploader's claim, not independently verified; prefer the Roboflow original.
**Confidence:** HIGH on the Roboflow page facts (fetched text); MEDIUM on the AWS-blog label distribution (third-party description, consistent with the page).

---

## 1. THE LICENSE — VERIFIED, NOT ASSUMED

- Page text (verbatim): **"License: Public Domain"**. This is the per-dataset license file/text the task asked for — **do not file this as CC BY 4.0**; it is explicitly Public Domain.
- **FINAL VERDICT: USABLE.** Public domain = no attribution legally required. Record the BibTeX citation anyway as good practice (Roboflow supplies it; keep it in the experiment doc).
- Download mechanics: requires a Roboflow account + API key (free tier), `universe.roboflow.com/home-mxzv1/nfl-competition`, Fork/Download buttons. The page also offers a "Run on custom image" inference widget (irrelevant to us — we train our own).

---

## 2. WHAT THE DATASET ACTUALLY IS

- **9,947 images** of NFL game play (sideline + endzone views), **193,736 helmet boxes** — i.e., ~19.5 boxes/image, dense multi-player scenes.
- **5 classes**, and the class taxonomy is the payload: `Helmet-Blurred` (17.31%), `Helmet-Sideline` (7.76%), `Helmet-Partial` (4.55%), `Helmet-Difficult` (3.39%) are **pre-labeled hard subsets** — motion blur, partial visibility, difficult/occluded instances. **One third of all labels (33.02%) are hard labels.** This is exactly the pile/occlusion recall problem our detector has, already annotated.
- The page's stated purpose: "detect the number of players and their locations on the field ... alert coaches of possible NFL formation penalties or analyze formations post-game ... starting point for automated player safety checks, ensuring each player is wearing a helmet." Roboflow links its "AI football coach playbook" blog posts for inspiration.
- Note: these are **helmet** boxes, not full-body person boxes. For our person detector they serve as (a) occlusion-hard positives, (b) a bootstrap signal ("a helmet box here means a person is here") — not as drop-in person labels.

---

## 3. GSE APPLICATION — gap (a) detector recall on piles/ground players — DIRECT

Our YOLOv8n file detector: precision 1.00, recall **0.74** on 57 hand-labeled people; misses concentrate in **piles / ground players / edge partials**.

Three concrete uses, in priority order:
1. **Hard-positive mining for detector v2 training.** The 33% hard-label mass (Blurred/Difficult/Partial) is the occlusion subset we lack. Training recipe: convert helmet boxes → person-present positives (expand box to estimated torso, or use as-is for a helmet-head detector stage); weight hard classes up in the loss (focal weighting) or oversample them in the batch sampler.
2. **Calibration of the error-stratification protocol** (deep-dive-aws-sagemaker.md): this dataset's per-class breakdown is a ready-made prior for what our stratification should reproduce — if our 57-frame eval shows a different hard-label rate, our eval set is too easy.
3. **A helmet-head detection stage** for pile frames: a small YOLO head trained on helmet boxes runs only on frames where the person detector's confidence is low (piles), giving recall where bodies merge. This is the mask-free, cheap version of the RF-DETR/SAM-2 pile approach (see deep-dive-harshraj-linkedin.md) — try this first.

---

## 4. IMPLEMENTATION SPEC

**Target files:**
- New experiment doc: `packages/prediction-engine/src/tracking/detector-v2-experiment.md` (shared with the playmakers v2 comparison).
- Data-pulling recipe recorded in `docs/research/2026-10-01/cv-corpus/dataset-licenses.md` (license sidecar for the `DATASET_LICENSES.json` gate test).
- Reuses `Detection`/`BoundingBox` from `cv-detector-contract.ts`.

**Pseudocode — helmet-box ingestion:**

```
function ingestRoboflowHelmet(datasetDir): PersonPositive[]
  # datasetDir: COCO-format export (Roboflow offers COCO export; boxes as left/top/width/height)
  for each annotation with category in {Helmet, Helmet-Blurred, Helmet-Difficult, Helmet-Partial}:
    # Helmet-Sideline = sideline personnel, NOT players → EXCLUDE from person positives
    # (this is a documented trap: 7.76% of labels are non-players; including them trains false positives)
    hard = category != 'Helmet'
    positives.push({ box: annotation.box, hard, source: 'roboflow-nfl-competition', license: 'Public Domain' })

function buildV2TrainingMix():
  ours   = our 57 hand-labeled frames (person boxes, license: internal)
  wr     = wr-finder v3 person boxes (CC BY 4.0, attributed)
  helmets= ingestRoboflowHelmet(...) (Public Domain)
  # batch sampler: 40% ours, 30% wr-finder, 30% helmets; within helmets, oversample hard classes 3:1
  return stratifiedSampler([ours, wr, helmets], ratios=[0.4, 0.3, 0.3], hardOversample=3.0)
```

**Test assertions with expected values** (extend `detector-v2-harness.test.ts`):
1. Ingestion fixture: 10 COCO annotations — 4 Helmet, 2 Helmet-Blurred, 1 Helmet-Difficult, 1 Helmet-Partial, 2 Helmet-Sideline → assert `positives.length === 8` and `hardCount === 4` (the 2 Sideline excluded; assert a specific excluded annotation id appears in the `excludedSideline` list).
2. Batch-sampler fixture: mix of 100 items with 30% helmet items, 50% of those hard → over 1,000 sampled batches assert hard-helmet fraction is within [0.35, 0.55] of helmet items (oversample 3:1 pushes 50% → ~75%; tolerance band accounts for randomness — pin the RNG seed and assert exact count instead: with seed 42, `hardCount === <precomputed>`; compute once, pin it).
3. License-sidecar test (from deep-dive-the-playmakers.md): `nfl-competition: "Public Domain"` present → harness passes.

**Done/verified criteria:** v2 detector trained on the mix shows **recall ≥ 0.85 on the pile/ground-player subset** of our 57-frame eval (the subset where v1 = ~0.74 overall and pile recall is worse — record the v1 pile-subset recall as the baseline first); no Helmet-Sideline boxes leak into person positives (audited by the ingestion test); BibTeX citation recorded.

---

## 5. IMPROVEMENT PATH
1. **Now:** pull the dataset (Roboflow API), run the ingestion test, record the label distribution we actually receive (verify the 66.98/17.31/7.76/4.55/3.39 split against the AWS blog's numbers — a mismatch means the export differs).
2. **Next:** train the helmet-head stage; if helmet recall on pile frames exceeds person-box recall, promote helmets as the pile-frame primary signal.
3. **Later:** the same hard-label classes are the natural source for the long-tail re-ID work — a `Helmet-Difficult` box that persists across frames is a through-pile track anchor (pairs with the SAM-2 through-pile idea at lower cost).

---

## 6. EVIDENCE / CONFIDENCE
- **Confidence: HIGH.** License ("Public Domain") and classes/counts are from the fetched Roboflow page text; the 193,736-helmet / 9,825-play / per-class-percentage numbers are from the AWS error-analysis blog describing this dataset (consistent, third-party).
- One item to verify at pull time: the actual export's class distribution vs the blog's percentages.
