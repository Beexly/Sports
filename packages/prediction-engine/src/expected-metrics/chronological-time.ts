/**
 * Chronological NFL Season-Week Ordering Helpers
 * ==============================================
 * Replaces legacy base-100 season-week encoding arithmetic that injects an 82-integer
 * dead gap (`19..99`) between Season S Week 18 and Season S+1 Week 1, starving
 * Weeks 1-4 lookbacks and causing a 2x seasonal window sawtooth under window
 * subtraction.
 */

export interface SeasonWeek {
  readonly season: number;
  readonly week: number;
}

/**
 * Dense chronological index with uniform spacing (`2025 W18 -> 2026 W1` step = 1).
 * Defaults to 18 regular-season weeks so trailing-K week windows work seamlessly
 * across season boundaries without Week 1-4 starvation or 2x sawtooth distortion.
 */
export function chronologicalRegWeekIndex(
  season: number,
  week: number,
  regWeeks = 18,
): number {
  const clampedWeek = Math.min(regWeeks, Math.max(1, Math.trunc(week)));
  return (Math.trunc(season) - 1999) * regWeeks + (clampedWeek - 1);
}

/**
 * Dense chronological index reserving postseason slots (up to Week 22) without
 * any 19..99 gap. Use for exact within-season + playoff chronological sorting.
 */
export function chronologicalSeasonWeekIndex(
  season: number,
  week: number,
  slotsPerSeason = 22,
): number {
  return (Math.trunc(season) - 1999) * slotsPerSeason + Math.trunc(week);
}

/** Comparator for two `(season, week)` pairs (negative if a < b). */
export function compareSeasonWeek(
  aSeason: number,
  aWeek: number,
  bSeason: number,
  bWeek: number,
): number {
  if (aSeason !== bSeason) return aSeason - bSeason;
  return aWeek - bWeek;
}

/** Parse standard nflverse `YYYY_WW_AWAY_HOME` gameId into `{ season, week }`. */
export function parseGameIdSeasonWeek(gameId: string): SeasonWeek | null {
  const parts = gameId.split("_");
  if (parts.length < 2) return null;
  const season = Number.parseInt(parts[0]!, 10);
  const week = Number.parseInt(parts[1]!, 10);
  if (!Number.isFinite(season) || !Number.isFinite(week)) return null;
  return { season, week };
}
