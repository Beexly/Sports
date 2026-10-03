# allenwalker3/playcall — Dossier

**Stars:** 1 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-06-09 (maintained) · **Created:** 2026-05-19

## 1. Vision
Natural-language chat over the entire nflverse play-by-play history (1999–present, ~510 MB parquet): an LLM translates questions to DuckDB SQL against 376 documented columns (epa, cpoe, wpa, xyac, down, yardline...), executes, and answers in plain English. Ships with a full schema doc (SQL gotchas included), an in-UI data sync pill, eval reports, and a verbatim Week-10 betting-prep walkthrough. LLM-agnostic: Ollama default, OpenAI/Anthropic via env.

## 2. The Ask
Python 3.11+, Bun (frontend), an LLM (Ollama local by default — no keys; or hosted), ~510 MB disk for all seasons. Docker or native install; idempotent install script.

## 3. Constraints
- **License: MIT** — clean.
- It's a research interface, not a production component: chat quality depends on the LLM; SQL-generation errors are a known failure mode it documents rather than hides.
- Local-first data (bind-mounted `./data`); no multi-user, no auth.

## 4. GSE lens
Two sharp points. First, the **schema document**: 376 columns with usage notes and SQL gotchas is the kind of consumer-facing data dictionary GSE's signal registry aspires to be — but playcall's dictionary describes data that *exists*, while GSE's registry describes 47 signals with zero producers. Same lesson as nflreadr: dictionary rides along with data, not ahead of it. Second, the **reasoning-trace angle**: GSE's first real reasoning trace returned INVALID (honest refusal). playcall shows a production pattern for LLM-over-data that *expects* failure modes and documents them — a useful reference if GSE's reasoning layer needs a query interface over its own marts. But it reveals no core gap: GSE doesn't need a chat UI today. File under "technique reference."

## 5. Verdict
**IGNORE** (for now) — MIT and well-built, but a chat UI over pbp isn't on GSE's critical path. Keep the schema-doc pattern in mind for the day the registry has producers worth documenting.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/allenwalker3/playcall
- Gitdiagram: https://gitdiagram.com/allenwalker3/playcall
- Star history (1 star): https://star-history.com/#allenwalker3/playcall
- github.dev: https://github.dev/allenwalker3/playcall
