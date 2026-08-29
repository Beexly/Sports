# Settlement identity dossier — 2026-08-26

**The defect:** the same physical game exists as up to three `Game` rows under
different `externalId` conventions — provider hash (Odds API / TheRundown),
`espn:{oddsKey}:{id}` (ESPN odds fallback), `espn:{short}:{id}` (ESPN seeder).
The paid settlement path matches scores by externalId equality only, so picks
attached to a row in the "wrong" namespace stay PENDING forever → 82 of 2,020
commenced picks overdue → settlement health CRITICAL → calibration eligibility
RED (leg 1) → PROVEN blocked.

**The fix (shipped on this branch):**
1. `settle-picks` route: after the paid pass, an **overdue recovery pass** runs
   the free-path settler (`runFreePathSettlement`) with a new `overdueOnly`
   option — team-token + date matching heals overdue picks regardless of which
   row convention they hang on. Fires only when the health probe reports
   overdue picks. This retroactively drains the existing 82 on the next cron
   after deploy.
2. `seedGamesFromEspn`: **match-before-create** — canonical-espn sibling-id
   check + team/time match (`matchGameByTeamsAndTime`, with an ambiguity guard
   for doubleheaders/same-city pairs) before minting an `espn:{short}:{id}` row.
3. `processSport` ESPN fallback: **`remapOrKeepFeedRows`** — fallback events
   remap onto existing rows by team+commence (the NFL-preseason pattern,
   generalized); unmatched events keep their espn ids.

Deliberately NOT done: merging/deleting duplicate rows (frozen slate-commitment
Merkle receipts make historical row identity immutable; recovery settles picks
in place), and no alias guessing ("Oakland" vs "Athletics" is healed by the
recovery pass's alias table in `free-settlement.ts`, never by the dedup matcher).

The four lane reports below are the verified file:line map this fix was built
from (4-reader investigation, 2026-08-26). Lane order: settlement path map,
game writers, identity utilities, blast radius.

**PRE-FIX SNAPSHOT NOTICE:** the lane reports were captured at `bb0e7dfc`
(main, before this branch's fix landed). Statements inside them like "no
dedup/merge utility exists" or "no fix code exists" describe THAT snapshot —
they are the evidence the fix was designed from, superseded by the fix summary
above wherever the two disagree.


## Lane report: agent0

# Settlement lane — end-to-end fact map

## Stage 0: path selection (apps/web/app/api/cron/settle-picks/route.ts)

- Cron fires hourly at :20 with **no query params**: `vercel.json:20-23` (`"path": "/api/cron/settle-picks", "schedule": "20 * * * *"`; same in `apps/web/vercel.json:21`). So neither `?sport` nor `?path=free` is ever set on scheduled runs.
- Path law: free path runs ONLY when `THE_ODDS_API_KEY` is absent/blank or `?path=free` is passed — `route.ts:46,51,56`; `apps/web/lib/settlement/path-select.ts:9-14` ("Present + deactivated does NOT free-path"). CLAUDE.md lists `THE_ODDS_API_KEY` as a required env var, and the prompt's observation that hash rows update at odds-refresh times implies the key is live in prod ⇒ the scheduled cron takes the **paid path**. (Prod env not directly verifiable from the repo — flagged.)
- Paid branch: loops `SUPPORTED_SPORTS` → `settleSport()` (`route.ts:120-122,150-153`), then `backfillStaleSettlement` (`route.ts:169,256-264`).
- Free branch: `persistFreeScores` (`route.ts:68`) → `runFreePathSettlement` (`route.ts:69-73`) → `backfillStaleSettlement` (`route.ts:74`).
- `backfillStaleSettlement` is the only free-source stage that runs on BOTH paths.

## Stage 1: paid settlement — settleSport (packages/ingestion-pipeline/src/settle-sport.ts)

- Score fetch: The Odds API `getScores(sport.key, daysFrom=3)` — `settle-sport.ts:94,187`. Scores older than 3 days are permanently invisible to this stage (`settle-sport.ts:2-4` route comment `route.ts:49-50` confirms: "Paid getScores is daysFrom=3 and cannot grade older overdue picks").
- Normalization: `normalizeScores` passes the feed id through verbatim — `externalId: score.id` at `packages/data-ingestion/src/normalizer.ts:277`. The Odds API ids are the 32-hex hash convention (convention (a)).
- **Matching is strict externalId equality, nothing else**: `db.game.findUnique({ where: { externalId: score.externalId } })` — `settle-sport.ts:243-246`. No team-name matching, no commence-time matching, no normalization, no fallback. `if (!game) continue;` (`settle-sport.ts:247`).
- Picks are settled only via `include: { picks: { where: { result: "PENDING" } } }` on that one matched row (`settle-sport.ts:245,447`).
- **Therefore**: Game rows with `externalId = espn:baseball_mlb:<id>` (built at `packages/data-ingestion/src/espn-odds-client.ts:361`, `id: \`espn:${sportKey}:${ev.id}\``) or `espn:mlb:<id>` (built at `packages/data-ingestion/src/espn-schedule-seed.ts:121`, upserted on externalId at `packages/ingestion-pipeline/src/seed-games-from-espn.ts:79-81`) can **never** be matched by paid settlement. When duplicates exist, the score lands on the hash row (FINAL, `settle-sport.ts:278-288`) while the espn:* duplicates — and any PENDING picks attached to them — stay SCHEDULED/PENDING. After 3 days even the hash row leaves the paid window.
- Sole exception to id-equality: NFL preseason remap uses team+commence matching (`remapPreseasonRows`, `settle-sport.ts:200-212`) — NFL only.
- Cross-path guard: refuses to overwrite/grade when the SAME row already holds a different FINAL score (`settle-sport.ts:265-276,356`). Note: because the three conventions are **different rows**, cross-convention disagreement never trips this guard — each duplicate carries its own independent score state.

## Stage 2: persistFreeScores (apps/web/lib/data-sources/free-score-persist.ts) — free path only

- Loads Game rows directly (not picks): sport + `commenceTime >= now-21d` + (`resultFetched:false` OR `status IN (SCHEDULED,LIVE)` OR `homeScore:null`), `take: 300`, **no orderBy** (`free-score-persist.ts:152-172`).
- Matching is convention-agnostic team-token + date ±48h (`free-score-persist.ts:194-208`, `finalMatchesGame` `:73-93` using `expandTeamMatchTokens`/`teamTokensMatch` from free-settlement.ts) — so in principle it could stamp scores on all three row conventions, including duplicates with no picks.
- **But every write is currently dead code**: before each `game.updateMany` it calls `checkClearance({ source_id: "espn-public-api", intents: ["storage"] })` and `continue`s on denial (`free-score-persist.ts:216-224`). The registry sets `storage_allowed: false` for espn-public-api (`apps/web/lib/scraping/source-rights-registry.ts:242`); clearance blocks `STORAGE_NOT_ALLOWED` (`apps/web/lib/scraping/clearance-engine.ts:230-236`) and `allowed = blocks.length === 0` (`clearance-engine.ts:333`). ⇒ `persistFreeScores` matches but never updates; `gamesUpdated` is deterministically 0. (Static conclusion from pure code + static registry; not observed at runtime — flagged.) The comment at `free-score-persist.ts:211-215` states this is intentional (GSE-SEC-051).
- Secondary sources (mlb-statsapi, balldontlie, nhl-web, henrygd) are all clearance-denied too — no registry row → `SOURCE_NOT_REGISTERED` (`multi-source-scores.ts:156-170,182-187`). So "trusted finals" are ESPN-only ⇒ every final is `SINGLE_SOURCE` (`free-settlement.ts:73-74`); the dual-source CONFIRMED tier can't occur.

## Stage 3: runFreePathSettlement (apps/web/lib/data-sources/free-settlement-runner.ts) — free path only

- **Pick-driven, not game-driven**: loads PENDING picks per sport via the game relation, `take: 1500` (`free-settlement-runner.ts:195-225`).
- Matching **never consults externalId or Game.status**: pick's `game.homeTeamName/awayTeamName/commenceTime` are matched against fetched ESPN finals by expanded team tokens + `daysApart ≤ 2` (`free-settlement.ts:287-289`, `finalMatchesPick` `:250-258`, `orientToPickHome` `:261-275`, token expansion `:198-240`, containment match `:122-128`). So this stage CAN settle a pick regardless of which duplicate row it hangs on.
- On settle it writes score + `status: "FINAL"` + `resultFetched` **only to the pick's own game row** (`row.game.id`, `free-settlement-runner.ts:391-401`), inside a transaction with outbox + post-settlement work (`:336-403`). Duplicate rows of the same physical game with no PENDING pick are never touched by this stage.
- Rows this stage can never reach: any game with no PENDING pick; picks beyond the 1500/sport cap; picks whose team strings fail token match (→ `NO_FINAL`/`ORIENT_FAIL`, sampled in `matchDebug` `:497-521`); picks whose commence day's scoreboard wasn't fetched (below).

## "overdue-first-stp" and "free-path-date-targeted-scores"

Both are deploy-lag feature markers in `apps/web/app/api/ops/public-surface-truth/route.ts:56,58` (`MAIN_FEATURE_MARKERS`). The actual mechanisms:

- **overdue-first-stp**: `free-settlement-runner.ts:227-248` sorts loaded picks by `stpLoadPriority` (overdue ≥ graceHours(6) → 1,000,000-band; in-grace → 100,000; future → lowest; `apps/web/lib/settlement/stp-clearance.ts:236-240`) and, when an overdue subset exists, processes **only** the overdue slice (`:238-248`). After grading, `planClearanceWaves` classifies residuals (`free-settlement-runner.ts:565-568`; `stp-clearance.ts:169-211`): `NO_TRUSTED_FINAL`/`OVERDUE_NO_SCORE` → `REPROCESS` (`stp-clearance.ts:127-136`) — which is **a report only; nothing executes REPROCESS** beyond the next cycle repeating the identical fetch+match.
- **free-path-date-targeted-scores**: `uniqueScoreboardDates` derives ESPN `YYYYMMDD` keys from pending picks' commence times — past/today only, most-recent-first, capped at `maxDays: 21` distinct days (`apps/web/lib/data-sources/settlement-score-dates.ts:36-81`); `fetchScoresMultiSource` then fetches those dated ESPN boards (`multi-source-scores.ts:242-273`), because the undated board is "now"-only (`settlement-score-dates.ts:5-9`).

**Why they still miss the stuck rows:**

1. Both live exclusively inside the free path. With `THE_ODDS_API_KEY` present, the scheduled cron never enters that branch (`route.ts:56`; no `?path=free` in `vercel.json:20-23`); `?path=free` is a manual owner drain only (`route.ts:48-51`; `docs/data/LAUNCH_RUNBOOK.md:87,102`).
2. Even when the free path runs, STP is prioritization, not a new matcher: an overdue pick whose final can't be fetched or token-matched loops `REPROCESS` forever.
3. Date-key gaps: keys come from the pick's game row `commenceTime` in **UTC** (`toEspnDateKey`, `settlement-score-dates.ts:13-20`); ESPN scoreboard days are (per code comments, not verified against ESPN) local-slate-based — a game commencing 00:00–05:00Z can live on the previous ESPN day's board, whose key is fetched only if another pending pick commenced that UTC day. Pending picks spanning >21 distinct days silently drop the oldest days (`:61-69`) → permanent `NO_FINAL` for those.
4. Free settlement only repairs rows that carry the PENDING pick — duplicate espn:*/hash siblings stay SCHEDULED regardless, and the only stage that would fix pickless rows (`persistFreeScores`) is storage-clearance-blocked (Stage 2).

## Stage 4: backfillStaleSettlement (apps/web/lib/data-sources/settle-backfill.ts) — both paths

- Query: `result: "PENDING"` AND **`isPublished: true`** AND `game.commenceTime < now - 3d`, oldest first, `take: 50` (cap; `settle-backfill.ts:35-36,129-136`).
- Same team+date grader (`buildTrustedFinals(games, [])` — ESPN-only — + `settlePendingPicks`, `:208-221`), same date-key derivation with `maxDays: 21` (`:197-200`). Writes to the pick's own game row (`:294-304`).
- Rows it can never reach: **unpublished** PENDING picks (`:132`); picks younger than 3 days; anything past the 50-pick cap per cycle across all sports; and everything in the Stage-3 date-key/token-match miss set. Unresolved picks are reported (`:233-243`) but nothing escalates beyond `olderThanGrace: ageDays > 14`.

## Net fall-through for a SCHEDULED game + PENDING pick (default prod = paid path)

1. `settleSport`: Odds API hash id ≠ `espn:*` externalId → row never found (`settle-sport.ts:243-247`); pick invisible.
2. `persistFreeScores` / `runFreePathSettlement`: never run on paid path (`route.ts:56-106` free branch only).
3. Age 6h–3d: **no stage at all** can settle a pick on an espn:* row (backfill requires `commenceTime < now-3d`, `settle-backfill.ts:125,133`). This is the exact window where overdue (grace = 6h, `settlement-health.ts:58,145`) accrues.
4. Age >3d: only `backfillStaleSettlement`, throttled to 50/cycle, `isPublished` only, ESPN-team+date match — the single thread by which these picks can ever settle on the paid path.

## Overdue accounting (for the 82-CRITICAL number)

- `loadSettlementHealth`: overdue = `isPublished:true`, `modelVersion` not containing "seed", `result: "PENDING"`, `game.commenceTime < now - 6h` (`apps/web/lib/performance/settlement-health.ts:143-157`); CRITICAL at ≥5 (`:55,87`). Note asymmetry: health counts only published picks, and backfill also only settles published picks — but the free runner and settleSport settle regardless of `isPublished`.

## Not verified

- Prod env values (`THE_ODDS_API_KEY` presence, deployed SHA vs feature markers) — inferred from CLAUDE.md + observed update-time fingerprints only.
- ESPN `dates=YYYYMMDD` timezone semantics (Eastern-slate vs UTC) — the UTC-key/board-day mismatch is a code-level risk, not a confirmed prod failure.
- Whether the 82 overdue picks hang on espn:* rows vs hash rows specifically — requires prod DB, outside this lane's read scope.

Key files: `/home/user/Sports/apps/web/app/api/cron/settle-picks/route.ts`, `/home/user/Sports/packages/ingestion-pipeline/src/settle-sport.ts`, `/home/user/Sports/apps/web/lib/data-sources/free-settlement-runner.ts`, `/home/user/Sports/apps/web/lib/data-sources/free-settlement.ts`, `/home/user/Sports/apps/web/lib/data-sources/free-score-persist.ts`, `/home/user/Sports/apps/web/lib/data-sources/settle-backfill.ts`, `/home/user/Sports/apps/web/lib/data-sources/settlement-score-dates.ts`, `/home/user/Sports/apps/web/lib/settlement/stp-clearance.ts`, `/home/user/Sports/apps/web/lib/scraping/source-rights-registry.ts`, `/home/user/Sports/apps/web/lib/scraping/clearance-engine.ts`, `/home/user/Sports/apps/web/lib/performance/settlement-health.ts`, `/home/user/Sports/apps/web/lib/data-sources/score-verification.ts` (pure cross-check helpers; `lookupFinal` exact date+token equality `:79-91` — no caller in the settlement stages above).

## Lane report: agent1

FINDINGS — Game-row WRITERS (create/upsert), externalId conventions, invokers, prod schedule

## A. The only two production create/upsert sites

Repo-wide grep for `.game.(create|upsert|createMany)` yields exactly 6 hits; only 2 are production code:

**W1 — `packages/ingestion-pipeline/src/process-sport.ts:524`** — `db.game.upsert({ where: { externalId } … })`; create writes `externalId, sportId, homeTeamName, awayTeamName, commenceTime`; update branch (lines 533‑537) overwrites teamNames+commenceTime every cycle. `externalId` = `event.id` verbatim and team names = `event.home_team/away_team` verbatim via `DataNormalizer.normalizeGames` (`packages/data-ingestion/src/normalizer.ts:40‑47`) — no normalization/cross-mapping of ids or team names anywhere. The convention written therefore depends on which provider filled `events` inside the same function:
1. **Odds API primary** (`process-sport.ts:268`, `client.getOdds`) → 32‑hex hash ids; team-name style is Odds API pass-through. Runs only when the key is not a sentinel (`oddsKeyIsSentinel`, lines 252‑257: empty / `"rundown-free-path"` / `"espn-free-path"` / `"absent"`).
2. **NFL preseason merge** (`process-sport.ts:271‑317`): `remapPreseasonRows` rewrites preseason feed rows' `id` to an **existing** `Game.externalId` (`packages/data-ingestion/src/nfl-preseason-map.ts:99‑103`) — reuses whatever convention already exists (hash or `espn:nfl:*`). July/August only (`nfl-preseason-map.ts:30‑31`).
3. **TheRundown full replace** (`process-sport.ts:367‑381` → `fetchRundownEventsForSport`): condition = rundown key present (any of 16 env aliases, `packages/data-ingestion/src/rundown-client.ts:58‑76`) AND `events.length === 0` (primary absent/failed/empty/spend‑guard‑refused). Id = `String(e.event_id ?? e.id ?? e.eventId)` raw pass-through (`rundown-client.ts:125,168,179`); team names from `teams[].name` / `home_team` fallbacks (`rundown-client.ts:128‑139`). **Not verifiable from code** that these ids are 32‑hex or that names are city-short ("San Francisco") — both are feed pass-through.
4. **Rundown thin-fill** (`process-sport.ts:385‑398`): merges bookmakers only; primary event ids preserved (`packages/data-ingestion/src/odds-event-merge.ts:108‑136`) — creates no new convention.
5. **ESPN public odds tertiary** (`process-sport.ts:409‑431` → `fetchEspnOddsForSport`): condition = `events.length === 0` after BOTH Odds API and Rundown (no keys, key exhausted/429/failed, or Rundown empty/429‑cascade). Id = `` `espn:${sportKey}:${ev.id}` `` with **canonical odds sport key** (`packages/data-ingestion/src/espn-odds-client.ts:361`) → `espn:baseball_mlb:401816675`; team names = ESPN scoreboard `team.displayName ?? team.name` (`espn-odds-client.ts:171`) — full display names. **This is how convention (b) rows are created by the same upsert that otherwise writes hash rows.**
Guards before the upsert: freshness gate + quiet-board early return (`process-sport.ts:455‑513`) can prevent any write.

**W2 — `packages/ingestion-pipeline/src/seed-games-from-espn.ts:78`** — `db.game.upsert` keyed on `externalId`; ids built as `` `espn:${short}:${id}` `` with the **ESPN short slug** (`packages/data-ingestion/src/espn-schedule-seed.ts:121`) → `espn:mlb:401816675` — convention (c). Team names = ESPN `team.displayName` full names (`espn-schedule-seed.ts:113`). Window: games from now−3h to now+504h (21d) (`seed-games-from-espn.ts:24‑28,42`). No lookup against existing hash/`espn:baseball_mlb` rows — always its own row.

## B. Non-production creators
- `packages/db/prisma/seed.ts:1230` — `db.game.create`, ids `seed-pick-…` (db:seed only).
- `scripts/integration/db-smoke.mjs:40`, `scripts/integration/settlement-outbox-acceptance.mjs:128`, `packages/ingestion-pipeline/src/__tests__/slate-opening-reader.integration.test.ts:88` — test harnesses.
- `apps/web/lib/ingestion/historical-games.ts:102` writes `historicalGame` (different table), via `/api/cron/backfill-historical-games`.

## C. Update-only paths (never create; where scores land)
`packages/ingestion-pipeline/src/settle-sport.ts:278` (`db.game.update`), `apps/web/lib/data-sources/free-settlement-runner.ts:392` (`tx.game.update`), `apps/web/lib/data-sources/settle-backfill.ts:295`, `apps/web/lib/data-sources/free-score-persist.ts:227` (`db.game.updateMany`), `packages/ingestion-pipeline/src/generate-signal-slate.ts:314`, `packages/data-ingestion/src/context-enrichment.ts:402` (opening lines).

## D. Invocation graph (who triggers the writers)

| Trigger | Writers reached | Condition |
|---|---|---|
| `/api/cron/refresh-odds` (`apps/web/app/api/cron/refresh-odds/route.ts:98`) | W1 per in-season sport via `refreshOdds()` (`packages/ingestion-pipeline/src/refresh-odds.ts:159‑208`); then `generateSignalSlate` (route.ts:106) → W2 auto-seed **only if** `db.game.count` in [now, +504h] == 0 (`generate-signal-slate.ts:105‑122`) | `processKey = realKey \|\| "rundown-free-path" \|\| "espn-free-path"` (`refresh-odds.ts:131‑132`); with no odds+rundown key the route short-circuits to signal-only slate (route.ts:61‑72), still able to hit W2 auto-seed |
| `/api/cron/board-fill` (route → `runBoardFillPipeline`) | **W2 unconditionally** (`packages/ingestion-pipeline/src/board-fill.ts:37`), then W1 via `refreshOdds` (board-fill.ts:40), then slate with `skipSeed:true` (board-fill.ts:43‑47) | always |
| `/api/cron/free-spine-health` | **W2 + W1 again** — route always runs `runBoardFillPipeline` (`apps/web/app/api/cron/free-spine-health/route.ts:146‑148`; the gate is literally `hasOdds \|\| true`) | always |
| `/api/cron/generate-signal-slate` (route.ts:19) | W2 auto-seed | only when Game table empty in 21d window |
| `/api/cron/autonomy-cycle` | indirect W1/W2 by HTTP-invoking `refresh-odds` and `free-spine-health` (`apps/web/lib/autonomy/safe-cron-targets.ts:13‑19`) | `AUTONOMY_EXECUTE=true` |
| `POST /api/admin/trigger-refresh` (`apps/web/app/api/admin/trigger-refresh/route.ts:46`) | W1 | manual, ADMIN role; 503 without `THE_ODDS_API_KEY` (route.ts:28‑31); can still fall through to Rundown/ESPN inside processSport if the paid call fails |
| `workers/data-refresh/src/index.ts:62` | W1 every 30 min (`REFRESH_INTERVAL_MS`, index.ts:31) | requires `THE_ODDS_API_KEY` (index.ts:39‑40); deployed only via `docker/oracle-vps/compose.yml:78‑79` — **cannot verify from code whether this VPS worker runs in prod** |

## E. Production schedule facts
`vercel.json` (root and `apps/web/vercel.json` are identical): refresh-odds `*/15`, board-fill `2,17,32,47`, generate-signal-slate `5,20,35,50`, free-spine-health `0 */2`, settle-picks `20 * * * *`, autonomy-cycle `7,22,37,52`. `.github/workflows/external-cron.yml:4‑12` states Vercel **Hobby caps crons at once per day** and that as of 2026‑08‑10 the production scheduler is **Vercel-only** (Actions may sit idle). If Actions were enabled: board-fill hourly :10, signal-slate hourly :25, free-spine-health `5 */2`, settle :15; its `refresh-odds` job is **dead on schedule** (guards on `*/30 * * * *` never declared — documented at `apps/web/__tests__/github-workflow-contract.test.ts:201‑208`). Once-daily Hobby collapse is consistent with observed daily ~04:02Z (`espn:mlb:*` via board-fill W2) / ~04:15Z (`espn:baseball_mlb:*` via W1's ESPN tertiary, implying Odds API+Rundown were empty/exhausted at that tick) — but actual Vercel plan behavior is **not verifiable from the repo**.

## F. Root-cause-relevant structural facts
- Both upserts key on `externalId` alone; the schema has no uniqueness across (sport, teams, commenceTime), so the three conventions can never collide and each writer mints its own row for the same physical game.
- No code anywhere translates `espn:mlb:X` ↔ `espn:baseball_mlb:X` ↔ hash id, and no team-name normalization exists between ESPN `displayName` and Odds API/Rundown pass-through names.
- board-fill and free-spine-health each run BOTH writers in the same tick, guaranteeing convention (c) rows and, when paid/rundown feeds are empty at that moment, convention (b) rows minutes later — matching the observed 04:02/04:15 split.

Unverified items flagged: Rundown event-id format and team-name style (feed pass-through, no fixture in repo); which vercel.json Vercel actually reads (both identical); whether the Oracle-VPS BullMQ worker is live; actual Vercel Hobby cron-collapse timing.

## Lane report: agent2

FACTUAL REPORT — EXISTING IDENTITY / REMAP / DEDUP UTILITIES (lane: identity-utils)

## 1. Game-remap engines that match by (teams + commenceTime) — the reusable pattern

**A. NFL preseason remap — `packages/data-ingestion/src/nfl-preseason-map.ts`** (pure, no I/O)
- `nflTeamsMatch()` :55-63 — exact normalized-name equality OR last-token nickname match (token ≥4 chars), built on `normalizeComparableText` (imported :14). Absorbs "Kansas City Chiefs" vs "Chiefs".
- `matchPreseasonRowToExistingGame()` :65-83 — matches a feed row to an existing game by home-team match + away-team match + closest `commenceTime` within `NFL_PRESEASON_COMMENCE_MATCH_MS` = 18h (:23).
- `remapPreseasonRows()` :85-106 — rewrites feed row `id` to the matched existing `externalId` (:101) and `sport_key` to canonical (:102); one-claim-per-game via `claimed` set (:91,94,98); unmatched are counted and dropped.
- `mergeFeedRowsById()` :108-120 — union of feed rows, primary wins on id collision.
- Tests: `packages/data-ingestion/src/__tests__/nfl-preseason-map.test.ts` (nickname match :47-49, remap onto `espn:nfl:401772001` :53-60, time-window rejection :74-77, merge :83-86).
- WIRED (only for NFL preseason, July–Aug window):
  - Odds path: `packages/ingestion-pipeline/src/process-sport.ts:271-317` — candidates = existing DB `Game` rows (sport=NFL, -2d..+21d, :277-291) PLUS the primary feed's normalized games (:299), then `remapPreseasonRows` :301, `mergeFeedRowsById` :310.
  - Scores path: `packages/ingestion-pipeline/src/settle-sport.ts:188-219` — same remap against all NFL `Game` rows (:191-205), merged into scores :212.
- NOT wired for any other sport or for cross-convention (hash vs `espn:*`) reconciliation.

**B. Thin-coverage odds merge — `packages/data-ingestion/src/odds-event-merge.ts`** (pure)
- `eventTeamsMatch()` :34-42 — same rule as `nflTeamsMatch` (comment :33 says so), duplicated implementation.
- `matchSecondaryEventToPrimary()` :60-81 — team-pair + closest commence within `THIN_FILL_COMMENCE_MATCH_MS` = 12h (:19); exists explicitly because "Odds API ids and TheRundown event_ids are not the same namespace" (:5-6).
- `mergeBookmakersIntoPrimary()` :103-141 — merges secondary bookmakers into thin primary events; primary id always survives; secondary-only games are NEVER inserted (:7, :102).
- Tests: `packages/data-ingestion/src/__tests__/odds-event-merge.test.ts`.
- WIRED: `packages/ingestion-pipeline/src/process-sport.ts:385-405` — only on the TheRundown thin-fill branch. NOT used on the full-replace branch (:367-381, rundown events keep rundown ids) and NOT used on the ESPN-odds failover branch (:409-432, events keep `espn:{oddsKey}:{id}` ids).

## 2. Team-name normalizers

- `normalizeComparableText()` — `packages/data-ingestion/src/team-text-match.ts:8-16` (NFKD, strip diacritics, lowercase, collapse non-alnum). Shared by both remap engines. Also `findMatchingTeamInText()` :22-44 (longest-name-first free-text match, whole-token guard for ≤3-char tokens :36-39) and `parseSportsScore()` :47-54 — used for Kalshi/Polymarket, not for Game identity.
- `normalizeTeamToken()` — `apps/web/lib/data-sources/score-verification.ts:27-29` (lowercase, strip non-alnum).
- `normAbbr()` + `matchupKey()` (orientation-independent sorted abbr pair) + `daysApart()` — `apps/web/lib/data-sources/ncaa-consensus.ts:29-36, 88-93`.
- `normalizeTeamKey()` (prediction engine) — `packages/prediction-engine/src/team-index-registry.ts:66-68` — deliberately conservative (case/whitespace only); its own doc says alias reconciliation "must be solved with a real alias table, not guessed at here" (:62-64). Registry is append-only team→index identity for the particle filter; NOT a game-identity tool.
- `normalizeTeamKey()` (Kalshi) — `packages/ingestion-pipeline/src/kalshi-team-abbr.ts:18-25`, plus the largest alias table in the repo: full-name/nickname/ESPN-short → exchange abbr for NFL/NBA/MLB/NHL/WNBA/CFB/CBB/EPL/MLS (e.g. NFL table :28ff; CHW→CWS, GS→GSW polarity guards per header :11-13). Resolver `resolveKalshiTeamAbbr()` :1094-1133 (5-step: full name → short alias → parenthetical → allowlisted passthrough → last-token; null = honest miss). Wired only in `packages/ingestion-pipeline/src/build-independent-fair-values.ts:61,100`.
- Enrichment-side matchers (team-level, not game identity): `clubelo-client.ts` `normalizeClubName` :72-80 + `NAME_OVERRIDES` :83-120 + private `teamsMatch` :128-142; `espn-powerindex-client.ts` `lookupTeamFpi` :232-243 (exact keys only, suffix strip); `polymarket-independent-client.ts` `teamMatchTokens` :89-108 (≥4-char distinctive tokens, stopword list) + `questionMatchesBoth` :110-121; `kalshi-client.ts` `eventTickerMatchesGame` :196-231 (abbr adjacency + date fragment ±1 day).

## 3. Cross-source score matching & the settlement matchers (apps/web)

- `apps/web/lib/data-sources/score-verification.ts` — `indexFinals()` :47-77 indexes ESPN finals by directional key `date|homeToken|awayToken` (both abbr and full-name tokens :67-73); `lookupFinal()` :80-91; `crossCheckScore()` :103-111 (unmatched → `agrees:null`, "do not settle from free source"). Tests: `apps/web/__tests__/score-verification.test.ts`. Wiring: only its `normalizeTeamToken` is imported elsewhere (`free-settlement.ts:29`); I found no production caller of `indexFinals`/`crossCheckScore` themselves — referenced only by tests and by advisory text in `apps/web/lib/autonomy/operating-kernel.ts:212-213` and `apps/web/lib/settlement/root-cause-analysis.ts:155`. (Flag: could not find a runtime call site.)
- `apps/web/lib/data-sources/free-settlement.ts` — the richest matcher:
  - `expandTeamMatchTokens()` :198-240 — full token, last-word, last-two-words, multi-word-city strip (`CITY_PREFIXES` :131-149 includes "san francisco"), single-city-word strip, and `TOKEN_ALIASES` :152-190 (Athletics/A's, Guardians/Indians, D-backs, White Sox, MLS short forms, two-pass closure :232-237).
  - `teamTokensMatch()` :122-128 — equality or substring containment.
  - `finalMatchesPick()` :250-258, `orientToPickHome()` :261-275 (handles home/away flips), `buildTrustedFinals()` :50-88 (ESPN×henrygd fusion via `matchupKey` + `daysApart`; CONFIRMED/SINGLE_SOURCE/DISPUTED), `settlePendingPicks()` :281-365 (±2-day window :289, doubleheader ambiguity → HELD :299-320), `findPostponedMatch()` :408-443.
  - Tests: `apps/web/__tests__/free-settlement.test.ts`, `free-settlement-abbr-match.test.ts`, `free-settlement-doubleheader.test.ts`.
  - WIRED — this matcher already crosses the externalId gap because it never touches externalId:
    - `apps/web/lib/data-sources/free-settlement-runner.ts` `runFreePathSettlement()` :141ff loads PENDING picks with their game's `homeTeamName/awayTeamName/commenceTime` (:195-225), date-targets free boards (:265-273), settles via `settlePendingPicks` (:292), writes pick result + stamps the pick's own Game row FINAL (:370-401) with a cross-path score-conflict guard (:350-367).
    - `apps/web/lib/data-sources/free-score-persist.ts` `persistFreeScores()` :125ff — matches ANY unscored/SCHEDULED Game row (any externalId convention) to trusted finals by team tokens + ±48h (:193-208, `finalMatchesGame` :73-93 handles orientation flips) and stamps homeScore/awayScore/FINAL/resultFetched (:227-235). CAVEAT: the GSE-SEC-051 storage-clearance gate (:216-224) checks `espn-public-api` with intent `storage`, and the rights registry has `storage_allowed: false` for espn-public-api (`apps/web/lib/scraping/source-rights-registry.ts:242`) — the write is skipped (`continue`), so this path counts matches but persists nothing under current registry state (test documents this: `apps/web/lib/data-sources/free-score-persist.test.ts:8-10`).
    - Both are wired ONLY on the free branch of `apps/web/app/api/cron/settle-picks/route.ts:56-105` (`forceFree` via `?path=free` or no `THE_ODDS_API_KEY` :46-56). With a key present, the default cron takes the paid `settleSport` path instead.
- `apps/web/lib/data-sources/ncaa-consensus.ts` — `crossCheckNcaaScores()` :121-182 (abbr-pair join + date tolerance) and `resilientNcaaScores()` :199-220; its `matchupKey`/`daysApart`/`toComparableFrom*` are the fusion primitives reused by `buildTrustedFinals`.
- `apps/web/lib/data-sources/multi-source-scores.ts` `mergeGames()` :98-109 — cross-source score dedup keyed on raw source `gameId`, falling back to `startTime|homeAbbr|awayAbbr` (:102); prefers completed rows (:104-105).

## 4. Identity construction and exact-match consumers (why three rows exist — no utility bridges them)

- Hash ids: `packages/data-ingestion/src/normalizer.ts:42` (`externalId: event.id` from The Odds API) and TheRundown full-replace keeps rundown `event_id` as `id` (`packages/data-ingestion/src/rundown-client.ts:125,168,179`; `process-sport.ts:367-381`).
- `espn:baseball_mlb:401816675`: `packages/data-ingestion/src/espn-odds-client.ts:361` — `` `espn:${sportKey}:${ev.id}` `` with canonical odds sport key; flows into Game via `process-sport.ts:459` → upsert on `externalId` only (:524-531).
- `espn:mlb:401816675`: `packages/data-ingestion/src/espn-schedule-seed.ts:121` — `` `espn:${short}:${id}` `` with short slug; upserted by `packages/ingestion-pipeline/src/seed-games-from-espn.ts:78-92` on `externalId` only — no team+time lookup against existing rows before create. Called from `generate-signal-slate.ts:111-112` and `board-fill.ts:37` (cron `/api/cron/board-fill` every 15 min per `apps/web/lib/ops/cron-schedule-manifest.ts:146`).
- Exact-match consumers that miss across conventions: paid settlement `settle-sport.ts:243-247` (`db.game.findUnique({ where: { externalId: score.externalId } })`, `if (!game) continue;`) and nflverse backfill `scripts/backfill/historical-settlement-backfill.ts:314-318,400` (`Game.externalId == nflverse game_id`, a fourth convention; skips on miss).
- Grep for `espn:` construction/parsing (`*.ts` repo-wide) finds ONLY the two constructors above plus tests — there is NO parser, translator, or alias between `espn:mlb:*` and `espn:baseball_mlb:*` even though both embed the same ESPN event id.

## 5. Dedup / merge migrations & scripts for Game rows

- NONE exist. No migration in `packages/db/prisma/migrations/` dedups or merges Game rows; no script under `scripts/` or route under `apps/web/app/api` merges duplicate games or reassigns picks between Game rows (repo-wide grep for reassign/repoint/game-merge patterns returns only unrelated Stripe/price and team-index-registry hits).
- Closest primitive: **Entity Graph** (ADR 005), migration `packages/db/prisma/migrations/20260813200000_add_entity_graph/migration.sql` — `entities` table with `entity_type` enum including `'game'` and `'team'`, `normalized_name` resolution key, `external_ids JSONB`, unique index `(entity_type, normalized_name, sport)` ("Resolution invariant: one canonical row per (type, normalized name, sport)"), plus provenance-mandatory `entity_edges`. Prisma models `Entity`/`EntityEdge` at `packages/db/prisma/schema.prisma:3846,3877`. The migration header states "Nothing reads these tables yet"; grep confirms zero TS consumers (only `apps/web/__tests__/migrate-if-configured.test.ts` mentions it).

## 6. Wired-vs-not summary

| Utility | Wired | Not wired |
|---|---|---|
| `remapPreseasonRows` (team+18h window → existing externalId) | NFL preseason only: process-sport.ts:301, settle-sport.ts:206 | Any other sport; hash↔espn reconciliation |
| `matchSecondaryEventToPrimary`/`mergeBookmakersIntoPrimary` (team+12h) | Rundown thin-fill only: process-sport.ts:385-405 | Rundown full-replace; ESPN odds failover; Game upsert |
| `expandTeamMatchTokens`/`settlePendingPicks` (aliases, city strip, orientation) | Free settle branch: free-settlement-runner.ts:292 via cron settle-picks route:69 | Paid settleSport path (externalId-only) |
| `persistFreeScores` (team+±48h → stamp any Game row) | cron settle-picks free branch route:68 | Effectively inert: storage clearance denies the write (source-rights-registry.ts:242 → free-score-persist.ts:216-224) |
| `indexFinals`/`crossCheckScore` | tests only | no production caller found |
| Entity Graph (`entities.external_ids`, resolution invariant) | schema only | no code reads/writes it |
| `resolveKalshiTeamAbbr` alias tables | build-independent-fair-values.ts:100 | Game identity/dedup |

## 7. Could not verify / flags

- Prod DB behavior (which rows scores actually landed on, update timestamps) — code-read only, DB not queried.
- `score-verification.ts` runtime wiring: I found no non-test caller; stated as "not wired" but a dynamic import elsewhere can't be fully excluded.
- `eventTeamsMatch` (odds-event-merge.ts:34) and `nflTeamsMatch` (nfl-preseason-map.ts:55) are byte-identical logic duplicated in two files — any fix reusing "the" matcher should note there are two copies.
- The default (key-present) cron settle path is paid `settleSport`; I did not verify prod env has `THE_ODDS_API_KEY` set, only the routing logic at settle-picks/route.ts:46-56.

## Lane report: agent3

Dense factual report. All paths absolute under `/home/user/Sports`.

## 1. Where each externalId convention is minted, and which writers upsert Game rows

- `Game.externalId` is `@unique` (`packages/db/prisma/schema.prisma:302`, comment still says "ID from The Odds API"). `Game.id` is a cuid; every other table FKs on `Game.id`, not externalId.
- **Hash convention**: `DataNormalizer.normalizeGames()` passes `event.id` through verbatim (`packages/data-ingestion/src/normalizer.ts:42`); scores likewise (`normalizer.ts:277`). The Odds API events carry 32-hex ids; TheRundown also passes its `event_id` through verbatim (`packages/data-ingestion/src/rundown-client.ts:125,168,179`).
- **`espn:{canonicalOddsKey}:{espnEventId}`** (e.g. `espn:baseball_mlb:401816675`): minted by the free ESPN-odds fallback at `packages/data-ingestion/src/espn-odds-client.ts:361`; enters the DB because `processSport` treats those events like any provider's (fallback selected at `packages/ingestion-pipeline/src/process-sport.ts:409-432`) and upserts `where:{externalId}` at `process-sport.ts:524-540`.
- **`espn:{short}:{espnEventId}`** (e.g. `espn:mlb:401816675`): minted at `packages/data-ingestion/src/espn-schedule-seed.ts:121` (`SHORT_TO_ODDS_SPORT` map at :20-66 proves short `mlb` ↔ canonical `baseball_mlb`, so the two ESPN conventions differ only in the middle segment for the SAME ESPN event id); upserted by `packages/ingestion-pipeline/src/seed-games-from-espn.ts:78-92`. Callers: `generate-signal-slate.ts:111-116` (auto-seed when Game table cold), `board-fill.ts:37` (unconditionally, every board-fill run), exported at `packages/ingestion-pipeline/src/index.ts:117`. Cron entry points: `apps/web/app/api/cron/board-fill/route.ts:20`, `apps/web/app/api/cron/free-spine-health/route.ts:148`, `apps/web/app/api/cron/generate-signal-slate/route.ts:19`, and refresh-odds route's signal fills (`apps/web/app/api/cron/refresh-odds/route.ts:63-64,105-106`).
- **Fourth convention (dormant lane)**: nflverse `game_id` as `Game.externalId`, required by the historical backfill (`scripts/backfill/historical-settlement-backfill.ts:301,314,318,400`).
- Dev fixtures pin yet other synthetic formats: `apps/web/__fixtures__/intelligence-graph/*.ts` (`happy-path-canonical.ts:24` "nba_2026052201", etc.), seed picks `seed-pick-${i}` (`apps/web/__tests__/seed-picks-wiring.test.ts:71`).

## 2. Pick creation — which Game rows picks attach to

- **processSport (odds path)**: picks attach to the row upserted from THIS cycle's provider events — `gameRecords[game.externalId]` (`process-sport.ts:522-540`), then create/update keyed on the `@@unique([gameId,pickType])` constraint (`schema.prisma:575`) at `process-sport.ts:817-916`. So the same physical game gets picks on a hash row when The Odds API/Rundown served the cycle, and on an `espn:baseball_mlb:*` row when the ESPN fallback served it. Callers: `refresh-odds.ts:34` (cron + worker), `workers/data-refresh/src/index.ts:62`.
- **generateSignalSlate**: selects games purely by `commenceTime` window with NO externalId/provider filter (`packages/ingestion-pipeline/src/generate-signal-slate.ts:125-136`, take 80) and creates MONEYLINE picks on whatever row it finds (`generate-signal-slate.ts:297-307`) — including `espn:mlb:*` seed rows, which nothing on the paid settlement path can ever match. It also stamps `game.dataQualityScore >= 70` on those rows (`generate-signal-slate.ts:310-317`), which is what makes them publicly visible via `/api/picks`.
- `workers/pick-generation` is a stub that exits immediately (`workers/pick-generation/src/index.ts:16-18`).
- Historical backfill creates picks against `Game.externalId == nflverse game_id` rows (`historical-settlement-backfill.ts:318`).

## 3. Odds / snapshots / context attachment (all keyed on Game.id of the current cycle's row)

- `Odds` rows: `process-sport.ts:573-595` (gameId of that cycle's upserted row). CLV close derivation at settlement reads `db.odds` by that same gameId (`settle-sport.ts:426-439`) — if picks and odds live on different duplicate rows, close derivation returns nothing.
- `OddsLineSnapshot` (line archive): `captureLineSnapshotsIfEnabled` at `process-sport.ts:621-626` with `gameId: gameRecord.id`; CLOSE re-tagging per gameId at `settle-sport.ts:651`. Pinnacle leg keyed off the same `gameRecords` map (`process-sport.ts:551-560`, `pinnacle-line-archive.ts:119-120`).
- Player-prop event odds are matched back by Odds API event id only: `eventOddsByExternalId.get(game.externalId)` (`process-sport.ts:619`, `prop-line-rows.ts:130-133`) — can only hit hash-convention rows.
- `enrichGameContext` / `OpeningLine` (`@@unique([gameId,market])` `schema.prisma:374`) / `GameSignal` / rest-days all write per game row (`process-sport.ts:661-675`) — duplicates fragment opening-line and line-movement history per row.
- `TeamGameLog` is `@@unique([gameId,teamName])` (`schema.prisma:403`) and written at settlement (`settle-sport.ts:617-629`) — if two duplicate rows of one physical game both reach FINAL, the same contest can be double-logged into ATS form.

## 4. Settlement paths vs game-row identity

- **Paid path** (`settleSport`): matches strictly `db.game.findUnique({where:{externalId: score.externalId}})` where `score.externalId` is The Odds API event id (`settle-sport.ts:243-247`, `normalizer.ts:277`). Only hash rows (plus NFL-preseason-remapped rows, below) can ever settle here. Route doc states this explicitly: "Path A (paid scores): … externalId match" (`apps/web/app/api/cron/settle-picks/route.ts:4`).
- **Free path** (`runFreePathSettlement`): externalId-agnostic — loads ALL PENDING picks per sport and matches by team-token + date (`apps/web/lib/data-sources/free-settlement-runner.ts:195-292`; matcher in `free-settlement.ts:250-275`, token expansion :198-240). So free settlement CAN settle picks on any of the three conventions, but depends on team-name matching; hash rows carry Odds API names ("San Francisco" style short names per the defect description) vs ESPN `displayName` on espn rows (`espn-schedule-seed.ts:113`), and `CITY_PREFIXES`/`TOKEN_ALIASES` (`free-settlement.ts:131-190`) are the only bridge. Free path runs only when `THE_ODDS_API_KEY` is absent or `?path=free` (`settle-picks/route.ts:51-56`) — with a live paid key (prod, per PATH-FORWARD doc item 7) default crons take the paid, externalId-only path.
- **Free score persist**: also team+date, updates whichever not-yet-final row matches first (`apps/web/lib/data-sources/free-score-persist.ts:153-239`) — this is how finals land on some duplicate rows while others stay `SCHEDULED`.
- **Stale backfill** (`backfillStaleSettlement`): same free grader, team+date (`apps/web/lib/data-sources/settle-backfill.ts:24-33`), runs on BOTH cron paths (`settle-picks/route.ts:74,169`).
- Cross-path score-conflict guards compare only within one Game row (`settle-sport.ts:265-288`, `free-settlement-runner.ts:350-368`) — duplicates rows are invisible to them.
- Settlement evidence/anomaly records embed `game.externalId` in payload/fingerprint (`settle-sport.ts:302-319`, `settlement-evidence.ts:87-93`); settlement-run fingerprint hashes score externalIds (`settlement-run.ts:39-47`).
- Settlement health ("82 overdue") joins pick→game.commenceTime only (`apps/web/lib/performance/settlement-health.ts:145-161`) — convention-independent, but each duplicate row's picks count separately.

## 5. Slate commitments / proof receipts

- `PickProofReceipt` payload commits `gameId` = Pick.gameId (the cuid), not externalId (`process-sport.ts:965-981`); receipt is `pickId @unique`, immutable (`schema.prisma:594-616`).
- `freezeSlateCommitments` enumerates games by `(sport, UTC-day commenceTime)` — `packages/ingestion-pipeline/src/freeze-slate-commitments.ts:167-173` — then collects receipts via `pick.gameId IN games` (:207-216) and freezes an immutable Merkle root + count (:249-268). Consequence: duplicate rows of one physical game each contribute their own picks' receipts to the same slate population, and the frozen root/count/receipt.slateKey stamps make any later merge/delete/re-point of Game rows unable to alter historical commitments (receipts already stamped, `slateKey:null` guard :265). Freeze runs from both refresh-odds (`refresh-odds.ts:35`) and settle-picks (`settle-picks/route.ts:173-177`).
- Blast-radius note: `db.game.delete` on a duplicate is blocked/complicated by non-cascading FKs — `Odds` (`schema.prisma:427`) and `Pick` (`schema.prisma:565`) have no `onDelete: Cascade`; `OpeningLine`/`TeamGameLog`/`OddsLineSnapshot` do cascade (:372, :401, :466).

## 6. UI / API surfaces

- **No code in `apps/web` keys on `espn:` externalId prefixes.** Repo-wide grep for `espn:` string in apps/web matched only local variable names (`free-score-persist.ts:184`, `free-settlement-runner.ts:274`, `score-verification.ts:96-108`, `free-settlement.ts:51`). No `startsWith("espn`/`externalId.split`/prefix parsing exists anywhere in the repo (greps returned zero).
- `/api/picks` joins pick→game with no dedupe across duplicate rows (`apps/web/app/api/picks/route.ts:105-143`) — a physical game duplicated across rows can surface one pick per (row, pickType), subject to `isBootstrap:false` and the dataQualityScore filter that signal-slate stamps.
- Preview pages resolve games by team-name slug over a 500-row scan (`apps/web/app/preview/[sport]/[slug]/page.tsx:85-121`); sitemap emits one URL per Game row from team names (`apps/web/app/sitemap.ts:100-123`) — duplicate rows with different team spellings yield distinct near-duplicate URLs; identical spellings yield the same slug resolved to whichever row sorts first.
- Board/slate surfaces enumerate games by time window (`apps/web/lib/board/state.ts:371,380`, `lib/board/passes.ts:160`, `lib/slate-twin/get-slate-twin.ts:115`) — duplicates all pass through.
- `apps/web/lib/platform/integrity-ledger.ts:494` already documents the failure mode as text: "team+date match can miss externalId games".

## 7. Tests pinning the conventions

- `espn:{short}:` pinned: `packages/data-ingestion/src/__tests__/espn-schedule-seed.test.ts:9,28` (`expect(...externalId).toBe("espn:ncaaf:401628000")`); `packages/data-ingestion/src/__tests__/nfl-preseason-map.test.ts:53,60,67,76,83-86` (existing Game rows as `espn:nfl:*`, and asserts remap output id equals the existing row's externalId).
- `espn:{canonicalKey}:` is NOT pinned by any test — `espn-odds-client.test.ts` asserts provider/teams/markets but never `ev.id` (`packages/data-ingestion/src/__tests__/espn-odds-client.test.ts:81-92`).
- Pipeline tests use opaque ids only ("ext-1"): `settle-sport.test.ts:186,605,634,657-658`, `process-sport.test.ts:165`, `settlement-hardening.test.ts:109-110` — none pin an espn format.

## 8. Existing cross-convention lookup / matching code

- **Only one externalId-remapper exists, NFL-preseason-only**: `remapPreseasonRows` rewrites an incoming Odds API preseason feed row's `id` to an EXISTING Game row's externalId matched by team + commence-time ±18h (`packages/data-ingestion/src/nfl-preseason-map.ts:65-106`, window constant :23). Wired in both directions: odds ingest (`process-sport.ts:271-317`, candidates include existing DB rows :277-300) and paid score settlement (`settle-sport.ts:188-219`). This is the in-repo precedent for hash↔`espn:nfl:*` identity resolution — but it never runs for MLB or outside July–Aug (`isNflPreseasonFetchWindow`, `nfl-preseason-map.ts:29-32`).
- The free settlement/persist layer (Section 4) is the other de-facto cross-convention path (team+date, ignores externalId entirely).
- Nothing anywhere tries both `espn:mlb:` and `espn:baseball_mlb:` for the same event id; no reverse use of `SHORT_TO_ODDS_SPORT` for id translation exists (only consumers: `espn-schedule-seed.ts:100,170,220`, export `data-ingestion/src/index.ts:320`).

## 9. Prior art / not verified

- The defect is already logged with the same two mint sites in `docs/ops/2026-08-26-PATH-FORWARD.md:249-259` ("Fix in progress on this branch" — I found no such fix code in the working tree).
- Not verified (no DB access in this lane): the prod row timestamps/counts cited in the task; whether prod crons currently run paid vs free settlement path (env-dependent, `settle-picks/route.ts:46-56`); whether `LINE_ARCHIVE_ENABLED` is on (affects whether OddsLineSnapshot blast radius is live — PATH-FORWARD item 6 says archive stalled Aug 22).