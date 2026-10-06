// @ts-nocheck
/**
 * arXiv 2512.16968v1: Fairness, Travel, and Market Potential: An Optimization Framework for NBA Expansion.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Theory-distance travel-burden differential as an NBA fatigue feature: game-frequency-weighted travel over trailing days, differenced home vs away, plus a schedule-fairness audit over released schedules. Adopt iff it improves rolling-origin log-loss beyond the ledger-1059 rest/travel features.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * GSE adds theory-distance travel-burden differential (game-frequency-weighted travel over trailing days) as fatigue features in the NBA game model, alongside schedule-fairness auditing for released schedules.
 *
 * ACCEPTANCE GATE:
 * ADAPT iff travel-burden differential improves the NBA game model on rolling-origin log-loss beyond the ledger-1059 rest/travel features; keep the optimization/MIP template as content-only if distance adds nothing.
 *
 * ENABLED=false: new game-model feature; needs a human call.
 */


export const ENABLED = false;

export interface TeamGame {
  /** Miles traveled to reach this game (0 for home games). */
  readonly travelMiles: number;
  /** Days since the previous game. */
  readonly restDays: number;
}

/**
 * Travel burden: sum of travel miles over the trailing window, weighted by
 * recency (recent travel fatigues more) and game frequency (back-to-backs hurt).
 * windowDays caps how far back travel counts.
 */
export function travelBurden(
  games: readonly TeamGame[],
  windowDays = 7,
  decayPerDay = 0.75,
): number {
  let burden = 0;
  let daysAgo = 0;
  for (let i = games.length - 1; i >= 0; i--) {
    const g = games[i]!;
    if (daysAgo > windowDays) break;
    const recency = Math.pow(decayPerDay, daysAgo);
    const frequencyPenalty = g.restDays < 1 ? 1.5 : g.restDays < 2 ? 1.2 : 1.0;
    burden += g.travelMiles * recency * frequencyPenalty;
    daysAgo += Math.max(g.restDays, 1);
  }
  return burden;
}

/** Travel-burden differential: away burden minus home burden (positive favors home). */
export function travelBurdenDifferential(
  awayGames: readonly TeamGame[],
  homeGames: readonly TeamGame[],
  windowDays = 7,
): number {
  return travelBurden(awayGames, windowDays) - travelBurden(homeGames, windowDays);
}

export interface ScheduleAudit {
  readonly teamBurden: { team: string; burden: number }[];
  readonly mean: number;
  readonly sd: number;
  /** Max burden minus min burden: the fairness gap. */
  readonly fairnessGap: number;
  /** Teams beyond 2sd from the mean (schedule-fairness outliers). */
  readonly outliers: string[];
}

/** Schedule-fairness audit over a released schedule's trailing travel burdens. */
export function scheduleFairnessAudit(
  teamGames: Record<string, readonly TeamGame[]>,
  windowDays = 7,
): ScheduleAudit {
  const teamBurden = Object.entries(teamGames).map(([team, games]) => ({
    team,
    burden: travelBurden(games, windowDays),
  }));
  const vals = teamBurden.map((t) => t.burden);
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
  const sd = Math.sqrt(
    vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(vals.length, 1),
  );
  const fairnessGap = Math.max(...vals, 0) - Math.min(...vals, 0);
  const outliers = teamBurden
    .filter((t) => sd > 0 && Math.abs(t.burden - mean) > 2 * sd)
    .map((t) => t.team);
  return { teamBurden, mean, sd, fairnessGap, outliers };
}
