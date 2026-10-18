# Continuity Delta Computation

**Last Updated:** 2026-10-17

## Definition

**Continuity Delta** measures the change in a position group's starter retention between two consecutive depth-chart snapshots.

```
Continuity Delta = (Starters Retained / Prior Starters) - 1
```

### Semantics
- **Range:** [-1, ∞) typically, with most values in [-1, 1]
- **-1:** Complete turnover (zero starters retained)
- **0:** All starters retained (no change)
- **+0.5:** 50% of prior starters + new additions (expansion)
- **Null:** Insufficient data (no prior snapshot or no depth chart for team)

### Position Groups
- **OL (Offensive Line):** LT, LG, C, RG, RT, G, T
- **DL (Defensive Line):** LE, RE, DE, DT, NT, T, D
- **DB (Secondary/Defensive Back):** CB, S, SS, FS, DB, SC

## Data Source

**Table:** `depth_chart_entries` (Neon gse-postgres)

**Schema:**
```sql
id               string (cuid)
playerId         string (nullable, FK to Player.id)
gsisId           string (nullable, NFL Player ID)
playerName       string (required)
season           int
week             int
team             string (uppercase abbreviation, e.g., "KC")
position         string (uppercase, e.g., "LT")
depthRank        int (nullable; 1 = starter, 2+ = backup)
role             string (nullable, positional role)
sourceId         string (default "nflverse")
rightsSnapshot   json
fetchedAt        datetime
```

**Indexes:**
- `(season, week, team)`
- `playerId`

**Selection Criteria:**
- `depthRank = 1` (starters only)
- Position in the relevant group's set
- Latest 2 snapshots for each (season, team, position group)

## Computation Algorithm

1. **Fetch Latest Snapshots:**
   - Query depth_chart_entries for (team, season, position_group, depthRank=1)
   - Sort by `week DESC`, take 2 most recent distinct weeks
   - If <2 snapshots, return null

2. **Build Player Sets:**
   - Current = {playerId or playerName} from latest snapshot
   - Prior = {playerId or playerName} from prior snapshot

3. **Count Retention:**
   ```
   retained = |Current ∩ Prior|
   prior_count = |Prior|
   ```

4. **Compute Delta:**
   ```
   if prior_count == 0:
      return null
   delta = (retained / prior_count) - 1
   return delta
   ```

5. **Game-Level Aggregation:**
   - Compute delta for home team, away team per position group
   - Game Delta = (home_delta + away_delta) / 2
   - If one team has null, use the other; if both null, result is null

## Implementation

**Module:** `packages/prediction-engine/src/continuity-deltas.ts`

**Exports:**
- `computeContinuityDeltas(input: ContinuityDeltasInput): Promise<ContinuityDeltas>`

**Input:**
```typescript
interface ContinuityDeltasInput {
  homeTeamName: string;
  awayTeamName: string;
  season: number;
  week: number;
}
```

**Output:**
```typescript
interface ContinuityDeltas {
  olContinuityDelta: number | null;
  dlContinuityDelta: number | null;
  dbContinuityDelta: number | null;
}
```

## Integration

**Consumer:** `apps/web/app/api/picks/route.ts` (lines 378-420)

**Flow:**
1. For each pick on an NFL/NCAAF game:
   - Call `computeContinuityDeltas({homeTeamName, awayTeamName, season, week})`
   - Falls back to existing stored factorBreakdown values if present
   - Falls back to **null** (NOT hardcoded constants)
2. Return delta in pick's `factorBreakdown.continuityDeltas` and `factorBreakdown.{olContinuityDelta, dlContinuityDelta, dbContinuityDelta}`

## Coverage & Status

**Current Data:**
- NFL: Depth charts ingested weekly (source: nflverse)
- NCAAF: Not yet integrated (depth_chart_entries is single-sport model)
- Current week (if available): See neon `SELECT MAX(week) FROM depth_chart_entries WHERE season = 2026`

**Null Handling:**
- Teams with no depth chart data → null
- Teams with only 1 snapshot → null
- Missing position group starters → null for that group (OL/DL/DB independent)

## Fallback Behavior

The picks route's old hardcoded fallbacks (-0.08 / 0.0 / -0.05) are **completely replaced** by this computation. Fields emit null when data is absent, enabling honest signal coverage reporting downstream.

## Testing

**File:** `packages/prediction-engine/src/continuity-deltas.test.ts`

**Coverage:**
1. No data → null on all groups
2. Partial retention (3/4 starters) → correct delta (-0.25)
3. Independent position groups (OL/DL/DB tracked separately)
4. Game-level averaging (home + away delta / 2)

**Run:**
```bash
npm run test continuity-deltas
```

## Known TODOs

1. **Week Resolution:** Currently hardcoded to week=1. Must resolve actual NFL/NCAAF week from game commenceTime.
2. **NCAAF Support:** Depth charts exist only for NFL currently; NCAAF integration requires separate table or schema extension.
3. **Performance:** For high-concurrency pick serving, consider caching depth chart snapshots in memory or Redis rather than querying per-pick.
