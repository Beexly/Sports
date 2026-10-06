# Deep-Dive: AWS SageMaker — "Football tracking in the NFL with Amazon SageMaker"

**Source:** https://aws.amazon.com/blogs/machine-learning/football-tracking-in-the-nfl-with-amazon-sagemaker/
**What was read:** full blog text via `browser.open` (lines 0–255 of 255), 2026-10-01. All code snippets, the mAP definition, the HPO section, and the sensitivity/error-analysis section read in full. The two image/GIF illustrations were not readable as pixels (image bytes not retrieved) — no numeric claims depended on them.
**Authors:** Michael Lopez (NFL Director of Football Data and Analytics), Colby Wise and Divya Bhargavi (Amazon ML Solutions Lab).
**Date context:** written for the 2020 season kickoff (modeling on Apache MXNet Gluon 1.6.0, SageMaker Script Mode) — a dated stack, but the experimental method is what matters.
**License:** AWS blog content — method intel only; no code copied (snippets are SDK boilerplate described in clean-room terms below).
**Confidence:** HIGH — everything below is from the fetched text; where the text omits a number, it is flagged explicitly instead of filled in.

---

## 1. METHOD (protocol, not headline)

### 1.1 End-to-end pipeline
1. **Dataset creation (SageMaker Ground Truth):** NFL play segments are broken into images; human annotators draw bounding boxes around the **football** in a labeling UI over S3-stored image sequences. Output is an `output.manifest` file carrying the S3 path, `(x, y)` box coordinates, and class label (`football`). This is a single-class detection problem.
2. **Storage/format:** annotations converted to **RecordIO** for compact storage and faster disk access.
3. **Overfitting controls:** MXNet Gluon image normalization + augmentations — randomized image flipping and cropping are named explicitly.
4. **Training (transfer learning):** pre-trained networks from the **Gluon Model Zoo** fine-tuned on the annotated data. Two paths:
   - **No-code path:** SageMaker built-in SSD pre-trained model, used in the worked example with **ResNet50** backbone.
   - **Script Mode path:** bring-your-own algorithm via `train.py` entry point; the article names **YOLOv3** and **Faster-RCNN** with several backbone combinations. The worked training-job snippet uses `train_instance_type="ml.p3.16xlarge"`, `framework_version="1.6.0"`, `py_version="py3"`, parameter-server distribution, `epochs: 15`.
5. **Hyperparameter optimization:** SageMaker Automatic Model Tuning (Bayesian + random search) over **>100 jobs**, `max_jobs=100`, `max_parallel_jobs=10`. The worked hyperparameter ranges: `lr` continuous in **[0.001, 0.1]**, backbone categorical **{resnet50_v1b, resnet101_v1d}**. Objective metric = **highest mAP on held-out test data** (regex-captured from the script's "Validation: " printout).
6. **Evaluation metric:** mAP defined in the article as the area under the precision–recall curve (precision/recall pairs from sweeping confidence thresholds, interpolated), mean across classes for K>1.
7. **Deployment:** endpoint hosting via `tuner.deploy` / `MXNetModel.deploy` on `ml.m5.xlarge`; model artifacts in S3; client sends request → inference returns boxes. Production scaling noted but not quantified.

### 1.2 Architecture comparison — what the article actually states
- **SSD:** predicts relative offsets to a fixed set of boxes at every feature-map location. *"Empirically, SSD underperforms other object detector algorithms on small objects like football."*
- **YOLOv3:** DarkNet-53 feature extraction concatenating multiple feature maps → *"improved performance on smaller objects"* (relative to SSD).
- **Faster-RCNN:** adds a shared deep network predicting region proposals from the feature maps, aggregated downstream for classification + box prediction. *"Faster-RCNN empirically outperformed other networks on small objects in our use case."*
- **Inference-time tradeoff:** SSD and YOLOv3 are fast (FPS-critical for real-time); Faster-RCNN is slower. This is stated qualitatively — **no FPS numbers or per-architecture mAP numbers are given in the text.**

### 1.3 The error-stratification protocol (exact strata as defined in the article)
The article's "Sensitivity and error analysis" section defines test sets split along five axes — the strata are **binary qualitative pairs**, no numeric cutoffs given:

| Axis | Stratum A | Stratum B |
|---|---|---|
| Occlusion of the football | high | low |
| Bounding-box size | small | large |
| Aspect ratio | tall | wide |
| Camera angle | endzone | sideline |
| Contrast (football vs background) | high | low |

The stated purpose: *"we understood which qualitative aspect of image the model was struggling to predict, and these findings led us to strategically gather additional data to target and improve upon these areas."* I.e., the protocol's output is a **per-stratum mAP table** used to direct data collection — not to pick the model alone. The article **does not publish the per-stratum numbers**; it only reports the conclusion (Faster-RCNN best on small objects) and the direction of the inference-time tradeoff.

### 1.4 What the article does NOT establish (honesty record)
- No per-architecture mAP values; no per-stratum mAP values; no FPS numbers.
- No dataset size for the football-detection training set (number of labeled images not stated).
- The 2020-era stack (MXNet/Gluon) is deprecated for new work; adopt the protocol, not the framework.

---

## 2. DATASETS / LICENSES
- **NFL broadcast play segments → football boxes:** internal to the NFL; **not released**. Not usable for GSE training.
- The article's manifest/RecordIO/SageMaker code examples are AWS SDK boilerplate — nothing to ingest.
- **Verdict: method intel only. No data asset for the repo.**

---

## 3. GSE APPLICATION — gap (a) detector recall on piles/ground players

Our current state: YOLOv8n file detector, precision **1.00**, recall **0.74** on **57 hand-labeled people**; misses concentrate in **piles / ground players / edge partials** (per the task brief).

What this source gives gap (a):
1. **The diagnostic protocol itself.** Our 0.74 recall is a single number. The five-axis stratification (occlusion, size, aspect, camera angle, contrast) applied to our 57-frame eval tells us whether misses are *pile occlusion* (high occlusion + wide aspect + sideline) vs *small players* (small box + high contrast — e.g., distant backfield) vs *angle* problems. That determines the remedy: targeted data (strategic gathering) vs architecture change (two-stage detector).
2. **The two-stage-vs-one-stage tradeoff for the v2 detector eval.** Faster-RCNN-class two-stage detectors outperform one-stage on small objects at slower inference. Our misses in piles are partly *occluded-large* objects (not small), so the AWS "small object" finding does not transfer directly — but the *protocol* transfers exactly. Note in the spec: don't just switch architectures on the headline; stratify first.

---

## 4. IMPLEMENTATION SPEC

**Target files:**
- New: `packages/prediction-engine/src/tracking/cv-eval-stratification.ts` (stratify an eval set, compute per-stratum precision/recall, emit a table + the "where to gather data" recommendation).
- Test: `packages/prediction-engine/src/tracking/cv-eval-stratification.test.ts`.
- Consumes: `Detection`/`BoundingBox` from `cv-detector-contract.ts`.

**Pseudocode (clean-room; method-level, not copied):**

```
function stratify(frameEval): StratumReport
  # frameEval: per-frame { detections, groundTruthBoxes, view: 'sideline'|'endzone' }
  for each (det, gt) pair matched at IoU >= 0.5:
    size    = (gt.area < areaMedian) ? 'small' : 'large'
    aspect  = (gt.width / gt.height > 1.5) ? 'wide' : 'tall'
    occl    = estimateOcclusion(gt, frame)   # see below
    angle   = frame.view                     # sideline | endzone
    contrast= localContrast(gt, frame)       # high | low
    accumulate into the 2^5 = 32 stratum cells; track TP/FP/FN per cell
  return { perCell: {precision, recall}, worstCells: top-3 lowest-recall cells with n>=5 }

function estimateOcclusion(gt, frame):
  # box-level proxy: fraction of gt box area overlapped by OTHER gt boxes
  overlap = sum over other gt boxes of intersectionArea(other, gt) / gt.area
  return overlap > 0.4 ? 'high' : 'low'

function localContrast(gt, frame):
  # grayscale luminance std inside box vs 1-box-width margin ring around it
  return (std(ring) / (mean(box)+eps) > contrastMedian) ? 'high' : 'low'
```

**The "strategic gathering" rule this implements** (from the article's stated purpose): find the 3 worst-recall cells with n>=5; the data-collection recommendation is literally *"gather N more frames matching <worst-cell descriptor>"* — e.g., `high-occlusion / wide-aspect / sideline` = pile frames. Emit that as the report's headline.

**Test assertions with expected values** (`cv-eval-stratification.test.ts`):
1. Synthetic eval set with 10 ground truths: 6 "pile" boxes (occlusion > 0.4) of which the detector finds 2, and 4 "clean" boxes of which it finds 4 → assert `perCell['high-occlusion'].recall === 2/6` and `perCell['low-occlusion'].recall === 1.0`. Exact expected values: 0.3333 (tolerance 1e-9) and 1.0.
2. All-worst cell check: fixture where every box is high-occlusion → `worstCells[0].descriptor` includes `'high-occlusion'` and recommendation string matches `/gather.*high-occlusion/`.
3. Edge: empty eval set → report has 32 cells with `n: 0`, no throw; `worstCells` empty.

**Done/verified criteria:** `cv-eval-stratification.test.ts` green; run once against our 57-frame hand-labeled set and record the per-stratum table in `docs/research/2026-10-01/cv-corpus/detector-stratification-2026-10-01.md`; the worst 3 cells drive the next labeling batch (pile/ground-player frames first if occlusion cells dominate).

### 4.1 Follow-on experiment this source justifies (detector v2)
- **Eval design:** on the same stratified eval, run **YOLOv8n (current)** vs **Faster-RCNN (ResNet50-FPN, torchvision reference weights)** vs **RT-DETR** as detectors behind `cv-detector-contract.ts`'s `Detector` interface. Compare *per-stratum recall*, not just global mAP — the article's finding predicts two-stage wins specifically in `small` cells; for GSE we additionally expect it (or not) in `high-occlusion` cells. **Decision rule:** promote the architecture that wins the worst 3 cells from our current report, subject to the inference-time budget (Faster-RCNN slower — measure FPS on the same harness; the article flags this as the price).

---

## 5. IMPROVEMENT PATH
1. **Now:** land the stratification report (this spec) — it is the diagnostic the AWS team used to decide "scale up vs scale out."
2. **Next:** stratified two-stage eval (4.1); if `high-occlusion` recall stays < 0.5 under all architectures, the fix is data, not architecture — queue a pile-frame labeling batch (Roboflow Public Domain helmet set gives occluded positives; see deep-dive-roboflow-helmet.md).
3. **Later:** automate strata labels at scale (occlusion from box overlap is cheap; view classifier for angle; luminance stats for contrast) so every future detector eval is born stratified. The article's HPO discipline (optimize held-out mAP, not train mAP) becomes our detector-selection gate.

---

## 6. EVIDENCE / CONFIDENCE
- **Confidence: HIGH.** All claims above trace to specific sentences in the fetched blog text. The two honest gaps — no per-stratum/per-architecture numbers, no training-set size — are explicitly marked rather than inferred.
- No code or text copied; pseudocode is a clean-room method description.
