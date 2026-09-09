# Audit — DATA IN, DATA OUT (data contracts)

**Read-only audit, 2026-09-08. Dimension: for every external source, what we request, what we
store, what we serve, and every place a value changes meaning between ingest and display.**

Scope: `apps/web/lib/data-sources/**`, `apps/web/lib/data-sources/free-adapters/**`,
`packages/data-ingestion/src/**`, plus the write and serve edges those feed
(`packages/ingestion-pipeline/src/process-sport.ts`, `settle-sport.ts`,
`packages/prediction-engine/src/scoring.ts`, `apps/web/app/api/picks/route.ts`,
`apps/web/components/picks/pick-card.tsx`, `apps/web/lib/board/*`, `apps/web/lib/bot-outbox/*`,
`apps/web/lib/embed/edge-index.ts`, `packages/db/prisma/schema.prisma`).

Every line reference below is a file I read in this session. The one command whose output I
relied on is named inline. Anything I could not establish is marked **NOT VERIFIED**.

---

## What I checked (with commands run)

Files read in full or in the cited ranges:

- `apps/web/lib/data-sources/`: `espn-public.ts`, `multi-source-scores.ts`, `ncaa-consensus.ts`,
  `score-verification.ts`, `free-score-persist.ts`, `free-settlement.ts` (1-300, 440-620,
  790-880), `free-settlement-runner.ts` (150-370, 495-525, 650-680), `settle-backfill.ts`
  (560-650), `source-confidence.ts`, `free-stats.ts`, `live-evidence.ts` (1-70)
- `apps/web/lib/data-sources/free-adapters/`: `espn-scores.ts`, `mlb-statsapi.ts`, plus a
  `sourceId` sweep over every adapter in the directory
- `packages/data-ingestion/src/`: `normalizer.ts`, `config.ts`, `freshness-schedule.ts`,
  `espn-odds-client.ts`, `rundown-client.ts` (1-400), `kalshi-listing-quote.ts`,
  `kalshi-client.ts` (180-230, 455-500), `clubelo-client.ts` (1-80, 165-260),
  `predexon-client.ts` (1-60), `odds-api-client.ts` (300-390), `context-enrichment.ts`
  (54-99, 330-460), `game-identity.ts` (25-60), `index.ts`
- `packages/ingestion-pipeline/src/`: `process-sport.ts` (300-360, 740-830, 840-1180),
  `settle-sport.ts` (400-560), `generate-signal-slate.ts` (230-470)
- `packages/prediction-engine/src/`: `scoring.ts` (80-125, 380-700, 880-960),
  `settlement.ts` (100-142), `publish-time-market-p.ts`
- `apps/web/lib/calibration/`: `publish-time-market-p-loader.ts`, `proven-path-rows.ts` (58-100,
  170-200)
- `apps/web/lib/scraping/`: `clearance-engine.ts` (90-300, 324-344),
  `source-rights-registry.ts` (source_id sweep, 231-262)
- `apps/web/`: `app/api/picks/route.ts` (280-360), `components/picks/pick-card.tsx`,
  `components/picks/line-freshness-badge.tsx`, `lib/picks/line-freshness.ts`,
  `lib/picks/public-edge-score.ts`, `lib/picks/display-selection.ts`,
  `lib/board/load-gate-slate.ts` (415-480), `lib/bot-outbox/records.ts` (115-175),
  `lib/embed/edge-index.ts`
- `packages/db/prisma/schema.prisma` (`Game` 300-360, `Odds` 423-452, `OddsLineSnapshot`
  467-485, `IngestionRun` 491-510, `Pick` 516-565)
- `docs/ops/SCORE_INTEGRITY_2026-09-08.md` (context for C-247, not re-derived)

Commands run and whose output I saw:

```bash
# from /home/user/Sports/apps/web
npx vitest run __tests__/scraping-clearance.test.ts -t "storage intent" --reporter=basic
#  -> 1 passed, 2 tests passed | 82 skipped
#  the passing assertions are scraping-clearance.test.ts:864-873:
#  checkClearance({source_id:"espn-public-api", mode:"public_logged_off_fact_extract",
#                  tool_id:"fetch-native", intents:["storage"]}).allowed === false
#  with block code STORAGE_NOT_ALLOWED

# from /home/user/Sports
grep -rn "currentEdgeIndex" --include=*.ts --include=*.tsx --include=*.mjs --include=*.sql . \
  | grep -v node_modules | grep -v "__fixtures__\|\.test\."
#  -> 18 hits: 1 doc comment, 2 migrations, 2 merge-script field lists, 13 READERS. Zero writers.

grep -n "sourceId" apps/web/lib/data-sources/free-adapters/*.ts
#  -> mlb-statsapi.ts:81, balldontlie-nba.ts:57, nhl-web-api.ts:45 all emit "espn-public-api"

grep -rn "\"http://" --include=*.ts packages/data-ingestion/src apps/web/lib/data-sources
#  -> clubelo-client.ts:20 only

grep -n "new Date().toISOString()" packages/data-ingestion/src/rundown-client.ts \
                                    packages/data-ingestion/src/espn-odds-client.ts
#  -> rundown 167,230,248,266,280,355,365 ; espn-odds 175,263
```

### Source inventory as built (request → store → serve)

| Source | We request | We store | We serve | On disagreement / partial |
|---|---|---|---|---|
| The Odds API `/odds` | `regions=us`, `markets=h2h,spreads,totals`, `oddsFormat=american`, `dateFormat=iso` (`odds-api-client.ts:311-314`) | one `odds` row per (game, book, market) with prices + points + our `fetchedAt` (`process-sport.ts:775-791`) | mean spread / mean total as `pick.line`; consensus %, book count | per-game upstream-age gate (`normalizer.ts:146-179`); whole-feed gate `validateOddsFreshness` |
| The Odds API `/scores` | `daysFrom=1`, `dateFormat=iso` (`odds-api-client.ts:325-333`) | `games.homeScore/awayScore/status` (`settle-sport.ts:475-483`) | final score, W/L | both-scores-or-nothing; `SCORE_MISMATCH_CROSS_PATH` refuses to overwrite a FINAL |
| ESPN scoreboard (scores) | `limit=300`, `dates=`, `groups=` per sport (`espn-scores.ts:160-171`) | `games.homeScore/awayScore/status` via the settlement runner / backfill | final score, W/L, settled record | de-dup by event id preferring completed; `requireAllGroups` only on the zero-sit lane |
| ESPN core odds (keyless) | scoreboard + `/events/{id}/competitions/{id}/odds`, `items[0]` (`espn-odds-client.ts:271-289`) | one `odds` row under bookmaker key `espn_public` | same as Odds API | soft-fail empty; never invents a price |
| TheRundown | `sport_id` + date span (`rundown-client.ts:22-30`) | `odds` rows under affiliate book keys | same | 429s daily per AGENTS.md; drops a market when the shape does not match |
| Kalshi / PredExon | listing quotes; PredExon prices are dollars, Kalshi cents (`predexon-client.ts:26-29`) | `IndependentMarketFairValue` (in-memory, into `factorBreakdown`) | `rankingP`, independent-edge factor | refuses `last_price`, inverted book, wide spread (`kalshi-listing-quote.ts:87-140`) |
| ClubElo | `http://api.clubelo.com/Fixtures` (`clubelo-client.ts:20`) | in-memory only | independent fair value | soft-fail null |
| MLB StatsAPI / balldontlie / NHL web / henrygd | dated schedule + scores | nothing (clearance-denied, see F-3) | nothing | n/a |
| nflverse / ESPN FPI / open-meteo / Reddit | per-adapter | features / trends surfaces | trend pages | out of this dimension's core path |

---

## Findings

### F-1 — BLOCKER. `Game` has no provenance for the single most consequential number in the product

**Evidence:** `packages/db/prisma/schema.prisma:300-346` — the `Game` model carries
`homeScore`, `awayScore`, `status`, `resultFetched`, `updatedAt`. There is **no column for the
source that supplied the score, the source's own event id, or when the score was observed.**

Three separate lanes write those columns:
`packages/ingestion-pipeline/src/settle-sport.ts:475-483` (paid),
`apps/web/lib/data-sources/free-settlement-runner.ts:337-350` (free),
`apps/web/lib/data-sources/settle-backfill.ts:620-635` (backfill).
None of them records where the number came from.

The nearest thing to provenance is `PickSettlementEvent.payload.settledWith.sources`
(`free-settlement-runner.ts:255-266`, `settle-backfill.ts:576-586`), which is per-PICK, records
only source *labels*, and (see F-2) records the wrong label for three of the adapters. A game
row with no pick, or a game settled by the paid lane, has nothing at all.

`updatedAt` cannot stand in for an observation time: `free-settlement-runner.ts:296-306` writes
`commenceTime` back to itself purely to take a row lock and the comment says so verbatim —
"making the row look touched when nothing was learned about it".

**Why it matters:** AGENTS.md records as unestablished "which code path wrote them" for the 25
MLB / 14 MLS / 2 NCAAF contradicted finals (C-247). It is unestablished because the schema makes
it unanswerable. Every published W/L, the settled record, the calibration sample and the PROVEN
gate all rest on a number whose origin is not recorded anywhere. This is the same class as
C-247, one level up: it is the reason C-247 cannot be diagnosed rather than an instance of it.

**Proposed fix (owner-gated, needs a migration — not an agent task):** add
`scoreSourceId`, `scoreSourceEventId`, `scoreObservedAt` and `scoreConfirmation` to `Game`, and
have all three writers populate them inside the same statement that writes the score. Additive
columns only; no existing behaviour changes.

**Risk of fix:** touches `schema.prisma` and `migrations/**`, which AGENTS.md law 2 freezes for
agents. Backfilling historical rows is impossible, so the columns start null and only new writes
are traceable — say so explicitly rather than implying the old rows became verifiable.

---

### F-2 — BLOCKER. Three non-ESPN score adapters report themselves as ESPN

**Evidence:**

- `apps/web/lib/data-sources/free-adapters/espn-scores.ts:70` types the field as a literal:
  `readonly sourceId: "espn-public-api";`
- `apps/web/lib/data-sources/free-adapters/mlb-statsapi.ts:81` — `sourceId: "espn-public-api"`,
  three lines below `attribution: MLB_STATSAPI_ATTRIBUTION` ("Scores data via MLB Stats API")
- `apps/web/lib/data-sources/free-adapters/balldontlie-nba.ts:57` — same
- `apps/web/lib/data-sources/free-adapters/nhl-web-api.ts:45` — same
- `apps/web/lib/data-sources/multi-source-scores.ts:48-61` (`henryToNormalized`) does the same to
  henrygd rows, with the comment "shape-compatible; attribution on ncaa"

That `sourceId` is the value that becomes `ComparableGame.source`
(`ncaa-consensus.ts:48`), then `TrustedFinal.sources` (`free-settlement.ts:75-84, 96-105`), then
`PickSettlementEvent.payload.settledWith.sources` (`free-settlement-runner.ts:260-263`) — the
audit trail for how a pick was graded.

**Why it matters:** the settlement audit trail is falsified at the adapter boundary. A score
graded off MLB Stats API is recorded as having come from ESPN. It also breaks the clearance
story: an ESPN-labelled record carries ESPN's rights envelope
(`source-rights-registry.ts:231-242`, `storage_allowed: false`, attribution "Scores data via
ESPN") while the real source has different terms and different attribution. And the two-source
CONFIRMED tier (`free-settlement.ts:78-83`) cannot mean what it says if both "sources" can be
the same string.

The type literal at `espn-scores.ts:70` is what forces it — honest attribution is currently not
expressible.

**Proposed fix:** widen `NormalizedGame["sourceId"]` to the `ScoreSourceId` union already
declared at `multi-source-scores.ts:28-33`, and let each adapter state its own id. No runtime
behaviour changes except that the recorded label becomes true.

**Risk of fix:** every consumer of `sourceId` must be re-checked for a hard-coded
`"espn-public-api"` comparison; `multi-source-scores.ts:259, 443` set `used` from the literal.

---

### F-3 — MAJOR. "Never a single free source for scores" is false in production; every secondary is clearance-denied by design

**Evidence:**

- `apps/web/lib/data-sources/multi-source-scores.ts:4` — module header: "Primary → fallback chain
  per sport. **Never a single free source for scores.**" `:65` — "Ordered free score sources per
  sport (min dual where available)."
- `:168-175` `checkSecondaryClearance()` runs `checkClearance` for
  `henrygd-ncaa | mlb-statsapi | balldontlie-nba | nhl-web-api`, and the module's own comment at
  `:160-166` states these have **no row** in the rights registry so clearance returns
  `SOURCE_NOT_REGISTERED`.
- I confirmed the registry contents: `grep -n "source_id" apps/web/lib/scraping/source-rights-registry.ts`
  lists 21 entries and none of those four is present.
- `clearance-engine.ts:96-103` — an unregistered source returns immediately with a block, and
  `finalize` at `:333` sets `allowed: blocks.length === 0`.

Consequences that follow directly:

1. `buildTrustedFinals(espn, henry)` (`free-settlement.ts:51-88`) always receives
   `henry = []` (`free-score-persist.ts:123-141`, `free-settlement-runner.ts:504-519` both return
   `[]` on the denial). So **every final is `SINGLE_SOURCE`. `CONFIRMED` and `DISPUTED` are
   unreachable.** The documented trust discipline at `free-settlement.ts:6-11` is a three-value
   contract that can only ever produce one value.
2. `free-score-persist.ts:259-261` filters out `DISPUTED` finals. That filter can never fire.
3. MLB, NBA, NHL and NCAA have a declared second source that never runs; MLS and NFL never had
   one (`multi-source-scores.ts:78-82`, chain `["espn-public-api"]`).
4. If ESPN is down or its board is partial, the chain has nothing to fall back to; the errors
   array records `clearance-denied` and games come back empty.

This is not a compliance criticism — failing closed on an unregistered source is correct. The
finding is that **the code's own description of what it does is wrong, and a cross-check the
settlement trust tier is built on does not exist.** C-247's MLS row (14 of 48 comparable finals
contradicted) sits on a single-source path with no second opinion available to it at all.

**Proposed fix:** either register the four sources (owner action, already tracked as
`OPERATOR_TASKS.md → HENRYGD-REG` per `free-settlement-runner.ts:506-509`), or correct the module
headers and the `Confirmation` type comment to say that dual-source confirmation is currently
inert. Do not change the clearance gate.

**Risk of fix:** registering a source is a rights decision, not an engineering one.

---

### F-4 — MAJOR. `free-score-persist` computes a score and then cannot write it; a sibling lane writes the same ESPN score with no such gate

**Evidence:**

- `apps/web/lib/data-sources/free-score-persist.ts:440-448` — immediately before the only DB
  write in the module, it calls
  `checkClearance({source_id:"espn-public-api", mode:"public_logged_off_fact_extract",
  tool_id:"fetch-native", intents:["storage"]})` and `continue`s when denied.
- `apps/web/lib/scraping/source-rights-registry.ts:241` — `storage_allowed: false` for
  `espn-public-api`.
- **Verified by running the repo's own test** (command and output above):
  `apps/web/__tests__/scraping-clearance.test.ts:864-873` asserts that exact call returns
  `allowed === false` with `STORAGE_NOT_ALLOWED`, and it passes.

So `persistFreeScores` can match a final, bind it to a kickoff, pass every doubleheader and drift
guard at `:288-430`, and then unconditionally skip the write at `:446`. It still records an
`IngestionRun` SUCCESS at `:531-543` with `gamesUpserted: gamesUpdated` (always 0).

Meanwhile `apps/web/lib/data-sources/free-settlement-runner.ts:337-350` writes the very same
ESPN-sourced score into `games.homeScore/awayScore/status` with **no storage clearance check** —
the file imports `checkClearance` (`:45`) and uses it only for henrygd (`:510-519`), where its
comment says explicitly: "The runner persists these finals on `games` and grades picks from them,
so it needs storage rights, not just derived analytics." The same argument applies verbatim to
`espn-public-api` and is not applied.

**Why it matters:** two things at once.

1. **Dead lane presented as live.** `free-score-persist` is scheduled work that produces nothing
   and reports SUCCESS. Its module header ("Used so free path can move `resultFetched` without
   `THE_ODDS_API_KEY`") describes behaviour that cannot occur.
2. **It narrows C-247.** AGENTS.md names `free-score-persist.ts` as "the obvious suspect" for the
   corrupted finals. Given the registry entry above, that lane cannot have written them. The
   writers to look at are `free-settlement-runner.ts:337`,
   `settle-backfill.ts:620` and `settle-sport.ts:475`. I am **not** claiming which one did —
   that needs the production data — but the suspect list is one shorter, on evidence.
3. The compliance posture is inconsistent: one lane refuses to store ESPN scores, another stores
   them every cycle.

**Proposed fix:** owner decision, not an agent's. Either the registry entry is wrong (ESPN score
facts are storable and the row should say so, which is a rights review) or the runner is wrong
(and settlement must stop persisting ESPN scores, which stops settlement). Whichever way it goes,
the two lanes must agree. Do **not** relax the clearance check to make the lane work.

**Risk of fix:** changing `storage_allowed` is a legal call. Changing the runner stops the free
settlement path outright.

---

### F-5 — MAJOR. "Lines updated 3m ago" is our poll time, not any bookmaker's; upstream age is discarded at ingest and cannot be recovered

**Evidence, ingest side:**

- `packages/data-ingestion/src/normalizer.ts:70-79` builds `bookmakerLastUpdate` from
  `bookmaker.last_update ?? market.last_update` and the comment insists both are "UPSTREAM
  timestamps (never the local clock, preserving the anti-tautology freshness design)".
- `:146-179` `freshGameIds` gates on that upstream value against
  `FRESHNESS_THRESHOLD_MS`, which is **4 hours** by default
  (`packages/data-ingestion/src/config.ts:133-134`).
- `packages/db/prisma/schema.prisma:423-452` — the `Odds` model has **no `bookmakerLastUpdate`
  column.** `process-sport.ts:775-788` writes only `fetchedAt: odds.fetchedAt`.
- `process-sport.ts:313` — `const fetchedAt = new Date();` This is our poll instant.

**Evidence, serve side:**

- `scoring.ts:1152, 1215` stamp that same `fetchedAt` onto every pick's `dataFreshnessAt`.
- `apps/web/app/api/picks/route.ts:335` serves it.
- `apps/web/lib/picks/line-freshness.ts:14-24` takes the max across picks;
  `apps/web/app/picks/page.tsx:516-519` renders it.
- `apps/web/components/picks/line-freshness-badge.tsx:52` renders **"Lines updated {label}"** and
  `:46` sets the tooltip to **"Freshest bookmaker line behind today's picks: <timestamp>"**.
- `apps/web/components/picks/pick-card.tsx:63-65, 225-227, 718-745` renders **"Data: Live"** for
  anything under 10 minutes old, off the same field.

**Why it matters:** the badge names a bookmaker line and shows our fetch clock. A board where
every book's `last_update` is 3 hours 50 minutes old passes the gate, is polled at 10:00, and
reads "Lines updated under a minute ago · Data: Live". The number the reader is being asked to
trust as market freshness is guaranteed-fresh by construction. The honest value exists at ingest
and is thrown away one function later because the table has nowhere to put it.

**Proposed fix (owner-gated, needs a migration):** add `bookmakerLastUpdate` to `Odds`, carry it
into the pick as a second timestamp, and either label the badge as "fetched" or show the real
upstream age. Interim fix with no migration: change the badge copy and tooltip to say "fetched",
which is true today.

**Risk of fix:** the honest number will often look worse than the current one. That is the point;
it is not a reason to keep the current wording.

---

### F-6 — MAJOR. Two keyless odds adapters stamp the local clock into the field the freshness gate treats as upstream

**Evidence:**

- `packages/data-ingestion/src/espn-odds-client.ts:263` —
  `const lastUpdate = new Date().toISOString();` — reused at `:306, :326, :345` as every market's
  `last_update` and at `:356` as the bookmaker's.
- `packages/data-ingestion/src/rundown-client.ts:230, 248, 266, 280` — `lineBlobToBookmaker`
  writes `last_update: new Date().toISOString()` for h2h, spreads, totals and the bookmaker.
  (The v2 path at `:355` correctly prefers the feed's `pr["updated_at"]`, falling back to the
  local clock only when it is absent, and `:365` seeds `last` from the local clock.)
- Those values land on `bookmakerLastUpdate` (`normalizer.ts:76`) and are what
  `freshGameIds` (`normalizer.ts:146-179`) and `validateOddsFreshness` (`:188-194`) test.

**Why it matters:** the anti-tautology design named in `normalizer.ts:73-75` is defeated for
every game priced by the ESPN keyless path and by TheRundown's v1 lines shape. Those rows are
**unconditionally fresh** — the gate compares now against now. A genuinely stale ESPN odds item
(ESPN's `items[0]` can be hours old) passes as if it had just moved, and the whole-feed liveness
check `validateOddsFreshness` can be satisfied by nothing but self-reported nowness.

Per AGENTS.md, `espn_public` is the primary book on the intended keyless path, so this is not a
corner case.

**Proposed fix:** read ESPN's own odds-item timestamp and TheRundown's v1 per-line update field,
and where a source genuinely publishes none, emit `null` and let the game be dropped as
not-provably-fresh — the same fail-safe `normalizer.ts:159` already applies to an unparseable
timestamp. Never substitute the local clock.

**Risk of fix:** in the short term more games get dropped as not provably fresh and the board
thins. That is the correct direction, but it is a real availability cost and a founder call.

---

### F-7 — MAJOR. The displayed "Data Quality" score contains a 30-point freshness term that is full marks by construction

**Evidence:**

- `packages/data-ingestion/src/context-enrichment.ts:407-409`:
  `const freshnessMinutes = (Date.now() - fetchedAt.getTime()) / 60_000;` and
  `const freshnessScore = Math.max(((90 - freshnessMinutes) / 90) * 30, 0);`
- `packages/prediction-engine/src/game-context.ts:288-289` mirrors it exactly; `:727-733` feeds it
  from `context.dataFreshnessMinutes`, which `process-sport.ts:1002` computes as
  `(Date.now() - fetchedAt.getTime()) / 60_000`.
- `fetchedAt` is set at `process-sport.ts:313` at the top of the same run.
- `apps/web/app/api/picks/route.ts:317` serves `dataQualityScore` with the comment
  "Always visible — trust transparency"; `pick-card.tsx:224, 706` renders it under the label
  **"Data Quality"**.
- The pick is re-upserted with a fresh `dataQualityScore` on every cycle
  (`process-sport.ts:1097-1112`), so it never decays.

**Why it matters:** 30 of the 100 points of a publicly displayed quality score measure the elapsed
time between two statements in the same function. It is near-30 on every pick, always, and it
cannot fall. The score reads as though freshness were being assessed; it is not. The other 70
points (book coverage, market coverage) are real.

**Proposed fix:** base the freshness term on the upstream `bookmakerLastUpdate` (blocked on F-5's
column) or drop the term and rescale the remaining components with the label changed to say what
it actually measures. Do not lower any threshold.

**Risk of fix:** displayed Data Quality scores will drop by roughly 30 points across the board.

---

### F-8 — MAJOR. `Game.currentEdgeIndex` has no writer anywhere in the repository and is read by nine display paths on two different scales

**Evidence:** the exhaustive grep above (output reproduced in "What I checked") returns, outside
tests and fixtures: one doc comment, two migrations, two field-name lists in
`scripts/ops/merge-duplicate-games.ts`, and **thirteen reader sites. No writer.**

Readers:
`apps/web/lib/board/state.ts:846, 863, 878`, `apps/web/lib/board/passes.ts:283, 355`,
`apps/web/lib/bot-outbox/records.ts:129, 168`,
`apps/web/lib/intelligence-graph/index.ts:153`, `apps/web/lib/game-room/load.ts:186`,
`apps/web/lib/studio/load.ts:57`.

Two distinct problems on top of the missing writer:

1. **Two scales in one column, acknowledged in code.**
   `packages/prediction-engine/src/scoring.ts:96-99` says `toEdgeIndex` must hard-clamp because of
   "a raw-edge fraction persisted to `Game.currentEdgeIndex` / `GateDecision.edgeIndex`". The
   repo's own fixtures carry both scales:
   `apps/web/__fixtures__/intelligence-graph/happy-path-canonical.ts:31` has `2.7` while
   `apps/web/__fixtures__/intelligence-graph/game-node.ts:13` has `71`. `toEdgeIndex`
   (`scoring.ts:107-110`) rounds and clamps, so a real +3.1% edge stored as `0.031` is displayed
   as **0**, indistinguishable from no edge — it does not refuse, it silently reports the wrong
   number.
2. **`intelligence-graph/index.ts:153` returns it raw** (`edgeIndex: game.currentEdgeIndex ?? null`)
   with no `toEdgeIndex`, and that is the value the **public, unauthenticated** Edge Index embed
   reads (`apps/web/lib/embed/edge-index.ts:75-77`), the surface whose header calls Edge Index
   "the free trust signal ... free by design".
3. **`bot-outbox/records.ts:129`** — `edgeIndex: pick.game.currentEdgeIndex ?? pick.edgeScore`
   silently substitutes a *different quantity* (the pick's 0-100 edge component) under the same
   name when the column is null, which per the grep is the normal case. So a bot post's
   "Edge Index" is one statistic sometimes and a different one the rest of the time, with nothing
   marking which.

**Why it matters:** Edge Index is the free public trust signal and the embeddable distribution
surface. Today it is either empty, or a legacy value on an unknown scale, or a quietly
substituted different metric.

**Proposed fix:** decide whether `Game.currentEdgeIndex` is alive. If it is, one writer must own
it on one documented scale. If it is not, remove the `??` fallback at `records.ts:129` and
`state.ts:846` (a null Edge Index should render "pending", which `toEdgeIndex` already supports)
and let the column go unread rather than serve a substitute.

**Risk of fix:** the board and bot posts will show "Edge Index pending" more often. Removing the
`??` fallback is the honest change and it makes an existing gap visible rather than creating one.

---

### F-9 — MAJOR. The line we display is refreshed; the line we grade against is frozen. They are different numbers and only one is shown

**Evidence:**

- `packages/prediction-engine/src/settlement.ts:137-142` — `selectGradingLine` returns
  `clvLockLine ?? line`, and every grader uses it: `settle-sport.ts:650`,
  `free-settlement-runner.ts:660`, `settle-backfill.ts:345`, `zero-sit-lane.ts:1103`. Consistent,
  and correct.
- `clvLockLine` is create-only (`schema.prisma:553-558`: "Lock fields are captured ONCE at
  creation ... so they are immutable").
- `packages/ingestion-pipeline/src/process-sport.ts:1097-1112` — `pickUpdateData` includes
  `selection` and `line`, and `:1160-1170` applies it to any pick still `PENDING`. A side flip is
  frozen (`:1136-1155`); a *line move on the same side* is not.
- `apps/web/app/api/picks/route.ts:284-285` serves `selection: displaySelection(pick.selection)`
  and `line: pick.line` — the refreshed values.
- `clvLockLine` is exposed on exactly one route, and it is an ops route:
  `apps/web/app/api/ops/settlement-rca/route.ts:157, 217, 296`. It reaches no public surface.
- `apps/web/lib/board/load-gate-slate.ts:415-450` documents this precise hazard ("HAZARD 1 ...
  rewritten on every refresh cycle while a pick is PENDING") and handles it correctly for the
  gate slate, so the problem is known and fixed in one place and not in the public one.

**Why it matters:** a subscriber reads "Chiefs -3.5" on the board and their W/L is computed at
-3. The two can differ by a half point on exactly the picks where a half point decides the
result. Nothing on the card says which number is binding.

**Proposed fix:** serve `clvLockLine` on `/api/picks` and render the locked line as the pick, with
the current market line shown beside it as movement (the `lineMovement` chip already has the slot
and already carries a `(home-team perspective)` disclosure at `pick-card.tsx:575`).

**Risk of fix:** the card gains a number and the "current" line has to be relabelled; no grading
behaviour changes.

---

### F-10 — MAJOR. `confidence` and `edgeScore` mean two different things depending on which generator wrote the row, under one label

**Evidence:**

- Book-priced engine: `packages/prediction-engine/src/scoring.ts:527-535` —
  `confidence = round(clamp(consensusScore + depthScore + edgeComponentScore + volatilityPenalty
  + lineMovementScore + restAdvantageScore + ... + 10, 0, 100))`. A weighted sum of factor
  scores. `:504` — `edgeScore = clamp(round((edgeComponentScore / WEIGHTS.EDGE_COMPONENT_MAX) *
  100), 0, 100)`.
- Signal slate: `packages/ingestion-pipeline/src/generate-signal-slate.ts:431` —
  `const confidence = Math.round(trueProb * 100);` — a probability. `:445` —
  `const edgePts = Math.max(0, Math.round((trueProb - 0.5) * 100));` — a distance from a coin
  flip.
- Both write the same `Pick.confidence` / `Pick.edgeScore` columns and both are served by
  `apps/web/app/api/picks/route.ts:307, 313`.
- `apps/web/components/picks/pick-card.tsx:147` labels confidence "How strongly the model likes
  this pick, 0-100"; `:164` labels edge **"How much better our number is than the market price,
  0-100. Higher = more value."**
- `apps/web/lib/picks/public-edge-score.ts:1-13` already states the problem in its own header:
  "its edgeScore is round((trueProb - 0.5) * 100) ... **An 'edge' without a book line is not an
  edge index**", and `:19` withholds it — but only from viewers who cannot see confidence. A Pro
  or Elite subscriber is served the signal-slate number under the market-comparison label.
- Per the established session finding, 89% of published MONEYLINE picks carry no
  `marketFairProb`, i.e. they are signal-slate rows. So the mislabel is the majority case, not
  the exception.

**Why it matters:** "how much better our number is than the market price" is a factual claim about
a comparison that was never performed on those rows — there is no book price to compare to
(`bookmakerCount === 0`). The fix already exists as a leak guard and was not extended to the
labelling.

**Proposed fix:** either give the signal-slate row a distinct field, or make the card read the
`bookmakerCount === 0` flag it already receives and change the label and tooltip for those rows
(the copy `NO_BOOK_PRICE_LABEL` at `display-selection.ts:19` already exists for the line slot).
No gate, threshold or number changes.

**Risk of fix:** none to the engine; it is a display and payload change.

---

### F-11 — MAJOR. A spread is a mean across books with no plausibility bound outside baseball, and TheRundown's v2 alternate lines feed that mean last-wins

**Evidence:**

- `packages/prediction-engine/src/scoring.ts:404, 411` — `const spreads = spreadOdds.map(o =>
  o.spread as number);` then `const avgSpread = spreads.reduce(...) / spreads.length;` and
  `:648-652` stores it as `line: avgSpread`. `scoreTotalPick` at `:684-686` does the same for
  `avgTotal`.
- The only ladder guard is baseball: `:920` `BASEBALL_RUN_LINES = [1.5, 2.5, 3.5]`, applied at
  `:430` via `isPublishableSpreadLine`. The comment at `:901-919` records the measurement: "355
  of 725 published MLB spread picks carried a line that is not a run line" and "8 of 12
  bookmakers carry MLB spread rows up to 19.5, which is where the contamination enters."
  Football, basketball and hockey spreads have **no** equivalent bound.
- A candidate entry point for that contamination, in the ingest layer:
  `packages/data-ingestion/src/rundown-client.ts:342-357` iterates
  `participants[].lines[]` — which is an **alternate-lines array** — and calls `touch(...)` for
  every row. `touch` at `:319` does `acc.outcomes.set(name, ...)`, so **the last line row in the
  array wins** for that (affiliate, market, side). There is no selection of the main line, and no
  check that the home side's chosen point and the away side's chosen point came from the same
  alternate.
- `packages/data-ingestion/src/normalizer.ts:106` then keeps only `spread: home?.point` and drops
  the away point entirely, so an inconsistent home/away pair is not detectable downstream.
- `sanitizeAmericanPrice` (`normalizer.ts:33-38`) guards prices. **Nothing guards points.**
- The v1 shape at `rundown-client.ts:236` reads `Number(sp["point"] ?? sp["spread_home"] ??
  sp["home"])` with no bound at all; if a payload used `home` for a price, the point would become
  e.g. -110.

**Why it matters:** the published `line` is an arithmetic mean that may sit at no book, and it is
the number the subscriber is told to bet and the number the pick is graded against (F-9). The
MLB symptom is already measured and documented; the same mechanism has no guard for the other
sports and the ingest-side entry point is unguarded for all of them.

I state the Rundown v2 alternate-lines path as a **candidate** mechanism consistent with the
documented MLB symptom. **NOT VERIFIED** that it is the actual source of the 19.5 rows — that
needs the stored `odds` rows and their `bookmaker` keys, which I cannot read.

**Proposed fix:** at ingest, refuse a spread/total point outside a per-sport plausibility band the
way `sanitizeAmericanPrice` refuses a non-American price, and in `v2MarketsToBookmakers` select
one line per (affiliate, market) deterministically — the row whose two sides are closest to
price parity, or the first — instead of letting the last one win. Refuse, do not repair.

**Risk of fix:** touches the frozen engine boundary if the band is applied in `scoring.ts`
(`MODEL_VERSION` is frozen by `scripts/guardrails/model-freeze.mjs`). Applying it in the
normalizer instead changes what enters the engine, which is still a behaviour change and needs
the owner's call.

---

### F-12 — MAJOR. `Odds.bookmaker` collapses every ESPN-routed provider to one key, so the book that set the price is discarded at ingest

**Evidence:**

- `packages/data-ingestion/src/espn-odds-client.ts:289-292` reads `items[0]` and its
  `provider.name`; `:353-357` emits `key: "espn_public"` with `title: "ESPN/" + providerName`.
- `packages/ingestion-pipeline/src/process-sport.ts:775-788` stores only
  `bookmaker: odds.bookmaker` — the key. The `title` is never persisted; `schema.prisma:423-452`
  has no column for it.
- `packages/prediction-engine/src/publish-time-market-p.ts:36-39` documents the consequence
  itself: "`espn_public` is ESPN's routed DraftKings line ... and the odds row does not say which
  provider ESPN routed, so `espn_public` and `draftkings` in one snapshot count as two keys here
  as they did in the engine."

**Why it matters:** two effects. (a) `MIN_BOOKMAKERS = 2`
(`packages/prediction-engine/src/constants.ts:105`) counts distinct keys, so `espn_public` plus
`draftkings` reads as two independent books when it may be the same book twice — inflating market
depth, the consensus percentage, and the public `bookmakerCount` in the reason string "backed by
N bookmakers". (b) ESPN can route a different provider per event, so which book actually priced
any given pick is unrecoverable from the row.

**Proposed fix:** persist the provider (either as a `bookmakerTitle` column or by keying as
`espn_public:<provider>`) and de-duplicate by real book identity before counting.

**Risk of fix:** changing the key shape changes book counts, which changes which picks clear
`MIN_BOOKMAKERS`. It is a publishing-behaviour change and belongs to the owner.

---

### F-13 — MINOR (latent, currently unreachable). `indexFinals` collapses two games of a series or doubleheader into one key with silent last-write-wins

**Evidence:** `apps/web/lib/data-sources/score-verification.ts:57-87` builds a single
`Map<string, FinalScore>` keyed `date|homeToken|awayToken` (`:52-55`). Two completed games between
the same two teams on the same UTC date overwrite each other at `:81` with no ambiguity signal,
and `lookupFinal` at `:90-101` returns exactly one. `dateKey` at `:41-44` is UTC, so a 20:10 ET
game rolls to the next day and can also collide with the next day's fixture.

That is precisely the C-247 failure shape — one game's score served for another — implemented
without the doubleheader and kickoff-drift guards that `free-score-persist.ts:288-430` and
`free-settlement.ts:547-565` were built to provide.

**Why it is MINOR today:** a grep for `lookupFinal|crossCheckScore|indexFinals` across
`apps packages scripts workers` returns only `apps/web/__tests__/score-verification.test.ts`.
Nothing in production imports it. Only `foldDiacritics` and `normalizeTeamToken` from that module
are used elsewhere (`free-settlement.ts:30`).

**Proposed fix:** delete the unused index/lookup/cross-check exports, or add the same
`nearestByKickoff` + tie-refusal discipline before anything wires it up. Leaving a
known-unsafe matcher in the tree next to the guarded one invites its reuse.

**Risk of fix:** none; it is unreferenced.

---

### F-14 — MINOR. A missing kickoff in two keyless adapters becomes "now"

**Evidence:**

- `packages/data-ingestion/src/espn-odds-client.ts:175` —
  `const commence = String(c["date"] ?? e["date"] ?? new Date().toISOString());`
- `packages/data-ingestion/src/rundown-client.ts:164-167` —
  `String(e["event_date"] ?? e["date_event"] ?? e["commence_time"] ?? e["schedule"] ?? "") || new
  Date().toISOString();`

That value becomes `OddsApiEvent.commence_time`, then `NormalizedGame.commenceTime`
(`normalizer.ts:46`), then `Game.commenceTime` on upsert.

**Why it matters:** `Game.commenceTime` is the anchor for every kickoff guard in the settlement
system — `free-score-persist.ts:282` (has it started), `MAX_KICKOFF_DRIFT_MS` binding at
`:402-412`, and the exact-match write predicates at `free-settlement-runner.ts:340` and
`settle-backfill.ts:604`. A fabricated kickoff of "now" makes a game look already started and
poisons every one of those bindings. The fixture confirmer (`process-sport.ts:818-877`) mitigates
pick generation but not the stored value.

**Reachability NOT VERIFIED** — both fallbacks require the feed to omit every date field, which I
could not test. The correct behaviour regardless is to drop the event.

**Proposed fix:** return `null` from the adapter for an event with no parseable kickoff and skip
it, the same fail-safe `normalizer.ts:159` applies to unparseable timestamps.

**Risk of fix:** negligible; it only drops events that carry no usable time.

---

### F-15 — MINOR. ClubElo, an input to `rankingP`, is fetched over cleartext HTTP

**Evidence:** `packages/data-ingestion/src/clubelo-client.ts:20` —
`const CLUBELO_BASE = "http://api.clubelo.com";` and
`packages/data-ingestion/src/source-registry.ts:277` — `baseUrl: "http://api.clubelo.com"`.
It is the only cleartext data source in either directory (grep output above).

Its output flows to `IndependentMarketFairValue` (`clubelo-client.ts:325-331`), into
`buildIndependentFairValues` (`process-sport.ts:1043-1052`), into `deriveRankingProbability`
(`scoring.ts:550-553`) and so into the published `rankingP` and the independent-edge factor.

**Why it matters:** an unauthenticated, unencrypted transport for a number that becomes part of a
published probability. Any on-path actor can change it and nothing downstream would notice; the
soft-fail-to-null discipline protects against absence, not against alteration.

**Proposed fix:** try `https://api.clubelo.com` first and treat a TLS failure as a soft-fail null
rather than falling back to HTTP.

**Risk of fix:** if ClubElo does not serve HTTPS, soccer independent fair values go dark. That is
a real capability loss and a founder call, not an agent's.

---

### F-16 — MINOR. `freshnessConfidence` on the sources cockpit is derived from a wiring enum, not from any timestamp

**Evidence:** `apps/web/lib/data-sources/source-confidence.ts:32` documents the field as "Trust
that what we hold is current"; `:105-125` `dataAndFreshness` maps the wiring status enum
(`wired`, `scheduled-code`, `adapter-ready`, ...) straight to a confidence level. No timestamp is
read. `status: "scheduled-code"` returns `freshness: "high"` unconditionally.

Mitigating: `proofNote` at `:151-155` is honest ("Derived from ... wiring status"), and `:146`
adds the limitation "Freshness unproven. Validate timestamps before treating as live" when the
level is low or unknown — but never when it is "high", which is the case that most needs it.

**Why it matters:** low, because it is an internal cockpit surface. But it is another instance of
the pattern this dimension is looking for: a field named for currency whose value traces to a
configuration constant.

**Proposed fix:** rename the field to reflect what it measures (wiring maturity), or bind it to
the source's last successful fetch timestamp, which `lib/sources/source-reliability.ts` already
tracks per the module's own cross-reference at `:22-23`.

**Risk of fix:** cockpit copy only.

---

### F-17 — MINOR. The doubleheader-safe identity window is hard-coded to one sport key

**Evidence:** `packages/ingestion-pipeline/src/game-identity.ts:37, 47, 51` —
`GAME_IDENTITY_COMMENCE_MATCH_MS = 18h`, `BASEBALL_COMMENCE_MATCH_MS = 2h`, and
`commenceMatchMsFor(k) { return k === "baseball_mlb" ? 2h : 18h; }`.

The 2h window's stated reason (`:39-46`) is that "feed clocks for the SAME game differ by
minutes, never hours" — an argument that is sport-independent. The 18h default therefore permits
a feed's scores row to be resolved onto a `games` row whose kickoff is up to 18 hours away, in
every sport but MLB, via the `resolveCanonicalGame` fallback at
`packages/ingestion-pipeline/src/settle-sport.ts:403-434`.

**I am not claiming this is the MLS mechanism in C-247.** AGENTS.md rules out series propagation
for MLS on the grounds that those clubs do not play on consecutive days, and 18 hours does not
reach a different day's fixture either. **NOT VERIFIED** as a cause of anything. It is recorded
as a structural asymmetry: the tolerance that makes MLB safe is denied to every other sport for
no stated reason.

**Proposed fix:** narrow the default to the "differ by minutes, never hours" claim the comment
itself makes, with a per-sport widening only where a feed is known to disagree by hours.

**Risk of fix:** narrowing the identity window creates duplicate `games` rows where two feeds
disagree by more than the new tolerance — which is C-163's stranding problem. Needs measurement
against production before changing, so this is a proposal to investigate, not to apply.

---

### F-18 — MINOR. Bot posts publish an unverified final score and an Edge Index that may be a different metric

**Evidence:** `apps/web/lib/bot-outbox/records.ts:148` — `finalScore: finalScore(pick.game)`
reads `games.homeScore/awayScore` directly, the same rows C-247 shows to be contradicted in 25
of 169 MLB cases. `:129` is the Edge Index substitution from F-8.

This is not a new defect class, it is a blast-radius note: the corrupted finals do not stop at
`/picks` and the calibration sample; they are also posted to social with the outcome attached.

**Proposed fix:** none independent of C-247 and F-8. Recorded so the remediation scope is
complete.

**Risk of fix:** n/a.

---

## What I checked and found CORRECT

These are places where the ingest-to-display contract is held, several of them guarding exactly
the failure modes above. They should not be "simplified" away.

1. **American-price boundary guard.** `normalizer.ts:33-38` drops any price with
   `|price| < 100`, so a decimal price leaking through `oddsFormat=american` cannot become a ~98%
   implied probability. The comment names the "Edge Index 100" board bug it was written for.
2. **Non-numeric score handling.** `normalizer.ts:270-274` collapses `"PPD"` / `"-"` / `""` to
   `null` rather than `NaN`, so a non-game cannot slip the null guard and grade as a WIN.
3. **Both-scores-or-nothing, and never overwrite a FINAL.** `settle-sport.ts:443-484`,
   `free-score-persist.ts:456-501`, `free-settlement-runner.ts:337-350`,
   `settle-backfill.ts:610-640` all carry the guard in the WRITE predicate, not only in a
   preceding read, so a concurrent write cannot slip between. `settle-sport.ts:545-548`
   additionally refuses to grade a pick against a score it refused to store.
4. **Doubleheader and series binding.** `free-score-persist.ts:288-430` collects *all* matching
   finals, filters by fixture placement (`finalMatchesNearestFixture`), narrows by kickoff
   (`nearestByKickoff`), refuses on a tie (`AMBIGUOUS_MATCH`), and refuses a lone stale candidate
   beyond `MAX_KICKOFF_DRIFT_MS` (`KICKOFF_DRIFT`). `nearestByKickoff`
   (`free-settlement.ts:547-565`) deliberately keeps both candidates of a doubleheader so the
   caller holds rather than guesses. This is the correct shape.
5. **Containment-length floor on team matching.** `free-settlement.ts:130-138`
   `MIN_CONTAINMENT_TOKEN_LENGTH = 4`, with the measured evidence in the comment ("LA" inside
   atLAnta / orLAndo / philadeLphiA / portLAnd; "FLA" inside Red FLAsh). `GENERIC_TEAM_TOKENS`
   (`:213-218`) stops bare "fc"/"united" matching a whole MLS board.
6. **Orientation is explicit and consistent.** `scoring.ts:646-652` stores `line` in home-team
   perspective and says why (settlement reads home; storing `chosenSpread` previously mis-graded
   away-favoured picks). `settlement.ts:100-108` grades `homeMargin + line`.
   `free-score-persist.ts:95-115` and `free-settlement.ts:455-468` handle the flipped-orientation
   match explicitly. `pick-card.tsx:575` discloses "(home-team perspective)" in the movement
   tooltip.
7. **Three-way market refusal.** `scoring.ts:896-898, 941` refuses a soccer moneyline outright
   rather than publishing a two-way de-vig of a three-way market, and the calibration loader
   excludes them structurally (`publish-time-market-p-loader.ts:123`,
   `proven-path-rows.ts:58-66`). The key-versus-display-name defect that made this guard inert is
   fixed and documented in place at `process-sport.ts:1063-1070`, including the measured cost
   ("148 soccer moneylines were published"), and the second generator carries the same guard
   (`generate-signal-slate.ts:353-356`).
8. **Clock-skew ceiling on upstream timestamps.** `normalizer.ts:17, 155, 163` treats a
   bookmaker `last_update` more than five minutes in the future as not-provably-fresh rather than
   as fresh, so a poisoned future-dated row cannot manufacture freshness. `freshnessDiagnostics`
   (`:204-246`) reports `unparseableRows` and `futureDatedRows` separately.
9. **Dynamic freshness can only tighten.** `freshness-schedule.ts:44` clamps the schedule with
   `Math.min(scheduled, FRESHNESS_THRESHOLD_MS)`, so enabling dynamic mode cannot loosen the gate.
10. **Chaos base-URL override refused in production.** `config.ts:165-197`, resolving the
    environment by first non-empty value so a blank `VERCEL_ENV` cannot bypass the refusal.
11. **Kalshi refuses a trade print as a quote.** `kalshi-listing-quote.ts:116-127` returns
    `last_trade_only`, `inverted_book`, `wide_spread` or `out_of_range` rather than deriving a
    probability from a last price or a candle close.
12. **PredExon unit difference documented and handled.** `predexon-client.ts:26-29` records that
    PredExon prices are dollars where Kalshi's are cents, verified against the live API, and
    matches the convention `impliedYesProbability` expects. This is the model the other adapters
    should follow.
13. **ESPN scoreboard page-size and division-group coverage.** `espn-scores.ts:30-53` pins
    `limit=300` inside a live-measured working range (999/1000 silently fall back to a 25-event
    page) and adds `groups=81` (FCS) and `groups=50` (D-I) where the default board is incomplete.
14. **`requireAllGroups` for the lane that reads absence as evidence.**
    `espn-scores.ts:177-184, 224` and `zero-sit-lane.ts:1060-1078`: the void lane treats any ESPN
    error as an incomplete board and voids nothing that cycle, while the graders keep the
    permissive default. Correct asymmetry.
15. **`selectGradingLine` used by every grader.** All four settlement paths grade on the locked
    line (see F-9 for the display half, which is the only gap).
16. **Settle-time evidence records the score used.** `free-settlement-runner.ts:255-266` and
    `settle-backfill.ts:576-586` write `settledWith.homeScore/awayScore` into
    `PickSettlementEvent.payload` inside the settlement transaction, explicitly so a later
    game-row change cannot hide a mis-grade. This is the right instinct and is what F-1 asks for
    at the game level.
17. **The gate slate solves the average-versus-spot mismatch properly.**
    `load-gate-slate.ts:415-450` reconstructs the same consensus statistic the lock line was
    computed as, rather than comparing a multi-book average to one book's spot quote, and
    overrides the prices from the same batch so spread and price come from one computation.
18. **`publish-time-market-p.ts` reproduces the receipt's method rather than inventing a second
    one.** `:1-59` states the method, imports the engine's own `americanToImpliedProbability` and
    `removeVig` (`:62`), refuses `rundown_default` as a non-book key (`:98`), reports single-book
    resolutions under a distinct provenance tag (`:191-195`), and reports `oldestBookAt` beside
    `snapshotAt` so a reader can see the snapshot spread.
19. **The signal-slate marker is stripped at render, not in the database.**
    `display-selection.ts:1-19` — the internal `(model signal)` suffix stays on the stored row and
    the public surface says the same thing in plain words.
20. **Board de-duplication prefers completed rows.** `espn-scores.ts:213-215` and
    `multi-source-scores.ts:98-109` both prefer a completed row over an incomplete one when
    merging boards, so a partial capture cannot displace a final.
21. **MLB StatsAPI postponement handling.** `mlb-statsapi.ts:55-79` — MLB marks postponed games
    `abstractGameState = Final` with coded state D, and the adapter refuses to treat those as
    completed. (Its `sourceId` is still wrong; see F-2.)
22. **`calculatePickResult` fails loud.** `settlement.ts:118-125` throws on an unhandled pick
    type rather than falling through to PUSH, refusing to fabricate a no-loss result.

---

## What I could not check and why

1. **Anything requiring production data.** This audit is read-only over the source tree with no
   database access. Every claim above is about code. Which lane wrote the C-247 finals, how many
   `odds` rows carry an out-of-ladder point, how many games have a non-null
   `currentEdgeIndex` and on which scale, and what fraction of published picks have
   `line !== clvLockLine` are all measurable and all unmeasured here.
2. **Live feed shapes.** I could not confirm whether ESPN's core odds item carries a usable
   upstream timestamp (F-6), whether TheRundown's v1 `spread` blob ever populates the
   `sp["home"]` key the code reads as a point (F-11), or whether either adapter's
   date-fallback path (F-14) is ever reached. Those need a captured live payload.
3. **Whether ESPN reports `completed: true` for a canceled or abandoned contest.**
   `espn-scores.ts:142` takes `statusType.completed` at face value and nothing checks
   `statusDetail` on the ESPN scores path (the postponed check at `free-settlement.ts:795-805`
   runs only on the VOID lane). If ESPN ever sets `completed: true` on a 0-0 abandonment, that
   would grade as a real final. **NOT VERIFIED** in either direction.
4. **The full test suite.** I ran one targeted test to verify the clearance behaviour that F-4
   rests on. I did not run `npm run typecheck`, `npm run lint`, `npm run test` or
   `npm run guardrails` — this audit proposes no code change, so there is nothing of mine for
   them to check.
5. **Sources outside the score/odds spine.** nflverse, ESPN FPI (gated fail-closed per
   AGENTS.md), open-meteo, Reddit narrative, Sleeper, FPL and the DFS/props adapters were
   inventoried but not audited field-by-field; they do not feed the published pick line, the
   final score, or the settled record, which is where this dimension's risk concentrates.
6. **`GateDecision.edgeIndex` scale.** `scoring.ts:98` names it alongside
   `Game.currentEdgeIndex` as a possible raw-fraction column. I traced `currentEdgeIndex` to zero
   writers but did not trace `GateDecision.edgeIndex`'s writer, so its scale is **NOT VERIFIED**.
   `bot-outbox/records.ts:168` and `board/state.ts:572` read one as a fallback for the other,
   which only makes sense if they share a scale.
