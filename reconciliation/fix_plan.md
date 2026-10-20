# Dark Sources — Corrected Census and Fix Plan

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Machine-readable:** `reconciliation/dark_sources_census_corrected.json`
**Generator:** `reconciliation/_census_dark_corrected.py`
**Supersedes:** the verdict field in `dark_sources_census.json` (its per-evaluator
env keys and declared dependencies are still valid; the verdicts were wrong)

---

## 0. The correction — my first pass was too generous

My first census judged each DARK evaluator by whether its **declared
`dataDependencies` named a table that exists**. That was the wrong test.

The declared names are **source-product** names — `nfl_pbp`, `nfl_charting`,
`nfl_coaching_history` — not table names. And the play-level tables those
products would populate **do not exist** in
`packages/db/prisma/schema.prisma`: there is no `model Play`, no `model
Drive`, no penalty column, no `Player.birthDate`, and no venue lat/lon.

**Measured on `schema.prisma` (2026-10-20):**

| Model | Present |
|---|---|
| `Player` (`:2767`) · `PlayerGameStat` (`:2787`) · `TeamGameEfficiency` (`:2951`) · `TeamWeekStat` (`:3132`) · `SnapCount` (`:2824`) · `DepthChartEntry` (`:2883`) · `Injury` (`:2853`) · `NextGenStat` (`:3012`) · `TeamGameLog` · `Game` · `HistoricalGame` | yes |
| `Play` · `Drive` · penalty rows · `Player.birthDate` · venue lat/lon · coach table · coordinator table · draft-capital column | **no** |

**So the corrected counts are:**

| | |
|---|---|
| DARK evaluators | **21** |
| SHADOW_ONLY evaluators in the same file | **2** |
| **total** | **23** |
| `DATA-EXISTS-NEEDS-ADAPTER` | **5** |
| `NEEDS-A-NEW-PRODUCER` | **18** |

**My earlier claim — "20 of 21 declare dataDependencies naming a table with
rows, so they need an adapter, not a feed" — was wrong.** The correct number
is **5**. The other 18 need a producer that does not exist, at a granularity
the schema has never had.

The 5 that only need an adapter:

| signal id | status | what is missing |
|---|---|---|
| `nfl_primetime_target_concentration` | DARK | PlayerGameStat.targetShare EXISTS. Needs a WR1 aggregation and a primetime flag; both derivable from games.commenceTime + the stat column. |
| `nfl_backup_qb_target_distribution` | DARK | DepthChartEntry.depthRank + Injury + PlayerGameStat ALL EXIST and are ingested by live crons. Only the IS_BACKUP derivation + homeSign are missing. |
| `nfl_wr1_vacated_target_efficiency` | DARK | Injury + DepthChartEntry + PlayerGameStat.targetShare all exist -- BUT the implementation is a hand-rolled local formula (extensions:606-619) whose comment falsely claims 'Same math' as a kernel it never imports. DUPLICATE of nfl_wr1_out_redistribution. |
| `nfl_high_altitude_fatigue` | DARK | needs STADIUM_ELEVATION_FT -- a 32-row static venue table. No altitude column today; games/teams carry no elevation. |
| `nfl_linear_wind_pass_impact` | SHADOW_ONLY | WIND_MPH is PRODUCED (game-weather-capture cron -> gameSignal -> stored-signal-env-bridge maps wind_mph->WIND_MPH). IS_DOME is a 32-row static constant. The family is measured /slope/ < se (engine-weights.ts:14) -- the HONEST move is to leave it SHADOW, not promote it. |

The 18 that need a real producer:

| signal id | status | what is missing |
|---|---|---|
| `nfl_turnover_luck` | DARK | needs PLAY-level rows (def snaps, dropbacks, forced fumbles, recoveries, INTs). No play table exists. |
| `nfl_short_week_road_deficit` | DARK | restDays EXISTS (games.restDaysHome/Away, populated 2130/2082 rows) but TRAVEL_DISTANCE_MILES has no source (no venue coordinates) and IS_DIVISION_RIVALRY has no column. |
| `nfl_age_conditioned_rest` | DARK | needs Player.birthDate (absent) and a snap-weighted age construction. |
| `nfl_fourth_down_aggressiveness` | DARK | needs 4th-down DECISIONS keyed to a COACH. data/gse-dataset/fourth-down.jsonl has WP-by-option, no decision, no coach. |
| `nfl_second_and_ten_tendency` | DARK | needs live in-game play-call state (prior play type, score, quarter, clock). No feed. |
| `nfl_early_down_proe_momentum` | DARK | needs early-down pass rate and pace. TeamGameEfficiency stores only offEpaPerPlay/offSuccess/defEpaPerPlay/defSuccess. |
| `nfl_two_minute_hurry_up` | DARK | needs drive-level two-minute slices. No drive table. |
| `nfl_bye_week_defensive_install` | DARK | bye week + defEpaPerPlay are derivable, but COORDINATOR identity and PEDIGREE TIER have no source (EntityType lists 'coordinator' but the graph is 'not yet read by any surface'). |
| `nfl_qb_twp_regression` | DARK | attempts + INTs exist; turnoverWorthyPlays has no table (pbp_participation_2026.parquet is a documented 404). |
| `nfl_qb_receiver_continuity` | DARK | 2 of 3 derivable from PlayerGameStat + DepthChartEntry; COORDINATOR TENURE has no source. |
| `nfl_penalty_differential_momentum` | DARK | needs PBP penalty rows. grep 'penalty' schema.prisma -> no matches. |
| `nfl_man_zone_receiver_archetype` | DARK | needs coverage charting (man/zone, two-high). NextGenStat has separation/CPOE, not shells. |
| `nfl_redzone_opportunity_conversion` | DARK | needs drive-level red-zone entry. No red-zone column, no drive table. |
| `nfl_negative_binomial_redzone_td` | DARK | same drive-level need, plus a FITTED dispersion stored nowhere. |
| `nfl_redzone_personnel_grouping` | DARK | participation-2018..2025.jsonl HAS offense_personnel, but there is no participation-2026 file and no grades source. |
| `nfl_rookie_breakout_cohort` | DARK | rosters-2026.jsonl has NO draft column; usage trend is a proxy (SnapCount.offensePct). |
| `nfl_turf_surface_fatigue` | DARK | TURF_SOFTNESS_INDEX has ONE occurrence in the whole repo (the read). Invented. IS_ARTIFICIAL_TURF is derivable from a 32-row venue table. |
| `nfl_temperature_precipitation_decay` | SHADOW_ONLY | TEMP_F is bridged and PRECIP_PCT is written, but the bridge wants a precipitationType ENUM (NONE/LIGHT_RAIN/HEAVY_RAIN/SNOW/FREEZING_RAIN) that nothing derives. IS_DOME unproduced. |

**A 32-row static venue table is the single highest-leverage write in this
repo.** It would unblock `nfl_high_altitude_fatigue` (elevation),
`nfl_linear_wind_pass_impact` (dome flag), and `nfl_turf_surface_fatigue`
(surface enum) — three signals, no feed, no key, no licence. Storage slot
already exists: `model Entity` has `entity_type: EntityType` (already
enumerating `venue`, `coordinator`, `coach` — `schema.prisma:3875-3878`) plus
`attributes Json?` (`:3917`), so **no migration is needed** — but the graph
is *"additive, not yet read by any surface"* (`:3870`), so a reader is the
actual work.

---

## 1. The structural cause, unchanged and still correct

The evaluators read their inputs from `ctx.env`. The file says it at
`packages/ingestion-pipeline/src/signal-registry-extensions.ts:39`:

```ts
const DARK_NO_PIT =
  "DARK: no point-in-time producer on the mint path. Env keys are not a feed.";
```

"Env keys are not a feed" is exactly right — and it is the whole story for
the 5 adapter candidates.

---

## 2. The three gates a DARK signal must clear

**This decides whether wiring the 5 is worth doing.** A producer alone does
not activate a signal. Three gates exist, and all 23 fail all three:

1. **Producer gate.** `ctx.env` is either the whole process environment
   (`signal-registry-runner.ts:40` — `env: (input.env ?? process.env)`) or
   `envWithStoredSignals(...)` at `generate-signal-slate.ts:604`, which merges
   exactly **four** stored keys into five env names
   (`stored-signal-env-bridge.ts:24-37`: `wind_mph->WIND_MPH`,
   `wind_gust_mph->WIND_GUST_MPH`, `temp_f->TEMP_F`,
   `precip_pct->PRECIP_PCT|PRECIP_IN`) and reads them only from
   `db.gameSignal` where `sourceName: "nws"` (`:68-76`).
   **No non-weather key can be read from the DB by any code path.**
2. **Status gate.** Both consumers skip anything not ACTIVE:
   `signal-registry-runner.ts:48`, `continuous-signal-tilt.ts:79`.
3. **Sign gate.** A CONTINUOUS_VALUE signal is refused unless its result
   carries `metadata.homeSign` of exactly `1`/`-1`
   (`continuous-signal-tilt.ts:43-47`, refusal at `:100-104`).
   **Only one of the 23 declares it** — `signal-registry-extensions.ts:210`
   (age-conditioned rest, which also needs a producer for other reasons).
   And `grep -c homeSign signal-registry-definitions.ts` = **0**, so no
   ACTIVE registry signal supplies a sign either.

**Consequence: `applyContinuousSignalTilt` — the ONLY seam where a signal
moves `trueProb` — yields `votes.length === 0` today** and returns
`applied: false` (`continuous-signal-tilt.ts:123-131`). The path is wired and
structurally inert.

**DARK is also test-locked.** `continuous-signal-tilt.test.ts:140-153`
asserts every extended signal is DARK/SHADOW_ONLY with a `blockedReason`
containing `point-in-time`/`SHADOW`. **Wiring any one requires editing that
test in the same commit.**

---

## 3. Two signals that are worse than DARK

**`nfl_wr1_out_redistribution` is ACTIVE, weight 0.14, and can never fire.**

`packages/ingestion-pipeline/src/signal-registry-definitions.ts:880-888`:
```ts
activationStatus: "ACTIVE",
...
evaluate: async (ctx) => {
  return null;        // <-- always
},
```

Because it is ACTIVE it has no `blockedReason`, so
`buildMissingContextEvidenceFromRegistry` (`:923-926`, which filters
`!== "ACTIVE"`) **never reports it missing**. An ACTIVE signal that silently
returns null is worse than a DARK one: DARK is honest, ACTIVE-and-null is a
claim the system cannot support.

**`nfl_referee_crew_tendencies` is the same shape**
(`definitions.ts:815-818`).

**And the officials surface — the brief's "marked dark for honesty failures"
— is not a DARK signal at all.** It is an ACTIVE registration that cannot
produce a value. That is a worse honesty failure than being dark, and it
should be fixed by either producing the value or de-registering it.

---

## 4. The duplicate

**`nfl_wr1_vacated_target_efficiency`** (extensions `:583`) carries a
hand-rolled local formula at `:606-619`:
`reallocation = min(1, wr2 + vacated*0.45)`, `edge = (reallocation-wr2)*0.6`,
under a comment claiming *"Same math"* (`:614`) as a kernel it never imports.
Meanwhile `nflWr1OutRedistributionSignal` (`definitions.ts:871`) is the
upstream kernel — and it `return null`s (`:888`).

**The comment's claim cannot hold.** Delete the extension; keep one surface.

---

## 5. Deletion candidates — 4, not 2

| # | Signal | Why delete rather than wire |
|---|---|---|
| 1 | `nfl_wr1_vacated_target_efficiency` | duplicate of `nfl_wr1_out_redistribution`, with a false "Same math" comment (`:614`) |
| 2 | `nfl_turf_surface_fatigue` | `TURF_SOFTNESS_INDEX` has **one occurrence in the whole repo** — the read. Invented. Re-derive from a surface enum instead. |
| 3 | `nfl_redzone_opportunity_conversion` + `nfl_negative_binomial_redzone_td` | both need a drive table the schema has never had; #17 additionally needs a fitted dispersion stored nowhere |
| 4 | the 225 trust-intake rows | one day, one source, one label contradiction, `quote_text` null and `extraction_confidence` 0.0 on every row, `schema_version 1.0.0` while the pipeline declares `1.1.0` (`extractors/pipeline.py`), `extractor_name: null` — **the store's contents were not written by the code in this repo** |

---

## 6. The trust-signals intake is a relabelled parquet, not a news wire

Measured, all 225 rows (`intelligence/trust-signals/intake/signals.jsonl`):

| field | value | count |
|---|---|---|
| `shadow` | `true` | 225/225 |
| `signal_origin` | `news_wire` | 225/225 |
| `source_handle` | `@mysportsupdate` | 225/225 |
| `source_url` | `.../nflverse-data/releases/download/injuries/...` | 225/225 |
| `signal_type` | `injury` | 225/225 |
| `verification` | `CORPUS` | 225/225 |
| `calibration_state` | `UNCALIBRATED` | 225/225 |
| `extraction_confidence` | `0.0` | 225/225 |
| `quote_text` | `null` | 225/225 |
| `schema_version` | `1.0.0` | 225/225 |
| `observed_at` | `2026-10-14` | 225/225 |

A representative row:
```
"signal_origin": "news_wire", "source_handle": "@mysportsupdate",
"source_url": ".../injuries_2026.parquet",
"text": "[Week 4 nflverse] Damien Lewis (G, CAR): report_status=Out, ..."
```

**This is the nflverse injuries parquet relabelled as a news-wire intake.**
The `source_url` is a GitHub release asset, `quote_text` is null, and
`extraction_confidence` is 0.0. Meanwhile
`intelligence/trust-signals/extractors/pipeline.py` declares
`SCHEMA_VERSION = "1.1.0"`, and the store's rows say `1.0.0` with
`extractor_name: null` — **the contents were not written by the code in this
repo**.

The producer code exists (`extractors/pipeline.py:181`
`IntakeStore.save_signal`) but its only callers are tests
(`intelligence/tests/test_trust_signals_c06.py:439, :810`). No cron, no
script, no schedule.

**The X path is a documented stub.**
`intelligence/trust-signals/fetch.py:49-61` is `MirrorFetcher`, documented
as a `STUB: twstalker -> xstalk -> instalker fallback chain`, with
`MIRRORS = ("twstalker","xstalk","instalker")` and **no HTTP call**.
`intelligence/trust-signals/README.md:25`: *"No working X client ships (X is
blocked from this environment). The `fetch.SourceFetcher` seam is the
deliverable."*

The consumer side is real: `intelligence/integration/api.py:343`
(`providers.trust.get_trust_signals`), `specialists.py:170`, and
`run_game.py:48-51` (`HonestTrustSignalProvider`). It would serve these rows
if asked.

---

## 7. What "coverage" means for this surface

| Metric | Today | After Tier A+B | Measured by |
|---|---|---|---|
| DARK + SHADOW_ONLY evaluators | **23** | 19 (4 deleted) | `dark_sources_census_corrected.json` |
| with a live producer | **0** | **5** (adapter only) | same -> `verdict` |
| that can actually vote | **0** | **0** until `homeSign` + the env bridge are fixed | `continuous-signal-tilt.ts:100-104` |
| appearing in a reasoning trace | **0** | at least 1 | join `signals.key` against trace `observed_values` |
| wire signal rows | **44** | 44 + X volume | `select count(*) from signals where key like 'wire.%'` |
| classifier precision | **unmeasured** | measured | labelled sample |

**The honest ceiling, stated plainly.** Wiring the 5 adapter candidates does
**not** make them vote. The sign gate and the env bridge both block them.
Three things are needed in order:

1. **A sign.** `metadata.homeSign` on every CONTINUOUS_VALUE signal. Without
   it, `continuous-signal-tilt.ts:100-104` refuses every one.
2. **An env bridge that can carry non-weather keys.**
   `stored-signal-env-bridge.ts:24-37` currently maps exactly four weather
   keys. A general bridge is the work.
3. **The adapter** — resolve the declared fields from the tables that exist.

**And then the kill line** (`signal-registry-extensions.ts:41-46`):
`maxBrierScoreVsMarket 0.250`, `minSettledSample 100`,
`maxDivergenceZScore 3.0`, `maxAgeMinutes 120`. A newly wired evaluator
starts at weight 0 and must earn its way up through the settlement loop —
which is `staged_improvements/04-settlement-to-belief-loop.md`, and which
does not yet exist on `main`.

**So the correct sequence is: sign gate -> env bridge -> adapter -> measure ->
settlement loop -> promote.** Wiring first produces 5 more signals that never
earn weight — the same failure as the corpus evaluator.

---

## 8. The ACTIVE-but-null signals, which are the honesty failure

The brief says officials, weather, and narrative contracts "were marked dark
for honesty failures." Measured:

- **Officials** — `nfl_referee_crew_tendencies` is registered **ACTIVE** with
  an `evaluate` that cannot produce a value (`definitions.ts:815-818`). Not
  dark. **Worse than dark**, and the fix is to de-register it or produce the
  value.
- **Weather** — `nfl_linear_wind_pass_impact` and
  `nfl_temperature_precipitation_decay` are correctly **SHADOW_ONLY**, and
  the family is measured `|slope| < se` (`engine-weights.ts:14`) — the
  honest state. **The honesty failure is fixed here.** They stay shadow.
- **Narrative contract** — the family is advertised LIVE on an application
  input broken by 10^6.
  `data/reasoning/narrative-contract-week3-2026-09-27.json` emits:
  ```json
  "home_roster_mean_apy_millions": 5.311087280701753e-06,
  "away_roster_mean_apy_millions": 5.441898588235294e-06,
  "x_apy_gap_millions": -1.308113075335404e-07
  ```
  $5.31 mean APY per player; a home-minus-away gap of -$0.13. A 0.05/$M
  slope applied to a 1e-7 gap contributes nothing, so `signed: 0.0416` is
  effectively the intercept — **the same value for every game**.
  `engine-weights.ts:24` still says `role: "dark"`, which is the more
  honest of the two registry rows. **HONESTY-FAILURE-STILL-PRESENT.**

---

## 9. Doc drift worth a one-line fix

`signal-registry-extensions.ts:2` says *"the 22 signal evaluators"*.
`EXTENDED_SIGNALS` holds **23** (`:900-923`).
