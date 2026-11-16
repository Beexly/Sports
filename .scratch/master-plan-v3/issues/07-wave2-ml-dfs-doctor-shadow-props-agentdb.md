# 07: Wave 2 End-to-End Wiring (ML Contract, Web DFS Lineup Doctor, Board360 Shadow Props, Sequenced v3 Bridge, Orbax Checkpoints, AgentDB Memory & GCP Guarded Warehouse)

**What to build:** Fix `gse-ml-endpoints.ts` to match `gse-ml-service` Pydantic `extra="forbid"` schemas (`/predict/etkf` + `/predict/tda`), build Web + API Stage-0 `<50ms` DraftKings Lineup Doctor (`Classic 2-TE` + `Showdown CPT` + free redaction), wire `createBoard360PropsShadowSource` into `props-slate-shadow`, connect `src/gse_engine` into `run_permanent_sequenced_weekly_pipeline.py`, and add `orbax` mmap trajectory checkpoints, `AgentDB` bitemporal SQLite hybrid vector/lexical memory store, BigQuery dry-run byte-capped warehouse adapter, and SRE recovery runbook.

**Blocked by:** 06-cron-osv-corpus-and-verification

**Status:** implemented-awaiting-shell-verify

- [x] `gse-ml-endpoints.ts` sends strictly allowed `EtkfRequest` fields (`teams`, `home_team`, `away_team`, `observations`) and keeps `/predict/tda` separated as feature extraction.
- [x] `/api/dfs/lineup-doctor` and `<LineupDoctorPanel />` validate 9-man 2-TE Classic & 6-man 1.5x Showdown rosters against `stage0_truth_s*_w*.json` (sorted numerically by season/week via `parseSeasonWeekSortKey`) while redacting repairs for FREE viewers.
- [x] `createBoard360PropsShadowSource` (numeric `parseSeasonWeekSortKey`) + `createDbRateHistoryResolver` (`apps/web/lib/props/db-rate-history-resolver.ts`, single-batch `PlayerGameStat` query, stub/missing-column/`<2`-game fail-closed) feed real two-sided quotes into `props-slate-shadow` (`apps/web/app/api/cron/props-slate-shadow/route.ts`) without inventing single-sided under odds or imputing missing rate histories.
- [x] `run_permanent_sequenced_weekly_pipeline.py` runs `run_gse_engine_v3_pipeline_bridge` inside `Gate_0B` and stamps `gse_engine_v3` into the receipt.
- [x] `TrajectoryCheckpointer` (path-traversal hardened on `save`/`load` + manifest buffer path verification), `AgentDbMemoryStore`, and `GcpWarehouseAdapter` + unit tests (`test_trajectory_checkpoint.py`, `test_agentdb_store.py`, `test_gcp_warehouse.py`, `test_sequenced_pipeline_v3_bridge.py`, `db-rate-history-resolver.test.ts`) are authored and statically checked.
