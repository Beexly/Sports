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
// Regular-season WEEK resolution.
// ---------------------------------------------------------------------------

/**
 * Week 1 of the NFL regular season opens on the Thursday AFTER Labor Day (the
 * first Monday in September). Every subsequent week rolls over on Tuesday,
 * which is the league's own week boundary — a Monday night game belongs to the
 * week that started the previous Tuesday, and a Tuesday-to-Monday window is the
 * only rule that puts it there.
 *
 * Derived from the calendar rather than a hardcoded table, so it does not need
 * maintaining each August and cannot silently go stale mid-season. Verified
 * against 2026: Labor Day is 2026-09-07, the Thursday opener is 2026-09-10, and
 * the week-1 window therefore opens Tuesday 2026-09-08.
 */
export function nflWeekOneStart(season: number): Date {
  // First Monday in September of the season year = Labor Day.
  const sept1 = new Date(Date.UTC(season, 8, 1));
  const dow = sept1.getUTCDay(); // 0 Sun .. 6 Sat
  const laborDayOffset = dow === 1 ? 0 : (8 - dow) % 7;
  const laborDay = new Date(Date.UTC(season, 8, 1 + laborDayOffset));
  // The week-1 window opens the day AFTER Labor Day; the opener is two days later.
  return new Date(laborDay.getTime() + 24 * 60 * 60 * 1000);
}

/** Regular-season weeks in the modern NFL schedule. */
export const NFL_REGULAR_SEASON_WEEKS = 18;

export type NflWeekResolution = {
  /** Labelled season the week belongs to. */
  readonly season: number;
  /**
   * 1..18 during the regular season. BEFORE week 1 opens this reads 1 — the
   * week we are heading into, which is the week every projection surface is
   * actually about in August and early September. AFTER week 18 it stays 18
   * rather than running on into a nineteenth week that does not exist.
   */
  readonly week: number;
  /** True only inside the 18-week window; false in the offseason and in January+. */
  readonly inRegularSeason: boolean;
};

/**
 * The regular-season week a projection surface should target.
 *
 * Clamped at BOTH ends on purpose. Reporting week 0 in August would make every
 * "is this basis current" check compare against a week that never happens, and
 * letting it run to 23 in February would quietly age a basis out of every
 * grace window. Callers that need to know the difference read
 * `inRegularSeason`.
 */
export function resolveNflWeek(now = new Date()): NflWeekResolution {
  const season = currentNflSeasonLabel(now);
  const start = nflWeekOneStart(season);
  const elapsedDays = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (elapsedDays < 0) return { season, week: 1, inRegularSeason: false };
  const week = Math.floor(elapsedDays / 7) + 1;
  if (week > NFL_REGULAR_SEASON_WEEKS) {
    return { season, week: NFL_REGULAR_SEASON_WEEKS, inRegularSeason: false };
  }
  return { season, week, inRegularSeason: true };
}
