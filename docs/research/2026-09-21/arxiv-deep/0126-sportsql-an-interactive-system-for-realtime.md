# [0126] SportSQL: An Interactive System for Real-Time Sports Reasoning and Visualization (arXiv:2508.17157)

**Citation:** Sebastian Martinez, Naman Ahuja, Fenil Bardoliya, Chris Bryan, Vivek Gupta (2025). *SportSQL: An Interactive System for Real-Time Sports Reasoning and Visualization*. arXiv:2508.17157v1. URL: https://arxiv.org/abs/2508.17157v1
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML.
**Verdict:** ADOPT — the text-to-SQL-over-live-sports-data architecture (schema-only LLM generation + deterministic dataframe verification + just-in-time materialized views) ports directly to GSE's nflverse/odds tables as a natural-language research-query layer.

## 1. Research question
Can an LLM agent answer arbitrary natural-language questions over live sports data accurately and fast enough for interactive use — combining schema-grounded SQL generation, on-demand materialized views for expensive temporal queries, and verified visualizations?

## 2. Dataset / schema
English Premier League data from the public FPL API, normalized into MariaDB: persistent core tables (players, teams, fixtures) under 5 GB, plus on-demand in-memory tables for player history (past seasons gameweeks) and future fixtures. DSQABench: 1,793 questions from 180 base templates × 3 rephrasings; 1,395 scalar + 398 tabular questions. **Inconsistency flagged:** the paper says 398 dynamic queries, but the listed components sum to 396 (player_past 270 + history 72 + future 54) — off by two, recorded here as stated. Models tested: GPT-4o and Gemini 2.0 Flash, temperature 0.1, max tokens 2048.

## 3. Method / model
(a) Entity resolution: map team/player mentions in the question to DB ids before SQL generation. (b) Schema-only LLM SQL generation: the LLM sees the schema (not the data) and emits SQL; executed against MariaDB. (c) Just-in-time views: expensive temporal aggregations (per-gameweek history, future fixtures) materialized as in-memory tables on demand, then queried. (d) Visualization: optional Matplotlib/Seaborn generation guarded by dataframe-code validation — the generated plotting code must reproduce the query dataframe byte-for-byte before any chart is rendered. (e) Answer verification: scalar answers checked by exact match; tabular answers scored by the TabEval-style correctness/completeness protocol (Section IV).

## 4. Equations & assumptions
No formal numbered equations ("Not stated in paper" — the paper is a systems paper). Scoring as described: string exact-match (EM) for scalar answers; table correctness/completeness F1-style scores for tabular answers (TabEval protocol). Assumptions: FPL API schema stable across the refresh cadence; entity resolution is near-perfect for canonical team/player names; the LLM's SQL is executed read-only.

## 5. Features / target
Input features: natural-language question + DB schema + resolved entities. Target: correct scalar answer or correct/complete table (+ optional verified chart). Prediction horizon: single question answering; "real-time" = interactive latency (exact latency numbers not reported — "Not stated in paper").

## 6. Validation design
DSQABench (1,793 questions, template-based with 3 rephrasings each); baselines = GPT-4o vs Gemini 2.0 Flash head-to-head; no comparison against a non-LLM baseline (e.g., template SQL) or against retrieval-augmented schema prompting. Results broken down by primitive composition (Retrieve, Filter, Calculate, Compare, Order, Manipulate/join).

## 7. Numerical results / baselines
Table 1 (exact): Gemini 2.0 Flash — string EM 76.23, table correctness 0.64, completeness 0.76, overall 0.69; GPT-4o — EM 80.48, correctness 0.70, completeness 0.81, overall 0.75. By primitive: single Retrieve 100%, Order 97.6%; Calculate+Compare 96.3%; Retrieve+Filter+Calculate 22.3%; Compare+Order 30.3%; Manipulate/join cases 15.4%. By primitive count: one primitive 93%, two 67%, beyond three ≈50%. The bottleneck is compositional queries with joins/aggregations — directly actionable (see §14).

## 8. Code / data availability
Yes — https://github.com/coral-lab-asu/SportSQL (Section I). DSQABench templates included; FPL data via the public API.

## 9. Leakage & limitations
Adversarial read: (a) 180 templates × 3 rephrasings means the benchmark tests paraphrase robustness, not true question novelty — EM scores are likely inflated vs real user questions; (b) no latency numbers despite "real-time" in the title; (c) entity resolution evaluated only on canonical names — nicknames/abbreviations ("Mahomes" vs "Patrick Mahomes II") untested; (d) the 396-vs-398 dynamic-query discrepancy (§2) suggests sloppy benchmark accounting; (e) EPL-only — schema patterns (gameweek history tables) don't map 1:1 to NFL play-by-play; (f) no cost analysis (tokens per question). Strengths: real working system, public code, honest breakdown showing where it fails (joins).

## 10. GSE overlap
From existing-research-map.md: no existing text-to-SQL or natural-language query research in the corpus. Adjacent assets: the 2026-09-18 nflverse/DB work (GSE has structured predictions tables in Neon Postgres — the `picks` table with 3,411 engine picks per MEMORY.md), the 2026-09-20 props/benchmark dig tables. No duplication. This fills a genuine gap: Garrett currently queries his data by hand/paste.

## 11. GSE implementation spec
Port SportSQL to the GSE stack: (a) point the schema-only SQL generator at GSE's Neon Postgres (read-only role, statement timeout, row limits — never the paper's implicit trust); (b) persistent core tables = picks/engine outputs; on-demand in-memory views = per-gameweek aggregates, matchup-joined tables; (c) entity resolution over NFL teams/players (handle abbreviations — the paper's untested case); (d) keep the dataframe byte-for-byte verification gate before any visualization; (e) start with GPT-4o-class or the NVIDIA NIM Llama 3.1 8B (already in Garrett's TASK-012 stack) behind the SQL-generation step only. Effort: 3–5 days for the read-only NL-query endpoint + NFL entity resolver.

## 12. Reproducible test
Dataset: DSQABench-style NFL benchmark — write 60 base templates × 3 rephrasings (180 questions) over GSE's picks table + nflverse 2020–2025 tables, with hand-verified gold SQL. Metric: string EM (scalar), correctness/completeness (tabular), same as the paper. Baseline: schema-only prompting (paper's method) vs schema + sample-values prompting.

## 13. Acceptance / rejection gate
ADOPT the NL-query layer iff it reaches ≥75% overall correctness on the NFL benchmark (matching the paper's GPT-4o 0.75) with zero write queries escaping the read-only guard (deterministic SQL allowlist check: SELECT-only, enforced at the driver level) over the full test set; reject visualization auto-generation until the byte-for-byte dataframe gate passes on all chart questions.

## 14. Improvement experiment
One follow-up: fix the paper's join bottleneck (15.4% on Manipulate/join, 22.3% on Retrieve+Filter+Calculate) with a two-stage generator — stage 1 emits a validated subquery per primitive, stage 2 composes them, with the dataframe verification gate applied per stage. Dataset: the NFL benchmark's join-heavy subset. Metric: correctness on join questions vs the paper's single-shot baseline. Gate: ≥20-point absolute improvement on join questions.
