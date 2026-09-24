# [0325] Extended OpenTT Games Dataset: A Table Tennis Dataset for Fine-Grained Shot Type and Point Outcome Detection (arXiv:2512.19327v2)

**Citation:** Moamal Fadhil Abdul–Mahdi, Jonas Bruun Hubrechts, Thomas Martini Jørgensen, Emil Hovad (2026). *Extended OpenTT Games Dataset: A Table Tennis Dataset for Fine-Grained Shot Type and Point Outcome Detection*. arXiv:2512.19327v2. URL: https://arxiv.org/abs/2512.19327v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 573 lines).
**Verdict:** REJECT — a table-tennis stroke-annotation dataset paper: no model, no results, no transferable analytics to GSE's NFL/NCAA operation. The only reusable element (a compact shorthand + two-step frame-tagging annotation workflow) is a generic labeling trick, not a research contribution worth adapting; and the CC BY-NC-SA 4.0 license blocks commercial reuse anyway.

## 1. Research question
Can a widely-used, openly-licensed table-tennis video dataset be extended with frame-accurate, fine-grained stroke-type, posture, and rally-outcome annotations so the community can move beyond event spotting (bounce/net detection) toward tactical stroke understanding? The paper is a pure dataset-release contribution: it answers no modeling question and trains no model.

## 2. Dataset / schema
Extension of the public OpenTTGames dataset (12 videos: 5 training, 7 test; fixed side-of-table camera; 1920×1080 @ 120 fps; no audio track; only three left-handed players, all in test videos). Annotations added:
- **Strokes**: 1,457 total (1,134 train / 323 test), one frame per ball-racket impact. Hierarchy: table side (left/right from camera) × forehand/backhand × technique (block, chop, flick, lob, loop, push, serve, smash) → concatenated labels, e.g. `left_forehand_serve`.
- **Posture at impact**: body lean (forward/backward/right/left/neutral/unknown — 1,432 annotated) and per-foot lifted/planted/unknown (1,319 annotated).
- **Rally endings**: 282 annotated (223 train / 58 test — note: 223+58 = 281, one more than the components sum; paper's stated total is 282), six classes × player prefix: `out`, `net`, `winner`, `not_hitting_ball`, `double_bounce`, `miss_on_own_side` (e.g. `left_winner`; point awarded accordingly).
Label sparsity is severe: loops (583) and pushes (279) dominate; smashes 12, lobs 10 across the whole dataset. Authors explicitly warn the inherited train/test split is "not strictly meaningful" (fine-grained types missing from one split) and users should make their own splits. Also refines original events (e.g., net hits attributed to the erring player; some bounces re-labeled double bounces).

## 3. Method / model
No model. The contribution is an annotation pipeline: (a) a custom frame-by-frame inspection/labeling script; (b) a **compact shorthand notation** (Tables 6–9: e.g. `lfsv` → `left_forehand_serve`, `b/f/r/l/n/u` for lean, `b/bl/r/l/u` for legs, two-letter outcome codes) that expands into predefined label parts, reducing typos and annotation time, plus temporary tags (`point`) for later review; (c) a **two-step procedure**: Step 1 — tag all stroke frames as `empty_event` and rally-endings as `point` (reusing OpenTTGames' existing impact timestamps where present to skip Step 1 for strokes); Step 2 — revisit marked frames and replace temporary tags with detailed labels. Design decision: a stroke = exactly the ball-racket impact frame (subsequent frame if impact falls between frames, matching OpenTTGames convention); preparatory/follow-through sequences deliberately excluded as boundary-fuzzy. Foot-labeling rules: slight ground contact or dragging = lifted; occluded-but-inferable = inferred; occluded-and-moving = unknown.

## 4. Equations & assumptions
None. The paper contains no equations, models, or statistical claims — it is a dataset + annotation-protocol release. Assumptions worth noting: (a) the single impact frame captures the meaningful signal of a stroke (authors defer sequence-boundary work); (b) four-direction lean discretization is sufficient (authors note diagonal leans were forced to nearest direction); (c) impact timestamps from OpenTTGames are trustworthy anchors for the extension.

## 5. Features / target
N/A (dataset paper). The released artifacts: stroke labels, lean labels, leg labels, rally-ending outcome labels, frame timestamps, plus the inspection/annotation scripts. Annotation code: https://github.com/moamal01/table_tennis_data.

## 6. Validation design
None — no model is trained, no benchmark baseline is run. Validation is procedural: "many hours of careful review and repeated verification" of annotations; no inter-annotator agreement statistics are reported. (This is the paper's weakest point as research: label reliability is asserted, not measured.)

## 7. Numerical results / baselines
None. All numbers in the paper are dataset statistics, not results: 1,457 strokes; 1,432 lean annotations; 1,319 leg annotations; 282 rally endings; per-class counts in Tables 2–5, 10–11 (e.g. train loops 431, serves 228, blocks 141; test left-handed players 4). There are no baselines, no accuracy figures, no comparisons.

## 8. Code / data availability
Scripts: open at github.com/moamal01/table_tennis_data. Data: released under **CC BY-NC-SA 4.0** (same as OpenTTGames) — **non-commercial use only**, which independently rules out direct use in GSE's commercial operation.

## 9. Leakage & limitations
- **No inter-annotator agreement**: single-pass manual labeling with no reported reliability metric; the impact-frame judgment call (preceding vs subsequent frame when the ball is occluded) introduces label noise.
- **Broken split**: the inherited train/test split lacks coverage of fine-grained classes; any model benchmarked on it will face zero-shot classes at test time.
- **Extreme class imbalance**: 583 loops vs 12 smashes — most fine-grained labels occur a handful of times; authors themselves advise aggregating labels.
- **Training videos aren't full matches** (include warm-ups); test videos are much shorter — distribution mismatch between splits.
- **No modeling contribution**: the paper's stated goal (enabling tactical-understanding models) is left entirely to future work; the dataset's utility is unproven.
- Sport specificity: table tennis strokes have zero analog in GSE's sports portfolio.

## 10. GSE overlap
Existing-research-map check: GSE's corpus is NFL/NCAA — tracking, EPA, coverage, passing, betting-market, and broadcast-content lanes. There is no table-tennis lane, no racket-sport lane, and no video-stroke-classification lane anywhere in the repo. **Verdict: no overlap — the contribution (a table-tennis annotation dataset) lies entirely outside GSE's domain.** The license (CC BY-NC-SA 4.0) would block commercial reuse even if the sport matched.

## 11. GSE implementation spec
Not applicable — REJECT. No implementation is proposed. (For the record, the only salvageable pattern is the compact-shorthand + two-step frame-tagging annotation workflow in §3, which could inform a future NFL game-film labeling tool — e.g. shorthand codes for route/coverage/play-type tagging in the broadcast-clip pipeline. That is a tooling footnote, not a research transfer, and needs no spec here.)

## 12. Reproducible test
Not applicable — REJECT. There is no model, metric, or claim to test. (A sanity check on the dataset itself would be: re-annotate a 100-stroke sample with a second annotator and report Cohen's κ per label layer — the paper's missing reliability evidence.)

## 13. Acceptance / rejection gate
**Reject.** The paper contributes a table-tennis dataset to a sport GSE does not cover, trains no model, reports no results, provides no measured label reliability, and is licensed non-commercial. There is no plausible path by which it improves an NFL analytics engine, the betting model, or the content operation.

## 14. Improvement experiment
If the authors (or anyone) revisit this: (a) measure and report inter-annotator agreement (Cohen's κ per label layer) on a double-annotated subset — currently the dataset's reliability is unquantified; (b) define and run a canonical baseline (e.g. VideoMAE-based clip classifier on ±8-frame windows around impact, plus a trajectory-only baseline in the spirit of Kulkarni et al. [10]) on an author-recommended split, so the dataset has a benchmark, not just statistics; (c) the GSE-relevant salvage is methodological, not substantive: adopt the shorthand-code + temporary-tag two-step workflow for any future in-house NFL film-labeling effort (e.g. tagging coverage busts or route concepts in All-22 clips), where it would cut labeling time and enforce taxonomy consistency.
