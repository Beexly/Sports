/**
 * PickSignalSnapshot Builder
 *
 * Constructs the immutable signal record that captures what was known at
 * prediction time. This is the foundation for outcome-anchored calibration.
 *
 * Rules:
 *   - Called ONCE per pick, at creation time
 *   - Never updated after creation except to record settlement outcome
 *   - Contains only facts that existed at prediction time — never post-hoc
 *   - isBootstrap mirrors the pick's bootstrap state at creation
 *   - usedDerivedHistory=true only when DERIVED_MODEL_HISTORY_ENABLED was true
 *     and canonical ATS/H2H data was actually present (non-null)
 *
 * The snapshot enables future queries like:
 *   "When bookmakerCount >= 7, lineMovement was confirming, and ATS form was
 *    present, what was our actual WIN rate vs predicted confidence?"
 * This is outcome-anchored learning — not self-referential model memory.
 */

import type { ScoredPick, GameContextInput } from "@sports/types";

export interface PickSignalSnapshotData {
  pickId: string;
  gameId: string;

  // Signal presence flags
  hadOddsSignal: boolean;
  hadLineMovementSignal: boolean;
  hadRestSignal: boolean;
  hadScheduleSignal: boolean;
  hadAtsFormSignal: boolean;
  hadH2HSignal: boolean;
  hadVenueSignal: boolean;
  hadWeatherSignal: boolean;
  hadInjurySignal: boolean;
  hadRatingsSignal: boolean;

  // Key quantities at prediction time
  bookmakerCount: number;
  dataQualityScore: number;
  confidenceAtPrediction: number;
  lineMovementDelta: number | null;
  restAdvantageNet: number | null;
  atsFormSampleSize: number | null;
  h2hSampleSize: number | null;
  scheduleDensityHome: number | null;
  scheduleDensityAway: number | null;

  // Provenance
  isBootstrap: boolean;
  usedDerivedHistory: boolean;
  usedScheduleSignal: boolean;
  modelVersion: string;
}

/**
 * Builds the snapshot data object from the scored pick and its context.
 * Does not perform any DB access — just constructs the data shape.
 * The worker is responsible for the actual DB upsert.
 *
 * @param pickId         - The DB ID of the Pick record (from upsert return)
 * @param pick           - The ScoredPick from the prediction engine
 * @param context        - The GameContextInput that was fed to the engine
 * @param isBootstrap    - Whether this pick was created in bootstrap mode
 * @param usedDerivedHistory - Whether DERIVED_MODEL_HISTORY_ENABLED was true
 *                             AND canonical ATS/H2H data was actually present
 */
export function buildPickSignalSnapshot(
  pickId: string,
  pick: ScoredPick,
  context: GameContextInput | undefined,
  isBootstrap: boolean,
  usedDerivedHistory: boolean
): PickSignalSnapshotData {
  // Line movement: opening line existed and is different from current
  const hadLineMovementSignal =
    (context?.openingSpread != null) ||
    (context?.openingTotal != null);

  // Rest signal: any rest data was present
  const hadRestSignal =
    (context?.restDaysHome != null) ||
    (context?.restDaysAway != null) ||
    (context?.isBackToBackHome === true) ||
    (context?.isBackToBackAway === true);

  // Schedule signal: schedule density data was present
  const hadScheduleSignal =
    (context?.scheduleDensityHome != null) ||
    (context?.scheduleDensityAway != null);

  // ATS form used: derived history enabled AND actual data was non-null
  const hadAtsFormSignal =
    usedDerivedHistory &&
    ((context?.homeAtsForm != null) || (context?.awayAtsForm != null));

  // H2H used: derived history enabled AND H2H data was non-null
  const hadH2HSignal =
    usedDerivedHistory && (context?.headToHeadForm != null);

  // Venue splits used
  const hadVenueSignal =
    usedDerivedHistory &&
    ((context?.homeAtsFormAtHome != null) || (context?.awayAtsFormAway != null));

  // Largest ATS sample used (home or away form, whichever is larger)
  const atsFormSampleSize = hadAtsFormSignal
    ? Math.max(
        context?.homeAtsForm?.sampleSize ?? 0,
        context?.awayAtsForm?.sampleSize ?? 0
      ) || null
    : null;

  // H2H sample
  const h2hSampleSize = hadH2HSignal
    ? (context?.headToHeadForm?.sampleSize ?? null)
    : null;

  // Net rest advantage from home team's perspective (positive = home more rested)
  const restAdvantageNet =
    context?.restDaysHome != null && context?.restDaysAway != null
      ? context.restDaysHome - context.restDaysAway
      : null;

  // Line movement delta — extract from context if both opening and current exist
  // For spread picks: current - opening (negative = favoring home more)
  const lineMovementDelta = (() => {
    if (pick.pickType === "SPREAD" &&
        context?.openingSpread != null &&
        context?.currentSpread != null) {
      return context.currentSpread - context.openingSpread;
    }
    if (pick.pickType === "TOTAL" &&
        context?.openingTotal != null &&
        context?.currentTotal != null) {
      return context.currentTotal - context.openingTotal;
    }
    return null;
  })();

  return {
    pickId,
    gameId: pick.gameId,

    // Signal presence — honest flags, no inflation
    hadOddsSignal: true,                // odds are always the primary input
    hadLineMovementSignal,
    hadRestSignal,
    hadScheduleSignal,
    hadAtsFormSignal,
    hadH2HSignal,
    hadVenueSignal,
    hadWeatherSignal: false,            // not implemented yet
    hadInjurySignal: false,             // not implemented yet
    hadRatingsSignal: false,            // not implemented yet

    // Quantities
    bookmakerCount: pick.bookmakerCount,
    dataQualityScore: pick.dataQualityScore,
    confidenceAtPrediction: pick.confidence,
    lineMovementDelta,
    restAdvantageNet,
    atsFormSampleSize,
    h2hSampleSize,
    scheduleDensityHome: context?.scheduleDensityHome ?? null,
    scheduleDensityAway: context?.scheduleDensityAway ?? null,

    // Provenance
    isBootstrap,
    usedDerivedHistory,
    usedScheduleSignal: hadScheduleSignal,
    modelVersion: pick.modelVersion,
  };
}
