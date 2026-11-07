# GAP AUDIT — HONEST INVENTORY OF EXTERNAL DEPENDENCIES & KNOWLEDGE-ONLY ITEMS (`docs/wiring/GAP-AUDIT.md`)

Generated: `2026-11-07T12:28:30Z`  
Branch: `argon4/reverse-overnight-total-wiring-2026-11-07`

Per Part 5 & Part 9 of the Overnight Master Order (*"knowledge is never deleted; unproven consumption is never called wiring"*), every item across the 898 branches, 48,609 corpus artifacts, 17,712 equation registry rows, and 10 warehouse datasets that is knowledge-only or gated on an external account/host action is explicitly cataloged below with its exact count and next action.

---

## 1. Summary Table by Gap Classification

| Gap Classification | Category | Exact Count | Current State in Ledger | Exact Next Action (Owner / Morning Step) |
|---|---|---:|---|---|
| **External Account Intake Dependency** | OpenRouter Public Provider Listing (`gse/*` model IDs) | `1` provider (`9` V2.4 model IDs) | Worker & `/v1/models` routes unified on all 9 V2.4 IDs (`workers/stealth-skeleton-provider/src/index.ts` & `apps/web/app/api/openrouter/v1/models/route.ts`) | Garrett submits OpenRouter Provider Intake Form on account dashboard so OpenRouter's poller attaches `gse/*` IDs to `stealth.galaxysportsedge.com/v1/models`. |
| **External Weather Forecast Feed Retry** | Warehouse Dataset `DS_NWS_STADIUM_FORECAST` | `1` dataset (`0` rows; `DS_OPENMETEO_STADIUM_HOURLY` landed `1` row) | Tracked in `intelligence/data/warehouse/ingestion_registry.jsonl` as `NAMED_EXTERNAL_GAP_WEATHER_API` with `.meta.json` | Run Step 1 (`Fresh Data Pull`) in `docs/wiring/ARMED-WORKFLOWS.md` with live outbound NWS `api.weather.gov` gridpoint fetch prior to kickoff; if unavailable, `layer_03_venue_physical_environment` falls back to Open-Meteo and `layer_25_missingness_contradiction` widens `uncertainty_width_delta`. |
| **Low-Sample Shrinkage-Gated Equations** | Canonical Catalog Equations with `sample_size_n < min_sample_size_n` | `1,400` of `12,304` equations | Tagged `sample_gate_status: "GATED_LOW_SAMPLE_SHRINKAGE_APPLIED"` in `data/equations/equation_executable_catalog_12304.json` and `data/equations/equation_execution_registry.jsonl` with explicit `shrinkage_weight = sample_size_n / min_sample_size_n` | Automatically shrunk toward zero prior when `execute_catalog_equation(..., apply_shrinkage=True)` runs; promote to `PASS_SAMPLE_GATE` as additional 2026 weekly play-by-play samples accumulate in Step 10 (`grading_to_corpus_pipe.py`). |
| **Research Crosswalk Nodes (Structural Mapping)** | Quad-Engine Master Crosswalk (`QUAD-ENGINE-MASTER-CROSSWALK.json`) | `3,742` nodes | Recorded in `data/equations/equation_execution_registry.jsonl` (`source: "QUAD_ENGINE_MASTER_CROSSWALK"`) as structural cross-domain graph edges (`live_output_seen: false` for pure graph metadata nodes) | Retain as cross-domain graph topology pointers linking the `12,304` executable catalog equations and `1,666` thousand-equation matrix entries across the 6 GSI universal domains. |
| **Knowledge-Only Corpus Archive Artifacts** | Historical Raw Data Snapshots & Secondary Research Files in `CORPUS-CENSUS.csv` | `46,603` of `48,609` items (`2,006` active sources chunked into `4,463` records in `data/corpus/research_records.jsonl`) | Every single item accounted for in `docs/wiring/RESEARCH-LEDGER.jsonl` with `ingestion_status: "KNOWLEDGE_ONLY_INDEXED_IN_LEDGER"` and explicit `reason_if_knowledge_only` | Retained in `RESEARCH-LEDGER.jsonl` for historical provenance and point-in-time backtest replay without bloating the active context-window corpus chunk index. |
| **Unfree External Textbook Binaries (Charge 9)** | 5 Copyrighted Graduate Textbooks Without Legal Free Route | `5` books | Documented in `CORPUS-CENSUS.csv` and `data/research/books_and_repos_ingest_2026.jsonl` via structured chapter/theorem manifests (`216` Drive PDFs + `28` manifest records ingested) | Do not claim binary PDF presence for the 5 copyrighted books unless Garrett uploads licensed copies to Drive folder `1mp82cTGHf-10vnL1XlJgL9XmQ3gkeRF2`. |

---

## 2. Verification of Zero Unaccounted Items

- **Branches:** `898` in `BRANCH-CENSUS.csv` − `898` in `BRANCH-LEDGER.csv` = **`0` unaccounted**.
- **Corpus Items:** `48,609` in `CORPUS-CENSUS.csv` − `48,609` in `RESEARCH-LEDGER.jsonl` = **`0` unaccounted**.
- **Equations:** `12,304` (Catalog) + `1,666` (Matrix) + `3,742` (Crosswalk) − `17,712` in `equation_execution_registry.jsonl` = **`0` unaccounted**.
- **Warehouse Datasets:** `10` (`79,297` records) in `ingestion_registry.jsonl` − `10` (`79,297` records) in `intelligence/data/warehouse/normalized/` = **`0` unaccounted**.
- **Reasoning Layers:** `26` in `LAYER-MAP.md` − `26` in `intelligence/reasoning/layers/` − `26` in `data/context_packets/2026_W09_JAX_BAL.json` = **`0` unaccounted**.
- **Work Queue:** `28` total items in `docs/wiring/WORK-QUEUE.jsonl` − `28` `DONE` = **`0` queued / `0` parked**.
