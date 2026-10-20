# STAGED-IMPROVEMENT 3 — DARK adapter: `ctx.env` → database (INV-04)

**Changes a published number?** YES — 20 signals start voting.
**Risk:** MEDIUM. Must land with the settlement loop (STAGE 4).
**Files:** new
`packages/ingestion-pipeline/src/context.builders/signal-context.ts`,
and 20 one-line edits in
`packages/ingestion-pipeline/src/signal-registry-extensions.ts`.

---

## Why — the measured finding (CORRECTED 2026-10-20)

**CORRECTION.** An earlier draft of this document claimed 20 of 21
evaluators need only an adapter. **That was wrong** -- it judged by whether
the declared `dataDependencies` *named* an existing table, and those names
are source-product names (`nfl_pbp`, `nfl_charting`), not table names. The
play-level tables do not exist in `schema.prisma` (no `model Play`, no
`model Drive`, no penalty column, no `Player.birthDate`, no venue lat/lon).

**The correct count is 5** (`reconciliation/dark_sources_census_corrected.json`).
The other 18 need a producer that does not exist, and are OUT OF SCOPE for
this stage.

The evaluators are dark because they read their inputs from `process.env`.
**The file says it itself** at
`packages/ingestion-pipeline/src/signal-registry-extensions.ts:39`:

```ts
const DARK_NO_PIT =
  "DARK: no point-in-time producer on the mint path. Env keys are not a feed.";
```

"Env keys are not a feed" is exactly right — and it is the whole story.
**Measured: 20 of the 21 declare `dataDependencies` that name a table
which exists with rows.** They are not missing a producer. They are missing
an adapter.

The worked example, `nfl_short_week_road_deficit`
(`signal-registry-extensions.ts:135-166`):

```ts
const restDays = num(ctx.env, "REST_DAYS");           // always null
...
if (isRoadTeam == null || restDays == null || ...) return null;   // always returns null
const res = evaluateShortWeekRoadDeficit({ isRoadTeam, restDays, ... });
```

versus the real module
(`packages/prediction-engine/src/signals/situational/short-week-road-deficit.ts:32`),
which takes a typed context and computes a real penalty.

**`REST_DAYS` is a column in `games`.** Measured live: `restDaysHome` is
populated on **2,130 of 4,832** games; `restDaysAway` on 2,082.

## The five in scope

| signal id | what the adapter resolves | source |
|---|---|---|
| `nfl_primetime_target_concentration` | WR1 target share + primetime flag | `PlayerGameStat.targetShare` (36,539 rows) + `games.commenceTime` |
| `nfl_backup_qb_target_distribution` | IS_BACKUP + starter/backup target share | `DepthChartEntry.depthRank` (6,875) + `Injury` (7,857) + `PlayerGameStat` |
| `nfl_high_altitude_fatigue` | stadium elevation | a 32-row static venue table (needs building) |
| `nfl_linear_wind_pass_impact` | IS_DOME | a 32-row static venue table (needs building); WIND_MPH already produced |
| `nfl_temperature_precipitation_decay` | precipitation TYPE enum | nothing derives NONE/LIGHT_RAIN/HEAVY_RAIN/SNOW/FREEZING_RAIN from `precip_pct` |

`nfl_wr1_vacated_target_efficiency` also has its data, but it is a
**duplicate** with a false "Same math" comment and is a deletion candidate
instead.

## The gates this stage does NOT clear

**Wiring these 5 still does not make them vote.** Two more gates sit in
front, and they are in STAGED-IMPROVEMENT 5:

1. **The sign gate.** `continuous-signal-tilt.ts:100-104` refuses any
   CONTINUOUS_VALUE signal whose result does not carry `metadata.homeSign`
   of exactly `1`/`-1`. `grep -c homeSign signal-registry-definitions.ts`
   = **0**.
2. **The env bridge.** `stored-signal-env-bridge.ts:24-37` merges exactly
   **four** weather keys. No non-weather key can be read from the DB by any
   code path.

**So the correct sequence is: sign + bridge (stage 5) -> adapter (this
stage) -> measure -> settlement loop (stage 4) -> promote.**

## What changes

### 1. New file: `packages/ingestion-pipeline/src/context.builders/signal-context.ts`

A builder that resolves the declared `dataDependencies` into typed values.
One function per dependency family, not one per evaluator:

```ts
export interface SignalContext {
  readonly restDays: number | null;
  readonly opponentRestDays: number | null;
  readonly isRoadTeam: boolean | null;
  readonly travelDistanceMiles: number | null;
  readonly isDivisionRivalry: boolean | null;
  readonly defensivePlays: number | null;
  /* ... one field per env key the 21 evaluators read ... */
}

export async function buildSignalContext(
  game: { id: string; homeTeam: string; awayTeam: string; commenceTime: Date },
  db: SignalContextDb,
): Promise<SignalContext>
```

### 2. 20 one-line edits in `signal-registry-extensions.ts`

```ts
- const restDays = num(ctx.env, "REST_DAYS");
+ const restDays = ctx.signalContext?.restDays ?? null;
```

### 3. The `activationStatus` flip

`"DARK"` → `"ACTIVE"` **only after** the adapter's output passes the
kill line at `signal-registry-extensions.ts:41-46`
(`maxBrierScoreVsMarket 0.250`, `minSettledSample 100`,
`maxDivergenceZScore 3.0`, `maxAgeMinutes 120`).

**A newly wired evaluator starts at weight 0 and must earn its way up.**
That is the repo's existing discipline and it must not be bypassed.

## The two deletion candidates

The doctrine — *"Dark sources are failures until fixed. A source with no
point-in-time producer is dark. It must receive a producer or be deleted"* —
points at two of these:

1. **`nfl_turf_surface_fatigue`** — needs `TURF_SOFTNESS_INDEX`, which
   **nothing in the repo measures**. There is no turf-physics feed.
   Wiring it means inventing a number. **Delete it from the registry.**
2. **`nfl_age_conditioned_rest`** — needs `ROSTER_SNAP_WEIGHTED_AGE`, a
   *construction* (age weighted by snap share), not a measurement.
   **Stage it as a new metric with a producer; do not activate it against
   env vars.**

Deleting them makes the registry's state truthful: 19 DARK, each with a
stated producer path, instead of 21 DARK of which 2 have no possible
producer.

## The dependency that is not optional

**This stage must land with the settlement loop (STAGE 4).** Wiring 20
evaluators without a settlement feedback path produces 20 more signals
that never earn weight — exactly the failure mode of the corpus evaluator,
whose output reaches a factor breakdown and nothing else.

The order is: **adapter → wire → measure → settlement loop → promote.**

## Acceptance

- [ ] Each of the 19 wired evaluators returns a non-null value for a game
      where its data exists, and null where it does not.
- [ ] Every value it returns is traceable to a named table + column.
- [ ] The kill line is unchanged and enforced.
- [ ] A wired evaluator that misses the kill line is retired by the existing
      mechanism — measured, not asserted.
- [ ] The 2 deletion candidates are removed from the registry, with the
      removal reason recorded in the registry file.
