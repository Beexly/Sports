# 1722 Moneyball with LLMs: analyzing tabular summarization in sports narratives (arXiv:2510.18173v2)

**Citation:** Ritam Upadhyay, Naman Ahuja, Rishabh Baral, Aparna Garimella, Vivek Gupta (2026). *Moneyball with LLMs: Analyzing Tabular Summarization in Sports Narratives*. ASU / Adobe Research. arXiv:2510.18173v2. URL: https://arxiv.org/abs/2510.18173v2
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, 24 pages, all sections, tables 1–3, figures, appendices).
**Verdict:** ADAPT — the Text–Tuple–Table decomposition (narrative → atomic (entity, attribute, value) tuples → rule-based aggregation) is the single best pattern in this wave for turning beat-writer game narratives into structured box-score/event records, and the Hallucination–Omission Index is a genuinely useful directional metric; but the paper is cricket/basketball-only with a diagnostic (not production) framing, so adapt the recipe to NFL narratives with GSE's own eval.

## 1. Research question

What actually limits LLMs in long-context text-to-table generation: local arithmetic or multi-entity state tracking? The paper introduces SporTabSet (ball-by-ball cricket commentary → scorecards; basketball play-by-play → box scores) and asks whether decomposition strategies (input chunking, entity-wise generation, event-tuple extraction) improve accuracy and numerical fidelity — and, via perturbation experiments, whether the gains come from better reasoning or from removing multi-entity interference. A secondary question: do models rely on brittle surface cues (dismissal summaries, player names) rather than genuine narrative reasoning?

## 2. Dataset / schema

- SporTabSet: cricket — ball-by-ball commentary of One Day Internationals (~300 balls/match) with batsman and bowler scorecard tables; basketball — 2,500 games of play-by-play with player box-score tables. A masked cricket variant removes dismissal-summary sentences (high-salience extractive cues).
- Perturbation suites: entity anonymization (names → player1, player2…), OOD entity substitution (synthetic names from other domains), entity entanglement (cricket "<bowler> to <batsman>" pattern paraphrased into descriptive narrative, forcing role inference).
- Models: Llama-3.3 70B Instruct, GPT-4.1, Gemini 2.5 Flash.

## 3. Method / model

- Task: narrative → full statistical table (cell-level exact match).
- Strategies: (1) ZS-CoT baseline — zero-shot chain-of-thought with the domain policy, monolithic generation; (2) Divide & Generate — split commentary into n ∈ {2,4,8} chunks, generate intermediate scorecards in parallel, deterministically merge; (3) EntityCoT — extract the entity set first, then one parallel LLM call per entity (row) over the full commentary; (4) Text–Tuple–Table (T3) — LLM emits atomic (Entity, Attribute, Value) tuples per event, then a rule-based compiler aggregates tuples into the final table.
- Metrics: cell accuracy (exact match), RMSE, SMAPE (preferred for sparse tables), and the new Hallucination–Omission Index HOI = Over-Count% − Under-Count%.

## 4. Equations & assumptions

- HOI = Over-Count% − Under-Count%, where the percentages are over table cells whose predicted values exceed / fall below ground truth. Positive HOI = systematic hallucination (over-counting); negative = systematic omission. Directional where accuracy/RMSE are not.
- RMSE/SMAPE on numeric cells; cell accuracy = exact match rate.
- Assumptions: the rule-based T3 compiler is correct (aggregation logic hand-verified); masked cricket removes *all* extractive shortcuts (the paper inspects but does not prove this); perturbations are label-invariant (anonymization preserves the correct table).

## 5. Features / target

- Input: full game narrative (ball-by-ball / play-by-play text).
- Intermediate: chunks (D&G), entity lists (EntityCoT), (Entity, Attribute, Value) tuples (T3).
- Target: complete stat table, cell-level.
- Perturbation analysis tracks accuracy/RMSE/SMAPE/HOI shifts per model × sport × perturbation.

## 6. Validation design

- All critical numbers reported on the masked cricket set (extractive cues removed) and basketball; models compared across strategies on identical inputs.
- Perturbation experiments use ZS-CoT as the base to isolate surface-cue reliance.
- Cost/reliability analysis in Appendix D (T3's failure modes documented, not hidden).

## 7. Numerical results / baselines

- Decomposition gains (mean over models/tasks vs ZS-CoT): Divide & Generate n=8: +14.9 pp accuracy, −37.8% RMSE. EntityCoT: +15.1 pp, −49.5% RMSE. Text–Tuple–Table: +20.6 pp, −62.8% RMSE — best overall.
- Gemini 2.5 Flash is the standout: cricket batsman T3 94% accuracy / 0.96 RMSE; bowler 89% / 0.59; basketball T3 75% / 0.97. (Llama-3.3: basketball CoT 30% → T3 57%; GPT-4.1: cricket batsman CoT 53% → T3 64%.)
- Masking dismissal summaries collapses apparent reasoning: GPT-4.1 batsman 89% → 61%, Gemini 86% → 49% — much of "reasoning" was extractive cue-matching.
- Perturbations: basketball anonymization devastates — Gemini 62% → 35% (−27 pp), GPT-4.1 47% → 29% (−18 pp); cricket entity entanglement costs up to −5 pp accuracy and +12 SMAPE. HOI shifts are directional per model/sport/perturbation (e.g., anonymization pushes some models toward omission, others toward hallucination).
- T3 reliability caveat: degenerate repetition and cumulative hallucination on GPT-4.1/Llama-3.3 — best average accuracy, worst tail behavior without safeguards.

## 8. Code / data availability

- SporTabSet benchmark described in full; the ledger found no repository link in the text. Methods are specified precisely enough to reimplement (prompts in Appendix G, compiler logic described).

## 9. Leakage & limitations

- The unmasked-cricket result (GPT-4.1 89%) is the paper's own demonstration of cue leakage — handled honestly via the masked set, but any deployment on raw commentary reintroduces it.
- T3's tuple stream has no self-correction: one hallucinated tuple poisons the compiled table (cumulative hallucination), and the paper offers no mitigation — the reliability appendix documents the failure without fixing it.
- Only two sports, both with highly structured narratives; NFL play-by-play has more entities (22 players), more complex attribution (assists, pressures, coverage), and noisier text.
- Cost analysis is appendix-level: EntityCoT multiplies input tokens per entity; T3 needs a validation pass the paper does not include.

## 10. GSE overlap

- GSE's narrative-to-structure problem is everywhere: beat-writer recaps → structured game events; injury news → (player, body part, status, timeline) tuples; film notes → charting rows. T3's (Entity, Attribute, Value) + rule-based compiler is the exact pattern, and HOI gives GSE a directional metric its QA evals currently lack.
- Complements ledger 1715 (KEE segmentation): 1715 segments the narrative, 1722 converts segments to tables — they compose into a full narrative → structured-record pipeline.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/nlp/text_tuple_table.py`: (1) LLM emits atomic (Entity, Attribute, Value, Evidence-span) tuples from NFL game narratives — the evidence-span addition fixes the paper's unauditable tuples; (2) a rule-based, unit-tested compiler aggregates tuples into box-score/event tables with conflict resolution (two tuples, same cell → prefer the one with the quoted evidence span; flag unresolved conflicts for human review instead of silently compiling); (3) run the HOI metric on every eval: track over-count vs under-count separately rather than folding into RMSE.
- Apply first to injury-news extraction: (player, attribute ∈ {body part, mechanism, status, timeline}, value) tuples compiled into the injury table — a narrower schema than full box scores, so the compiler stays trustworthy.

## 12. Reproducible test

- On 100 NFL game recaps with human-verified box-score/event tables: compare ZS-CoT vs EntityCoT vs T3 (with GSE's evidence-span + conflict-flag modifications); success criteria: T3 cell accuracy ≥ 0.85 on the injury-tuple schema and ≥ 0.70 on full box-score cells, HOI within ±5 pp (no systematic over/under-counting), and conflict-flag rate ≤ 10% of cells. Replicate the anonymization perturbation on NFL text to measure surface-cue reliance before trusting the numbers.

## 13. Acceptance / rejection gate

ADAPT the T3 recipe (tuple extraction + rule-based compiler + HOI) with GSE's two hardening modifications (evidence spans, conflict flagging). The paper's raw T3 is rejected for production use without them — cumulative hallucination with no self-correction is disqualifying for anything that feeds models or published content. ADAPT proceeds if the reproducible test meets the accuracy/HOI criteria; REJECT full box-score generation via T3 if cell accuracy < 0.70 (keep the injury-tuple schema, which is narrower and higher-value); REJECT any deployment that skips the anonymization-perturbation check — the paper proves apparent accuracy can be 28 pp of cue-matching.

## 14. Improvement experiment

Fix the paper's documented-but-unsolved problems. (1) Tuple validation loop: the paper notes cumulative hallucination but never mitigates it — add a second-pass verifier that checks each tuple against its evidence span (entailment check) before compilation, and measure how much of T3's error mass it removes; this is the obvious missing component and a publishable ablation. (2) Learned conflict resolution: replace the paper's deterministic merge with a tiny classifier over (tuple A, tuple B, evidence spans) trained on analyst-resolved conflicts — test whether it beats "prefer quoted evidence" on the conflict subset. (3) Extend HOI to GSE's QA evals as a standard directional diagnostic: report HOI alongside accuracy on every NLP eval in the program, so systematic over- vs under-extraction is visible instead of hidden inside RMSE — the paper's most portable contribution.
