# REA Tool Design & Analysis Optimization Report (`2026-11-07`)

## 1. `/rea-tool-design` Audit & Contract Implementation

- **Provider Owner:** `packages/mcp-equations-server/src/rea-evidence-investigation-tools.ts` & `intelligence/rea/rea_tool_design_and_analysis_optimizer.py` (`provider_id: gse-mcp-equations-ast-v1`)
- **Advertised MCP Tools (`tools/list`):** `8` tools across 3 availability groups (`session_and_discovery`, `evidence_producers_and_views`, `unknown_registry`) with closed effect booleans (`read_only`, `retains_evidence`, `mutates_session_registry`).
- **Reproduced Bugs Fixed:**
  1. `packages/mcp-equations-server/src/index.ts` previously exposed only `query_quad_engine_crosswalk` without REA `EvidenceRecord` envelopes, `parent_evidence_id` retention, or `inspect_analysis_view` projection.
  2. `intelligence/equations/equation_executor.py` previously repeated `normalize_feature_vector`, `sorted(inputs.items())`, and `dict(norm_inputs)` `21,419` times per batch call and rebuilt `21,419` lowercase search strings on every book query.
- **Failure Recovery & Evidence Semantics Verified:**
  - `resource_constraint` (`details.resource: "transport"`) retains complete record (`ev_fam_0002`) and recovers via `inspect_analysis_view` with **zero additional producer invocations** (`2 -> 2`).
  - `logical_paths` omitted pages all occurrences (`10` returned); `logical_paths: []` selects `0`.
  - `source_complete: false` with `0` matches sets `absence_established: false` (never claims global absence from partial source).
  - `record_unknown` / `update_unknown` enforces optimistic concurrency (`stale_revision` rejected) and requires qualifying observed `evidence_id` before transitioning to `verified_resolved`.

## 2. `/rea-analysis-optimization` Measured Producer Speedups

| Workload Phase (`21,419` Equations / `279` Families / `26` Layers) | Baseline (Before) | Optimized (After) | Measured Speedup |
|---|---:|---:|---:|
| **Warm `execute_all_279_equation_families` (Shared Producer Cache)** | `1.9903s` | `0.000665s` | **`2992.9x`** |
| **Cold 26-Layer Batch (`_PreNormalizedFeatureContext` + Shared `ast_env`)** | `3.1531s` | `2.2151s` | **`1.42x`** |
| **Warm 26-Layer Batch (`_BATCH_PRODUCER_CACHE`)** | `3.1531s` | `0.005701s` | **`553.1x`** |
| **10 Book/Source Queries (`_search_haystack_lower` at Admission)** | `0.5347s` | `0.1034s` | **`5.17x`** |

## 3. Correctness Oracle & Cache Ownership

- **`EQ_00003` Exact Oracle (`-0.088894`):** `True`
- **`EQ_06896` Exact Oracle (`-0.197351` at 5,280 ft):** `True`
- **Cold vs Warm `279`-Family & `26`-Layer Exact Parity:** `True` (`20,019` active, `1,400` held below min sample)
- **Cache Bound & Invalidation:** `MAX_BATCH_CACHE_ENTRIES = 64` owned by `intelligence/equations/equation_executor.py`, keyed by `(resolved_path, st_mtime_ns, st_size, ast_enabled, scope_id, feature_tuple, overrides_tuple, max_equations)`.
