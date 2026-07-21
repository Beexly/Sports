# NFLverse: PFF-Level NFL Data at $0

> Source: `packages/data-ingestion/src/nflverse-source.ts`, `nflverse-ngs.ts`, `nflverse-cache.ts`, `nflverse-trend-plan.ts` (all written, zero new code)
> Purpose: 20 NFL datasets — play-by-play, NGS, snap counts, injuries, rosters, PFR advanced stats — from CC-BY-4.0 GitHub releases. Same data as nflreadr/nflfastR. Free forever.

## What This Is

NFLverse is a community-maintained open data project that redistributes NFL data under CC-BY-4.0 (Creative Commons Attribution). The datasets include:

- Play-by-play with EPA, WPA, CPOE, RYOE (same as nflfastR)
- Next Gen Stats (NGS) — separation, CPOE, RYOE (same values as nextgenstats.nfl.com)
- PFR advanced stats — pressure rate, blitz %, pass block win rate
- Snap counts, depth charts, injury reports
- Rosters, contracts, combine, draft picks, trades, officials

This is the data infrastructure behind every serious NFL analytics project. `nflverse-source.ts` fetches it from GitHub releases. The cache layer (`nflverse-cache.ts`) makes it production-safe.

**Attribution required for NGS expected metrics** (RYOE, xYAC, CPOE): these are NFL-proprietary metrics republished under data-sharing agreement. Cite "NFL Next Gen Stats" when these values appear in user-facing content.

## Catalog: 20 Datasets

```typescript
// From nflverse-source.ts — NFLVERSE_CATALOG
const NFLVERSE_CATALOG = {
  pbp:                  "play_by_play",           // EPA, WPA, play-level
  pbp_participation:    "pbp_participation",       // personnel groupings per play
  player_stats_week:    "player_stats",            // weekly offense/defense stats
  snap_counts:          "snap_counts",             // snap counts by week
  ngs:                  "ngs",                     // NGS: sep, CPOE, RYOE
  pfr_advstats:         "pfr_advstats",            // PFR: pressure rate, PBWR
  ftn_charting:         "ftn_charting",            // FTN route/coverage (CC-BY-SA-4.0, not ingested)
  depth_charts:         "depth_charts",
  injuries:             "injuries",
  rosters:              "rosters",
  espn_qbr_week:        "espn_qbr",               // ESPN QBR weekly
  players:              "players",                 // player bio/position/team
  schedules:            "schedules",               // game schedule + outcomes
  draft_picks:          "draft_picks",
  combine:              "combine",
  officials:            "officials",
  trades:               "trades",
  contracts:            "contracts",
  weekly_rosters:       "weekly_rosters",
  stats_team_week:      "team_stats",              // team-level weekly
};
```

## Fetching Data

### Basic fetch

```typescript
import { fetchNflverse } from "@packages/data-ingestion/nflverse-source";

const table = await fetchNflverse("player_stats_week", 2024);
// table: CsvTable { columns: string[], rows: string[][] }
```

### With column projection (recommended)

```typescript
const table = await fetchNflverse("player_stats_week", 2024);
// The full table has 372 columns — use parseCsv with { columns } to project
```

### Cached fetch (production — use this, not fetchNflverse directly)

```typescript
import { fetchNflverseTableCached } from "@packages/data-ingestion/nflverse-cache";

const result = await fetchNflverseTableCached({
  key: "player_stats_week",
  season: 2024,
  columns: ["player_id", "week", "passing_yards", "passing_tds", "rushing_yards"],
});
// result: NflverseTableResult with TTL, size stats, cache-hit indicator
```

## The Cache Layer (Required for Production)

**Use `fetchNflverseTableCached` in all production code.** Do not call `fetchNflverse` directly in request handlers.

### Why

`nflverse-cache.ts` was written to fix OP-002: three concurrent loaders were downloading the same 400MB play-by-play asset simultaneously, causing OOM. The cache provides:

- **Single-flight**: concurrent requests for the same dataset coalesce into one fetch
- **TTL per dataset**: `player_stats_week` caches for 30min, `schedules` for 6h
- **Column projection**: only keep the columns you need before storing in memory
- **Size caps**: `NFLVERSE_MAX_RAW_BYTES = 150MB`, `NFLVERSE_MAX_TEXT_BYTES = 400MB`

### TTLs

```typescript
const NFLVERSE_TABLE_TTLS = {
  player_stats_week: 30 * 60 * 1000,   // 30 min (updates during season)
  schedules:         6 * 60 * 60 * 1000, // 6 hr
  injuries:          60 * 60 * 1000,    // 1 hr
  depth_charts:      2 * 60 * 60 * 1000, // 2 hr
  // ... defaults to 4hr for stable datasets
};
```

### Column allowlists

`NFLVERSE_PROJECTIONS` in `nflverse-cache.ts` defines column allowlists per dataset. Example for `player_stats_week`: 21 columns selected from 372. This keeps the in-memory table small.

## NGS: Next Gen Stats

`nflverse-ngs.ts` provides typed access to NFL Next Gen Stats.

### Receiver separation

```typescript
import { parseNgsReceiving, ngsReceivingToSeparationTruth } from "@packages/data-ingestion/nflverse-ngs";

const table = await fetchNflverseTableCached({ key: "ngs", season: 2024, variant: "receiving" });
const rows = parseNgsReceiving(table);
const calibrationTruth = ngsReceivingToSeparationTruth(rows, /* minTargets= */ 20);
// calibrationTruth: Array<{ playerId, name, avgSeparation, targets }>
```

`avgSeparation` is the moat metric — it's not available from any free public source except NFLverse's CC-BY-4.0 redistribution.

### QB CPOE (Completion Percentage Over Expected)

```typescript
import { parseNgsPassing, ngsPassingToCpoeTruth } from "@packages/data-ingestion/nflverse-ngs";

const table = await fetchNflverseTableCached({ key: "ngs", season: 2024, variant: "passing" });
const rows = parseNgsPassing(table);
const cpoeTruth = ngsPassingToCpoeTruth(rows, /* minAttempts= */ 135);
```

### Rusher RYOE (Rushing Yards Over Expected)

```typescript
import { parseNgsRushing } from "@packages/data-ingestion/nflverse-ngs";

const table = await fetchNflverseTableCached({ key: "ngs", season: 2024, variant: "rushing" });
const rows = parseNgsRushing(table);
```

### NGS dataset structure

NGS combined assets (`ngs_${variant}.csv.gz`) cover 2016→current season. Per-season assets 404 for the current year — `nflverse-source.ts` handles this automatically with the combined asset fallback.

```typescript
// filterNgs: week=0 means full-season aggregate
const seasonAggregate = filterNgs(rows, 2024, /* week= */ 0);
const week5Only = filterNgs(rows, 2024, 5);
```

## Trend Plans: 5 Pre-Built Analytics

`nflverse-trend-plan.ts` defines 5 data science plans using NFLverse datasets:

| Plan ID | Datasets | Signal |
|---|---|---|
| `qb-age-rb-target-share` | player_stats_week, pbp | Age curves + usage patterns |
| `birthday-usage` | player_stats_week, rosters | Days-of-rest effects |
| `rest-route-participation` | snap_counts, schedules | Rest advantage |
| `injury-cascade` | injuries, pbp | Downstream effects of key injuries |
| `ngs-separation-buy-low` | ngs, player_stats_week | Separation vs. target share divergence |

Each plan specifies:
```typescript
{
  requiredDatasets: string[];
  joins: JoinSpec[];
  minimumSeasons: number;
  minimumObservations: number;
  publicUntilReady: "empty-state-only"; // gated until models trained
}
```

All 5 plans are gated `"empty-state-only"` — the data pipeline is ready, the model fitting is the remaining work.

## PFR Advanced Stats

`pfr_advstats` provides Pro Football Reference advanced metrics:
- Pass: pressure rate, time to throw, PROE (passing rate over expected)
- Rush: yards before contact, missed tackles forced
- Def: pressure %, blitz %
- Rec: target share, air yards

```typescript
const table = await fetchNflverseTableCached({
  key: "pfr_advstats",
  season: 2024,
  variant: "pass", // "pass" | "rush" | "def" | "rec"
});
```

## What This Replaces

| Data | Without NFLverse | With NFLverse |
|---|---|---|
| Play-by-play + EPA | $5k–$20k/yr (SportsRadar, Sportradar) | $0 |
| NGS separation | NFL Data partnership or $0 via redistribution | $0 via CC-BY-4.0 |
| PFR advanced | PFR API subscription | $0 via CC-BY-4.0 |
| Snap counts | $0 via NFLverse | $0 |
| Full roster history | $0 via NFLverse | $0 |

The pick engine has PFF-level input data without a PFF contract.

## Attribution

CC-BY-4.0 requires attribution. For NFLverse data generally:
> Data sourced from NFLverse (CC-BY 4.0). See nflverse.github.io.

For NGS expected metrics (RYOE, xYAC, CPOE):
> Expected metrics from NFL Next Gen Stats, redistributed via NFLverse (CC-BY 4.0).

Include this attribution on any public-facing surface that shows expected metric values.

## Status

- [x] 20-dataset catalog with GitHub release URLs
- [x] `fetchNflverse(key, season, variant?)` → `CsvTable`
- [x] Quote-aware RFC-4180 CSV parser with column projection
- [x] Transparent gunzip via magic bytes
- [x] Single-flight + TTL + size-capped artifact cache (OP-002 fix)
- [x] Per-dataset column projection allowlists
- [x] Typed NGS parsers (receiving, rushing, passing)
- [x] NGS → calibration ground truth adapters
- [x] 5 trend plan definitions
- [ ] Train and deploy `ngs-separation-buy-low` trend model
- [ ] Train and deploy remaining 4 trend plans
- [ ] Surface PFR advanced stats in pick rationale
- [ ] Kalshi × NFLverse: correlate snap count trends with market mispricing
