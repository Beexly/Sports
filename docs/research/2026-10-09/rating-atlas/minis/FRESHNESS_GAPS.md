# FRESHNESS GAPS — 2026-10-10

Files and patterns that the FreshnessGate cannot yet enforce. These are the next stamping/wiring targets.

## A. Data files lacking `observed_at` stamps

The gate WILL refuse these (correct behavior). They need stamps added at write time:

| File pattern | Readers | Status |
|---|---|---|
| `cfb/data/games_*.json` | book_anatomy, cfb_context, cfb_deep_context, cfb_engine, cfb_ppa_model, feeds | No top-level `observed_at` |
| `cfb/data/lines_*.json` | book_anatomy, cfb_altline_engine, cfb_context, cfb_deep_context, cfb_engine, cfb_ppa_model | No top-level `observed_at` |
| `cfb/data/cfb_drives_*.json` | cfb_drive_efficiency, graph_vs_close_stamp, ppd_v2_carryin | No top-level `observed_at` |
| `cfb/data/cfb_teamgamelog_*.json` | cfb_drive_efficiency | No top-level `observed_at` |
| `cfb/data/cfb_usage_*.json` | cfb_drive_efficiency | No top-level `observed_at` |
| `cfb/data/ppa_games_*.json` | cfb_ppa_model | No top-level `observed_at` |
| `cfb/data/teams_fbs.json` | cfb_drive_efficiency | No top-level `observed_at` |
| `cfb/data/coaches_all.json` | cfb_deep_context | No top-level `observed_at` |
| `cfb/data/venues.json` | cfb_deep_context, feeds | No top-level `observed_at` |
| `cfb/data/pbp_2026_w*.json` | cfb_pbp_tendencies | No top-level `observed_at` |
| `cfb/dk_cfb_prop_fits.json` | cfb_prop_engine, cfb_usage_join, consensus | No top-level `observed_at` |
| `cfb/cfb_prop_sigmas.json` | cfb_prop_engine, cfb_usage_join | No top-level `observed_at` |
| `cfb/cfbadv_recruiting_*.json` | recruiting_residuals | No top-level `observed_at` |
| `nfl/data/games_all.csv` | nfl_deep_context, nfl_weather_fix | No `observed_at` column |
| `nfl/data/espn_injuries_today.json` | feeds | No top-level `observed_at` |
| DK ladder TSVs (`dk_week6_*`) | ladder_inverse | No stamp mechanism |

**Fix:** Add `"observed_at": "<ISO>"` at write time in each producer script.

## B. Scripts not patched — gate doesn't support the format

| Script | Pattern | Reason |
|---|---|---|
| `nfl_pbp_baseline.py` | `gzip.open(pbp_*.csv.gz)` | Gate has no `.gz` support |
| `nfl_situational_graph_v1.py` | `gzip.open(pbp_*.csv.gz)` | Gate has no `.gz` support |
| `compute_missing_metrics.py` | `pd.read_parquet()` | Gate has no `.parquet` support |
| `consensus.py` | `entries_*.jsonl` (line-delimited) | Gate has no `.jsonl` support |
| `flow_analysis.py` | Flow JSONL | Gate has no `.jsonl` support |

**Fix:** Extend `freshness_gate.py` with `.gz`, `.parquet`, and `.jsonl` handlers, OR decompress/convert these to stamped `.csv`/`.json`.

## C. Infrastructure reads — exempt by design

These are not data-warehouse reads. Do NOT gate them:

| Script | Read | Reason |
|---|---|---|
| `doctrine.py`, `doctrine_selfcheck.py` | Kill ledger (JSONL) | Append-only audit log, not a data artifact |
| `clv.py` | Kill ledger | Same |
| `freshness.py` | JSONL scan | Legacy freshness module (superseded by gate) |
| `pull_entries.py` | Cookies file, resume JSONL | Operational credentials + checkpoint |
| `books_api.py` | Own snapshot output | Self-read for display |
| `divergence.py` | Own SNAP file | Self-read for movement detection |
| `tg_relay.py` | Binary file upload | Not a data read (Telegram send) |
| `snapshot_pump.py` | (writer only) | No data file reads; API → JSONL |
| `cfb_deep_context.py` | Weather cache (`wpath`) | Operational API cache |
| `nfl_deep_context.py`, `nfl_weather_fix.py` | Weather API cache | Operational API cache |

## D. Gate limitations

1. **`.json` with list top-level:** `load_stamped` calls `d.get("observed_at")` — fails on JSON arrays. Most warehouse files are lists. They need wrapping: `{"observed_at": "...", "rows": [...]}`.
2. **CSV without `observed_at` column:** Returns `None` → refused. Correct, but producers must add the column.
3. **No `.gz`/`.parquet`/`.jsonl`:** See Section B.
4. **`max_age_hours=6.0` default:** May be too aggressive for slow-moving data (recruiting, venues). Consider per-file overrides.

## Priority order

1. Wrap warehouse JSON lists with `{"observed_at", "rows"}` envelope (unblocks 15 scripts)
2. Add `observed_at` column to `games_all.csv` and team efficiency CSVs
3. Extend gate for `.gz` (unblocks NFL pbp baseline + situational graph)
4. Extend gate for `.jsonl` (unblocks consensus + flow analysis)
5. Per-file `max_age_hours` overrides for slow-moving reference data
