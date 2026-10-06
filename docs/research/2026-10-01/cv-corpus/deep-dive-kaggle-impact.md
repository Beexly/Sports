# Deep-Dive: Kaggle — NFL 1st and Future: Impact Detection (2020)

**Source:** https://www.kaggle.com/competitions/nfl-impact-detection
**What was read (2026-10-01):**
- Competition overview page via `browser.open` (48 lines): host = The National Football League, Featured Code Competition, Nov 16 2020 – Jan 4 2021, **$75,000 prizes, 2,849 entrants, 573 participants, 459 teams, 7,795 submissions**, tags Football/Video/Sports/Computer Vision, "Custom Metric".
- Rules and Data subpages would not render: the Rules tab crashed the fetcher (Kaggle JS shell, `Unexpected token '<'`); direct curl of `/rules` returned HTTP 200 but only the JS app shell (5.7KB, no license text extractable). **The competition's exact license/terms text is therefore GATED (login + rules acceptance required).** One curl retry performed; no further retries.
- Label schema, metric, and solution patterns established from public write-ups found via search (a SlideShare deck reproducing the competition's data dictionary, the AWS helmet-detection error-analysis blog, a GitHub winning-approach summary, and an xmartlabs blog post) — all cited below. These describe the competition's documented data format, not leaked data.
**Confidence:** HIGH on competition facts and label schema (multiple consistent public sources); the license verdict below reflects what we could NOT verify.

---

## 1. COMPETITION FACTS

- **Name:** NFL 1st and Future – Impact Detection. Hosted by the NFL on Kaggle; the first of the NFL/AWS computer-vision competitions (the follow-up 2021 challenge added *player identification* in impacts — see the nfl.com awards/launch pages in deep-dive-corpus-remainder.md).
- **Task:** detect helmet impacts in videos of NFL plays.
- **Scale:** $75K prize; 2,849 entrants / 573 participants / 459 teams / 7,795 submissions (Nov 16 2020 – Jan 4 2021).
- **Winner:** Dmytro Poplavskiy (Australia) — 1st place (per SportsBusinessJournal; the nfl.com awards page covers the 2021 follow-up, won by Kippei Matsuda $50K / Takuya Ito $25K).

---

## 2. WHAT THE LABELS ACTUALLY ARE (data dictionary, from public write-ups)

**Images (training):** 9,947 still images with helmet boxes — this is the same image set as the Roboflow NFL-competition dataset (9,947 images; 4,958 sideline + 4,989 endzone; 193,736 helmets; 9,825 unique plays; per the AWS blog).
- `image_labels.csv`: `image` (filename), `label` ∈ {Helmet, Helmet-Blurred, Helmet-Difficult, Helmet-Sideline, Helmet-Partial}, box as `left/width/top/height` (left=0, top=0 at top-left).

**Videos (training):** 60 plays × 2 synchronized views (sideline + endzone) = **120 videos**, ~10 seconds each at **59.94 fps** (the xmartlabs write-up says 60 fps). Per-frame labels:
- `gameKey`, `playID`, `view` (camera orientation), `video` (filename), `frame` (frame number)
- `label`: the **associated player's number** (e.g., 'H67' home / 'V9' visitor style)
- box as `left/width/top/height`
- `impact`: **1 = helmet impact** for boxes associated with impacts
- `confidence`: 1 = Possible, 2 = Definitive, 3 = Definitive and Obvious
- `visibility`: 0 = Not Visible from View, 1 = Minimum, 2 = Visible, 3 = Clearly Visible
- `impactType`: helmet, shoulder, body, ground, etc.

**Evaluation:** "definitive helmet impacts" = `impact=1` AND `confidence>1` AND `visibility>0`; metric = **F1 score at IoU threshold 0.35**, with a **±4 frame tolerance** (a prediction within 9 frames of a ground-truth impact in the same play counts without degrading the score); optimal assignment of predictions to ground-truth boxes (at most one-to-one).

**Tracking data (training + test):** per-player at **10 Hz**: `gameKey/playID/player`, `time`, `x` (long axis), `y` (short axis), `s` speed (yards/s), `a` acceleration (yards/s²), `dis` distance from prior point (yards), `o` orientation (deg), `dir` motion angle (deg), `event` (snap, whistle, etc.). In test, player positions could not be directly mapped to detected players — that was the point.

---

## 3. COMPETITION TERMS — WHAT THE LICENSE ACTUALLY PERMITS

**Could not be verified.** The Rules page requires a Kaggle login + rules acceptance (JS shell only via public fetch). The standard Kaggle competition pattern for NFL-hosted competitions is research/personal-use-only terms with no redistribution, and closed competitions additionally require accepting rules before downloading — but **I did not read the actual terms text, so I will not assert it.**

### FINAL VERDICT: **RESEARCH-ONLY** for the Kaggle video/label bundle (until terms are verified)
- The *images* are independently available as **Public Domain on Roboflow** (see deep-dive-roboflow-helmet.md) — that is the clean ingestion path for images; use it, not the Kaggle download.
- The *video impact labels + tracking data* live only behind Kaggle competition access → RESEARCH-ONLY until someone with a Kaggle account accepts the rules and reads the terms; if the terms permit research use, the videos become a hard-negative source, not a redistributable asset. They never enter the repo either way.

---

## 4. HARD-NEGATIVE-MINING APPLICABILITY — gap (a) pile recall — DIRECT

Why this competition is the reference case for our pile-recall problem:
1. **Extreme imbalance is the documented reality.** One top solution's write-up reports **positive samples (impact boxes) were only 0.18% of total samples** — the fix used was **over-sampling** of positives (plus LR flip, color jitter, bbox position/size jitter augmentation; no cross-validation due to compute limits). Our pile frames are the same shape of problem: rare, hard, drowned in easy negatives.
2. **The 2-stage pattern that won:** detection (find possible impact boxes, e.g., DetectoRS via MMDetection) → classification (crop box ±N frames, concatenate 2N+1 boxes in the channel dimension, ResNet-50 → impact-or-not). The temporal-window trick (2N+1 frame stack) is directly reusable for pile-frame disambiguation: a "person in pile" classifier sees the box's temporal neighborhood, not just the ambiguous single frame.
3. **The hard-label taxonomy transfers:** Blurred/Difficult/Partial boxes are the competition's built-in hard negatives/positives — the same classes we ingest from the Public Domain Roboflow copy.

---

## 5. GSE APPLICATION — gaps (a)/(b)

- **(a):** adopt the winner's recipe shape — per-frame detector → **temporal-window classifier** (2N+1 frame box stack) for low-confidence pile detections. This is cheaper than SAM-2 and directly targets our 0.74-recall misses.
- **(b):** the per-frame labels carry **player numbers + 10 Hz tracking (x/y/s/a/dis/o/dir)** — the exact "detections ↔ field coordinates ↔ identity" join our association layer needs. The competition's test-time constraint (can't map tracking to detections directly) is our production constraint too: identity must be *inferred*, which is the Harsh Raj motion-continuity argument from the other direction.

---

## 6. IMPLEMENTATION SPEC

**Target files:**
- New: `packages/prediction-engine/src/tracking/cv-temporal-window-classifier.ts` — the 2N+1 frame-stack classifier contract (model-agnostic; real weights live outside the repo, FixtureClassifier for tests).
- Test: `packages/prediction-engine/src/tracking/cv-temporal-window-classifier.test.ts`.
- Hooks into `cv-tracklet-association.ts` (re-score low-confidence detections) and `cv-detector-contract.ts` (`Detection`).

**Pseudocode (clean-room):**

```
interface WindowSample {
  centerFrame: number;
  crops: VideoFrame[];        # 2N+1 frames centered on centerFrame, same box
  box: BoundingBox;
}

interface PileClassifier {
  readonly name: string;
  # returns P(person | box, temporal window)
  score(sample: WindowSample): number;
}

function rescoreDetections(frames: FrameDetections[], classifier: PileClassifier, N = 2): FrameDetections[]
  for each frame i, for each detection d with d.confidence < PILE_THRESHOLD (default 0.5):
    sample = { centerFrame: i, crops: frames[i-N .. i+N], box: d.bbox }   # edge-pad
    p = classifier.score(sample)
    d' = { ...d, confidence: max(d.confidence, p), rescored: true }
  # detections above threshold pass through untouched (no extra compute on easy frames)
```

**Test assertions with expected values:**
1. Fixture classifier returns fixed 0.9 for any sample; input detections: confidences [0.3, 0.6, 0.2] with PILE_THRESHOLD 0.5 → assert output confidences are **[0.9, 0.6, 0.9]** and `rescored` flags are `[true, false, true]`.
2. Edge padding: N=2 on frame 0 of 3 frames → assert the sample's crops array has length **5** with frames[0] repeated for the missing -2/-1 slots (assert `crops[0] === crops[1]` by frame index 0).
3. Cost guard: with all detections above threshold, assert the fixture classifier's `score` was called **0** times.

**Done/verified criteria:** harness green; experiment doc records N sweep (N ∈ {1,2,3}) on our 57-frame eval measuring pile-subset recall vs added latency; promote only if pile recall ≥ 0.85 without dropping overall FPS below the file-detector budget.

---

## 7. IMPROVEMENT PATH
1. **Now:** implement the rescoring contract + fixture (this spec); images come from the Public Domain Roboflow copy.
2. **Next:** if terms are ever verified as research-permitting, the 120 labeled videos become the training set for the real temporal classifier (impact-adjacent frames are the hardest pile frames in existence — 0.18% positive rate is the true difficulty distribution).
3. **Later:** the ±4-frame tolerance idea generalizes — our tracklet birth/death logic should tolerate ±N-frame detection jitter near piles rather than fragmenting (feeds the motion-continuity association work in deep-dive-harshraj-linkedin.md).

---

## 8. EVIDENCE / CONFIDENCE
- **Confidence: HIGH** on competition facts, label schema, metric (multiple consistent public write-ups + the competition page itself). **The one unverified item — the actual Rules/license text — is marked GATED, not inferred**, and the verdict is conservative (RESEARCH-ONLY) because of it.
