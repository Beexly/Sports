/**
 * The COMMITTED scale table for the `signals` ledger — measured, not guessed.
 *
 * This file is the artifact the writer loads. Every number in it came out of
 * production on 2026-09-30 by running `fitSignalScales` over the live
 * population; the reproduction query and the full method live in
 * `apps/web/scripts/fit-signal-scales.mjs`, and the law lives in
 * `signal-scale-fit.ts`. Nothing here is hand-tuned, and nothing here is a
 * plausible-looking constant: the eight keys with no joinable evidence carry
 * weight 0 and a stated reason, which is the honest answer.
 *
 * MEASURED POPULATION (the provenance of every row below)
 *   `signals`, 118,462 rows over seasons 2020-2026, first captured
 *   2026-08-06, last 2026-09-30. Ten distinct keys. On every row of every key,
 *   `weight = 1` and `confidence = 1` — that uniform 1 is what this table
 *   replaces.
 *
 * THE TEN RAW SCALES, AS FOUND (standard deviation of the persisted `value`)
 *   pgs.target_share       0.093     injury.availability    0.500
 *   ngs.avg_separation     1.020     ngs.yac_above_expect.  1.951
 *   pgs.rushing_epa        2.726     ngs.air_yards_to_stk.  2.321
 *   pgs.receiving_epa      3.296     pgs.fantasy_ppr        8.017
 *   ngs.cpoe               7.820     pgs.passing_epa        9.626
 *   A 103x spread in units across ten keys that a uniform weight treats as
 *   interchangeable. That is the whole defect.
 *
 * HOW EACH WEIGHT WAS EARNED
 *   - SCALE: anchor + spread measured per key by Welford over its own
 *     population. `injury.availability` is the one DECLARED scale, because its
 *     reading is an ordinal (-1 out / 0 doubtful / +1 active) and a fitted
 *     spread over three discrete codes would be meaningless.
 *   - WEIGHT: within-player (fixed-effect) correlation against a SETTLED
 *     outcome — next-week `player_game_stats.fantasyPointsPpr` above the
 *     population median (base rate 0.4966, median 6.10, so the target is
 *     balanced and the correlation is not inflated by class imbalance).
 *     Evidence counted in DISTINCT FIXTURES (season x week), not rows.
 *
 * WHY WITHIN-PLAYER AND NOT THE OBVIOUS NUMBER. The naive between-player
 * correlation is 4x to 70x larger and almost entirely IDENTITY rather than
 * forecast. Measured, same keys, same outcomes:
 *
 *     key                    between_r   within_r   inflation
 *     pgs.fantasy_ppr           0.373      0.094      4.0x
 *     pgs.target_share          0.293      0.091      3.2x
 *     pgs.receiving_epa         0.096      0.025      3.8x
 *     pgs.passing_epa           0.084      0.002     36.1x
 *     pgs.rushing_epa            0.041      0.004     11.3x
 *     injury.availability        0.071      0.063      1.1x
 *
 *   In 2024 alone `pgs.target_share` measures between_r 0.314 and within_r
 *   0.0046 — a 68x gap, i.e. the between-player number is almost entirely
 *   "which player is this", not "will they do better next week". Weighting by
 *   it would advertise predictive power the data does not have.
 *
 * WHY EIGHT KEYS CARRY WEIGHT 0. Each for its own measured reason, and the
 * reasons are the deliverable as much as the weights are:
 *   - ngs.* (4 keys): the writer keys NGS rows by gsisId while every settled
 *     outcome is keyed by playerId, and 0 of 380 distinct gsis match a playerId.
 *     No join, no fit, no weight. (The crosswalk does not exist in this repo.)
 *   - snap.* (3 keys): never persisted at all. All 31,100 `snap_counts` rows
 *     have a NULL `playerId`, and the writer drops a row with no id, so these
 *     keys project nothing. Their anchors below are measured on the source table
 *     so the scale is on record the day the ids land.
 *   - injury.availability: only 23 independent fixtures carry a joinable
 *     settled outcome, below the 100-fixture floor. Its within-player r of
 *     0.063 is the strongest of any key here, and it is still refused — a
 *     correlation off 23 games is not separable from noise.
 *
 * REPRODUCING / RE-FITTING
 *   DATABASE_URL=... node apps/web/scripts/fit-signal-scales.mjs [--write]
 *   Without `--write` it prints the table and diffs it against this file, so a
 *   refit is a reviewed diff rather than a silent edit. `--write` refuses to
 *   write unless the fit actually changed something, and prints both versions.
 */

import type { SignalScale } from "./signal-scale-fit.js";

/** Provenance of the fit these numbers come from. */
export const SIGNAL_SCALE_TABLE_VERSION = "2026-09-30";
export const SIGNAL_SCALE_TABLE_SOURCE = "signals @ 118,462 rows, seasons 2020-2026";

/**
 * The measured table. Keys are exactly the ones the writer emits — a census
 * driven by a key nothing emits reports "insufficient" forever, which in an ops
 * report is indistinguishable from a dead producer.
 */
export const SIGNAL_SCALES: readonly SignalScale[] = Object.freeze([
  {
    key: "injury.availability",
    // DECLARED ordinal scale, not fitted: the reading is -1 out / 0 doubtful /
    // +1 active, and the neutral point is 0.
    //
    // SPREAD IS 0.5, NOT 1, and that is load-bearing. `normalizeReading` maps
    // anchor +/- 2*spread onto -1..+1, so a declared spread of 1 would map the
    // ordinal onto -0.5..+0.5 and HALVE every injury reading — a "full
    // participation" player would persist as 0.5 instead of 1.0, and a
    // comparator comparing this key against a fitted one would be comparing a
    // halved value to a full one. The measured population (6,809 usable
    // readings, anchor 0.4607, spread 0.8847) is recorded here for reference but
    // deliberately NOT used as the scale: a fitted spread over three discrete
    // codes is not a measurement of anything.
    //
    // (The loader's own declared scale in `signal-ledger-loader.ts` uses spread
    // 1 and therefore does halve it. That path is read-only census output and
    // writes nothing, so nothing downstream is affected today; flagged here
    // rather than silently fixed outside this PR's scope.)
    anchor: 0,
    spread: 0.5,
    n: 6809,
    weight: 0,
    withinCorrelation: 0.0626,
    betweenCorrelation: 0.0706,
    fixtures: 23,
    entities: 370,
    verdict: "insufficient-fixtures",
    reason:
      "23 independent fixtures, below the floor of 100; the correlation is not separable from noise",
  },
  {
    key: "ngs.air_yards_to_sticks",
    anchor: -0.98887,
    spread: 2.320839,
    n: 661,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason: "no settled outcome joins this key, so no weight can be fitted (0, not a guess)",
  },
  {
    key: "ngs.avg_separation",
    anchor: 2.993155,
    spread: 1.020088,
    n: 1500,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason: "no settled outcome joins this key, so no weight can be fitted (0, not a guess)",
  },
  {
    key: "ngs.cpoe",
    anchor: 0.282356,
    spread: 7.819845,
    n: 661,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason: "no settled outcome joins this key, so no weight can be fitted (0, not a guess)",
  },
  {
    key: "ngs.yac_above_expectation",
    anchor: 0.507486,
    spread: 1.950651,
    n: 1497,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason: "no settled outcome joins this key, so no weight can be fitted (0, not a guess)",
  },
  {
    key: "pgs.fantasy_ppr",
    anchor: 8.397012,
    spread: 8.017209,
    n: 35513,
    // The strongest key in the table, and note how modest that is: 0.105.
    // Within-player r 0.094 over 125 fixtures, evidence-scaled by
    // sqrt(125/100) = 1.118.
    weight: 0.105064,
    withinCorrelation: 0.093972,
    // 4.0x the within-player number. Kept in the table so the report can show
    // exactly how much of the naive fit was player identity.
    betweenCorrelation: 0.373233,
    fixtures: 125,
    entities: 1052,
    verdict: "earned",
    reason: "within-player r=0.0940 over 125 fixtures",
  },
  {
    key: "pgs.passing_epa",
    anchor: 0.947118,
    spread: 9.626109,
    n: 4189,
    // Widest raw scale in the ledger (sd 9.63) and the weakest signal in it:
    // within-player r 0.0023. The fit is what stops a +-35 EPA reading from
    // dominating a composite it has no demonstrated claim on.
    weight: 0.002593,
    withinCorrelation: 0.00232,
    betweenCorrelation: 0.083861,
    fixtures: 125,
    entities: 209,
    verdict: "earned",
    reason: "within-player r=0.0023 over 125 fixtures",
  },
  {
    key: "pgs.receiving_epa",
    anchor: 0.736062,
    spread: 3.295935,
    n: 27143,
    weight: 0.028479,
    withinCorrelation: 0.025472,
    betweenCorrelation: 0.096183,
    fixtures: 125,
    entities: 922,
    verdict: "earned",
    reason: "within-player r=0.0255 over 125 fixtures",
  },
  {
    key: "pgs.rushing_epa",
    anchor: -0.208321,
    spread: 2.725506,
    n: 14112,
    weight: 0.004009,
    withinCorrelation: 0.003586,
    betweenCorrelation: 0.040648,
    fixtures: 125,
    entities: 687,
    verdict: "earned",
    reason: "within-player r=0.0036 over 125 fixtures",
  },
  {
    key: "pgs.target_share",
    anchor: 0.115548,
    spread: 0.093152,
    n: 30118,
    // Narrowest raw scale in the ledger (sd 0.093) and the second-strongest
    // signal in it. Under a uniform weight it was contributing ~1/100th of the
    // influence of pgs.passing_epa; here it outranks it 39:1.
    weight: 0.101859,
    withinCorrelation: 0.091106,
    betweenCorrelation: 0.292887,
    fixtures: 125,
    entities: 983,
    verdict: "earned",
    reason: "within-player r=0.0911 over 125 fixtures",
  },
  {
    // The three snap keys the writer emits but has never persisted, because all
    // 31,100 snap_counts rows carry a NULL playerId. Their anchors are measured
    // on the source table so the scale is on record for the day the ids land;
    // their weight is 0 because no row has ever been written, so there is no
    // evidence to fit.
    key: "snap.defense_pct",
    anchor: 0.235359,
    spread: 0.345725,
    n: 31100,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason:
      "no row is ever written: all 31,100 snap_counts rows have a NULL playerId, so nothing joins a settled outcome",
  },
  {
    key: "snap.offense_pct",
    anchor: 0.235541,
    spread: 0.366532,
    n: 31100,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason:
      "no row is ever written: all 31,100 snap_counts rows have a NULL playerId, so nothing joins a settled outcome",
  },
  {
    key: "snap.st_pct",
    anchor: 0.235236,
    spread: 0.245605,
    n: 31100,
    weight: 0,
    withinCorrelation: 0,
    betweenCorrelation: 0,
    fixtures: 0,
    entities: 0,
    verdict: "unjoinable-outcome",
    reason:
      "no row is ever written: all 31,100 snap_counts rows have a NULL playerId, so nothing joins a settled outcome",
  },
] as const satisfies readonly SignalScale[]);

/** Lookup by key. Missing key => no scale => the row must be dropped, not faked. */
const BY_KEY: ReadonlyMap<string, SignalScale> = new Map(
  SIGNAL_SCALES.map((s) => [s.key, s] as const),
);

/** The fitted scale for a key, or undefined when the key earned none. */
export function signalScaleFor(key: string): SignalScale | undefined {
  return BY_KEY.get(key);
}

/** Every key the committed table covers. */
export const SIGNAL_SCALE_KEYS: readonly string[] = Object.freeze(
  SIGNAL_SCALES.map((s) => s.key),
);
