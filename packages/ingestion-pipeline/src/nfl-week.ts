/**
 * NFL week from a kickoff, using the verified opening Wednesday/Thursday of
 * each season. A date before that opener, or a season we have not anchored,
 * returns null. Guessing a week would let a same-week stat leak into the pick.
 *
 * 2026 opener: September 9, 2026 (Wednesday), from the season page.
 */
const OPENERS_UTC: Readonly<Record<number, string>> = {
  2024: "2024-09-05",
  2025: "2025-09-04",
  2026: "2026-09-09",
};

export function nflSeasonOf(kickoff: Date): number | null {
  const month = kickoff.getUTCMonth() + 1;
  const year = kickoff.getUTCFullYear();
  if (month >= 9) return year;
  if (month <= 2) return year - 1;
  return null;
}

export function nflWeekOf(kickoff: Date): { season: number; week: number } | null {
  const season = nflSeasonOf(kickoff);
  if (season == null) return null;
  const opener = OPENERS_UTC[season];
  if (opener == null) return null;
  const start = Date.parse(`${opener}T00:00:00Z`);
  const days = Math.floor((kickoff.getTime() - start) / 86_400_000);
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  if (week < 1 || week > 22) return null;
  return { season, week };
}

/** A report may be used only if it was fetched before kickoff and is not a future week. */
export function injuryReportIsBeforeKickoff(input: {
  readonly kickoff: Date;
  readonly fetchedAt: Date;
  readonly season: number;
  readonly week: number;
}): boolean {
  if (input.fetchedAt.getTime() >= input.kickoff.getTime()) return false;
  const game = nflWeekOf(input.kickoff);
  if (game == null) return false;
  if (input.season < game.season) return true;
  if (input.season > game.season) return false;
  return input.week <= game.week;
}
