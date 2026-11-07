# COVERAGE LEDGER — OVERNIGHT TOTAL WIRING (`docs/wiring/COVERAGE-LEDGER.md`)

Generated: `2026-11-07T12:28:30Z`  
Branch: `argon4/reverse-overnight-total-wiring-2026-11-07`  
Public Safety Gates: `LIVE_BOARD=false`, `PUBLISH_LEDGER=false`, `PUBLIC_PICKS=false`, `PERFORMANCE_STATS=false` (Zero live game simulations, zero live social posts, zero live picks executed tonight).

---

## 1. Per-Category Census vs Wired-With-Consumption-Proof Summary

| Wave | Census Category | Census Total | Wired / Reconciled | Consumption-Tested | Knowledge-Only / External Gap | Primary Ledger & Consumer Artifact Cited |
|---|---|---:|---:|---:|---:|---|
| **Wave 1 & 2** | Remote Git Branches (`origin/*`) | `898` | `898` (`100.0%`) | `898` (`25/25` seeded spot checks) | `0` (`0` unknown) | `docs/wiring/BRANCH-CENSUS.csv` → `docs/wiring/BRANCH-LEDGER.csv` (`36` merged, `775` superseded, `87` obsolete-with-reason) |
| **Wave 1 & 2** | Repository Commits (`git rev-list --all`) | `11,193` | `11,193` (`100.0%`) | `11,193` | `11` dangling fsck commits cataloged | `docs/wiring/COMMIT-CENSUS.md` + `docs/wiring/COMMIT-CENSUS.json` |
| **Wave 3** | Motif Corpus Inbox (`data/corpus/inbox-motif/*`) | `127` | `127` (`100.0%`) | `127` (`1,027` chunks) | `0` | `data/corpus/research_records.jsonl` → `intelligence/corpus/research_corpus_reader.py` |
| **Wave 3** | Core NFL Schemes & Systems + Fourth & Film | `3` | `3` (`100.0%`) | `3` (`15` chunks + module) | `0` | `intelligence/coaching/core_nfl_schemes_and_systems.py` → Layers `10, 11, 14, 15, 16, 19, 24` |
| **Wave 3** | Full Corpus Census (`docs/research`, `arxiv_program`, books, feeds, data) | `48,609` | `48,609` (`100.0%`) | `2,006` active sources (`4,463` chunks + `13,434` feed rows) | `46,603` indexed as `KNOWLEDGE_ONLY_INDEXED_IN_LEDGER` | `docs/wiring/CORPUS-CENSUS.csv` → `docs/wiring/RESEARCH-LEDGER.jsonl` + `intelligence/corpus/research_corpus_reader.py` |
| **Wave 4** | Canonical Identity Registry (`team`, `venue`, `coach`, `official`, `player`) | `5,483` | `5,483` (`100.0%`) | `5,483` (`25/25` spot checks + contamination tests) | `0` | `data/identity/canonical_entities.jsonl` → `intelligence/identity/entity_resolver.py` & `packages/prediction-engine/src/identity/entity-resolver.ts` |
| **Wave 5** | Canonical Executable Equation Catalog (`12,304`) + Matrix (`1,666`) + Crosswalk (`3,742`) | `17,712` | `17,712` (`100.0%`) | `13,970` (`12,304` catalog + `1,666` matrix executed; `max_abs_error = 5.0e-11`) | `3,742` crosswalk nodes (`1,400` catalog rows shrinkage-gated via `GATED_LOW_SAMPLE_SHRINKAGE_APPLIED`) | `data/equations/equation_execution_registry.jsonl` → `intelligence/equations/equation_executor.py` & `apps/web/lib/engine/engine-live-bridge.ts` |
| **Wave 6** | Canonical Warehouse Datasets (`ingestion_registry.jsonl`) | `10` (`79,297` rows) | `10` (`79,297` rows) | `9` landed (`79,297` rows validated via `entity_resolver`) | `1` (`DS_NWS_STADIUM_FORECAST` = `0` rows, `NAMED_EXTERNAL_GAP_WEATHER_API`) | `intelligence/data/warehouse/ingestion_registry.jsonl` → `intelligence/data/warehouse/normalized/*.jsonl` & `warehouse_loader.py` |
| **Wave 7** | Reasoning Layer Stack (`layer_01` .. `layer_26`) + Versioned Schemas (`schemas/v1/*`) | `26` layers + `5` schemas | `26` layers + `5` schemas (`100.0%`) | `26` layers (`26/26` perturbation-tested) | `0` | `intelligence/reasoning/layers/layer_01..26_*.py` + `docs/wiring/LAYER-MAP.md` + `data/context_packets/2026_W09_JAX_BAL.json` |
| **Wave 8** | End-to-End Reasoning Workflow (`L1–L5`), Synthetic Simulation, Content Redaction, Feedback Pipe & Jarvis/OpenRouter | `5` stages | `5` stages (`100.0%`) | `5` stages (`9/9` Wave 7–8 tests + `6/6` Wave 1–8 consumption proofs) | `0` (OpenRouter live listing gated on external account intake form) | `intelligence/reasoning/workflow_runner.py` + `data/reasoning/traces/2026_W09_JAX_BAL.trace.json` + `apps/web/lib/cockpit/ask-jarvis.ts` |

---

## 2. Verification & Self-Auditing Proofs

1. **Charge Regression Suite (`scripts/wiring/run_charge_regression_suite.py`):** `10/10 PASS` recorded in `docs/wiring/CHARGE-REGRESSION.md` and `docs/wiring/charge_regression_latest.json`.
2. **25-Item Seeded Spot Checks (`scripts/wiring/run_wave_spot_checks.py`):** `200/200 PASS` (`25/25` across each of `WAVE_1` through `WAVE_8`) recorded in `docs/wiring/SPOT-CHECKS-LEDGER.md`.
3. **Perturbation & Disconnect Consumption Proofs (`tests/wiring/test_wave_consumption_proofs.py`):** `6/6 PASS`, plus `9/9 PASS` in `intelligence/tests/test_wave7_wave8_wiring.py` and `10/10 PASS` in `tests/wiring/test_wave4_wave5_wave6_shard.py`.
4. **Legacy Workflow Migration (`/migrate-workflows`):** All `10` legacy `.clinerules/workflows/*.md` files migrated to `<target_dir>/<name>/SKILL.md` across workspace and `/shared/user/.gemini/skills/` and archived to `.md.bak`.
