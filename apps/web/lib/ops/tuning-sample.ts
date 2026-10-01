/**
 * Tuning sample builder — the production caller `tuneSignalWeights` never had.
 *
 * The tuner (`packages/prediction-engine/src/tune-signal-weights.ts`) derives
 * weight multipliers from SETTLED OUTCOMES: each `KeyOutcome` is a
 * directional reading (−1..1) at mint time plus the settled binary outcome.
 * Until now it had only test callers — no production path ever fed it real
 * data, so no weight was ever earned from outcomes.
 *
 * The sample source is `pick_signal_snapshots`: immutable per-pick records of
 * which signals were active at prediction time, with `settlementResult` and
 * `eligibleForLearning` filled by the settlement flow. Only rows with
 * `eligibleForLearning = true` and a decisive settlement (WIN/LOSS — PUSH is
 * excluded, matching the tuner's contract) enter the sample.
 *
 * DIRECTIONAL NORMALIZATIONS (documented, not fitted):
 * - `line_movement`: clamp(lineMovementDelta / 7, −1, 1). Seven points is
 *   roughly a touchdown + PAT — the scale is a football constant, not a
 *   tuned parameter. Sign follows the stored delta verbatim.
 * - `rest_advantage`: clamp(restAdvantageNet / 7, −1, 1). Same 7-day scale:
 *   a full week of extra rest is the most rest advantage football offers.
 *
 * A signal category whose `had*` flag is set but which has no directional
 * quantitative value on the snapshot is reported in `keysWithoutReading`
 * rather than invented — the tuner cannot score a flag alone, and a
 * fabricated reading would be worse than an absent one.
 *
 * READ-ONLY: this module projects rows to `KeyOutcome[]`. It never writes
 * weights anywhere — applying tuned weights is the later weight/calibrate
 * phase, behind its own gate.
 */

import { tuneSignalWeights, type KeyOutcome, type TunedWeight } from "@sports/prediction-engine";

/** The snapshot fields the tuner needs. Mirrors the Prisma model; keep in sync. */
export interface TuningSnapshot {
  readonly pickId: string;
  readonly settlementResult: string | null; // "WIN" | "LOSS" | "PUSH" | null
  readonly hadLineMovementSignal: boolean;
  readonly lineMovementDelta: number | null;
  readonly hadRestSignal: boolean;
  readonly restAdvantageNet: number | null;
  readonly hadOddsSignal: boolean;
  readonly hadScheduleSignal: boolean;
  readonly hadAtsFormSignal: boolean;
  readonly hadH2HSignal: boolean;
  readonly hadVenueSignal: boolean;
  readonly hadWeatherSignal: boolean;
  readonly hadInjurySignal: boolean;
  readonly hadRatingsSignal: boolean;
  readonly hadPlayerSignal: boolean;
  readonly hadOfficialsSignal: boolean;
  readonly hadVenueEnvironmentSignal: boolean;
  readonly hadPaceSignal: boolean;
  readonly hadMilestoneSignal: boolean;
}

export interface TuningSample {
  readonly outcomes: readonly KeyOutcome[];
  /** Signal categories flagged on snapshots but lacking a directional reading. */
  readonly keysWithoutReading: readonly string[];
  readonly snapshotsUsed: number;
  readonly snapshotsSkippedUnsettled: number;
}

const clamp11 = (n: number): number => Math.min(1, Math.max(-1, n));

function outcomeOf(result: string | null): 0 | 1 | null {
  if (result === "WIN") return 1;
  if (result === "LOSS") return 0;
  return null; // PUSH, null, anything else: excluded, per the tuner's contract
}

/**
 * Project settled snapshots into the tuner's sample.
 * Pure: no database, no clock.
 */
export function buildTuningSample(snapshots: readonly TuningSnapshot[]): TuningSample {
  const outcomes: KeyOutcome[] = [];
  const withoutReading = new Set<string>();
  let used = 0;
  let skippedUnsettled = 0;

  const flagOnly: ReadonlyArray<readonly [keyof TuningSnapshot, string]> = [
    ["hadOddsSignal", "odds"],
    ["hadScheduleSignal", "schedule"],
    ["hadAtsFormSignal", "ats_form"],
    ["hadH2HSignal", "h2h"],
    ["hadVenueSignal", "venue"],
    ["hadWeatherSignal", "weather"],
    ["hadInjurySignal", "injury"],
    ["hadRatingsSignal", "ratings"],
    ["hadPlayerSignal", "player"],
    ["hadOfficialsSignal", "officials"],
    ["hadVenueEnvironmentSignal", "venue_environment"],
    ["hadPaceSignal", "pace"],
    ["hadMilestoneSignal", "milestone"],
  ];

  for (const s of snapshots) {
    const outcome = outcomeOf(s.settlementResult);
    if (outcome === null) {
      skippedUnsettled = skippedUnsettled + 1;
      continue;
    }
    used += 1;

    if (s.hadLineMovementSignal) {
      if (s.lineMovementDelta !== null && Number.isFinite(s.lineMovementDelta)) {
        outcomes.push({
          key: "line_movement",
          value: clamp11(s.lineMovementDelta / 7),
          outcome,
        });
      } else {
        withoutReading.add("line_movement");
      }
    }
    if (s.hadRestSignal) {
      if (s.restAdvantageNet !== null && Number.isFinite(s.restAdvantageNet)) {
        outcomes.push({
          key: "rest_advantage",
          value: clamp11(s.restAdvantageNet / 7),
          outcome,
        });
      } else {
        withoutReading.add("rest_advantage");
      }
    }
    for (const [flag, key] of flagOnly) {
      if (s[flag] === true) withoutReading.add(key);
    }
  }

  return {
    outcomes,
    keysWithoutReading: [...withoutReading].sort(),
    snapshotsUsed: used,
    snapshotsSkippedUnsettled: skippedUnsettled,
  };
}

export interface TuningReport {
  readonly weights: readonly TunedWeight[];
  readonly keysWithoutReading: readonly string[];
  readonly snapshotsUsed: number;
  readonly snapshotsSkippedUnsettled: number;
  readonly keyOutcomes: number;
}

/** Build the sample AND run the tuner. Still read-only: no weight is persisted. */
export function tuneFromSnapshots(snapshots: readonly TuningSnapshot[]): TuningReport {
  const sample = buildTuningSample(snapshots);
  return {
    weights: tuneSignalWeights(sample.outcomes),
    keysWithoutReading: sample.keysWithoutReading,
    snapshotsUsed: sample.snapshotsUsed,
    snapshotsSkippedUnsettled: sample.snapshotsSkippedUnsettled,
    keyOutcomes: sample.outcomes.length,
  };
}
