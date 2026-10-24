# Real-Time Ingestion Requirements

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Every count is measured**, by the scripts in `reconciliation/` or by a grep
whose command is quoted.

---

## 0. The headline: the real-time spine ALREADY EXISTS

The mandate asks for "real-time where possible: live X/tweets, pressers,
formation/vision updates, injuries, market/prediction-market moves,
settlements."

**A real-time wire pipeline exists and is live.** It is not dark, and it is
not imaginary:

```
104 curated RSS feeds
   ├─ 32 NFL club official feeds        (https://www.<club>.com/rss/news)
   ├─ 52 beat reporters                 (Bluesky profile RSS)
   └─ 20 insiders                       (Bluesky profile RSS)
        │
        │  cron: */10 * * * *   (every 10 minutes)
        ▼
apps/web/app/api/cron/refresh-wire/route.ts
        │  refreshWireFromRoster({ now })
        ▼
apps/web/lib/news/wire-store.ts
        │  toCuratedRssFeeds()  → classifySignal() → toWireReport()
        │  CORROBORATION_WINDOW_MINUTES = 6*60   (:97)
        │  MAX_REPORTS_PER_SIGNAL = 12           (:100)
        │  selfSourced feeds never corroborate themselves (:77)
        ▼
signals table  (key prefix "wire."   — WIRE_KEY_PREFIX, wire-store.ts:44)
        │  wire.injury-return   14 rows
        │  wire.injury-out      12 rows
        │  wire.coach-report    11 rows
        │  wire.role-up          2 rows
        │  wire.suspension       2 rows
        │  wire.trade            2 rows
        │  wire.weather          1 row
        ▼
apps/web/lib/watchlist/wire-alert-hook.ts  → dispatchWireReportAlerts
```

**Measured feed count** (`reconciliation/count_feeds.cjs` + a static parse of
`apps/web/lib/news/reporter-roster.ts`):

| Roster group | Count | Live? |
|---|---|---|
| `CLUB_FEEDS` (`club()`) | 32 | YES |
| `BEAT_FEEDS` (`beat()`) | 52 | YES |
| `INSIDER_FEEDS` (`insider()`) | 20 | YES |
| `ESPN_TEAM_FEEDS` (`espnTeam()`) | 32 | **NO — dropped** |
| **LIVE curated feeds** | **104** | |

`toCuratedRssFeeds` (`reporter-roster.ts:368-380`) drops `kind === "espn-team"`,
with the reason in the source: *"Probed 2026-09-15: every slug 302s to the
blogs index and serves no RSS... so the live wire never polls a known-dead
URL."* That is the right call and it is honestly documented.

**So the real-time spine is: 104 feeds → 10-minute latency → stored signals →
alert dispatch.** What is missing is not ingestion — it is the *downstream
reasoning* those signals should trigger (see §4 and
`reconciliation/reasoning_engine_continuous_loop_spec.md`).

---

## 1. Full cron inventory — 39 crons

`vercel.json`, all 39 entries with their measured cadence:

| Cadence | Path | Family | Latency class |
|---|---|---|---|
| `*/3 * * * *` | `/api/cron/watch-warm` | watch | near-RT |
| `*/10 * * * *` | `/api/cron/refresh-wire` | **wire / social** | **near-RT (10 min)** |
| `*/10 * * * *` | `/api/cron/watch-scheduler` | watch | near-RT |
| `*/15 * * * *` | `/api/cron/refresh-odds` | **market** | **near-RT (15 min)** |
| `*/15 * * * *` | `/api/cron/health-alert` | ops | near-RT |
| `0,30 * * * *` | `/api/cron/refresh-player-stats` | player | 30 min |
| `0,30 * * * *` | `/api/cron/gamma` | misc | 30 min |
| `1 * * * *`→`23 * * * *` | 11 hourly crons | mixed | hourly |
| `2,17,32,47 * * * *` | `/api/cron/board-fill` | **board** | 15 min |
| `5,20,35,50 * * * *` | `/api/cron/generate-signal-slate` | **slate** | 15 min |
| `7,22,37,52 * * * *` | `/api/cron/autonomy-cycle` | agent | 15 min |
| `10 6,12,18 * * *` | `/api/cron/game-weather-capture` | **environment** | 6-hourly |
| `20 6,12,18 * * *` | `/api/cron/prediction-market-snapshot` | **prediction market** | 6-hourly |
| `30 11 * * 3` | `/api/cron/ngs-ingest` | **vision/NGS** | weekly (Wed 11:30) |
| `*/10 * * * *` | `/api/cron/watch-scheduler` | watch | 10 min |
| `40 */6 * * *` | `/api/cron/calibration-metrics` | calibration | 6-hourly |
| `10 */4 * * *` | `/api/cron/backfill-independent-trueprob` | backfill | 4-hourly |
| `30 9 * * *` | `/api/cron/hydrate-cold-plane` | feature-store | daily |
| `0 9 * * *` | `/api/cron/ingest-player-stats` | player | daily |
| `45 9 * * *` | `/api/cron/run-formal-receipt` | formal | daily |
| `0 11 * * *` | `/api/cron/generate-drafts` | content | daily |
| `5 12 * * *` | `/api/ops/daily-truth` | content | daily |
| `35 12 * * *` | `/api/cron/microstructure-report` | market | daily |
| `15 7 * * *` | `/api/cron/backfill-team-efficiency` | backfill | daily |
| `0,30 * * * *` | `/api/cron/refresh-player-stats` | player | 30 min |
| `23 * * * *` | `/api/cron/signal-ledger-write` | **signal ledger** | hourly |
| `43 * * * *` | `/api/cron/signal-ledger-census` | signal ledger | hourly |
| `41 * * * *` | `/api/cron/arbiter-adjudication` | **adversary** | hourly |
| `25 * * * *` | `/api/cron/props-slate-shadow` | props | hourly |
| `55 * * * *` | `/api/cron/engine-dfs-slate` | DFS | hourly |
| `20 * * * *` | `/api/cron/settle-picks` | **settlement** | hourly |
| `15 */3 * * *` | `/api/cron/deliver-settlement-alerts` | settlement | 3-hourly |
| `45 * * * *` | `/api/cron/reconcile-entitlements` | billing | hourly |
| `15 * * * *` | `/api/cron/jarvis-snapshot` | agent | hourly |
| `0 */2 * * *` | `/api/cron/free-spine-health` | health | 2-hourly |
| `30 * * * *` | `/api/cron/drain-ai-telemetry-recovery` | telemetry | hourly |
| `30 6 * * *` | `/api/cron/prune-rate-limits` | ops | daily |
| `50 * * * *` | `/api/cron/repair-checkout-attempts` | billing | hourly |
| `0 4 * * 2` | `/api/cron/backfill-player-data` | backfill | weekly |
| `0 3 * * 2` | `/api/cron/backfill-historical-games` | backfill | weekly |
| `0 12 * * 0` | `/api/cron/backtest-calibration` | calibration | weekly |
| `0 13 * * 0` | `/api/cron/feature-recipe-backtest` | features | weekly |

---

## 2. Per-family latency targets and current state

| Family | Latency target | Current producer | Current state | Gap |
|---|---|---|---|---|
| **Social / X / tweets** | < 5 min | Bluesky RSS (52 beat + 20 insider), 10-min cron | **NEAR-RT (10 min)** for Bluesky | **X/Twitter has NO producer.** `workers/twitter-bot/{oauth1,sender,x-client}.js` exist (`x-client.js:19` targets `https://api.x.com`) but are imported by no route, cron, or workflow. @GalaxySportsHQ posting is manual. |
| **Pressers / coach reports** | < 5 min | `wire.coach-report` (11 rows), fed by the 10-min wire cron | **NEAR-RT** | 11 rows is thin. `intelligence/trust-signals/` has no live producer. |
| **Injuries** | < 15 min | `wire.injury-out` (12) + `wire.injury-return` (14) + `injury.availability` (7,858 rows) | **MIXED** — the wire path is near-RT; `injury.availability` is daily/batch | The 10-min wire only carries 26 injury rows vs 7,858 batch rows. |
| **Market / odds** | < 5 min | `refresh-odds` (*/15) → `odds_line_snapshots` | **NEAR-RT (15 min)** | 4,948,756 snapshots at 14,033 distinct stamps. Adequate. |
| **Prediction market** | < 15 min | `prediction-market-snapshot` (6-hourly) | **BATCH (6 h)** | Kalshi/Polymarket move on minutes. 6 h is a full market cycle. |
| **Formation / vision** | < 1 h | `ngs-ingest` (weekly Wed) | **BATCH (weekly)** | `vision.*` and `ftn.*` have only **32 entities** each (one per team, one snapshot). No per-play or per-game formation stream. |
| **Weather / environment** | < 1 h | `game-weather-capture` (6-hourly) | **BATCH (6 h)** | `wire.weather` has **1 row**. `game_signals` has 26 wind/precip/temp rows over 4 days. |
| **Settlement** | < 1 h post-game | `settle-picks` (hourly) | **NEAR-RT** | 4,340 settled picks, 2,374 games. Works. |
| **Literature premises** | on every signal | **audit branch**: `signal-ledger-write` (hourly) → literature bridge | **HOURLY, not per-signal** | The bridge is gated on `GSE_LITERATURE_BRIDGE=1` and fires on the hourly ledger cron. |

---

## 3. The signal table — what actually flows

Measured live (`reconciliation/measure_dark_inputs.cjs`):

| Key | Rows | Entities |
|---|---|---|
| `pgs.fantasy_ppr` | 36,539 | 1,449 |
| `pgs.target_share` | 31,144 | 1,287 |
| `pgs.receiving_epa` | 27,143 | 1,126 |
| `pgs.rushing_epa` | 14,112 | 843 |
| `injury.availability` | 7,858 | 1,707 |
| `pgs.passing_epa` | 4,189 | 280 |
| `ngs.avg_separation` | 1,717 | 242 |
| `ngs.yac_above_expectation` | 1,714 | 242 |
| `ngs.air_yards_to_sticks` | 751 | 72 |
| `ngs.cpoe` | 751 | 72 |
| `ngs.ryoe_per_att` | 35 | 35 |
| `vision.art_mean` / `pocket_depth_yd` / `soe_yd` | 32 each | 32 |
| `cognitive.*` (4 keys) | 32 each | 32 |
| `ftn.*` (5 keys) | 32 each | 32 |
| `qbr.total_qbr` | 32 | 32 |
| `snaps.starter_snap_share` | 32 | 32 |
| `wire.*` (7 keys) | 44 total | 1–14 each |

**32 distinct keys, 126,445 rows.** That is the "thousands of signals" — real,
but **17 of the 32 keys are the 32-team single-snapshot families** (vision,
ftn, cognitive, qbr, snaps), i.e. **one reading per team for the season**, not
a stream.

**The 17 "live" families are one row per team.** `vision.soe_yd` has 32 rows
for 32 teams. `ftn.motion_rate` has 32. There is no time dimension to them.
The 6,038 (entity, key) pairs with multiple captures are all `pgs.*` and
`injury.availability` — player stat rollups.

---

## 4. The gap: latency is fine, the DOWNSTREAM reasoning is not

**The real-time ingestion spine works.** The problem is what happens after
a signal lands.

| | State | Evidence |
|---|---|---|
| Signal lands in `signals` | YES | `writeSignalCandidates`, `apps/web/lib/ops/signal-ledger-writer.ts:375` |
| Signal is alerted to watchers | YES | `dispatchWireReportAlerts`, `apps/web/lib/watchlist/wire-alert-hook.ts` |
| Signal triggers **literature retrieval** | **YES on the audit branch** | `apps/web/lib/literature/literature-event-bridge.ts` → `retrieveForEvent` |
| Signal triggers **L1–L5 chain reconstruction** | **NO** | no caller from a signal write into `intelligence/integration/pipeline.py` (the chain builder at :131) |
| Signal triggers **adversary re-review** | **NO** | `adversary_review` (`intelligence/reasoning/adversary.py:357`) is not invoked from a signal write path |
| Signal triggers **situational trace update** | **NO** | `interpretSituation` (`packages/prediction-engine/src/reasoning/situational-engine.ts:105`) is called only from `dynamic-context-builder.ts:177`, which runs inside a slate build |
| Signal moves `trueProb` mid-week | **NO** | `trueProb` is computed in `scoreGame` during `processSport`, i.e. at slate build time |

**So: 10-minute signal latency, but the reasoning that consumes a signal
happens on the slate cadence (15 min board-fill) and only re-runs a full
rebuild.** A tweet at 12:04 that invalidates a thesis does not cause a
re-reason until the next board-fill — and the board-fill's *scoring* path
does not consume the reasoning surfaces at all.

This is the precise formulation of the mandate's gap, and it is the subject
of `reconciliation/reasoning_engine_continuous_loop_spec.md`.

---

## 5. The 21 DARK_NO_PIT evaluators — the producer gap, measured

`packages/ingestion-pipeline/src/signal-registry-extensions.ts` (924 lines).
Measured census: **21** evaluators with `blockedReason: DARK_NO_PIT`
(the file defines the constant at :39 as *"DARK: no point-in-time producer
on the mint path. Env keys are not a feed."*).

| Family | Count |
|---|---|
| EFFICIENCY | 9 |
| SITUATIONAL | 8 |
| MICROCLIMATE | 2 |
| LUCK | 1 |
| NARRATIVE | 1 |

**The structural cause, and the cheap fix.** Each evaluator reads its inputs
from `ctx.env` — environment variables — and the real implementation is a
clean typed module in `packages/prediction-engine/src/signals/`. Example
(`signal-registry-extensions.ts:135-166`):

```ts
evaluate: async (ctx) => {
  const isRoadTeam = bool(ctx.env, "IS_ROAD_TEAM");
  const restDays = num(ctx.env, "REST_DAYS");
  const opponentRestDays = num(ctx.env, "OPP_REST_DAYS");
  const travelDistanceMiles = num(ctx.env, "TRAVEL_DISTANCE_MILES");
  const isDivisionRivalry = bool(ctx.env, "IS_DIVISION_RIVALRY");
  if (isRoadTeam == null || restDays == null || ...) return null;
  const res = evaluateShortWeekRoadDeficit({ isRoadTeam, restDays, ... });
  ...
}
```

versus the real module
(`packages/prediction-engine/src/signals/situational/short-week-road-deficit.ts:32`):

```ts
export function evaluateShortWeekRoadDeficit(ctx: ShortWeekRoadContext): ShortWeekRoadResult
```

**`REST_DAYS` is already in the database.** Measured: `games.restDaysHome` is
populated on **2,130 of 4,832** games and `restDaysAway` on 2,082. So for this
evaluator the missing producer is not a new feed — it is a 5-line adapter
that reads `games.restDaysHome` instead of `process.env.REST_DAYS`.

**The measured verdict for all 21:** `PRODUCER-MISSING` (0 with a producer
already wired). The census is in
`reconciliation/dark_sources_census.json`, with each evaluator's declared
`dataDependencies` and the exact env keys it reads.

**Deletion candidates.** Two of the 21 are worth deleting rather than wiring:
- `nfl_turf_surface_fatigue` needs `IS_ARTIFICIAL_TURF` and
  `TURF_SOFTNESS_INDEX` — **turf softness is not measured by anything**;
  there is no turf-physics feed. Wiring it would mean inventing a number.
- `nfl_age_conditioned_rest` needs `ROSTER_SNAP_WEIGHTED_AGE` — `players`
  has 1,449 rows, so age is derivable, but a "snap-weighted age" is a
  construction, not a measurement. It should be proposed as a new metric with
  a producer, not activated.

The repo's own rule — *"a source with no point-in-time producer is dark, it
must receive a producer or be deleted"* — is right, and for these two the
honest answer is deletion.

---

## 6. Requirements, per family, as specified

**R1 — Social/X producer (MISSING).** Target < 5 min. Requires: an X API
client that is actually called. `workers/twitter-bot/x-client.js:19` exists
and is dead. Requirement: a cron (or a stream) that writes `wire.*` rows from
X, gated on X API credentials being present, and a
`CORROBORATION_WINDOW_MINUTES` rule that keeps a self-sourced tweet from
corroborating itself (the pattern already exists at `wire-store.ts:77`).

**R2 — Presser producer (PARTIAL).** Target < 5 min. The wire cron already
carries `wire.coach-report` (11 rows). Requirement: expand the classifier's
presser coverage; the mechanism is in place.

**R3 — Injury producer (MIXED).** Target < 15 min. The wire carries 26
injury rows; `injury.availability` carries 7,858 batch rows. Requirement:
route the wire injury reports into the same `injury.availability` key so the
DARK evaluators and the reasoning see one source.

**R4 — Prediction-market producer (BATCH).** Target < 15 min. Currently
6-hourly. Requirement: move `prediction-market-snapshot` to `*/15`.

**R5 — Formation/vision producer (BATCH).** Target < 1 h. Currently weekly,
32 entities × 5 families. Requirement: a per-game formation/FTN extraction.
This is the hardest one and it depends on the BDB tracking pipeline.

**R6 — Weather producer (BATCH).** Target < 1 h. Currently 6-hourly with 26
game_signals rows over 4 days. `game-weather-capture` exists; the cadence is
the gap.

**R7 — Literature re-query on EVERY signal (BUILT, hourly).** Target: on
signal write. The bridge exists on the audit branch but fires on the hourly
`signal-ledger-write` cron. Requirement: move the hook into
`writeSignalCandidates` itself so it is per-signal, not per-cron-tick.

**R8 — Chain reconstruction on signal (MISSING).** The smallest missing
link, specified in `reconciliation/reasoning_engine_continuous_loop_spec.md` §4.

---

## 7. What to measure

The mandate asks: "Coverage is measured by how many previously dark sources
now have a live producer and appear in reasoning traces."

Two denominators, both measurable today:

| Metric | Current | Target | How measured |
|---|---|---|---|
| DARK evaluators with a live producer | **0 / 21** | ≥ 12 / 21 | `reconciliation/dark_sources_census.json` → `verdict` field |
| Signal families that appear in a reasoning trace | **0** (the reasoning surfaces are not on the publish path) | all live families | join `signals.key` against trace `observed_values` |
| DARK sources that appear in a reasoning trace | 0 | ≥ 1 | same join |
| Premises retrieved per event | **12.95** (audit branch, measured) | — | `lit.activation` count / `lit.retrieval_event` count |
| Premises that survived a conclusive intervention test | **0** (8 ran, all INCONCLUSIVE) | > 0 | `lit.intervention_test.verdict = 'PASS'` |
