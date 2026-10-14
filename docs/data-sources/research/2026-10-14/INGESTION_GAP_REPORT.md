# Ingestion gap report: Horizon 1 Priority 1 (2026-10-14)

DIAGNOSTIC. Branch `grok/walk-forward-2026-10-14`. Nothing here is wired into emission.

The source registry is `packages/data-ingestion/src/source-registry.ts`. It lists `nflverse` as
cleared-with-attribution (CC-BY-4.0), with datasets including injuries, depth_charts, snap_counts,
schedules and pbp. It lists `nws-weather` as cleared (public domain). The atlas registry
`data/source-atlas/source_registry.json` (546 seed rows) does not list nflverse or NWS.

## What existed before this pass

| Priority 1 item | Existing code or artifact | Point-in-time status |
|---|---|---|
| Depth charts | `apps/web/lib/ingestion/depth-charts.ts` (TS writes to the DB, stamped `fetchedAt`, replaces each season) and `apps/web/lib/nflverse/depth-charts.ts` (reader). Python: `intelligence/coaching/data/depth_charts_2026.parquet` | The manifest says `point_in_time: false`. Rows from 2024 and earlier carry **no timestamp**. 2025+ rows carry `dt`. |
| Practice participation | Inside nflverse injuries (`practice_status`) | Same as injuries |
| Injury designation, body part, status | `apps/web/lib/ingestion/injuries.ts` (TS writes to the DB), `apps/web/lib/nflverse/injury-report.ts`, `intelligence/coaching/data/injuries_2026.parquet`, `data/gse-dataset/current/injuries_2026.csv` | 2026 only on the Python side, `point_in_time: false`. No historical injury rows were stamped for the Python cycle. |
| Snap counts | `apps/web/lib/ingestion/snap-counts.ts` (TS writes to the DB). `data/gse-dataset/snap-counts-2018..2026.jsonl` exists but I did not check its stamps | Keyed by game. Nothing for 2015–2017 on the Python side. |
| Stadium weather | NWS reader `apps/web/lib/weather/game-weather.ts` and writer `game-weather-capture.ts` (route `/api/cron/game-weather-capture`, already in `vercel.json`). Open-Meteo pilot in `docs/data-sources/research/2026-10-13/weather-pilot/` | **Live forecast only.** NWS has no historical forecast archive. The weather writer already exists, so no new puller was built. nflverse `temp`/`wind` are game-time readings, not pre-kickoff, and `game-weather.ts` treats Open-Meteo as commercially ambiguous. |
| Schedule metadata (rest, travel, timezone, altitude, surface, roof) | `intelligence/coaching/data/schedule.csv` (season, week, team, opponent only). nflverse games.csv already has rest, roof and surface. `apps/web/lib/conviction/signals/rest-travel.ts` exists (TS, not inspected) | **No travel miles, timezone or altitude anywhere.** No stadium table with sources. |

## Missing pullers built in `dfs/ingest/`

All are Python and DIAGNOSTIC, stamped with `observed_at` (UTC pull time), url, sha256 and license. Rows missing a required field are rejected (no imputation), and a missing required column fails the pull. The full pulls are cached outside the repo in `/workspace/nflverse_cache`. Samples and manifests are in `docs/data-sources/research/2026-10-14/ingest-samples/`.

- `nflverse_release.py`: historical injuries, snap_counts, depth_charts and the players crosswalk.
  - Injuries 2015–2024: 5,104 to 6,215 rows per season accepted, 0 rejected. Rows dated after kickoff: 0–3 per season.
  - **Injuries 2025: all 6,068 rejected**, because the 2025 file has no `date_modified` column.
  - Snap counts 2015–2025: 23,842 to 26,615 rows per season.
  - Depth charts: 2023 has 37,327 rows, **0 of them with a provable as-of time**. 2025 has 548,638 rows with `dt`.
  - Players: 24,854 rows.
- `stadiums.py`: 49 venues.
  - Coordinates come from Wikidata P625, timezone from NWS, altitude from USGS EPQS.
  - **32 are complete.** 17 are null with a reason: ambiguous or no Wikidata match (BUF, CHI, NAS, Madrid, Munich, Rio, São Paulo), or non-US venues that NWS/USGS don't cover.
- `schedule_meta.py`: 3,028 games for 2015–2025, **2,129 with travel miles, timezone shift and altitude all present.**
- Tests: `dfs/ingest/test_ingest.py`, 5 tests.

## Still open

1. Point-in-time depth charts before 2025: the source has no timestamp. Fix: archive weekly snapshots ourselves from now on.
2. Pre-kickoff historical weather: NWS has no archive. Fix: let the existing capture cron accumulate stamped forecasts. Open-Meteo history first needs a license decision.
3. Injuries for 2025 have no `date_modified`. Fix: ask nflverse, or snapshot future reports ourselves.
4. 17 venues are unresolved. Fix: fill them from a cited source (for example Wikidata QIDs chosen by a person and recorded in the table).
