# 1715 Knowledge graph assisted automatic sports news writing (arXiv:2402.11191v1)

**Citation:** Yang Cao, Jiaxin Liu, Wei Zhao, Xiaofei Zhou, Qi Zhang (2024). *Knowledge Graph Assisted Automatic Sports News Writing*. arXiv:2402.11191v1. URL: https://arxiv.org/abs/2402.11191v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, all sections, figures, and references).
**Verdict:** ADAPT — the event-segmentation + KG-enrichment pipeline for live-text sports news generation is a strong blueprint for GSE's automated game-recap and injury-news module, but it is NBA-only, trained on Chinese live-text schema, and has no public code; adapt the architecture (KEE segmentation, entity-linked enrichment) to GSE's NFL/NBA data rather than adopt anything as-is.

## 1. Research question

Can a knowledge graph of teams, players, games, and matches improve automatically generated sports news from live play-by-play text? The paper asks two linked questions: (a) how to segment a stream of live-text events into news-worthy passages (the KEE — key event extraction — problem), and (b) whether injecting structured background knowledge (player/team facts from a KG) makes the generated news richer and more accurate than template or pure-neural baselines. A secondary thread proposes Meta-TKGC, a temporal knowledge-graph completion method, to fill gaps in the sports KG.

## 2. Dataset / schema

- NBA knowledge graph: 3 entity classes (player, team, match), 4 relation types, 27 attributes; 4,027 player nodes, 30 team nodes, 43,510 game nodes, 1,836 match nodes.
- Live-text corpus: 494 NBA games, 58,745 sentences total; train split 340 games / 43,211 sentences; test split 154 games / 15,534 sentences.
- Live-text event schema: (quarter, time, team, event, score) — each event is a structured tuple parsed from the live feed.
- Event classes: scoring, misses, rebounds, fouls, turnovers, lineup changes, timeouts.
- KEE segmentation parameters: score-difference threshold of 8 points; key max/min scoring-run time windows to delimit passages.
- Human evaluation panel: 20 raters — 4 sports journalists, 10 fans, 6 general readers — rating "excellent/good" on news quality.

## 3. Method / model

- Pipeline: (1) live-text event parsing into (quarter, time, team, event, score) tuples; (2) KEE: segment the event stream into passages using score-differential (≥8 point swings) and key max/min time detection — passages become the "key events" a story is built around; (3) KG enrichment: link entities in the passage to the sports KG and pull attributes (player season stats, team records, head-to-head) to enrich the generated text; (4) generation: a CNN baseline vs KEE-template vs KEE+KG generation compared on fluency and informativeness.
- Meta-TKGC (secondary contribution): CNN relation meta-learner + Transformer encoder + TransE-style scoring with margin loss, for temporal KG completion on the sports graph.

## 4. Equations & assumptions

- KEE segmentation rule: a passage boundary is triggered when the cumulative score difference within a window crosses the 8-point threshold, or when a key max/min (largest scoring run / scoring drought) is detected in the time series of score differentials. Formally it is a threshold-crossing detector on the score-differential signal, not a learned segmenter.
- TransE-style scoring for Meta-TKGC: score(h, r, t) = −||h + r − t|| with a margin ranking loss L = Σ max(0, γ + score_neg − score_pos). CNN meta-learner produces relation embeddings; Transformer encodes temporal context.
- Core assumption: the live-text feed is complete and correctly ordered; the KG is static and correct at generation time; entity linking from passage text to KG nodes is assumed solved (the paper does not stress-test linking errors).

## 5. Features / target

- Input features: ordered live-text event tuples (quarter, time, team, event, score), plus KG node attributes (27 attributes covering player bio, season stats, team records).
- Target: multi-sentence news article per game, evaluated by ROUGE against human-written reference news and by the 20-person human panel.
- Intermediate target for KEE: passage boundaries (key event segments).

## 6. Validation design

- Train/test split by game (340/154), so no event from a test game appears in training — a clean split.
- Baselines: pure CNN generator, KEE template generator without KG, and the full KEE+KG system.
- Metrics: ROUGE-1/2/L against reference news; human panel ratings (excellent/good rates) split by rater type (journalist/fan/general).
- Meta-TKGC evaluated on the sports KG completion task (details secondary in the paper).

## 7. Numerical results / baselines

- ROUGE-1/2/L: CNN 0.264/0.065/0.182; KEE 0.392/0.138/0.197; KEE+KG 0.563/0.372/0.447. KG enrichment roughly doubles ROUGE-2 over KEE alone (0.138 → 0.372).
- Human evaluation: fan "excellent" rate 17.80% → 41.60% (KEE → KEE+KG); journalist "good" rate 39.50% → 52.00%. Both rater groups prefer the KG-enriched output.
- The segmentation + enrichment stack accounts for essentially all the gain; the CNN-only baseline is far behind on every metric.

## 8. Code / data availability

- No public code or dataset link found in the paper. The NBA KG (4,027 players, 43,510 games) and the 494-game live-text corpus are not released. Reproducing requires rebuilding both from public NBA data sources.

## 9. Leakage & limitations

- The KG is static while the news it enriches is about specific games — if KG attributes (e.g., season stats) incorporate the game being written about, enrichment leaks post-game knowledge into the "news." The paper does not document the KG snapshot date relative to the games.
- KEE's 8-point threshold is a hand-tuned constant on NBA data; no sensitivity analysis, and it will not transfer to sports with different scoring dynamics (NFL) without retuning.
- Entity linking is assumed solved; in production, linking errors (wrong player, wrong team) are the dominant failure mode of KG-enriched generation and are not measured.
- Human panel is small (n=20) and the journalist subsample is n=4; no inter-rater agreement reported.
- NBA-only; the live-text schema (quarter, time, team, event, score) is basketball-specific.

## 10. GSE overlap

- GSE's content operation needs automated game recaps, injury-news summaries, and prop-relevant narrative generation — the exact task family this paper addresses. The existing research map lists beat-writer/news text as untested territory for GSE.
- The KG-enrichment idea maps directly onto GSE's entity graph ambitions: player/team/injury entities with structured attributes enriching generated content and grounding claims (dates, stats, injury designations) that pure LLM generation hallucinates.
- No dedup conflict: checked against 1,093 base IDs; no KG sports-news paper in the corpus.

## 11. GSE implementation spec

- Build `gse/content/recap_pipeline.py` in three stages mirroring the paper: (1) event ingestion — parse NFL/NBA play-by-play into (period, time, team, event, score) tuples from GSE's existing data feeds; (2) KEE-style segmentation — replace the fixed 8-point threshold with a sport-specific win-probability-swing detector (segment on |ΔWP| ≥ 10 pp or scoring-run extrema), which generalizes the paper's score-differential idea to football; (3) KG enrichment — link entities to GSE's player/team/injury graph and inject verified attributes (season stats, injury status, line movement) into the generation prompt as structured context, with every injected fact cited to its source row.
- Generation: template + LLM hybrid; the LLM may only use KG-provided facts for numbers/names, everything else is narrative glue. Add an entity-linking confidence gate: any linked entity below 0.9 confidence is dropped from enrichment rather than risk a wrong-player injection.

## 12. Reproducible test

- On 50 completed 2025 NFL games: run the pipeline to generate recaps; have 3 GSE analysts rate factuality (count of wrong stats/names per recap) vs a no-KG LLM baseline; success criterion: ≥ 50% reduction in factual errors per recap and ≥ 80% of KG-injected facts verifiable against the source feed. Also compute ROUGE-L against AP-style reference recaps as a sanity metric (target: beat the no-KG baseline by ≥ 0.1).

## 13. Acceptance / rejection gate

ADAPT the architecture (event segmentation → entity linking → KG-enriched generation), not the paper's artifacts: its NBA KG, 8-point threshold, and trained models do not transfer. ADAPT only if the reproducible test shows the factual-error reduction above with the WP-swing segmenter on NFL data; REJECT the KG-enrichment step (keep KEE-style segmentation only) if entity-linking precision on NFL text falls below 95% — at that error rate the enrichment injects more falsehoods than it fixes, which is exactly the failure mode the paper never measures.

## 14. Improvement experiment

Go beyond the paper on its two weakest points: (1) make the KG temporal — snapshot player/team/injury attributes at kickoff and forbid any post-game knowledge in enrichment, then run the paper's own ROUGE + human protocol twice (static KG vs kickoff-snapshot KG) to quantify how much of its reported gain is post-game leakage; this is a publishable result and a production necessity for GSE. (2) Replace the hand-tuned threshold with a learned segmenter: train a small classifier on analyst-labeled "news-worthy passage" boundaries using WP swing, scoring-run length, and injury-event indicators as features, and test whether learned boundaries beat the fixed-threshold KEE on both ROUGE and analyst preference — the paper's method section practically begs for this ablation.
