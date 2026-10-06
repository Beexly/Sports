
export interface PiRatings {
  readonly home: number;
  readonly away: number;
}

export interface PiRatingsOptions {
  readonly lambda?: number;
  readonly gamma?: number;
}

export const PI_RATINGS_DEFAULTS = { lambda: 0.035, gamma: 0.7 } as const;

/** Expected score differential from the home team's perspective. */
export function piExpectedGoalDiff(home: PiRatings, away: PiRatings): number {
  return home.home - away.away;
}

/** One pi-ratings update step after observing goalsHome-goalsAway. */
export function piRatingsUpdate(
  home: PiRatings,
  away: PiRatings,
  goalsHome: number,
  goalsAway: number,
  opts: PiRatingsOptions = {},
): { home: PiRatings; away: PiRatings } {
  const lambda = opts.lambda ?? PI_RATINGS_DEFAULTS.lambda;
  const gamma = opts.gamma ?? PI_RATINGS_DEFAULTS.gamma;
  const err = goalsHome - goalsAway - piExpectedGoalDiff(home, away);
  return {
    home: {
      home: home.home + lambda * err,
      away: home.away + gamma * lambda * err,
    },
    away: {
      home: away.home - gamma * lambda * err,
      away: away.away - lambda * err,
    },
  };
}

export interface BaselineEntry {
  readonly name: string;
  readonly logLoss: number;
  readonly brier: number;
}

/** Baselines-board check: candidate must beat every baseline on both metrics. */
export function beatsAllBaselines(candidate: BaselineEntry, baselines: readonly BaselineEntry[]): boolean {
  if (baselines.length === 0) return true;
  return baselines.every((b) => candidate.logLoss < b.logLoss && candidate.brier < b.brier);
}
