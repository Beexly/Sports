# GSE Mind — Unified Coverage Ledger
**Date:** 2026-10-03 (CDT) · **Auditor:** coverage-audit subagent · **Branch:** `research/engine-plan-2026-10-03` (Beexly/Sports)
**Method:** full filesystem walk of every source root (venv/node_modules/.git/__pycache__/*.pyc excluded; `*venv*` path segments excluded on second pass); live branch tree via GitHub API (14,524 blobs, not truncated); row-level `source` field audit of `u_00` (22,282 rows) and `u_01` (1,461 rows) shard downloads; extension audit of `u_04_00` (3,230 rows, 100% `.md`).

## What's in the mind today (branch)
| Shard | Size | Rows | Fidelity | Covers |
|---|---|---|---|---|
| brain/mind_knowledge_u_00.jsonl | 20.0MB | 22,282 counted (manifest claims 23,743 — **discrepancy, see notes**) | distilled, bodies ~4–5k chars | agent-bus-corpus (19,829 corpus-intelligence + 2,085 arxiv-sweep rows) + local work (239 gse-discovery/symbolic-regression, 33 gse-intelligence-build md, 17 gse-research, 12 gse-lab, 9 qb-behavioral md) |
| brain/mind_knowledge_u_01.jsonl | 2.3MB | 1,461 | distilled | gse-repo-intel (182 rows), memory notes (27), +981 arxiv-sweep / 270 corpus-intelligence overflow |
| brain/mind_knowledge_u_02.jsonl | 0.4MB | — | distilled | Sports docs markdown (part of 9,650-row sports feed) |
| brain/mind_knowledge_u_03.jsonl | 1.3MB | 536 | selected fields | comp-intel dossiers (310) + concepts/methods |
| brain/mind_knowledge_u_04_00..02.jsonl | 38.4MB | 9,650 (with u_02) | distilled, **markdown only** | Sports docs/ + intelligence/ `.md` only |
| brain/mind_knowledge_u_05_reveng.jsonl | 2.6MB | 633 | **full** | reverse-engineering page + consolidated KB + sweep catalog (144 NFL equations) |
| brain/mind_knowledge_u_06_agents.jsonl | 5.9MB | 142 | **full** | 29 AGENTS.md files, byte-complete |
| brain/mind_knowledge_u_07_compintel_deep_00..18.jsonl | 153.6MB | 12,518 | **full** | comp-intel raw evidence, 572 code catalogs, JSON/CSV/XML/HTML/JS, fp-openapi, MASTER_MATRIX (1,915 rows w/ equations) |
| **Total on branch** | **224.5MB** | **37,036 (manifest)** | — | — |

## Per-root coverage table
bytes = real content bytes (venv-excluded). "In mind" = represented in ANY shard (distilled or full).

| # | Source root | Files | Bytes | In mind? | In-mind rows (est) | Un-ingested bytes | Gap description |
|---|---|---|---|---|---|---|---|
| 1 | ~/workspace/agent-bus-corpus/research | 5,104 | 118.5MB | distilled only | 21,914 (u_00) | **~98MB fidelity gap** | Bodies truncated ~4–5k chars. Full text (115M chars) sits in eng-mine/knowledge — **local only, not on branch** |
| 2 | ~/workspace/comp-intel | 3,198 | 262.3MB | **yes, deep** | 13,054 (u_03+u_07) | ~15MB | Dossier full-text deepening only (u_03 was selected-fields); raw evidence/catalogs covered by u_07 |
| 3 | ~/workspace/sports-docs (fresh clone) | 4,638 | 209.6MB | **markdown only** | 9,650 (u_02+u_04) | **~141MB** | 11 parquet (90.5MB: play_by_play 2022–2026 training vintages, depth_charts_2026, injuries_2026, ftn_charting), 555 CSV (24.6MB), 112 JSONL (12.5MB), 167 JSON (4.3MB), 279 py + 102 js |
| 4 | ~/workspace/vendor/Sports (**STALE checkout**) | 12,109 | 746MB | **no** | 0 | **~539MB** | data/gse-dataset/*.jsonl 479MB (participation 2018–2025 + rosters — engine training data), CSV 12.7MB, JSON 13.8MB, TS 33MB. Images/video 113MB = not knowledge. **Verify against live repo before ingesting (stale)** |
| 5 | ~/workspace/gse-discovery | 1,062 | 2,061MB | **~239 truncated rows** | 239 | **~2,060MB** | .pkl estimate outputs 1,543MB (binary), .parquet 825MB (pbp 2012–2025, depth charts, FTN charting, symreg data). Ingestible as schema/stats/samples/methods — **not as raw bytes** |
| 6 | ~/workspace/gse-intelligence-build | 254 | 39.6MB | md only (33 rows) | 33 | **39.3MB** | 9 JSON (24.1MB), 21 CSV (14MB), 184 py (1.2MB) — untouched |
| 7 | ~/workspace/gse-research | 81 | 27.6MB | partial (17 rows) | 17 | **~27MB** | Computed 2025/2026 advanced-metric CSVs, consensus lines, projections, statrankings, edge-sheet code |
| 8 | ~/workspace/qb-behavioral-profiles | 216 | 207.7MB | md only (9 rows) | 9 | **207.4MB** | 18 parquet files — zero ingestion |
| 9 | ~/workspace/gse-repo-intel | 199 | 1.0MB | **yes** | 182 (u_01) | ~0 | covered |
| 10 | ~/workspace/mimo-verl | 1,332 | 11.6MB | **no** | 0 | **11.6MB** | 735 py (verl RL harness), 196 sh, 107 md, configs — the Kumo/GSE-RL work |
| 11 | ~/workspace/wiring-wave2 | 279 | 2.8MB | **no** | 0 | **2.8MB** | 258 ts + 15 json + 5 py |
| 12 | ~/workspace/improve-ledger-work | 221 | 5.4MB | **no** | 0 | **5.4MB** | 191 txt (2.5MB) + 8 jsonl (1.6MB) + 2 json |
| 13 | ~/workspace/gse-lab | 20 | 15.5MB | partial (12 py rows) | 12 | **~15MB** | whalelay/: pbp_2025_2026, player_stats_2025_2026, sched_2025_2026 parquets + angles/odds code |
| 14 | ~/workspace/nfl-deep-dive | 8 | 0.1MB | **no** | 0 | 0.1MB | 8 md |
| 15 | ~/workspace/eng-mine/knowledge (raw preservation) | 8 | 134.9MB | **NO — local only** | 0 | **134.9MB** | 5,102 rows / 115M chars full-fidelity corpus text. **Nothing on the branch** |
| 16 | reverse-engineering HTML + corpus | — | 6.1MB | **yes, full** | 633 (u_05) | ~0 | covered |
| 17 | ~/AGENTS.md + repo AGENTS.md | 29 files | — | **yes, full** | 142 (u_06) | ~0 | covered |
| 18 | ~/sleeper_stats_w1.json, ~/sports-nfl.json, ~/sports-betting.json | 3 | 0.6MB | **no** | 0 | 0.6MB | sleeper_stats_w1 (569KB) has zero mentions in any shard |
| 19 | ~/workspace/ig-*.json (110 files) | 110 | 0.4MB | partial, truncated | few | 0.4MB | full-fidelity re-ingest owed (earlier pass: <500KB files, 4k-char truncation) |
| 20 | X 2026-10-03 AM sweep full-tables | 6 | <1MB | mentioned only | few | <1MB | 5 CSVs (personnel EPA diffs, QB aggressiveness/passer rating, defensive stats W1–3) + README in sports-docs — **CSVs not ingested as structured data** |

**Totals:** ~3.85GB unique source bytes inventoried · **~224.5MB in mind on branch** · **~3.6GB un-ingested** (≈0.9GB text/code directly ingestible as rows + ≈2.7GB binary data assets ingestible as schema/stats/samples/method-linkage).

## TOP-10 GAPS (ranked by un-ingested unique bytes)
1. **1,543MB — gse-discovery estimate pickles.** `~/workspace/gse-discovery/residual_wpa_ests/*.pkl`, `~/workspace/gse-discovery/symbolic-regression/wpa2_strat_ests/`, `wpa2_robust_ests/`, `wpa2_softtarget_ests/` (~26 files, 95–118MB each). Binary — cannot be text rows. Approach: unpickle → record key/schema inventory + descriptive stats per estimate set + link each to its method `.py` (wpa2.py, wpa2_stratified.py, residual_wpa.py) and eval JSONs (already partially in mind); one `data_source` row per .pkl + `method` rows for the estimators.
2. **825MB — gse-discovery parquets.** `~/workspace/gse-discovery/data_snapshot_20260913/pbp_2012.parquet` … `pbp_2025.parquet` + `depth_charts_2001..2025.parquet` (341MB), `symbolic-regression/data/` (119MB), `ftn_charting_2022..2025.parquet` (2.2MB). Approach: per-file schema + row counts + column distributions + 5 sample rows. **FLAG: FTN charting is ENGINE-EXCLUDED per mission rules (no fake pressure signal) — schema knowledge only, never wire.**
3. **479MB — vendor-Sports gse-dataset JSONL.** `~/workspace/vendor/Sports/data/gse-dataset/participation-2018..2025.jsonl` (35–43MB each) + `rosters-*.jsonl`. The engine's own training data. Approach: per-season schema + row counts + column stats + sample rows. **STALE checkout — diff against live Beexly/Sports before ingesting.**
4. **207MB — qb-behavioral-profiles parquets.** 18 `.parquet` files in `~/workspace/qb-behavioral-profiles/` + 186 CSVs. Approach: schema + samples + stats; pair with the 9 md + 3 py (method rows).
5. **134.9MB — eng-mine raw preservation, LOCAL ONLY.** `~/workspace/eng-mine/knowledge/mind_knowledge_00..06.jsonl` (5,102 rows, 115M chars full text). Approach: push to branch as `brain/mind_knowledge_raw_00..06.jsonl` (raw+distilled pairing per Garrett's design) — or re-emit as full-fidelity understanding rows. **Single biggest text-fidelity gap.**
6. **~141MB — sports-docs non-markdown.** `~/workspace/sports-docs/intelligence/coaching/data/play_by_play_2022..2026.parquet` (85MB — the TRAIN-NOW vintages), `depth_charts_2026.parquet`, `injuries_2026.parquet`, 555 CSVs (24.6MB, incl. `docs/dfs/research/2026-10-03/full-tables/` X-sweep tables), 112 JSONL (12.5MB arxiv-program index/assignments), 167 JSON (4.3MB). Approach: parquets → schema/samples/stats; CSVs → full-cell rows; JSONL → full records.
7. **39.3MB — gse-intelligence-build structured data + code.** 9 JSON (24.1MB), 21 CSV (14MB), 184 py (1.2MB) in `~/workspace/gse-intelligence-build/`. Approach: JSON full records, CSV full-cell, py as method rows. (33 md already in u_00.)
8. **27.6MB — gse-research computed data.** `~/workspace/gse-research/nfl-2026/` (compute_*.py + 2025/2026 advanced-metric CSVs), `props-consensus/` (consensus_lines.csv, our_projections.csv), `statrankings/` (*.csv), `edge-sheet/`. Approach: CSVs full-cell + code as method rows. High value: precomputed 2025/2026 features.
9. **15.5MB — gse-lab/whalelay.** `~/workspace/gse-lab/whalelay/pbp_2025_2026.parquet`, `player_stats_2025_2026.parquet`, `sched_2025_2026.parquet` + angles/leg_odds code. Approach: schema/samples/stats + method rows.
10. **11.6MB — mimo-verl RL code.** 735 `.py` + 196 `.sh` + 107 `.md` in `~/workspace/mimo-verl/` (the Kumo/GSE-RL work: reward v2, as-of-fenced episodes). Approach: code-as-method rows (reward design, episode fencing, verl harness gaps per 2026-10-02 memory).

**Honorable mentions:** improve-ledger-work 5.4MB (191 txt + 8 jsonl) · wiring-wave2 2.8MB · sleeper_stats_w1.json 0.6MB (zero mind mentions) · IG full-fidelity 0.4MB · nfl-deep-dive 0.1MB · fulltext-cache.tar.gz 24.4MB (dup of arxiv-sweep fulltexts — skip) · vendor-Sports images/video 113MB (not knowledge).

## Honesty notes (do not hand-wave these)
- **u_00 row-count discrepancy:** manifest claims 23,743 rows; the actual 20.0MB branch file contains **22,282** valid JSON rows. Manifest is inflated — recount before citing.
- **"Every word" is NOT satisfied** for the corpus: u_00/u_01/u_02/u_03/u_04 bodies are truncated ~4–5k chars. Only u_05/u_06/u_07 are full-fidelity. The full text exists — locally, in eng-mine/knowledge — and nowhere else.
- **Binary bytes ≠ text rows.** ~2.7GB of the gap is .pkl/.parquet; the ingestible unit is schema + statistics + samples + method linkage, not the bytes. Do not claim "3.6GB fed" after writing 200 rows of schemas — report both numbers.
- **vendor-Sports is stale.** Its docs/ tree overlaps the fresh sports-docs clone; dedupe before ingesting anything from it.
- **FTN charting** (2.2MB across both locations): knowledge-OK, engine-FORBIDDEN (mission rule: net EPA blocked, FTN excluded, no fake pressure signal). Label rows accordingly.
- **gse-research / gse-lab venv junk** (plotvenv 178MB, edge-sheet/.venv-v2, etc.) correctly excluded — not a gap.
- The Oct-3 AM X-sweep tables exist as CSVs in the fresh clone but the sports feed was markdown-only: the "EPA/dropback × pressure" and "personnel × EPA" innovations are in the mind as prose, **not as the underlying numbers**.
