# Total Signal Inventory (Session 0)

Date: 2026-09-30. Base: `main` at `2c73597e8` (#966). Research only, no code changes.
Mission source: `docs/ops/total-signal-wiring-program.md` (Session 0).
Filing note: the program doc names `docs/research/2026-09-30/total-signal-inventory.md`;
`AGENTS.md:9-25` retired `docs/research/` and requires `<bucket>/research/<date>/`, so this
lives in the `docs/engine/` bucket. `AGENTS.md` governs.

Evidence files (full tables, every row carries file:line):

- In-repo signal families, 44 rows: `total-signal-inventory-A-repo-signals.md`
- External sources, about 45 rows with flag, scheduler, cadence, sink: `total-signal-inventory-B-external-sources.md`
- arXiv-program corpus counts per family: `total-signal-inventory-C-corpus-family-counts.md`

## How to read this (honesty preamble)

- Every wiring-state claim traces to a grep named in file A or B. Three were re-run by the
  orchestrator before this was written: devig fix ancestry, `composeLedger` production callers,
  and the 8 `return null` registry bodies (all confirmed).
- No database was touched (`AGENTS.md:1238`, Law 7). Every row count is "count from docs, not
  re-measured". Current `signals` / `game_signals` counts are NOT VERIFIED here.
- No flag was read from a production environment. Flag defaults are read from code. Whether any
  flag is set in Vercel is NOT VERIFIED.
- No network call was made. Endpoint liveness is cited from dated docs, not re-probed.
- The leverage ranking below is a judgment built from three kinds of evidence (corpus counts,
  in-repo measurements, wiring gap size). No per-family accuracy lift has been measured anywhere
  in this repo, and for 8 families nothing can be measured yet because they were never observed on
  a settled pick (`docs/engine/research/2026-09-29/why-eight-signal-families-are-always-false.md`).
  Read the ranking as "where to build first", not "what is worth how much".
- NGS doctrine held: the feed is called "NGS feed" and no metric names appear.

## Corrections to the program doc's premises

1. Queue item 1 (devig adapter math) is already fixed. Commit `3e074c584` (PR #965) is an ancestor
   of main. `extended-signal-adapters.ts:411` now converts American to decimal (`:419`) before
   calling the real oracle (`:424`); `market-odds-adapters.ts:159` validates the method against
   the 7 real `DevigMethod` values (`:175`). Residual gap: the asymmetric-input tests the program
   asks for still do not exist. `extended-signal-adapters.test.ts:85` uses `-110,-110`;
   `market-odds-adapters.test.ts:77` passes `"proportional"`, which is not a valid method, so it
   silently hits the fallback. Neither test would fail if the old bug returned. A third adapter
   with the same name (`market-inplay-sizing-adapters.ts:153`) was always correct.
2. Queue item 2 ("`signals` has 0 rows") is stale. A writer exists
   (`apps/web/lib/ops/signal-ledger-writer.ts:249`, upsert `:284`, hourly cron `vercel.json:101`).
   `docs/ops/AGENT_LEDGER.md:563` (SIGNALS-1, 2026-09-28) records `written=84500` with 33,583
   candidates unwritten at the deadline. The 0-row statements at
   `docs/engine/research/2026-09-27/total-signal-wiring-spec.md:38` and `AGENT_LEDGER.md:551`
   predate the writer. Current count NOT VERIFIED; the read-only probe is
   `apps/web/app/api/ops/signal-ledger-state/route.ts:40-42`.
3. The real gap behind item 2 is the missing composer. `composeLedger`
   (`packages/prediction-engine/src/signal-ledger.ts:76`) has zero production callers: the only
   non-test hits outside its own file are two comments, one barrel export (`index.ts:1030`) and its
   read-only populator. The table is fuel with no engine. Its header (`signal-ledger.ts:20-21`)
   says it is not wired into the published pick score.
4. `game_signals` is written by exactly one path and two keys (`context-enrichment.ts:328,351`,
   SCHEDULE density only). Docs disagree on its size (5,002 vs 5,142). No production code writes
   WEATHER, INJURIES or RATINGS rows, so the weather reader
   (`apps/web/lib/intelligence-core/signal-adapters.ts:271`) cannot match in production.

## New structural findings the program should know before wiring anything

- Observation engine is starved. The only production bundle builder
  (`apps/web/lib/picks/intelligence-enrichment.ts:116-145`) sets `market` and `extraObservations`
  only. `engine.ts:63-75` declares 12 raw-DB surfaces (injuries, NGS, ratings, weather, snaps,
  game signals, ...) that nothing fills. The adapter math (`signal-adapters.ts:130,152,271`) runs
  over empty arrays in production. `universalSignalsFromPick` (`intelligence-enrichment.ts:201-225`)
  likewise supplies only `market.consensus` and `market.devig`.
- Registry inertness. 8 base definitions are `activationStatus: "ACTIVE"` with real `trustWeight`s
  but `evaluate` is `return null` (`signal-registry-definitions.ts:720,744,768,792,816,840,864,888`).
  All 22 extension evaluators (`signal-registry-extensions.ts:890`) read per-game scalars from
  `ctx.env` = `process.env` (`generate-signal-slate.ts:506`) and nothing in the repo writes those
  keys (for example `WIND_MPH`, `DEFENSIVE_PLAYS`). They abstain by construction. Env injected
  outside the repo is NOT VERIFIED.
- 8 snapshot families are permanently false (`0 / 3493` settled picks, measured 2026-09-29 by
  `scripts/ops/family-weight-evidence-census.ts`). Cause: the only `shadowEvidence` producer
  (`process-sport.ts:193`, call `:1196`) hard-stamps `BLOCKED_MISSING_SOURCE`. This is correct
  fail-closed behavior; the fix is a licensing/source decision, not a writer.
- About 30 data-source adapters are `adapter-no-production-caller`: the whole WIRE-40 cohort, all
  five pick'em intakes, FTN, PFF, and most free-tier clients. Exported and unit-tested, called by
  nothing in `apps/`, `packages/ingestion-pipeline/` or `workers/`.
- The free spine reports success with zero rows. 13 secondary free sources are unregistered, so
  `checkClearance()` denies every fetch before the network call while the run stamps HTTP 200 and
  `IngestionRun` SUCCESS (`docs/engine/research/2026-09-29/free-spine-why-dark.md:5,11`).
- Weight tuning is blocked. `tuneSignalWeights` (`tune-signal-weights.ts:95`) has no production
  caller and cannot build a sample: `teams` and `team_week_stats` held 0 rows, join returns 0 of
  3,451 settled picks (`AGENT_LEDGER.md:553`, TUNE-BLOCK-1).
- The continuous-signal tilt is a hardcoded shape, not a fitted number: `Math.tanh(v) * 0.35`
  (`continuous-signal-tilt.ts:49`), wired at `generate-signal-slate.ts:500-511`.
- Satellite cadence defect C-244: the scheduled `refresh-player-stats` entry has no query string, so
  NGS, snaps, injuries and depth satellites ran only inside a once-daily in-route window
  (`satellite-window.ts:5-23`). A full run on the current plan is NOT VERIFIED.
- Smaller items: duplicate 24-entry cron arrays in `vercel.json` and `apps/web/vercel.json` (drift
  hazard); `signal-ledger-census` route exists but is not scheduled; Kalshi fetch is wired but
  snapshot persistence is not (`kalshi-client.ts:22-25`); PrizePicks intake exists while the public
  connector copy says PrizePicks is not scraped (`apps/web/lib/integrations/connectors.ts:103-110`).

## Leverage ranking

Method. Rank = judgment over: (a) corpus weight, meaning verified-valuable paper count per family
from file C (keyword-tagged, approximate, counts overlap; the MASTER-PAPER-INDEX header reports
585/750 verified while this extraction's own ADAPT-token count is 864 of 1,471 matched notes, the
two definitions are not reconciled here); (b) in-repo measurements (`AGENTS.md:34-40` book-path
inversion on 2,641 settled picks; the 0/3493 census; the stated-confidence Brier 0.2675 / ECE
0.2339 at `docs/engine/research/2026-09-24/signal-wiring-catalog.md:36-48`, count from docs);
(c) size of the wiring gap, and whether the family unblocks others. The corpus's own prioritization
notes are the WIRE-IN-PLAN buckets (`docs/arxiv-program/research/2026-09-21/arxiv-program/index/WIRE-IN-PLAN.md`:
MODEL 1,083, INGEST 566, CALIBRATE 494, DECIDE 274, MONITOR 219, INVENT 185) and the
doctrine split (881 PROPRIETARY_EDGE, 152 SITUATIONAL, 118 INFRA, 100 BASELINE where market work is
"the mathematical starting point, never the goal").

Promotion gate applies to every row: anything uncalibrated computes in shadow and never promotes.

| Rank | Family | Corpus (papers / verified) | In-repo evidence | Wiring state (A/B row) | Refresh cadence | Lives or should live at | Next step and blocker |
|---|---|---|---|---|---|---|---|
| 1 | Signal composer over the `signals` table (injury, snap, usage, NGS-feed-derived fuel) | tracking 249 / 147, injuries 146 / 88, ensemble 124 / 76 | 84,500 rows written (count from docs), zero composers | A#8, A#9, A#10: adapter-no-production-caller; writer wired | writer hourly `vercel.json:101`; upstream stats every 30 min, satellites daily window | compose at `signal-ledger.ts:76`; call from the pick path near `intelligence-enrichment.ts:145` | Wire `composeLedger` in shadow, compose-only, no publish. Needs fresh `signals` count (ops probe). |
| 2 | Calibration and conformal posture | calibration 390 / 219 (largest family) | book path inverted at the top (80-89 -> 41.5%, 90-99 -> 31.2%, `AGENTS.md:38-39`); `calibratedWinProb` wired at `reasoning.ts:286`; conformal posture has no caller (`conformal-calibration.ts:191`) | A#35: mixed | per cycle; holdout report via `calibration-metrics` cron | `calibration-weights.ts:42`, `conformal-calibration.ts:131,191` | Attach calibration state to every wired number; wire conformal abstention in shadow. `AGENTS.md:40`: v5.3.0 calibration targets the book path only, leave the signal path alone. |
| 3 | Observation-engine input starvation (injuries, ratings, weather, snaps, NGS-feed reads into `runIntelligence`) | injuries 146 / 88, ratings 173 / 102, weather 155 / 87 | builder supplies 2 of 14 fields (`intelligence-enrichment.ts:116-145`) | A#21, A#23, A#24, A#34: wired but structurally empty | injuries: nflverse weekly report (lagged, `injuries.ts:10-11`); DB tables refresh every 30 min | `intelligence-enrichment.ts:116-145`, fields per `engine.ts:63-75` | Populate fields from existing tables, in shadow. Cheapest real accuracy-path change in the repo; no new source needed. |
| 4 | Weight tuning and ratings (Elo, Dixon-Coles, opponent-adjusted EPA) | ratings 173 / 102, ensemble 124 / 76 | `tuneSignalWeights` blocked by empty `teams` / `team_week_stats` (`AGENT_LEDGER.md:553`); registry Elo/DC/EPA wired (`signal-registry-definitions.ts:449,240,542`) uncalibrated | A#16, A#37 | per slate cycle `*/15` odds, `5,20,35,50` slate | `tune-signal-weights.ts:95`; crosswalk needed | Build the team crosswalk, then tune per family. This is the "weight" step for every other row. |
| 5 | Market consensus and devig | market 88 / 46; doctrine: baseline, not the goal | spine is wired and calibrated; devig oracle + 3 adapters have no callers; asymmetric tests missing | A#1, A#2, A#3-5, A#7 | Odds API every 15 min (`vercel.json:13-14`) | `devig/oracle.ts:187`; adapters per Corrections item 1 | Test-only PR: asymmetric-input tests that fail on the old code. Zero production risk. |
| 6 | Injuries and availability (as a model signal) | 146 / 88 | `nfl_injury_trajectory` ACTIVE but `return null` (`signal-registry-definitions.ts:744`); ingest wired (`injuries.ts:39`) | A#22 wired; A#23 and A#16f empty | weekly report, lagged | `signal-registry-definitions.ts:728`, `signal-adapters.ts:130` | Depends on rank 3. Real `evaluate` body or mark not-ACTIVE (registry status change: flag to Garrett). |
| 7 | Weather and environment | 155 / 87 | `WIND_MPH` and 70 other env keys never written; weather-vintage flag off (`weather-vintage.ts:16-18`); NWS read-only, no table (B row Weather) | A#20, A#21, A#16e, A#17 | NWS on demand | `game-weather.ts:19`, `weather-vintage.ts:18`, `game_signals` WEATHER writer missing | Needs a game-keyed writer (`game-weather-capture.ts` path cited in signal-architecture `:1490`). Totals-side lever. |
| 8 | Line movement, CLV, sharp signal | 116 / 54 | `LINE_ARCHIVE_ENABLED` and `LINE_ARCHIVE_EU_PINNACLE` both default OFF (`line-archive.ts:176`, `pinnacle-line-archive.ts:46`) | B: flagged-off | each refresh-odds cycle when on | `line-archive.ts:165` -> `OddsLineSnapshot` | Flag flips are Garrett's (Law 3). Pinnacle leg spends paid calls: budget decision. |
| 9 | Kalshi / Polymarket as calibration inputs | 26 / 10 (small corpus) | Kalshi fetch wired (`build-independent-fair-values.ts:209`), persistence not done (`kalshi-client.ts:22-25`); Polymarket `INDEPENDENT_POLYMARKET` OFF, compliance hold (`:17-18`) | B: fetch wired, persistence missing | per cycle, soft-fail | `kalshi-client.ts:274`, new snapshot table needed | Persistence needs a migration: forbidden for agents (Law 2, 7). Decision point. |
| 10 | Props and pick'em intakes (DK Pick6, Underdog, PrizePicks, Sleeper projections, Action Network scoreboard) | props 54 / 28, pick'em 115 / 50 | all five verified live 2026-09-25 (`docs/dfs/research/2026-09-25/pickem-api-recon-audit-addendum.md`), all default OFF, no table, no cron; `runPropsSlate` no caller (`props-slate.ts:100`) | B rows 28-32, A#38, A#41 | on demand only | intake files per B; sink table missing | Flag flips and table are Garrett's. PrizePicks public-copy contradiction needs his call. |
| 11 | Sleeper market signals | within pick'em 115 / 50 | read-path wired, no table, `canPublishPicks` typed false (`market-signal.ts:49`); legal tier use-with-caution | A#29, B Sleeper row | on request, 24h window | `sleeper/market-signal.ts:92` | Fantasy-market sentiment only. Keep display-side until a rights decision. |
| 12 | Coaching and situational | 110 / 65 | 7 ACTIVE-but-null defs (`signal-registry-definitions.ts:720-888`), 22 env-fed extensions | A#16g, A#17 | n/a | same | Needs the per-game inputs from rank 3 first. |
| 13 | NGS-feed weighting (internal only) | tracking 249 / 147 | stored, explicitly not a scoring input (`next-gen-stats.ts:10-11`); ledger treats as uncalibrated measured input | A#24, B NGS row | satellite daily window (C-244) | `next-gen-stats.ts:144-168`, writer key list `signal-ledger-writer.ts:41-56` | Weights after rank 1 and 4. Never on a public surface. |
| 14 | Odds API historical backfill | feeds calibration (rank 2) | budget guard fails open on ledger outage (`odds-credit-ledger.ts:435`); 20K credits/month per program doc | B Odds API rows | 15 min live; backfill on demand | `odds-credit-ledger.ts:383` | Budget-affecting: Garrett. `reservePaidCallSlot` stays failing-open until his call. |
| 15 | LLM and narrative signals | LLM/text 187 / 136 | `nfl_beat_desk_corroboration` BLOCKED, `isRightsCleared: () => false`, weight 0 (`signal-registry-definitions.ts:617-628`) | A#42: flagged-off | n/a | same | Rights-blocked. No wiring work until cleared. |
| 16 | In-game / win probability | 130 / 69 | no in-repo family cataloged by sweep A | NOT VERIFIED | n/a | n/a | Pre-game product; lowest near-term leverage. Not swept. |

Dependency note: rows 1, 3 and 4 gate most of rows 6, 7, 12, 13. Ranking by leverage and ordering
by dependency agree except row 5, which is cheap enough to ship first.

## Revised queue for wiring sessions (replaces "Initial queue")

1. devig asymmetric-input tests (test-only; the math fix already landed in #965).
2. Observation-engine input wiring, shadow only (rank 3), with injuries first.
3. `composeLedger` shadow wiring over `signals` (rank 1). Fetch a current `signals` count first.
4. Team crosswalk, then `tuneSignalWeights` (rank 4).
5. Calibration state on every wired number; conformal posture in shadow (rank 2).
6. Weather game-signal writer and real `evaluate` bodies for the ACTIVE-but-null defs (ranks 6, 7, 12).
7. Line archive, Kalshi persistence, pick'em intakes, Odds API backfill: each blocked on a Garrett call below.

## Decisions that belong to Garrett (stopped here, not decided)

- `reservePaidCallSlot` fail-open (`odds-credit-ledger.ts:435`): stays as is.
- Turning on any flag: line archive, Pinnacle leg, PredExon, Polymarket, all pick'em intakes,
  FTN/PFF/Sharp/Pregame/Covers/VSiN/DKN/Underdog/DK-DFS clients, weather vintage. Law 3.
- New tables (Kalshi/Polymarket snapshots, pick'em sink): needs a migration, Laws 2 and 7.
- Registering the 13 free-spine secondaries (rights/licensing), and any `BLOCKED_MISSING_SOURCE` to
  ACTIVE flip (`AGENT_LEDGER.md` founder order: a missing source is a licensing decision).
- Changing the status of the 8 ACTIVE-but-null registry defs: honest either way, but it alters
  registry posture.
- PrizePicks: intake module vs public copy saying it is not scraped.
- mimo ports #913-#918: untouched, awaiting his triage.

## Not verified (carried forward)

Current `signals` / `game_signals` counts; the 0/3493 census (doc-measured 2026-09-29); which flags
are set in production; live status of any external endpoint; whether tests exist for
`context-enrichment.ts`, `injuries.ts`, `next-gen-stats.ts`, `pfr-adv-stats.ts`,
`separation-surface.ts`, `family-weight-evidence.ts`, `signal-ledger-state/route.ts`; pricing/cadence
of a full satellite run on the current Vercel plan; in-game signals; MASTER-PAPER-INDEX vs
extraction verified-count reconciliation. Full lists at the end of files A and B.
