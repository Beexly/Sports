# Deep-Dive: Zac Yauney — Madden NFL Computer Vision Classifier

**Source:** https://www.zacyauney.com/projects/madden/ ("Madden NFL Computer Vision Classifier — Teaching AI to Read Football")
**What was read (2026-10-01):** full page via `browser.open` — all 54 lines, i.e., the complete page text: Approach (formation + play classification), Data Collection & Labeling, Architecture, Frame-by-Frame Analysis. No linked repo/code was present in the page text; a web search for the author's repo/voting-scheme details returned no project-specific results (unrelated results only).
**License:** personal project page — method intel only. No code or data to ingest (the author notes training video data is excluded "due to size constraints").
**Confidence:** HIGH on the page's stated facts; the voting scheme is recorded exactly as stated (the page does not specify the vote-aggregation formula beyond "voting mechanism" — that limit is explicit, not filled in).

---

## 1. METHOD (exact, as stated)

### 1.1 Formation classification
- **Task:** classify **4 similar-but-distinct variants of the shotgun formation** from static screenshots: **Gun Bunch, Gun Empty Base Flex, Gun Normal Y Off Close, Gun Trey Y-Flex**.
- **Model:** **fine-tuned Inception v3** with a custom final layer for 4-class classification, trained on **manually labeled formation screenshots**. Result reported qualitatively: "high accuracy on distinguishing between these formation types" (no numeric accuracy given).

### 1.2 Play classification — the voting scheme, extracted exactly
- **Task:** classify actual plays from video sequences into **4 classes**: **Inside Zone** (running play), **Y-Sail** (passing play), **Mesh Spot** (passing play), **Escape** (scramble play).
- **Architecture:** **ResNet18-based frame classifier** that processes **individual video frames independently**; predictions are then **aggregated across the entire play sequence using a voting mechanism**.
- **The page's exact words:** *"For play classification, each video frame is processed independently, then predictions are aggregated using a voting mechanism. This approach handles the temporal complexity of football plays where different phases (snap, development, completion) may look quite different."*
- **What is NOT specified:** the vote-aggregation formula. "Voting mechanism" most plainly reads as **majority vote over per-frame argmax predictions** (the standard reading), but the page does not say majority vs. confidence-weighted vs. phase-weighted. **Do not claim more than the page states.** The honest-limits note in §5 records this.
- **Why voting:** different play phases (snap / development / completion) look different — a single frame is ambiguous, the sequence vote is robust. This is the design rationale to carry forward.

### 1.3 Data
- Video training data **manually extracted and labeled from Madden NFL gameplay footage**; screenshots captured at "key moments showing clear formation setups"; play videos "trimmed to show the essential action from snap to completion." Data structure and labeling methodology documented; the videos themselves not included.

---

## 2. DATASETS / LICENSES
- **Madden NFL gameplay footage** — EA's copyrighted game; the author's training videos are not distributed, and game footage is not a licensable training source for us. **Method intel only; DO NOT scrape or reuse Madden footage.**
- No code repo linked → nothing to license-check. Verdict: **method intel only.**

---

## 3. GSE APPLICATION — tendency layer (downstream of gaps a/b/c)

This source is not a detection/tracking source — it is the **tendency-model blueprint** that consumes tracking output once gaps (a–c) close:

1. **Two-stage pattern: formation → play.** Stage 1 classifies the static pre-snap formation (cheap, one frame or a few); Stage 2 classifies the play from the sequence. This decomposes the problem exactly the way our pipeline decomposes: homography + tracklets (upstream) → formation snapshot → play label → tendency features.
2. **Per-frame-independent + sequence vote.** The key transferable mechanic: run a cheap per-frame classifier over the whole play, then vote. For GSE's tendency layer this becomes: per-frame features (formation geometry, motion vectors from tracklets) → per-frame play-hypothesis → voted play label with a confidence = vote margin. The vote margin is itself a useful signal (unanimous vs. split votes → tendency confidence).
3. **Phase-awareness as the improvement:** the author's rationale (snap/development/completion look different) suggests the upgrade path — **phase-weighted voting** (weight the development phase more than the pre-snap milling), which the page doesn't do but its rationale invites.

**Relation to corpus siblings:** the Sloan 2018 paper got 72.3% formation classification with CART on coordinates (no pixels at all); Chung's thesis fused images + play-by-play text and beat either alone; the THI thesis got 74.13% run/pass with YOLOv8+OCR+XGBoost. The consensus pattern: **formation/play classification from visual features is a solved-shape problem at ~70–85% accuracy** — our differentiator is feeding it *real tracked geometry* instead of pixels.

---

## 4. IMPLEMENTATION SPEC

**Target files:**
- New: `packages/prediction-engine/src/tracking/cv-play-classifier.ts` — the two-stage contract (formation classifier + per-frame play classifier + voting aggregator; model-agnostic, fixture models for tests).
- Test: `packages/prediction-engine/src/tracking/cv-play-classifier.test.ts`.
- Consumes tracklets from `cv-tracklet-association.ts` (post-gap-b) and the formation snapshot (downstream of gap-c homography).

**Pseudocode (clean-room):**

```
type FormationLabel = string;   # e.g. 'Gun Bunch' — taxonomy defined by GSE, not this source
type PlayLabel = 'Inside Zone' | 'Y-Sail' | 'Mesh Spot' | 'Escape' | string;

interface FormationClassifier { classifyFormation(snapshot: FrameDetections): { label: FormationLabel; confidence: number } }
interface FramePlayClassifier { classifyFrame(frame: FrameDetections): Array<{ label: PlayLabel; confidence: number }> }

function classifyPlay(
  frames: FrameDetections[],
  formationClf: FormationClassifier,
  frameClf: FramePlayClassifier,
  phaseWeights?: number[],   # optional phase weighting; default uniform = the author's voting
): { play: PlayLabel; voteMargin: number; formation: FormationLabel }
  formation = formationClf.classifyFormation(frames[0])       # pre-snap snapshot
  votes = new Map<PlayLabel, number>()
  for i, frame in frames:
    w = phaseWeights?.[i] ?? 1.0
    top = argmax(frameClf.classifyFrame(frame))                # per-frame independent prediction
    votes.set(top.label, (votes.get(top.label) ?? 0) + w)
  total = sum(votes.values())
  play = argmax(votes); runnerUp = second(votes)
  voteMargin = (votes.get(play) - votes.get(runnerUp)) / total
  return { play, voteMargin, formation: formation.label }
```

**Test assertions with expected values:**
1. Fixture: 10 frames; frame classifier returns Inside Zone on 7 frames, Y-Sail on 3 (uniform weights) → assert `play === 'Inside Zone'` and `voteMargin === (7-3)/10 = 0.4` exactly.
2. Phase-weighted: same fixture with `phaseWeights = [3,3,3,1,1,1,1,1,1,1]` where the 3 Y-Sail frames are the weight-3 ones → weighted votes: Inside Zone 7×1=7, Y-Sail 3×3=9 → assert `play === 'Y-Sail'` (documents that phase weighting can flip the plain majority — the improvement path).
3. Tie: 5/5 split → assert deterministic tie-break (first-seen label wins; assert and document the rule).
4. Empty frames → throws `Error` matching `/no frames/` (fail-closed, never emit a play label from nothing).

**Done/verified criteria:** contract + tests green; a follow-up experiment doc runs the two-stage classifier on labeled play clips once tracking is solid, reporting per-class accuracy vs. the corpus anchors (72.3% CART formation / 74–85% play-type range); `voteMargin` distribution recorded as the tendency-confidence input.

---

## 5. IMPROVEMENT PATH
1. **Now:** land the contract + voting aggregator (this spec) — it is model-agnostic and testable today on fixture tracklets.
2. **Next:** phase-weighted voting (the page's rationale, our extension): learn phase weights from labeled plays; expect the development-phase frames to dominate.
3. **Later:** fuse with play-by-play text (Chung's finding: images + text beats either alone) and with the run/pass XGBoost head (THI 74.13%) — the tendency layer's full shape.

---

## 6. EVIDENCE / CONFIDENCE
- **Confidence: HIGH** on everything the page states (formation classes, model choices, the voting description). **Explicit limit:** the vote-aggregation formula is unspecified — the spec implements the plain-majority reading and documents the assumption; if the author's repo ever surfaces, reconcile then.
- No code or text copied; the pseudocode is a clean-room description of the described method.
