/**
 * Football season resolution for stats surfaces (engines + website).
 *
 * NFL seasons are labelled by the calendar year the regular season starts
 * (~September). Before September the labelled "current" season is still the
 * prior year.
 *
 * Integrity:
 *   - Do not present incomplete 2026 REG as if it were settled product truth
 *     when only preseason / empty REG exists.
 *   - Prefer the latest season that has real REG rows available from source
 *     (typically through 2025 until 2026 REG accumulates).
 *   - Never invent scores, wins, or availability.
 */

/**
 * Labelled NFL season for "now" (September+ → this calendar year).
 * August 2026 → 2025; September 2026 → 2026.
 */
export function currentNflSeasonLabel(now = new Date()): number {
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/**
 * Latest season we treat as complete for REG product surfaces when the
 * labelled current season has not yet produced REG data. Floor at 2025 so
 * pre-2025 stuck cursors still advance to a paid-worthy completed season.
 */
export function latestCompletedNflSeasonFloor(now = new Date()): number {
  const labelled = currentNflSeasonLabel(now);
  // Before the labelled season has started REG, the completed season is labelled-1.
  // Once labelled >= 2026 and we are still early, floor completed at 2025.
  const completedCandidate = now.getUTCMonth() >= 8 ? labelled - 1 : labelled;
  return Math.max(2025, completedCandidate);
}

export type StatsSeasonResolution = {
  /** Season to load for REG leaders / engines / website stats. */
  readonly season: number;
  /** Why this season was chosen (for API notes / empty-state honesty). */
  readonly reason: string;
  readonly labelledCurrent: number;
  readonly completedFloor: number;
};

/**
 * Resolve which season REG stats should surface.
 *
 * @param hasRegRows — optional probe: true if `season` has REG source rows.
 *   When omitted, returns the completed floor (safe default: through 2025
 *   until September, then labelled-1 until product probes 2026 REG).
 */
export function resolveFootballStatsSeason(
  now = new Date(),
  hasRegRows?: (season: number) => boolean,
): StatsSeasonResolution {
  const labelledCurrent = currentNflSeasonLabel(now);
  const completedFloor = latestCompletedNflSeasonFloor(now);

  if (!hasRegRows) {
    return {
      season: completedFloor,
      reason: `Defaulting to completed REG floor ${completedFloor} (labelled current ${labelledCurrent}); probe REG rows before advertising a newer season.`,
      labelledCurrent,
      completedFloor,
    };
  }

  // Prefer labelled current only when it actually has REG data.
  if (hasRegRows(labelledCurrent)) {
    return {
      season: labelledCurrent,
      reason: `Labelled current season ${labelledCurrent} has REG source rows.`,
      labelledCurrent,
      completedFloor,
    };
  }

  if (hasRegRows(completedFloor)) {
    return {
      season: completedFloor,
      reason: `Labelled current ${labelledCurrent} has no REG rows yet; using completed season ${completedFloor}.`,
      labelledCurrent,
      completedFloor,
    };
  }

  // Walk back a few seasons rather than invent data.
  for (let s = completedFloor - 1; s >= completedFloor - 3; s -= 1) {
    if (hasRegRows(s)) {
      return {
        season: s,
        reason: `Falling back to season ${s} with REG rows; newer seasons empty.`,
        labelledCurrent,
        completedFloor,
      };
    }
  }

  return {
    season: completedFloor,
    reason: `No REG rows found in probe window; reporting season ${completedFloor} with empty-state expected.`,
    labelledCurrent,
    completedFloor,
  };
}
