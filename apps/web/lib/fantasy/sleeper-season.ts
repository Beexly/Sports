/**
 * Default Sleeper season for the league-import form.
 *
 * Sleeper labels an NFL season by the calendar year it kicks off in. The
 * 2026 season (kickoff September 2026) is "2026" through the Super Bowl in
 * February 2027. Sleeper opens next-season leagues in early spring, so from
 * March onward the current calendar year is the season a user is drafting or
 * playing; in January and February the season still in progress is the prior
 * year's.
 *
 * Pure: takes the clock as an argument so the rule is testable and never
 * depends on a hard-coded year (the previous default was the literal "2025",
 * which showed last season's leagues on NFL 2026 kickoff week).
 */

/** First month (0-based) in which the current calendar year is the live season. */
export const SLEEPER_SEASON_ROLLOVER_MONTH = 2; // March

export function defaultSleeperSeason(now: Date): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return String(month >= SLEEPER_SEASON_ROLLOVER_MONTH ? year : year - 1);
}
