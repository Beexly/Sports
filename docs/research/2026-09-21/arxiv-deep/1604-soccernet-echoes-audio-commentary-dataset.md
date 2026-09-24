# [1604] SoccerNet-Echoes: A Soccer Game Audio Commentary Dataset (arXiv:2405.07354)

**Citation:** Gautam, S., Houshmand Sarkhoosh, M., Held, J., Midoglu, C., Cioppa, A., Giancola, S., Thambawita, V., Riegler, M. A., Halvorsen, P., & Shah, M. (2024). *SoccerNet-Echoes: A Soccer Game Audio Commentary Dataset*. SimulaMet / OsloMet / Forzasys / Université de Liège / KAUST / UCF. arXiv:2405.07354. URL: https://arxiv.org/abs/2405.07354
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — multilingual ASR-derived commentary layer over 550 SoccerNet games (1030 halves with commentary) with transcription-quality evaluation, hallucination-mitigation heuristic, and verb-noun NLP analysis; directly adaptable to NFL broadcast-audio mining for injury/lineup/tactical intelligence.

## 1. Research question
Can automatic speech recognition (Whisper) reliably convert soccer broadcast audio into a multilingual textual commentary layer that augments SoccerNet for multimodal sports analytics — and what are the transcription accuracy, hallucination failure modes, and linguistic properties of such a dataset?

## 2. Dataset / schema
SoccerNet-Echoes: all 1100 SoccerNet game halves (550 games, 6 leagues, 4 seasons 2014–2020), narrated in 10 languages (English 297, Spanish 264, Russian 218, German 135, French 102, Turkish 4, Italian 4, Polish 2, Bosnian 2, Hungarian 2; 70 halves manually confirmed without commentary — 56 no audio, 14 stadium-only). Per-half ASR JSONs: `{segments: {index: [start_s, end_s, text]}}`, organized by Whisper version × league × season × game, plus `_en` folders with Google Translate English translations of non-English commentary. Public: https://github.com/SoccerNet/sn-echoes.

## 3. Method / model
Pipeline: Whisper large-v1/v2/v3 (default params) transcribe all halves with automatic language detection from first 30 s → per-video "best model" selection via Unique Word Count heuristic (highest unique-word ratio wins, anti-hallucination measure) → Google Translate batch translation of non-English transcripts to English. Evaluation against GOAL dataset's human-verified transcripts (40 halves / 20 games, English): WER, CER, BLEU. NLP analysis: dependency parsing for verb-noun pair extraction, sunburst visualizations of action-dynamics vocabulary.

## 4. Equations & assumptions
No equations; metrics: WER/CER/BLEU (vs GOAL ground truth); unique-word-ratio = unique/total words as best-model heuristic. Assumptions: first-30-s language detection generalizes to full half; vocabulary diversity anti-correlates with Whisper repetition-hallucination; batch Google Translate is adequate for downstream English tasks.

## 5. Features / target
Input: game audio + Whisper transcript segments with timestamps + English translations. Outputs/uses: verb-noun action pairs, per-player mention frequency (influence proxy for summary word budgets), tactical-discussion context, sentiment/tactical analysis applications.

## 6. Validation design
Temporal: timestamps at Whisper segment resolution. Transcription: WER/CER/BLEU vs 40 human-verified GOAL halves. Model selection: per-video best-model distribution (v3 46.9%, v1 30.7%, v2 22.4%). Limitations explicitly enumerated: hallucinations (especially on speechless/noisy audio), entity-name (player/team) recognition errors, batch-translation context errors ("штрафной" → "penalty kick" vs correct "free kick" when translated in segment), no human-verified ground truth for most assets.

## 7. Numerical results / baselines
WER/CER/BLEU vs GOAL ground truth: large-v1 0.443/0.261/54.50; large-v2 0.458/0.269/52.59; large-v3 0.551/0.341/47.97 (v1 best on clean English; v3 selected most often overall — 483/1030 videos, highest unique-word ratio 0.370 — because it hallucinates least on noisy audio). WER ~0.44–0.55 shows substantial transcription noise — usable for event/context mining, not for verbatim quoting.

## 8. Code / data availability
Code + dataset public: https://github.com/SoccerNet/sn-echoes. This is the highest-availability paper in the lane so far.

## 9. Leakage & limitations
WER 0.44–0.55 vs ground truth; Whisper entity-name errors; batch translation errors; 70 halves lack commentary; model-selection heuristic (unique word count) is a proxy, not accuracy; the paper is dataset+analysis, not a prediction method — "ADAPT the data asset and pipeline," not a model.

## 10. GSE overlap
Complements 1602 (SoccerRAG uses SoccerNet-v2 ASR; Echoes is the 550-game v1 augmentation) and 1598 (MatchTime's audio pipeline): Echoes provides the only fully open multilingual commentary dataset with transcription-quality metrics. Injury/lineup relevance: broadcast commentary is exactly the channel where injuries, tactical adjustments, and coach decisions are announced — the paper's tactical-analysis and sentiment-analysis applications map directly onto the lane's priority use cases.

## 11. GSE implementation spec
Adapt to NFL: run Whisper large-v3 (best hallucination resistance) over full NFL broadcast audio per game; segment at segment-level timestamps; translate any non-English (Spanish broadcasts) to English; apply unique-word-ratio per-game model selection + VAD preprocessing (paper's suggested mitigation); then mine transcripts for (a) injury mentions and lineup changes (cross-validated against official reports), (b) mention-frequency-based player influence signals feeding summary/game-recap word budgets, (c) tactical-discussion extraction for coaching-adjustment signals. Feed cleaned transcripts into the 1594–1597 text-event pipelines and the 1602 SoccerRAG-style QA layer.

## 12. Reproducible test
Replicate Table 1 (Whisper v1/v2/v3 WER ≤ 0.45/0.46/0.56 on the 40 GOAL halves) and Table 2's model-selection distribution. For GSE: on 20 NFL games, ≥90% of broadcaster-reported injuries are detected in ASR transcripts within ±2 min of on-air announcement, with hallucination-filter precision validated against human spot-checks.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): open dataset + code, honest quality metrics, hallucination-aware model selection, direct injury/tactical intelligence applications. ADAPT (not ADOPT): it's a data asset and curation recipe, not a predictive model; the transcription noise (WER ~0.5) means downstream extraction must be confidence-weighted.

## 14. Improvement experiment
Add VAD pre-processing + speaker diarization (separating commentators from crowd/stadium), entity linking to a player/team knowledge graph (fixes Whisper entity errors), segment-level (not batch) translation for accuracy, and a human-verified injury-mention subset as a benchmark — directly extending the authors' stated future work into the NFL injury-news extraction lane.
