# Dark Sources — Census and Fix Plan

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Machine-readable:** `reconciliation/dark_sources_census.json` (per-evaluator
env keys, declared `dataDependencies`, producer evidence, verdict)
**Generator:** `reconciliation/_census_dark.py`

---

## 0. Headline

The brief says "23 extension evaluators in signal-registry-extensions.ts
marked DARK with reason DARK_NO_PIT."

**Measured: 21**, not 23. And the more important finding is *why* they are
dark, which turns a 21-item problem into a ~20-line-of-adapter problem.

**They are dark because they read their inputs from `process.env` instead of
from the database — and the database already has the data.**

The file says it itself, at `packages/ingestion-pipeline/src/signal-registry-extensions.ts:39`:

```ts
const DARK_NO_PIT =
  "DARK: no point-in-time producer on the mint path. Env keys are not a feed.";
```

"Env keys are not a feed" is exactly right, and it is the whole story.

### The proof, for one evaluator

`nfl_short_week_road_deficit`, `signal-registry-extensions.ts:135-166`:

```ts
evaluate: async (ctx) => {
  const isRoadTeam       = bool(ctx.env, "IS_ROAD_TEAM");
  const restDays         = num(ctx.env, "REST_DAYS");
  const opponentRestDays = num(ctx.env, "OPP_REST_DAYS");
  const travelDistanceMiles = num(ctx.env, "TRAVEL_DISTANCE_MILES");
  const isDivisionRivalry   = bool(ctx.env, "IS_DIVISION_RIVALRY");
  if (isRoadTeam == null || restDays == null || ...) return null;   // <-- always null
  const res = evaluateShortWeekRoadDeficit({ isRoadTeam, restDays, ... });
```

The implementation it calls,
`packages/prediction-engine/src/signals/situational/short-week-road-deficit.ts:32`,
takes a clean typed context and computes a real penalty
(`-1.75` baseline, `-0.65` for >1500 miles, `-0.35` for >800).

**`REST_DAYS` is already a column in `games`.** Measured live:
`games.restDaysHome` is populated on **2,130 of 4,832** games,
`restDaysAway` on **2,082**. `isRoadTeam` is `ctx.homeTeam`-derived.
`isDivisionRivalry` is derivable from the league. `travelDistanceMiles` is
computable from team coordinates.

**So this evaluator is not missing a producer. It is missing a five-line
adapter that reads `games` instead of `process.env`.** The signal would then
be live, and the DARK reason would be false.

---

## 1. The census — 21 DARK evaluators

Measured by family: EFFICIENCY 9 · SITUATIONAL 8 · MICROCLIMATE 2 ·
LUCK 1 · NARRATIVE 1.

| signal id | family | env keys | declared dataDependencies → measured source | verdict |
|---|---|---|---|---|
| `nfl_turnover_luck` | LUCK | 5 | nfl_player_stats_weekly=player_game_stats (36,539 rows); nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_short_week_road_deficit` | SITUATIONAL | 5 | nfl_schedule=games (4,832 rows; restDaysHome 2,130 populated) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_age_conditioned_rest` | SITUATIONAL | 4 | nfl_schedule=games (4,832 rows; restDaysHome 2,130 populated); nfl_rosters=players (1,449) + depth_chart_entries (6,875) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_fourth_down_aggressiveness` | SITUATIONAL | 3 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts); nfl_coaching_history=MISSING as a table; only scripts/ | **PARTIAL-DATA** |
| `nfl_second_and_ten_tendency` | SITUATIONAL | 2 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_primetime_target_concentration` | SITUATIONAL | 3 | nfl_player_stats_weekly=player_game_stats (36,539 rows); nfl_schedule=games (4,832 rows; restDaysHome 2,130 populated) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_early_down_proe_momentum` | SITUATIONAL | 2 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_two_minute_hurry_up` | SITUATIONAL | 2 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_bye_week_defensive_install` | SITUATIONAL | 2 | nfl_schedule=games (4,832 rows; restDaysHome 2,130 populated); nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_qb_twp_regression` | EFFICIENCY | 4 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts); nfl_player_stats_weekly=player_game_stats (36,539 rows) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_qb_receiver_continuity` | EFFICIENCY | 2 | nfl_rosters=players (1,449) + depth_chart_entries (6,875); nfl_player_stats_weekly=player_game_stats (36,539 rows) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_penalty_differential_momentum` | EFFICIENCY | 3 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_backup_qb_target_distribution` | EFFICIENCY | 3 | nfl_injuries=injuries (7,857); nfl_player_stats_weekly=player_game_stats (36,539 rows) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_man_zone_receiver_archetype` | EFFICIENCY | 3 | nfl_charting=nflverse pbp (formation/box data); nfl_player_stats_weekly=player_game_stats (36,539 rows) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_wr1_vacated_target_efficiency` | EFFICIENCY | 3 | nfl_injuries=injuries (7,857); nfl_player_stats_weekly=player_game_stats (36,539 rows) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_redzone_opportunity_conversion` | EFFICIENCY | 3 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_negative_binomial_redzone_td` | EFFICIENCY | 3 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_redzone_personnel_grouping` | EFFICIENCY | 3 | nfl_pbp=nflverse pbp asset (per apps/web/lib/nflverse/pbp.ts); nfl_charting=nflverse pbp (formation/box data) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_rookie_breakout_cohort` | NARRATIVE | 3 | nfl_rosters=players (1,449) + depth_chart_entries (6,875); nfl_player_stats_weekly=player_game_stats (36,539 rows) | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_high_altitude_fatigue` | MICROCLIMATE | 2 | nfl_stadium_weather_feed=game_signals (5,984) + game-weather-capture cron | **DATA-EXISTS-NEEDS-ADAPTER** |
| `nfl_turf_surface_fatigue` | MICROCLIMATE | 2 | nfl_stadium_meta=games (venue fields) + teams (EMPTY) | **DATA-EXISTS-NEEDS-ADAPTER** |

**Verdict counts (measured):**

| Verdict | Count | Meaning |
|---|---|---|
| `DATA-EXISTS-NEEDS-ADAPTER` | **20** | every declared dependency names a table or asset that exists with rows. Only the adapter is missing. |
| `PARTIAL-DATA` | **1** | `nfl_fourth_down_aggressiveness` — `nfl_coaching_history` has no table. |
| `PRODUCER-EXISTS-AND-UNWIRED` | **0** | none |
| `PRODUCER-MISSING` | **21** | no evaluator has a producer wired today |

Supporting tables measured live:

| Table | Rows | Serves |
|---|---|---|
| `player_game_stats` | 36,539 | `nfl_player_stats_weekly` |
| `games` | 4,832 (rest: 2,130/2,082) | `nfl_schedule` |
| `depth_chart_entries` | 6,875 | `nfl_rosters` |
| `injuries` | 7,857 | `nfl_injuries` |
| `players` | 1,449 | `nfl_rosters` |
| `snap_counts` | 35,190 | charting |
| `next_gen_stats` | 3,249 | NGS |
| `game_signals` | 5,984 | `nfl_stadium_weather_feed` |
| `historical_games` | 7,548 | backtest |
| `pfr_adv_stats` | **0** | — |
| `player_rush_profiles` | **0** | — |
| `entities` | **0** | — |
| `teams` | **0** | `nfl_stadium_meta` — the teams table is EMPTY; team names live on `games` |

---

## 2. The fix plan, tiered by cost

### Tier A — adapter work (20 evaluators, no new feed, no new table)

**Pattern.** For each evaluator, replace the `ctx.env` reads with a context
object populated from the already-measured tables, and flip
`activationStatus` from `"DARK"` to `"ACTIVE"` **only after** the adapter's
output has been checked against the signal ledger's own honesty rules
(`KILL_LINE` at `signal-registry-extensions.ts:41-46`:
`maxBrierScoreVsMarket 0.250`, `minSettledSample 100`,
`maxDivergenceZScore 3.0`, `maxAgeMinutes 120`).

**Where the adapter lives.** The `ctx` object is built by
`packages/ingestion-pipeline/src/dynamic-context-builder.ts` (which already
assembles `GameContext` from injuries, continuity, and weather) and is
consumed by `process-sport.ts`. The adapter is a new
`context.builders/signal-context.ts` that resolves the declared
`dataDependencies` into typed values, so the evaluator bodies change from
`num(ctx.env, "REST_DAYS")` to `ctx.restDays` — a one-line change per
evaluator.

**Order (cheapest and highest-confidence first):**

| # | Evaluator | Adapter source | Confidence |
|---|---|---|---|
| 1 | `nfl_short_week_road_deficit` | `games.restDaysHome/restDaysAway` (2,130/2,082 rows) | **HIGH** — the data is literally named |
| 2 | `nfl_bye_week_defensive_install` | `games` (bye week = 7-day gap) + `team_game_efficiency` (754) | HIGH |
| 3 | `nfl_primetime_target_concentration` | `games.commenceTime` (primetime) + `player_game_stats` (target share) | HIGH |
| 4 | `nfl_qb_receiver_continuity` | `player_game_stats` + `depth_chart_entries` | HIGH |
| 5 | `nfl_backup_qb_target_distribution` | `player_game_stats` + `injuries` | HIGH |
| 6 | `nfl_wr1_vacated_target_efficiency` | `player_game_stats` + `injuries` | HIGH |
| 7 | `nfl_redzone_opportunity_conversion` | nflverse pbp | MEDIUM — needs a pbp read path |
| 8 | `nfl_negative_binomial_redzone_td` | nflverse pbp | MEDIUM |
| 9 | `nfl_redzone_personnel_grouping` | nflverse pbp + charting | MEDIUM |
| 10 | `nfl_qb_twp_regression` | nflverse pbp + `player_game_stats` | MEDIUM |
| 11 | `nfl_turnover_luck` | nflverse pbp | MEDIUM |
| 12 | `nfl_second_and_ten_tendency` | nflverse pbp | MEDIUM |
| 13 | `nfl_early_down_proe_momentum` | nflverse pbp | MEDIUM |
| 14 | `nfl_two_minute_hurry_up` | nflverse pbp | MEDIUM |
| 15 | `nfl_man_zone_receiver_archetype` | nflverse pbp (formation/box) | MEDIUM |
| 16 | `nfl_high_altitude_fatigue` | `games` venue + elevation lookup | MEDIUM |
| 17 | `nfl_age_conditioned_rest` | `players` (age) + `depth_chart_entries` | MEDIUM — "snap-weighted age" is a construction |
| 18 | `nfl_rookie_breakout_cohort` | `players` (draft capital) + `player_game_stats` | MEDIUM |
| 19 | `nfl_fourth_down_aggressiveness` | nflverse pbp + **needs a coaching-history table** | LOW — see §3 |
| 20 | `nfl_turf_surface_fatigue` | `games` venue + **needs a turf-physics feed** | **NONE — see §3** |

### Tier B — real producer work (1 evaluator, honestly)

`nfl_fourth_down_aggressiveness` needs `COACH_GO_FOR_IT_RATE` and
`LEAGUE_GO_FOR_IT_RATE`. The per-team rate is derivable from nflverse pbp
(4th-down attempts). The **league** rate needs a league-baseline table —
which is the same shape as the fitted `signal-scale-table.ts` the repo already
uses for signal weights. That table does not exist for coaching rates yet.
**Requirement: one league-baseline builder, then the adapter.**

### Tier C — deletion (2 evaluators)

Per the doctrine — *"Dark sources are failures until fixed. A source with no
point-in-time producer is dark. It must receive a producer or be deleted."* —
two of these cannot be honestly wired and should be **removed from the
registry** rather than left dark or faked:

1. **`nfl_turf_surface_fatigue`** — needs `IS_ARTIFICIAL_TURF` (derivable) and
   **`TURF_SOFTNESS_INDEX`**, which nothing in the repo measures. There is no
   turf-physics feed. Wiring it means inventing a number. **Delete**, or
   re-propose as a new metric with a producer.
2. **`nfl_age_conditioned_rest`** — needs `ROSTER_SNAP_WEIGHTED_AGE`, a
   *construction* (weight each player's age by their snap share), not a
   measurement. It is a derived quantity that needs a builder like the others
   — but the honest move is to **stage it as a new metric with a producer**,
   not to activate a DARK evaluator against env vars.

**Deletion is a real option here, and it is the honest one for #1.** The
registry's `activationStatus: "DARK"` + `blockedReason` already prevents
either from voting. Removing them makes the registry's state truthful
(19 DARK, all with a stated producer path) instead of 21 DARK of which 2
have no possible producer.

### Tier D — the unvalidated classifier and the trust-signal surface

The brief names "Trust-signals intake store is empty or non-live; X-account
monitoring and social extraction have no continuous producer. Classifier is
unvalidated."

**Measured on the wire path:**
- `wire-store.ts` HAS a classifier: `classifySignal` (imported at
  `wire-store.ts:23`) and `parseRssItems`.
- The wire producer IS live: 104 curated feeds, `refresh-wire` cron at
  `*/10 * * * *`, and 44 stored `wire.*` rows.
- The corroboration discipline IS implemented:
  `CORROBORATION_WINDOW_MINUTES = 6 * 60` (`wire-store.ts:97`),
  `MAX_REPORTS_PER_SIGNAL = 12` (`:100`), and self-sourced feeds cannot
  corroborate themselves (`:77`).

**So the wire is not empty.** What is thin is its *volume* (44 rows) and the
absence of an X producer.

**X/Twitter specifically: no producer.** `workers/twitter-bot/` contains
`oauth1.js`, `sender.js`, `x-client.js` (targeting `https://api.x.com` at
`x-client.js:19`), but **no route, cron, or workflow imports them.** Posting
to @GalaxySportsHQ is manual. **Requirement: one cron that polls the X
timeline of the tracked accounts and writes `wire.*` rows through the existing
`classifySignal` path.** The classifier and the storage already exist; only
the transport is missing.

**The classifier's validation is the open question.** `classifySignal` decides
whether an RSS item is an injury report, a coach report, a role change, a
suspension, a trade, or a weather note. There is no measured precision /
recall for it. **Requirement: a labelled sample of feed items with the
classifier's output, so precision can be stated rather than assumed.** Until
that exists, the wire's signal values are unvalidated — and the honest
labeling of that is part of the doctrine ("Batch-only sources stay labeled
until a continuous producer exists" — but here the producer exists and the
*classifier* is the unvalidated part).

---

## 3. What "coverage" means for this surface

| Metric | Today | After Tier A+B | How measured |
|---|---|---|---|
| DARK evaluators | 21 | 19 (2 deleted) | `dark_sources_census.json` → `verdict` |
| DARK evaluators with a live producer | **0** | **19** | same |
| DARK evaluators that can vote | 0 | 19 | `activationStatus === "ACTIVE"` |
| DARK sources appearing in a reasoning trace | **0** | ≥ 19 | join `signals.key` against trace `observed_values` |
| Wire signal rows | 44 | 44 + X volume | `select count(*) from signals where key like 'wire.%'` |
| Classifier precision | **unmeasured** | measured | labelled sample |

**The honest ceiling.** Wiring all 19 does not make them *correct*. Each
carries a `KILL_LINE` (`signal-registry-extensions.ts:41-46`) requiring
`minSettledSample: 100` and `maxBrierScoreVsMarket: 0.250` before it earns
weight. **A newly wired evaluator starts at weight 0 and must earn its way
up through the settlement loop** — which is the loop
`reconciliation/reasoning_engine_continuous_loop_spec.md` describes and which
does not yet exist on `main`.

So the correct sequence is: **adapter → wire → measure → settlement loop →
promote.** Wiring without the settlement loop produces 19 more signals that
never earn weight, which is the same failure as the corpus evaluator.

---

## 4. The 8 causal/symreg modules that are `ENABLED = false`

Not strictly a "dark source" (they are code, not signals), but they belong
in the same census because they are the causal-discovery machinery the
mandate wants and they are switched off:

| Module | Line |
|---|---|
| `packages/prediction-engine/src/causal/1803-01422v2-notears-dag.ts` | `:16` |
| `packages/prediction-engine/src/causal/2001-04197v4-rcd-quarantine-layer.ts` | `:23` |
| `packages/prediction-engine/src/causal/2003-03685v2-pcmci-team-panel.ts` | `:23` |
| `packages/prediction-engine/src/causal/2007-00267v1-regime-dependent-causal-discovery.ts` | `:23` |
| `packages/prediction-engine/src/causal/2110-00637v4-ml4c-supervised-orienter.ts` | `:23` |
| `packages/prediction-engine/src/symreg/2006-10782v2-aifeynman-pareto-pruning.ts` | `:23` |
| `packages/prediction-engine/src/symreg/2312-11955v1-vertical-symbolic-regression.ts` | `:23` |
| `packages/prediction-engine/src/symreg/2401-00282v1-dgsr-lite-refinement.ts` | `:23` |

**These are honestly dark, and that is the right posture.** They are
discovery algorithms; enabling them without a refutation gate would
manufacture edges. The gate that should precede them is `refutationSuite`
(`packages/prediction-engine/src/2603-22620v2-chainreaction-causal-discovery-via-blocking.ts:73`),
which requires a placebo estimate ≈ 0 and subset estimates that agree in
sign — and which is itself unwired.

**The correct order is: refutation first, then discovery.** The repo already
has the right guard; it just needs to be the gate in front of every
discovered edge.
