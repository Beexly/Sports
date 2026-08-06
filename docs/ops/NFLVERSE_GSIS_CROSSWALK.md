# nflverse identity: GSIS hub + season-matched crosswalk

**Canonical key:** `Player.gsisId` / nflverse `gsis_id` / weekly stats `player_id` / NGS `player_gsis_id` (same `00-…` space).

## Column aliases (same value space)

| Asset | Player id column |
|---|---|
| rosters, injuries, players | `gsis_id` |
| player_stats week | `player_id` |
| NGS | `player_gsis_id` |
| PBP roles | `*_player_id` |
| snap_counts | **`pfr_player_id` only** (PFR namespace) |

## Bridges (never invent)

```text
snap.pfr_player_id → roster.pfr_id → roster.gsis_id
ESPN-only feed     → roster.espn_id → roster.gsis_id
```

Implementation: `buildIdCrosswalk` / `resolveGsisId` / `resolveGsisFromRow` in
`@sports/data-ingestion` (`nflverse-id-crosswalk.ts`).

**Season match:** load roster for the **stats season first**, then prior season
only to fill missing vendor keys. First write wins.

**Law:** empty vendor id or missing map entry → no GSIS substitute. Product
may keep the vendor id for display; persistence still prefers GSIS when known.

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
