# [1602] SoccerRAG: Multimodal Soccer Information Retrieval via Natural Queries (arXiv:2406.01273)

**Citation:** Strand, A. T., Gautam, S., Midoglu, C., & Halvorsen, P. (2024). *SoccerRAG: Multimodal Soccer Information Retrieval via Natural Queries*. OsloMet / SimulaMet / Forzasys. arXiv:2406.01273. URL: https://arxiv.org/abs/2406.01273
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — extractor→validator→SQL-agent RAG pipeline over a sports database with natural-language queries; GSE-adaptable as the query layer over the NFL stats/text archive.

## 1. Research question
Can a RAG+LLM framework answer complex natural-language queries over a multimodal sports archive (videos, transcribed commentary, event annotations, player info) accurately — and which pipeline components (extractor, validator, few-shot SQL RAG) contribute most to correct answers?

## 2. Dataset / schema
Augmented SoccerNet: 550 games, Whisper-ASR transcribed commentary, Labels-v2 event annotations, Labels-caption game info, converted via SQLAlchemy into a structured SQLite DB (games, leagues, seasons, lineups, events, commentary) plus manually built abbreviation auxiliary tables (augmented_teams/leagues.csv). 20 benchmark questions (e.g., "total home goals for Bayern M in 2014-15", "home advantage for Real Madrid 2015-16", "games in epl with yellow cards in the first half 2015-2016"). Code: github.com/simula/soccer-rag; demo available.

## 3. Method / model
Four-component pipeline: (1) Feature extractor — LangChain LLM call returns JSON of schema-defined properties from the query; (2) Feature validator — string-matches/Levenshtein-resolves extracted entities (incl. abbreviations like "ManU") against DB/auxiliary tables within a closeness threshold, asking the user on ambiguity; cleaned prompt + primary keys returned; (3) SQL agent — LangChain SQL agent generating/executing queries against SQLite; (4) SQL RAG — few-shot: top-K=2 human-crafted SQL examples (sqls.json) retrieved by FAISS vector search over question embeddings prepended to the agent prompt. LLMs used: GPT-3.5-Turbo / GPT-4.0-Turbo.

## 4. Equations & assumptions
Halstead complexity metrics (n1, n2, N1, N2, volume V, difficulty D, effort E) to quantify query difficulty; Levenshtein-based entity validation with threshold. Assumptions: schema names iteratively refined to be LLM-legible; abbreviation tables cover common nomenclature; human-crafted SQL exemplars cover the question distribution.

## 5. Features / target
Features: extracted properties (team, player, season, league, event) + validated keys + retrieved SQL exemplars. Target: correct database answer to the natural query.

## 6. Validation design
Subjective scoring of extractor-validator chain on 20 questions (perfect / 50% / fail criteria). Query complexity via Halstead metrics on manually composed queries for Q1–Q10. Ablation: 6 pipeline configurations (SQL agent only → +RAG → +extractor → +extractor SQL-RAG → +extractor-validator → full) × 2 LLMs on Q1–Q10 with pass/fail. Execution time: 5 runs × peak/off-peak for both models.

## 7. Numerical results / baselines
Extractor-validator chain: optimal on most of 20 questions; GPT-4 fixed Q15 (GPT-3.5 missed a property); Q18 ("players named Aleksandar") confused the extractor (context-blindness). Ablation: standalone SQL agent fails on nearly all questions with both models (GPT-3.5 pipeline-1: 0/10 correct; pipeline-2: 2/10). Full pipeline (extractor+validator+SQL RAG): GPT-3.5 9/10 correct (only Q8 failed — large-list output refusal), GPT-4 8/10 (Q7 model laziness, Q8 refusal). Validator is the crucial component. Execution: GPT-3.5 significantly faster; peak hours 22.6% slower (3.5) / 46.5% slower (4.0). LLM laziness documented (subset-of-list returns; premature "I now have the information" stops).

## 8. Code / data availability
Open source: github.com/simula/soccer-rag; schema.json, sqls.json, abbreviation CSVs, demo included.

## 9. Leakage & limitations
Only 10 questions in the ablation, subjectively scored; GPT-4 "model laziness" unquantified; LLMs truncate large list outputs (OpenAI-acknowledged); cloud API timing confounds; open-source LLMs (Llama 2, Mistral-7B) noted as lacking function-calling at the time — now dated; no sports-QA accuracy vs a human baseline.

## 10. GSE overlap
No GSE natural-language sports QA layer exists. This is the first sports-RAG ledger in the wave and directly fills GSE's "ask the archive" gap — complementary to the summarization ledgers (1599–1601) and event-detection ledgers (1594–1597).

## 11. GSE implementation spec
Port the pipeline to NFL: (a) structured SQLite/Postgres DB of GSE's archive — games, play-by-play, rosters, injuries, odds/CLV history, commentary transcripts (Whisper on Game Pass audio, mirroring the paper's ASR step); (b) extractor schema for NFL properties (team, player, week, season, stat, market); (c) validator with NFL abbreviation tables ("KC", "Mahomes", "MNF") + Levenshtein resolution; (d) few-shot SQL RAG with human-crafted exemplar queries for common GSE questions (splits, line-movement, injury-report lookups); (e) expose as the natural-language query interface behind @GalaxySportsHQ content research and the engine's internal analytics. The paper's ablation proves the validator is the component to build first.

## 12. Reproducible test
Replicate the Table I ablation on the released repo + 10 questions: full pipeline ≥ 8/10 correct, SQL-agent-only ≤ 2/10. For GSE: 20 held-out NFL questions, full pipeline pass rate ≥ 0.8 with validator engaged vs ≤ 0.3 without.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): open-source reproducible pipeline + controlled ablation isolating the validator's contribution + honest failure documentation (laziness, list truncation). ADAPT rather than ADOPT: soccer schema/LLM choices are dated (closed OpenAI models, LangChain SQL agent) — reimplement with current open models and GSE's NFL schema.

## 14. Improvement experiment
Swap GPT-3.5/4 for a modern function-calling open model and re-run the 20-question ablation; add a determinism/robustness metric (5 repeated runs per question); fix list-truncation with paginated SQL + structured output; measure validator recall on deliberately misspelled/abbreviated NFL entity queries; extend to multimodal retrieval (return video clips keyed to event timestamps).
