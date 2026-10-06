# Free Spine Investigation: Why No Odds Are Produced

**Date:** 2026-09-29  
**Scope:** Free multi-source odds/scores path analysis  
**Finding:** The free spine is structurally blocked at the clearance gate.

---

## Executive Summary

The free odds spine reports success (HTTP 200, IngestionRun SUCCESS) but produces **zero odds rows**. The root cause is a **runtime clearance gate blockade**: all secondary free sources (henrygd-ncaa, mlb-statsapi, balldontlie-nba, nhl-web-api) are **not registered in the source-rights-registry**, so `checkClearance()` returns `SOURCE_NOT_REGISTERED` and every fetch is denied before any network call is made.

The health check route (`free-spine-health`) measures **process liveness** (HTTP 200, cron completion) rather than **data freshness** (rows written). This structural mismatch allows the platform to report "healthy" while the free spine writes nothing.

---

## Ranked Causes

### 1. Secondary Free Sources Are Registry-Gated (BLOCKING)

**Evidence:**
- `apps/web/lib/data-sources/multi-source-scores.ts:168-192` — `checkSecondaryClearance()` calls `checkClearance()` for every secondary source before fetching
- `apps/web/lib/data-sources/multi-source-scores.ts:187-191` — when clearance is denied, the function returns `games: []` with error `${source}: clearance-denied [${blockCodes}]`
- `apps/web/lib/scraping/clearance-engine.ts:96-100` — `checkClearance()` returns `SOURCE_NOT_REGISTERED` block when the source_id is not in the registry
- `apps/web/lib/data-sources/source-router.ts:237-247` — henrygd-ncaa, mlb-statsapi, balldontlie-nba, nhl-web-api all have `cleared: false` and note "GSE-SEC-050: runtime checkClearance gates all fetches"
- **Grepped source-rights-registry.ts for these source IDs: zero matches** — they do not exist in the registry

**Observable Evidence:**
- Check the `source-rights-registry.ts` file for entries with source_id matching "henrygd-ncaa", "mlb-statsapi", "balldontlie-nba", or "nhl-web-api" — absence confirms they are not registered.
- Run the free-spine-health cron and inspect the `live` array in the response — every sport will show `used: null` and errors containing "clearance-denied" for secondary sources.

---

### 2. Health Check Measures Process Liveness, Not Data Freshness (STRUCTURAL)

**Evidence:**
- `apps/web/app/api/cron/free-spine-health/route.ts:29-72` — the route probes each sport via `fetchScoresMultiSource()` and counts `sportsWithGames` (line 70)
- `apps/web/app/api/cron/free-spine-health/route.ts:101-116` — it writes an IngestionRun with `oddsInserted: 0` (line 104) and `failed: probeFailed` (line 105)
- `apps/web/app/api/cron/free-spine-health/route.ts:170-191` — it returns HTTP 503 only when `probeFailed` is true (all sports returned zero games AND hard errors)
- `apps/web/app/api/cron/free-spine-health/route.ts:133-139` — `probeFailed` is defined as `sportsWithGames === 0 && hardFailures === live.length` — if ANY sport returns games (even zero odds), probeFailed is false
- `apps/web/lib/data-sources/free-ingestion-run.ts:4-11` — the helper's purpose is explicitly to write an honest SUCCESS/FAILED run so the existing probe recovers "without inventing odds"

**Observable Evidence:**
- Call the `/api/ops/public-surface-truth` endpoint — it reports `/oddsInserting/lastSuccessAt = null` and `/oddsInserting/oddsInserted = null` while `/free-spine-health` returns HTTP 200.
- Inspect recent IngestionRun rows in the database — free-spine runs show `status: SUCCESS` with `oddsInserted: 0`.

---

### 3. ESPN Public API Is Cleared But Does Not Provide Odds (EXPECTED)

**Evidence:**
- `apps/web/lib/data-sources/source-router.ts:88-98` — espn-public-api has `cleared: true` and `needs: ["scores", "results", "standings", "schedules", "rankings", "player_stats", "team_stats"]` — **odds is NOT in the needs array**
- `apps/web/lib/data-sources/espn-scores.ts:1-7` — the adapter is explicitly "ESPN public scoreboard adapter — FREE, cleared, FACTS ONLY" and "must never be used for commercial display/storage without a license"
- `apps/web/lib/data-sources/multi-source-scores.ts:67-83` — the score source chain for all sports is either `["espn-public-api"]` alone or `["espn-public-api", <secondary>]` — ESPN is the primary but never provides odds
- `packages/ingestion-pipeline/src/refresh-odds.ts:198-202` — the free paths are explicitly "THE_ODDS_API_KEY", "Rundown free dual-path", and "ESPN public odds (zero keys) — tertiary, never invents quotes"

**Observable Evidence:**
- Check the PLATFORM_SOURCES entry for espn-public-api — the `needs` array does not include "odds".
- Run a direct ESPN scoreboard fetch (e.g., `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`) — the response contains scores but no betting odds.

---

### 4. Board Fill Pipeline Always Runs But Odds Path No-Ops Without Keys (DESIGNED)

**Evidence:**
- `apps/web/app/api/cron/free-spine-health/route.ts:149-162` — the route calls `runBoardFillPipeline()` with `hasOdds || true /* always attempt signal path */`
- `packages/ingestion-pipeline/src/board-fill.ts:28-42` — `runBoardFillPipeline()` calls `seedGamesFromEspn()` (always runs), then `refreshOdds()` (soft-fails without keys), then `generateSignalSlate()` (runs independently)
- `packages/ingestion-pipeline/src/refresh-odds.ts:207-226` — when both THE_ODDS_API_KEY and RUNDOWN_API_KEY are absent, `processKey` becomes `"espn-free-path"` but ESPN does not provide odds
- `packages/ingestion-pipeline/src/seed-games-from-espn.ts:1-4` — the seed function explicitly "Upsert upcoming Game rows from free ESPN scoreboards" and "Never invents odds"

**Observable Evidence:**
- Inspect the boardFill response in the free-spine-health cron output — `odds.ok` will be false with note indicating absent keys, while `seed.upserted` may be non-zero.
- Check the Game table — rows exist (seeded from ESPN) but the Odds table is empty.

---

## The Single Most Likely Reason

**The free spine reports success without producing odds because all secondary free sources are blocked at the runtime clearance gate (SOURCE_NOT_REGISTERED), and the health check measures process completion rather than data output.**

This is a **compound structural failure**:
1. The secondary free sources (henrygd-ncaa, mlb-statsapi, balldontlie-nba, nhl-web-api) exist in the source-router as candidates but are not registered in source-rights-registry.ts, so `checkClearance()` denies every fetch.
2. The free-spine-health route returns HTTP 200 and writes IngestionRun SUCCESS as long as the cron completes without crashing, even when all sports return zero odds due to clearance denials.
3. ESPN public API is cleared and functional for scores, but it does not provide odds — the free spine has no working odds source.

---

## Configuration State

**Cleared Free Sources (per source-router.ts):**
- nflverse: cleared=true, needs include scores/results/player_stats (NFL only)
- espn-public-api: cleared=true, needs include scores/results/standings/schedules/rankings/player_stats/team_stats (all sports) — **NOT odds**
- open-meteo: cleared=true, needs include weather (all sports)

**Gated Free Candidates (per source-router.ts):**
- henrygd-ncaa: cleared=false, needs include scores/results/standings/rankings/schedules/play_by_play/team_stats/player_stats (NCAAF/NCAAB)
- mlb-statsapi: cleared=false, needs include scores/results/schedules/standings/player_stats/team_stats (MLB)
- balldontlie-nba: cleared=false, needs include scores/results/player_stats/team_stats/standings (NBA)
- nhl-web-api: cleared=false, needs include scores/results/schedules/standings (NHL)

**Environment Variables Required (per docs/ops/OPERATOR.md):**
- THE_ODDS_API_KEY: optional (paid odds)
- RUNDOWN_API_KEY: optional (paid odds)
- No env vars required for ESPN public API or the secondary free sources

---

## Recommended Next Steps

1. **Register secondary free sources in source-rights-registry.ts** — Add entries for henrygd-ncaa, mlb-statsapi, balldontlie-nba, and nhl-web-api with appropriate status (likely `approved_public_logged_off` for public APIs, or `vendor_candidate` if terms review is needed).
2. **Update health check to measure data freshness** — Modify free-spine-health to return HTTP 503 when `oddsInserted === 0` across all sports, not just when probe fails completely.
3. **Clarify ESPN's role in documentation** — Make explicit that ESPN public API is scores-only and never provides odds; the free spine requires at least one odds source to be functional.
4. **Add odds-specific coverage to freeCoverageMatrix** — Extend the matrix to track "odds" coverage separately from "scores" so operators can see at a glance which sports have free odds sources.

---

## File References

- `apps/web/lib/data-sources/multi-source-scores.ts:168-192` — Secondary clearance gate
- `apps/web/lib/data-sources/source-router.ts:237-247` — Gated free candidates
- `apps/web/lib/scraping/clearance-engine.ts:96-100` — SOURCE_NOT_REGISTERED block
- `apps/web/lib/scraping/source-rights-registry.ts` — Registry (missing secondary sources)
- `apps/web/app/api/cron/free-spine-health/route.ts:29-72` — Health probe logic
- `apps/web/lib/data-sources/free-ingestion-run.ts:4-11` — IngestionRun helper purpose
- `packages/ingestion-pipeline/src/board-fill.ts:28-42` — Board fill pipeline
- `packages/ingestion-pipeline/src/refresh-odds.ts:207-226` — Odds refresh logic

## Hermes addendum — two things this report missed (2026-09-29)

I spot-checked the three headline claims against the source and all three hold:
`probeFailed` at free-spine-health/route.ts:72 does key on games rather than odds;
line 133-146 only 503s when EVERY sport hard-fails; and ESPN's `needs` array at
source-router.ts:95 lists scores/standings/rankings/player_stats/team_stats with no
"odds", so a cleared free source still cannot supply a price.

Two further defects, both in code this report already cites:

1. **A dead conditional hides the real gate.** free-spine-health/route.ts:153 reads
   `if (hasOdds || true /* always attempt signal path */)`. The `|| true` makes
   `hasOdds` -- and therefore `resolveOddsApiKey()`/`resolveRundownApiKey()` at line
   152 -- unreachable as a condition. The board fill therefore always runs, and the
   route's own comment calls the no-key odds path "honest". It is honest, but the
   branch that would have told an operator WHY it no-opped has been short-circuited,
   so nothing in the response distinguishes "no keys configured" from "keys present
   and the upstream returned nothing".

2. **`oddsInserted` is a hardcoded literal, not a measurement.**
   free-spine-health/route.ts:104 passes `oddsInserted: 0` into `recordFreeIngestionRun`
   unconditionally, while `gamesUpserted: sportsWithGames` beside it IS measured. The
   durable IngestionRun row therefore asserts zero odds even on a run that inserted
   some, and asserts zero on a run that inserted none — the column carries no
   information. This is the same defect class as SURF-13: a field that looks like a
   measurement and is actually a constant, and it is on the row /api/health reads.

Together these mean the free spine cannot currently report a partial odds failure.
It reports success when games arrive and nothing else, and it reports success when
odds arrive and games do not. Fixing the observability is a prerequisite for the
odds blackout being diagnosable from the outside at all.
