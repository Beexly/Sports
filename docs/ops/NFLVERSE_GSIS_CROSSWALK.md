# nflverse identity: GSIS hub + season-matched crosswalk

**Canonical key:** `Player.gsisId` / nflverse `gsis_id` / weekly stats `player_id` / NGS `player_gsis_id` (same `00-…` space).

## Column aliases (same value space)

| Asset | Player id column |
|---|---|
| rosters, injuries, players, weekly_rosters | `gsis_id` |
| player_stats week | `player_id` (= GSIS) |
| NGS | `player_gsis_id` |
| PBP roles | `*_player_id` (GSIS) |
| **snap_counts** | **`pfr_player_id` only** (PFR namespace — no GSIS column) |
| **pfr_advstats** | PFR-keyed advanced weeks |
| draft_picks | `gsis_id` + `pfr_player_id` |

## Bridges (never invent)

```text
snap.pfr_player_id  →  roster.pfr_id  →  roster.gsis_id
ESPN-only feed      →  roster.espn_id →  roster.gsis_id
PFR advstats rows   →  roster.pfr_id  →  roster.gsis_id
```

Implementation: `buildIdCrosswalk` / `resolveGsisId` / `resolveGsisFromRow` in
`@sports/data-ingestion` (`nflverse-id-crosswalk.ts`).

**Season match:** load roster for the **stats season first**, then prior season
only to fill missing vendor keys. First write wins.

**Law:** empty vendor id or missing map entry → no GSIS substitute. Product
may keep the vendor id for display; persistence still prefers GSIS when known.

## PFR data sources (investigation)

Pro Football Reference IDs enter nflverse through the **nflverse-players**
pipeline, not by scraping PFR at read time in GSE:

| Source | Role |
|---|---|
| `nflverse/nflverse-players` → `players_pfr_release` | Builds/releases `pfr_id` joinable on `gsis_id` |
| Seasonal `roster_{season}.csv` | Carries `pfr_id` + `gsis_id` + `espn_id` on the same row |
| All-time `players.csv` | Master cross-season identity (same ID columns) |
| `snap_counts_{season}.csv` | **Only** `pfr_player_id` — must bridge via roster |
| `pfr_advstats` / `advstats_week_*` | PFR charting-grade weeks (pressures, YAC, etc.) |
| `draft_picks.csv` | `pfr_player_id` + `gsis_id` for draft capital |
| `load_players()` / DynastyProcess FF IDs | Broader fantasy-platform maps (optional; not required for GSE hub) |

**PFR id format:** short string like `MahoPa00` (not numeric). Do not coerce to
number or invent from name.

**Do not:** scrape pro-football-reference.com from GSE, invent PFR↔GSIS pairs,
or treat snap-count rows as already-GSIS.

**Do:** build season-matched maps from roster (or players) rows that already
carry both keys; resolve at read time in snap-share / any PFR-only surface.

## Season floor (website / engines)

`resolveFootballStatsSeason` / `latestNflverseInspectionSeason`:

- Before September → labelled prior year (Aug 2026 → **2025**).
- Prefer labelled current only when REG source rows exist.
- Injuries often lack `injuries_{current}.csv` early; loaders fall back one
  season with an explicit note or empty state — never fabricate designations.

## Related

- Snap-share uses the crosswalk at read time.
- Ingest upserts players on `gsisId` only (`ingestPlayerWeeklyStats`).
- Prisma pin: `npm run guard:prisma-version` (schema is Prisma 5.x).
- Local one-shot: `npm run verify:season-crosswalk`.
