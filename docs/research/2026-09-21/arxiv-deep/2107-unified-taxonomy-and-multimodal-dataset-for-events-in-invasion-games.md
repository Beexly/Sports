# [2107] A Unified Taxonomy and Multimodal Dataset for Events in Invasion Games (arXiv:2108.11149)

**Citation:** Henrik Biermann, Jonas Theiner, Manuel Bassek, Dominik Raabe, Daniel Memmert, Ralph Ewerth (2021). *A Unified Taxonomy and Multimodal Dataset for Events in Invasion Games*. arXiv:2108.11149v2. URL: https://arxiv.org/abs/2108.11149
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2108.11149v2). (Numeric values inside Tables 2–3 did not extract as text from the HTML conversion; qualitative findings and Table 1 counts are quoted from the extracted text.)
**Verdict:** ADAPT
**Rationale:** a hierarchical, modality-agnostic event taxonomy (game status → possession → individual ball events) plus a multimodal (video+audio+positional) gold-standard dataset, with the critical finding that commercial provider annotations disagree badly with expert annotations; directly applicable to unifying NFL charting sources (FTN/PFF/SIS/nflverse) and to labeling the multimodal corpus GSE needs. Needs adaptation (American-football refinement of the taxonomy).

## 1. Research question
How should on-ball events in invasion games be defined so that annotations are consistent across annotators, sports, and data modalities — and can a multimodal dataset (video + audio + positional data) with gold-standard annotations be built to benchmark automatic event spotting? A secondary question: how good are commercial data-provider annotations compared to expert annotations?

## 2. Dataset / schema
**EIGD-S** (soccer) and **EIGD-H** (handball), released at https://github.com/mm4spa/eigd. Each: 125 minutes total (5 matches × 5 sequences × 5 min), synchronized video (HD 1280×720 @ 30 fps, unedited main-camera, no replays/close-ups/overlays), audio, and positional data (handball: Kinexon, all players @ 20 Hz). Frame-accurate manual annotations by domain experts using the proposed taxonomy. ~40% of events reserved for test (2 of 5 matches). Annotation time ~30 min per clip. Event counts (Table 1, per expert annotation): EIGD-S — ball possession change 171, ball reception 923, ball release 1531, pass 1346 (of which successful untouched 1064, off target 175, intercepted 83, successful deflected 24), shot 31, successful interference 80, referee decision 142, static ball action 121; EIGD-H — ball reception 2268, ball release 2470, pass 2292 (successful untouched 2263), shot 175, goal 86, referee decision 252, static ball action 207. Also **PDD-S**: 4 matches of a first European soccer league 2014/2015 from a private data provider, used only for the provider-quality case study. Public (EIGD); PDD-S private.

## 3. Method / model
- **Taxonomy** (3 paths, hierarchical, minimal, non-redundant, mutually exclusive within a path): (1) Game-status-changing events — active↔inactive transitions: referee decisions (foul, out-of-bounds, goal, game end) vs. static-ball actions (game start, ball in field, after foul, kick-off, throw-in, corner, free-kick, penalty, goal-kick). (2) Ball possession changes (Link & Hoernig 2017 definition). (3) Individual ball events — ball reception (gaining control) → ball release (losing control); release split into unintentional (successful interference by opponent vs. self-induced) and intentional (pass = teammate-intended; shot = target-intended). One-touch actions annotate only the release. Dribbling deliberately excluded (definition too ambiguous). Attributes (e.g., pixel location) attach at any level and inherit downward. Multiple paths can co-fire at one timestamp (e.g., static-ball + pass on a free kick).
- **Metrics**: tIoU for duration events; for timestamp events, Nearest Neighbor Matching (NNM, many-to-one, positive bias) vs. the proposed Sequence Consistent Matching (SCM, penalizes count mismatches); temporal Average Precision (tAP) over tolerance areas; precision/recall at fixed tolerance.
- **Baseline**: I3D (Carreira & Zisserman 2017) with ResNet-50 backbone, Kinetics-400 pretrained; classes = {reception, successful pass, shot, background}; 32-frame clips centered on annotations, input 32×3×256×456, trained at 15 fps; sliding-window inference + NMS with per-event filter length w^e_nms and confidence threshold τ^e tuned by grid search on F1 (Sanford et al. 2020 search space); lowest-val-loss checkpoint.

## 4. Equations & assumptions
- tIoU = aggregated intersection / aggregated union over annotation pairs.
- NNM: true positive iff a predicted event has a same-description ground-truth event within temporal tolerance (many-to-one allowed → positive bias). SCM: enforces sequence consistency (count mismatches penalized).
- Grad-CAM-style equations: none in this paper (no equations stated beyond metric definitions in prose).
- Assumptions: (1) ball-centered events suffice to describe invasion games (group tactics like pressing are out of scope); (2) intention (pass vs. shot) is annotatable despite admitted subjectivity; (3) expert frame-accurate annotation is the gold standard; (4) hierarchy levels are comparable across sports.

## 5. Features / target
- Inputs: raw video frames, audio, positional (x,y) trajectories.
- Target: event class + timestamp (frame-accurate) under the taxonomy; attributes (e.g., location).

## 6. Validation design
Human performance: each annotator vs. the best-performing expert annotation (leave-one-out style); experienced vs. inexperienced annotator comparison on EIGD-S. Provider case study: provider annotations vs. a domain expert's frame-accurate re-annotation on PDD-S (SCM with player-identity matching for passes). Baseline: I3D trained on 60% of events, tested on the held-out 2 matches (~40%); per-event NMS/threshold tuned on train. Metrics: precision, recall, F1, tAP.

## 7. Numerical results / baselines
Table 1 counts quoted in §2 above (exact). Qualitative results (numeric table cells did not extract as text — reported as stated):
- Human agreement is high at the top hierarchy levels and decreases with depth/complexity; "disagreements and ambiguities in the annotation increase with the complexity of the event."
- Soccer: game-status agreement significantly higher than possession agreement. Handball: possession agreement comparable to soccer, but game-status agreement significantly lower (fluid active/inactive transitions).
- Successful pass in handball shows high agreement under NNM but low sequence-consistent counts (positive bias exposed by SCM) — high-frequency events are hard to assign one-to-one.
- Experienced vs. inexperienced annotator on EIGD-S differ only slightly → "a sufficient annotation of our base taxonomy does generally not require expert knowledge."
- Provider case study (PDD-S): "low agreement between the precise expert and the data-provider annotation" for pass/shot/game-status events — attributed to imprecise real-time manual annotation by providers.
- I3D baseline: "sufficiently robust recognition performance"; excessive false positives partly visible only under SCM (confirming the metric's value); fails most on temporally uncentered events.

## 8. Code / data availability
Datasets at https://github.com/mm4spa/eigd (stated). No model code link stated in the extracted text.

## 9. Leakage & limitations
- Table 2–3 numeric cells unavailable in the HTML extraction — effect sizes for agreement and baseline P/R cannot be quoted exactly (flagged, not filled).
- Only 125 min per sport; rare events (e.g., soccer goals: 3 in EIGD-S) have tiny samples — baseline numbers on rare classes are noisy.
- I3D baseline uses video only; the multimodal promise (audio + positional) is unexploited — "future work."
- NNM positive bias acknowledged; results reported under both metrics but the headline reading favors NNM.
- External validity: soccer/handball; American football's discrete-play structure (whistle-separated plays) differs from continuous invasion games — the game-status path maps well, but the individual-ball-event path needs a football-specific refinement (snap, handoff, throw, catch, tackle, etc.).

## 10. GSE overlap
Existing-research-map: no event-taxonomy or annotation-quality read in the corpus; the 2026-09-18 props-reverse-engineering mission explicitly compares analyst/charting sources (FTN, PFF, SIS) with "replicability verdicts" — this paper's provider-quality finding (commercial annotations ≠ gold standard) is DIRECTLY relevant to that lane and to any model trained on charting labels. NEW capability: a principled, hierarchical NFL event taxonomy + the discipline of expert-vs-provider validation. No duplication.

## 11. GSE implementation spec
**Goal:** (1) an NFL event taxonomy refined from the paper's base (game status: whistle/dead-ball vs. live; possession: change-of-possession events; individual ball events: snap, handoff, dropback, throw/release [intentional: pass/throwaway; unintentional: fumble, strip], reception [catch/drop/breakup], tackle, etc., with attributes like yard line, down, coverage shell); (2) a gold-standard multimodal annotation set (broadcast video + tracking + audio) for ~10 games; (3) an expert-vs-provider audit of one charting source.
- Data: Big Data Bowl tracking + broadcast clips + nflverse pbp as the "provider" annotation; expert re-annotation of a sample by GSE analysts.
- Model: adapt the I3D baseline recipe to a modern video backbone (or the 2102 Perceiver) for event spotting; per-event NMS/threshold tuning on F1 per the paper.
- Use: consistent labels for the multimodal corpus (feeds 2103/2104/2105), label-noise estimates for training (provider disagreement rate → label smoothing), and content (published "what the charting got wrong" analysis).
- Effort: medium (3–5 weeks; taxonomy design + annotation tooling dominate).

## 12. Reproducible test
Dataset: 10 NFL games (2023–2024) with tracking + broadcast video. Metric: (a) inter-annotator agreement (SCM precision/recall) between two GSE annotators using the NFL-refined taxonomy — target: top-level (game status/possession) agreement ≥0.9, leaf-level ≥0.7; (b) provider audit: nflverse/pbp event labels vs. expert re-annotation on the same plays — report disagreement rate per event type. Baseline to beat: the paper's qualitative bar (provider annotations "low agreement") — quantify it for NFL.

## 13. Acceptance / rejection gate
**ACCEPT:** (a) annotator agreement meets the ≥0.9/≥0.7 bar (taxonomy is usable); AND (b) the provider audit finds ≥5% label disagreement on at least one high-leverage event type (pass/rush/TD attribution) — proving the audit adds value over blind trust. **REJECT:** annotators can't agree at leaf level (<0.6) — then the taxonomy is too ambiguous for NFL and needs redesign before any model work; or providers agree ≥99% with experts — then the audit lane has no value. Pre-registered before annotating.

## 14. Improvement experiment
Beyond the paper: **multimodal event spotting** — the paper's baseline is video-only and explicitly defers multimodality. Train the spotter on video + tracking + audio jointly (tracking gives exact ball-carrier kinematics; audio gives whistle/crowd cues for game-status changes) and ablate modalities per event type. Why it might beat the paper: game-status changes (whistle, out-of-bounds) should be near-trivially detectable from audio+tracking while being the video baseline's weakness (cuts/replays cause temporal mismatches — the paper's own error analysis); a modality-per-event analysis would produce the first "which sensor for which event" map for sports, directly informing GSE's data-collection priorities.
