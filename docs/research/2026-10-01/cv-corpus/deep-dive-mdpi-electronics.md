# Deep Dive — MDPI Electronics 2023, 12(3), 726: "Automated Pre-Play Analysis of American Football Formations Using Deep Learning"

## What was actually read + how obtained

- **FULL TEXT READ** — all 750 extracted lines: Abstract; 1. Introduction (1.1 Related Work, 1.2 Scope); 2. American Football (Tables 1–3 captions); 3. Methods (3.1 System Modules incl. 3.1.1–3.1.3, 3.2 Input Representations incl. 3.2.1–3.2.3); 4. Experiments (4.1 Dataset, 4.2 Data Augmentation 4.2.1–4.2.4, 4.3 Investigations 4.3.1–4.3.5); 5. Results (5.1–5.6); 6. Future Work; 7. Conclusions; Author Contributions; References (15).
- **Source (legitimate):** `https://www.mdpi.com/2079-9292/12/3/726` — open access under CC BY 4.0, fetched via the page-text reader (no bypass; the article HTML is freely served). From author-contribution initials the team is D.-J.L. (conceptualization/methodology) with J.N. (software/validation) et al.; the work was carried out ~2020 and published 2023.
- **Caveat:** Table 3's body (the 25 formation names across 5 families) was not present in the extracted text — only its caption. Formation-family names confirmed in prose: **I-form** and **Singleback**. Everything else below is from extracted text.
- **Confidence: HIGH** on method/results/augmentation/rules (full text); **MEDIUM** on the exact 25-formation taxonomy (table body not extracted).

## METHOD (clean-room description, in my own words)

**Task:** from one overhead pre-snap image (All-22-style view, above and behind the offense): locate every visible player, label each player's position group, and classify the offensive formation. Three sequential deep modules:

**Module 1 — Player localization (YOLOv3, single class).**
- First attempt was multi-class YOLO (position per box) — failed, because all players wear the same uniform, postures are similar, and jersey numbers are occluded/blurry. Lesson: *detect first, label later* — YOLO is used as a single-class "player" detector only, emitting a bounding box + confidence per player.
- Trained with the TrainYourOwnYOLO recipe (Anton Meuhlemann's repo) on their custom data.
- Operating point chosen by sweeping the confidence threshold from 0.05 to 0.95 and maximizing precision/recall: **0.35**. At 400 training images: precision 97.65%, recall 91.81% (improvement saturates past ~350–400 images — their Figure 13).
- Detection scoring protocol (their §5.1, worth copying exactly): match each ground-truth visible player to the nearest detection; if box-center distance < 20 px → valid detection; leftover detections → false positives/duplicates. Reported accuracy: 90.3% overall, 94.1% on key offensive players (QB/RB/WR), 88.1% on key defensive players (DBs) — offense is easier than defense.

**Module 2 — Player labeling (ResNet-152).**
- The core trick is the *input representation*: for each player in turn, render a small 480×270 image where every detected player is a **green dot** at their location except the player-of-interest, drawn as a **yellow dot** (with a slight gradient on the dots so overlapping marks stay separable). The network classifies the yellow player. So labeling N players = N forward passes (their own future work flags this as the thing to fix).
- **Normalization:** compute the centroid of all player positions, find the player nearest the centroid, translate the whole formation so that player sits at image center. This canonicalizes formations regardless of where they appear in the frame.
- **12 → 8 label grouping** (their Table 1 + §2 prose, exact mapping):
  - Center + Offensive Guard + Offensive Tackle → **Offensive Line**
  - Cornerback + Safety → **Defensive Back**
  - Defensive End + Defensive Tackle → **Defensive Line**
  - Kept as-is: **Quarterback, Running Back, Tight End, Wide Receiver, Linebacker**
  - Rationale: the merged groups carry no formation-discriminative information beyond the group.
- Ground truth came from Microsoft VoTT: bounding boxes for visible players, **single-coordinate points for occluded players**. (Their follow-up work tightened this to "a single bounding box no larger than 5 pixels wide" for occluded players.)
- Results: 99.9% offense/defense separation (2,075 offensive players, 2 errors); 98.8% exact offensive label correct. Defense labeling was poor (occlusion + flexible defensive alignments).
- Architecture ablations: ResNet-50 vs 101 vs 152 — 152 won despite cost (their deployment assumption: GPU available, accuracy > latency). An early 3-channel variant (root/team/opponent channels assuming known offense/defense) was discarded because the detector doesn't provide team identity.

**Module 3 — Formation identification (ResNet-152).**
- Input: the same normalized dot image, but dots are **color-coded by predicted label** — offensive linemen dark blue, quarterbacks red, running backs green, tight ends yellow, wide receivers light blue. (Ablation: labels removed → −3 percentage points, so keep labels.)
- Output: one of **25 formations = 5 formation families × 5 formations** (their Table 3).
- Results with 3-fold cross-validation: 100%, 98.5%, 99.0% → **99.2% ± 0.62%** on ground-truth inputs. Labeling→formation combined on GT: 99.5% (the formation net is robust to occasional labeling errors). **End-to-end on raw images: 84.8% ± 1.8%** — the entire drop from 99.5% is attributed to Module 1 missing occluded players; error propagates forward and is unrecoverable downstream. This is the paper's central quantitative lesson: *localization is the bottleneck, not classification*.

**Data augmentation (four tried, three kept):**
1. **Yard-line augmentation (KEPT):** synthesize the same formation at different yard lines via a **2D affine transform** of player coordinates, generating new coordinate sets every 10 yards. They note a full 3D perspective transform would be more correct but judged affine sufficient "because the change in distance between the players is relatively small."
2. **Player-shift augmentation (KEPT):** random small pixel displacements per player (real lineups are never pixel-identical).
3. **Formation-rotation augmentation (KEPT):** rotate all players ±2° about the centroid player (formations aren't perfectly horizontal).
4. **Player-count modification (REJECTED):** randomly add/remove players to simulate detector misses — *decreased* accuracy, because some formations differ by only 1–2 players (their Figure 12: two formations identical except one RB ↔ TE swap) and football always has exactly 11 per side. Key insight for GSE: **do not train the formation/association stages to tolerate player-count noise** — 11 is a hard constraint to exploit, not noise to smooth over.

**Occlusion special-rules (§4.3.4, camera at ~30° behind the offense):**
- **QB rule (ADOPTED, +4 percentage points on formation accuracy):** enforce exactly one QB — if none detected, insert one at image center; if multiple, keep the one nearest center. (Diagnostic variant: inserting a 2nd RB behind the QB in I-form formations lifted overall accuracy to 94.0%, but was NOT adopted because it uses outside knowledge of which formations to apply it to.)
- **OL rule (REJECTED):** enforce exactly five OL — no accuracy gain.
- **RB rule (REJECTED):** inserting a RB behind the QB helped I-form but hurt singleback (which legitimately has one RB).
- Root cause per the authors: the I-form family stacks four players (C, QB, RB, RB) in a line away from the camera, so the detector sees one blob. 20 of 28 misidentified formations were I-form.

**Future work (authors'):** single-pass labeling (one forward pass for all players, shallower net than ResNet-152); normalize/crop around the formation to cut black space; video sequences instead of stills (audibles change formations pre-snap); real broadcast footage subject to two gating conditions — (1) all 22 players in frame, (2) viewing angle steep enough to minimize occlusion; referee filtering via uniform check (black-white stripes); single end-to-end network (MaskRCNN/SegNet/transformer) as an alternative to the 3-module cascade.

## DATASETS

- **Custom, 1,000 images from the Madden NFL 2020 PC game** (1920×1080), All-22-like view above/behind the offense. First 500 without formation labels (localization/labeling only); second 500 with formation names (all three modules). Manual VoTT labeling: boxes for visible players, single points for occluded players; LOS yard line recorded per image.
- Splits: 700 train / 300 test (modules 1–2); 300 train / 200 test (module 3). Split **by game** (different teams, different times of day) to maximize variability — the right way to split sports data.
- **Availability: "available on request from the corresponding author"** — not openly downloadable; Madden-derived, so EA rights apply. License: request-only.
- GSE cannot reuse it directly; the value is the *protocol* (labeling scheme, splits, augmentation, eval harness).

## GSE APPLICATION

- **Gap (a) — detector recall on piles/ground players (PRIMARY).** Three directly portable items:
  1. **The §5.1 eval harness**: GT-visible-player ↔ nearest-detection matching with a 20-px center threshold, confidence sweep 0.05→0.95, operating point at max precision/recall. This is the principled protocol for tuning GSE's YOLOv8n operating point on the 57 hand-labeled people and on future pile/ground-player labels — replacing ad-hoc threshold picks.
  2. **Occluded-player labeling protocol**: label occluded players as single points / ≤5-px boxes rather than guessing full boxes. This is exactly the annotation spec GSE needs for pile and ground-player training data (the current recall 0.74 gap).
  3. **The 90.3%/94.1%/88.1% asymmetry**: offense detects better than defense; key offensive players best. For GSE's pre-snap use, prioritize offensive recall — and their "single-class detect, label later" decision (multi-class YOLO failed on uniforms) validates our `DetectionClass = player|ball|ref|other` contract: keep the detector coarse, put fine labels downstream.
- **Gap (b) — motion-aware association (SECONDARY).** Their centroid-normalization (translate formation so the centroid-nearest player is centered) is a per-frame canonicalization that makes formation *shape* comparable across frames despite camera motion — usable as a tracklet re-ID feature (formation-context fingerprint) when IoU breaks during fast pans. Their hard "exactly 11 players" constraint should be ported as an association invariant: a frame claiming 12–13 active tracklets has a duplicate to merge.
- **Gap (c) — field landmarks (SECONDARY).** Their yard-line affine augmentation is the *inverse* of what `cv-homography.ts` needs — and their judgment ("affine suffices because player-distance changes are small") is evidence *for* the Sloan-style affine fallback (Kernel S1, deep-dive-sloan2018.md): when DLT landmarks are missing, an affine map from yard-line spacing is a defensible failsoft, not a hack.
- **Cross-paper warning:** their end-to-end 84.8% vs. 99.5% on GT inputs proves localization error dominates everything downstream — GSE's gap (a) is therefore the highest-leverage gap of the three, exactly as the branch notes prioritize it.

## IMPLEMENTATION SPEC

### Kernel M1 — `detector-eval.ts` (NEW): the §5.1 eval harness
Pseudocode (clean-room):
```
interface EvalResult { precision: number; recall: number; f1: number; threshold: number; }

function evaluateDetector(gt: Point[], detections: ScoredPoint[], threshold: number): EvalResult
  // scored detections filtered to confidence >= threshold
  // greedy match: each GT point claims nearest unmatched detection within 20 px
  // precision = matched / kept detections; recall = matched / gt.length

function sweepThreshold(gt, detections): EvalResult
  // thresholds 0.05..0.95 step 0.05; return argmax F1
```
- Repo files: CREATE `packages/prediction-engine/src/tracking/detector-eval.ts`; CREATE `detector-eval.test.ts`. Feed it the existing 57 hand-labeled people fixture + the YOLOv8n outputs.
- TEST ASSERTIONS:
  - On the current fixture at the current operating threshold, the harness reproduces the known numbers: precision 1.00, recall 0.74 (validates the harness against the recorded baseline).
  - `sweepThreshold` returns a threshold whose F1 ≥ baseline F1 (never regresses the operating point).
  - Synthetic case: 10 GT points, 8 detections within 20 px, 2 beyond → precision/recall computed exactly (8/10 recall; precision 8/(kept)).
- Done/verified: harness reproduces 1.00/0.74 on the fixture; sweep documented in the test log.

### Kernel M2 — occlusion label schema (extends labeling protocol, no model code)
- Add `OcclusionLabel` type to `cv-detector-contract.ts` (or new `cv-label-schema.ts`): `{ kind: "point", xPx, yPx } | { kind: "box", bbox }`, with the rule "occluded player → point label (≤5 px box equivalent), never a guessed full box."
- TEST: schema validator accepts a point label; rejects a full box flagged occluded=true; a 20-label synthetic pile fixture validates.
- Done/verified: validator green; a one-page `docs/research/2026-10-01/cv-corpus/pile-labeling-protocol.md` written for future annotators.

### Kernel M3 — `formation-guardrails.ts` (NEW): count guardrails post-processor
Pseudocode:
```
function guardrailCounts(dets: Detection[], opts): Detection[]
  // exactly-11 invariant: if dets.length > 11, merge highest-IoU same-teamHint pair iteratively
  // QB rule (pre-snap labeling mode only, shadow): if no detection with roleHint=="QB",
  //    insert marker at formation centroid with confidence 0 and source:"guardrail"
  //    (downstream must treat guardrail-inserted markers as untrusted: never published,
  //     used only for formation-shape features)
```
- TEST: 12 synthetic detections (one duplicate pair IoU 0.85) → 11 out; frame with no QB → one guardrail QB marker at centroid with `source:"guardrail"`; frame with 2 QB-role detections → keeps the more central.
- Done/verified: assertions green; guardrail insertions are structurally distinguishable from real detections (type-level, not just a flag).

### Kernel M4 — affine yard-line calibration fallback (shared with Sloan S1)
- Implement inside the planned `cv-field-lines.ts` (see deep-dive-sloan2018.md): from detected yard-line spacing build the 2D affine pixels→yards map; cite this paper's "affine suffices" judgment in the code comment as the rationale.
- TEST: synthetic field, affine maps 6 known yard-line points with mean error < 0.5 yards.

## IMPROVEMENT PATH (beyond the paper)

1. Their N-forward-passes labeling is obsolete — replace with a single-pass multi-head network (their own future work); for GSE, position labels come from formation geometry + roster priors, not from N ResNet passes.
2. Their sim-to-real gap (Madden → broadcast) is unaddressed: GSE trains/evals on real broadcast frames from day one; use their augmentation suite (yard-line affine, ±2° rotation, pixel shifts) as *training-time* augmentation for our detector, and explicitly NOT the rejected count-modification.
3. Their defense labeling failed (occlusion) — for GSE, defensive positions come from post-snap tracking + alignment priors, not from a pre-snap dot classifier.
4. Adopt their two gating conditions for real footage as pipeline preconditions: all 22 players in frame + steep-enough angle; log a data-quality flag when violated rather than silently degrading.
5. Referee handling: their striped-uniform check maps to our `classId: "ref"` — implement the uniform check as a detector post-filter.

## Confidence + evidence

- **HIGH** — full open-access text read end to end (CC BY 4.0, legitimate fetch); all numbers above (0.35 threshold, 97.65%/91.81%, 90.3%/94.1%/88.1%, 99.9%/98.8%, 99.2±0.62%, 84.8±1.8%, +4pp QB rule, 20/28 I-form, 700/300 & 300/200 splits, 480×270, ±2°, 20-px matching) transcribed from the extracted article text. Method paraphrased clean-room; no text or code copied.
- **MEDIUM** — the 25-formation taxonomy names (Table 3 body absent from extraction; I-form and Singleback confirmed in prose).
