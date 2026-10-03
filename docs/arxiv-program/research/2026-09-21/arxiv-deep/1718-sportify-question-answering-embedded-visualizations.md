# 1718 Sportify: question answering with embedded visualizations and personified narratives for sports video (arXiv:2408.05123v1)

**Citation:** Chunggi Lee, Sangho Lee, Jaehyun Park, Minji Kim (2024). *Sportify: Question Answering with Embedded Visualizations and Personified Narratives for Sports Video*. arXiv:2408.05123v1. URL: https://arxiv.org/abs/2408.05123v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, all sections, figures, and references).
**Verdict:** ADAPT — the "answer the sports question by grounding it in video evidence with embedded visualizations" pattern is directly useful for GSE's film-backed content (telestrated clips that answer a question rather than decorate it), but the user study is n=13 fans with no significance on the accuracy claims, so adapt the evidence-grounding recipe and run GSE's own evaluation.

## 1. Research question

When fans ask questions about sports video ("why did that play break down?"), is the answer more useful as text, as a third-person visualization, or as a first-person personified narrative embedded in the video? The paper builds Sportify, a system that answers sports-video questions by retrieving relevant clips, classifying the tactic shown (via SportsVU coordinate data), overlaying embedded visualizations (arrows, highlights for PASS/CUT/SCREEN/SHOOT), and narrating in first- or third-person voice — then tests which presentation fans prefer and learn from.

## 2. Dataset / schema

- SportsVU player-coordinate data; 134 human-annotated reference clips covering basketball tactics.
- Tactic taxonomy for the classifier: PASS, CUT, SCREEN, SHOOT action sequences.
- External knowledge retrieval: Google, Wikipedia, Statmuse via a ReAct agent for contextual facts (player stats, historical context).
- User study: 13 basketball fans; 12 completed the timed tasks (one technical exclusion); each answered questions under three conditions (text, third-person visual, first-person visual).

## 3. Method / model

- Pipeline: (1) question → retrieve relevant video clip; (2) tactic classification on SportsVU coordinates using KNN + FastDTW over action sequences; (3) PASS/CUT/SCREEN/SHOOT event extraction and filtering; (4) embedded visualization rendering (trajectory arrows, player highlights, tactic labels overlaid on the clip); (5) ReAct retrieval of external context (Google/Wikipedia/Statmuse); (6) answer generation in three presentation modes: plain text, third-person visual narration, first-person personified visual narration.
- The personified mode narrates as if the player ("I cut baseline because the screen freed me").

## 4. Equations & assumptions

- Tactic classification: KNN over FastDTW distances between observed multi-agent trajectory sequences and the 134 reference clips; no learned parameters beyond k and the DTW warping window.
- Event extraction/filtering for PASS/CUT/SCREEN/SHOOT evaluated as a detection task (precision/recall/F1).
- Assumption: SportsVU-grade coordinate data is available; tactic labels from the 134 reference clips cover the question space; first-person narration does not distort factual content (assumed, not tested).

## 5. Features / target

- Input: natural-language question about a sports video moment + the video/SportsVU coordinates.
- Intermediate: tactic class, extracted action events, retrieved external facts.
- Output: answer in one of three presentation modes.
- User-study measures: action-sequence identification accuracy, task completion time, perceived visualization helpfulness per tactic.

## 6. Validation design

- Tactic classifier: 5-fold cross-validation on the 134 reference clips.
- Event extraction: precision/recall/F1 against human annotations.
- User study: within-subjects, 13 fans × 3 conditions; action-sequence accuracy scored on 36 trials per condition; watch time measured; Kruskal–Wallis + Dunn post-hoc on timing; helpfulness ratings per tactic.

## 7. Numerical results / baselines

- Tactic classifier: 0.8533 accuracy (5-fold CV) on 134 clips.
- PASS/CUT/SCREEN/SHOOT extraction+filtering: F1 0.7393.
- Action-sequence identification accuracy: text 72.22% (26/36), third-person visual 72.22% (26/36), first-person visual 69.44% (25/36) — essentially no difference; the accuracy claim does not survive the sample size.
- Watch time: text 69.44s, third-person 68.72s, first-person 86.27s; Kruskal–Wallis p = 0.02, H = 7.765; Dunn text-vs-first p = 0.046 — first-person costs ~17s more viewing time with no accuracy gain.
- Visualization helpfulness: Cut 85%, Screen 77%, Pass 85% of fans rating helpful.

## 8. Code / data availability

- No public code or dataset link found in the paper. SportsVU data is proprietary (STATS); the 134 annotated clips are not released. The ReAct retrieval uses public sources (Google/Wikipedia/Statmuse).

## 9. Leakage & limitations

- User study n=13 (12 for timing) — the accuracy comparisons (26/36 vs 25/36) are noise; the only significant finding is that first-person narration costs time.
- Basketball-only, SportsVU-only: the coordinate-data requirement excludes any sport/level without tracking feeds (most of GSE's film sources are broadcast video, not coordinate data).
- 134 reference clips is a tiny tactic library; KNN+FastDTW will not generalize to unseen tactics or noisy tracking.
- First-person personification risks fabricating player intent ("I cut because…") — the paper does not test whether personified narration introduces factual distortions vs third-person.
- No comparison against a modern VLM baseline that could answer from video directly.

## 10. GSE overlap

- GSE's content doctrine requires telestrated, commentary-led clips where visuals answer a question — Sportify is the academic version of that instinct: embedded visualizations that carry the explanation, not decoration.
- Directly relevant to GSE's film-backed pick explanations: "why the model likes this prop" answered with a telestrated clip + sourced stats, mirroring the paper's visualization + ReAct-retrieval structure.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/content/evidence_clip.py`: (1) question → retrieve the relevant play(s) from GSE's charted-play database (NFL: use NGS-style tracking where available, broadcast-derived coordinates otherwise); (2) classify the concept (coverage bust, blitz pickup, route concept) with GSE's existing charting labels instead of KNN+FastDTW; (3) render embedded telestration (route arrows, coverage shading, pressure timing) on the clip; (4) attach retrieved context (player splits, matchup stats) via GSE's data APIs rather than Google/Wikipedia; (5) generate third-person narration only — skip the paper's first-person mode, which the study shows costs time without accuracy gains and risks intent fabrication.
- Every stat in the narration must be traceable to a GSE data row (the paper's ReAct retrieval is the weakest link; replace with sourced data).

## 12. Reproducible test

- Produce 20 evidence clips for 2025 NFL plays answering real analyst questions; run a fan/analyst panel (n≥30) rating comprehension and trust vs text-only answers; success criteria: ≥ 70% prefer the visual answer for comprehension, factual-error rate ≤ 1 per 20 clips, and median production time per clip ≤ 15 minutes semi-automated. The paper's n=13 study is replaced, not cited.

## 13. Acceptance / rejection gate

ADAPT the evidence-grounding pattern (question → retrieved play → tactic classification → embedded visualization → sourced stats), not the paper's components: KNN+FastDTW on 134 clips, SportsVU dependence, and first-person narration are all rejected for GSE use. ADAPT proceeds if the reproducible test shows comprehension gains without factual errors; REJECT the first-person personified mode unconditionally (costs ~17s, no accuracy gain, fabricates intent); REJECT the pipeline for any sport/level lacking coordinate or charted-play data — without grounding coordinates it degrades to decoration, which GSE's video doctrine forbids.

## 14. Improvement experiment

Go beyond the paper on its two gaps. (1) Factuality of narration: the paper never tests whether personified/visual narration distorts facts — run a controlled experiment with GSE analysts labeling every factual claim in 20 generated narrations as supported/unsupported by the clip + data, and compare third-person vs (a small test of) first-person; if first-person inflates unsupported intent claims, that is a publishable caution and it justifies GSE's third-person-only rule. (2) Replace KNN+FastDTW with GSE's charting labels and measure tactic-classification accuracy on NFL concepts (coverages, blitzes, route concepts) — if charted-label retrieval beats trajectory matching, it proves the paper's coordinate-matching step is unnecessary when structured charting exists, which simplifies the whole pipeline to retrieve → telestrate → narrate.
