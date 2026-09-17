# GSE Research Library — 2026-09-17

Everything Motif's lab produced or collected on 2026-09-17, filed so every
agent works from the same record. Indexed in `AGENTS.md` (benchmark
sections); this tree is the source material.

## Layout

- `dossiers/` — analyst/account intelligence:
  - `nfl-analytics-x-dossier.md` — v1: 36 verified accounts, 26-metric map
  - `dossier-v2-accounts.md` — v2: 50 more accounts, 10 method deep-dives,
    watch lane, 8-post sweep entries 51-58
  - `dossier-v2-methods.md` — 7-topic methods literature review
  - `advanced-metrics-data-source-catalog.md` — v1 26-metric catalog
  - `benchmark-audit-2026-09-17.md` — completeness audit: 156 items
    inventoried, 82 covered, 73 filed into AGENTS.md
- `gse-lab/` — computed metrics from nflverse play-by-play (29 CSVs, 15
  families, 4 scripts). Start at `COMPUTATION_NOTES.md`.
- `props-consensus/` — Bills-Lions TNF props workstream: method
  (`projection_methods.md`), reports, market captures (`consensus_lines.csv`,
  `our_projections.csv`), player gamelogs, team script rates.
- `edge-sheet/` — the published Bills-Lions Edge Sheet: v1/v2 build
  scripts, design brief + critiques, fonts, final graphic
  (`bills-lions-edge-sheet-final-v2.png` — posted to @GalaxySportsHQ
  2026-09-17 15:04 CDT).

Screenshots behind the two ENGINE BENCHMARK sections live in `docs/`:
`air-yards-week1-2026.png`, `coverage-defenders-week1-2026.png`.

## Data provenance

- nflverse play-by-play: CC-BY 4.0 (credit "nflverse").
- FTN charting via nflverse: CC-BY-SA 4.0 (credit "FTN Data via nflverse",
  share-alike).
- Excluded as reproducible downloads (not vendored): raw
  `play_by_play_{2025,2026}.csv.gz` and `ftn_charting_2025.csv` from
  https://github.com/nflverse/nflverse-data/releases ; Python venvs.

## Ranked build targets (from the 8-post sweep, AGENTS.md)

1. FPOE/xFP stack 2. EPA + draft-pick Monte Carlo 3. Hidden yardage
4. Transparent Open Havoc 5. Survivor + best-ball EV
