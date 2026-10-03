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

/**
 * Season an INGESTION cron should target: the labelled current season.
 *
 * Product surfaces default to `latestCompletedNflSeasonFloor` so they never
 * advertise an empty in-progress season, but an ingestion cursor that follows
 * that floor never asks the source for the new season at all — in 2026 the
 * daily/half-hourly nflverse crons kept re-ingesting 2025 through the whole
 * 2026 season (observed 2026-09-02). Ingestion must ask for the labelled
 * season; the caller falls back to the completed floor when the source has
 * not published it yet (404 / zero rows), and the display floor advances on
 * its own once REG rows exist.
 */
export function ingestionTargetNflSeason(now = new Date()): number {
  return currentNflSeasonLabel(now);
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

// ---------------------------------------------------------------------------
// REG-row probe (C-95).
// ---------------------------------------------------------------------------

/** True when `season` has regular-season source rows stored. */
export type RegRowsProbe = (season: number) => Promise<boolean>;

/**
 * `resolveFootballStatsSeason` with a real, asynchronous REG-row probe.
 *
 * Every production caller of the sync resolver omitted `hasRegRows`, so the
 * "advances on its own once REG rows exist" promise in the docblock above was
 * never kept: the display season sat on the completed floor (2025) for the whole
 * 2026 regular season. This walks the same candidates in the same order as the
 * sync resolver (labelled current, completed floor, then three seasons back),
 * probing lazily and stopping at the first season that has rows, then hands
 * the sync resolver a lookup over exactly what was probed so the two can never
 * disagree on precedence or wording.
 *
 * A probe that throws is treated as "no rows" for that season and reported in
 * `probeErrors`, never as a newer season: a database hiccup must not advertise
 * an empty season, and it must not hide either.
 */
export async function resolveFootballStatsSeasonAsync(
  now: Date,
  hasRegRows: RegRowsProbe,
): Promise<StatsSeasonResolution & { readonly probed: readonly number[]; readonly probeErrors: readonly string[] }> {
  const labelledCurrent = currentNflSeasonLabel(now);
  const completedFloor = latestCompletedNflSeasonFloor(now);
  const candidates = [
    labelledCurrent,
    completedFloor,
    completedFloor - 1,
    completedFloor - 2,
    completedFloor - 3,
  ].filter((season, index, all) => all.indexOf(season) === index);

  const withRows = new Set<number>();
  const probed: number[] = [];
  const probeErrors: string[] = [];
  for (const season of candidates) {
    probed.push(season);
    try {
      if (await hasRegRows(season)) {
        withRows.add(season);
        break;
      }
    } catch (err) {
      probeErrors.push(`${season}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const resolution = resolveFootballStatsSeason(now, (season) => withRows.has(season));
  return { ...resolution, probed, probeErrors };
}
