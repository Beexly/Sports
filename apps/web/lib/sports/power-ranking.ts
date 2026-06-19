/**
 * Power ranking utilities — pure, zero dependencies.
 *
 * Composite scoring, ranking algorithms, tier labeling, and
 * strength-of-schedule-adjusted rankings for sports teams.
 * Pure analytics — does not affect model weights or published picks.
 */

export interface TeamMetrics {
  readonly teamId: string;
  readonly teamName: string;
  readonly winRate: number; // 0-1
  readonly pointsFor: number; // avg points scored per game
  readonly pointsAgainst: number; // avg points allowed per game
  readonly strengthOfSchedule: number; // 0-1, avg opponent win rate
  readonly eloRating?: number;
  readonly recentForm: number; // 0-1 win rate in last 5 games
}

export interface PowerScore {
  readonly teamId: string;
  readonly teamName: string;
  readonly score: number; // 0-100 composite
  readonly rank: number; // 1-indexed
  readonly tier: PowerTier;
  readonly components: {
    readonly winRateScore: number;
    readonly pointDifferentialScore: number;
    readonly strengthScore: number;
    readonly formScore: number;
    readonly eloScore: number;
  };
}

export type PowerTier = "elite" | "strong" | "average" | "weak" | "bottom";

/** Simple point differential: pointsFor - pointsAgainst */
export function pointDifferential(
  pointsFor: number,
  pointsAgainst: number
): number {
  return pointsFor - pointsAgainst;
}

/** Clamp a value to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Min-max normalize an array of values to [min, max].
 * If all values are the same, every element maps to the midpoint (50 when using defaults).
 */
export function normalizeToRange(
  values: readonly number[],
  min = 0,
  max = 100
): number[] {
  if (values.length === 0) return [];

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  if (dataMin === dataMax) {
    // All same — map to midpoint
    const mid = (min + max) / 2;
    return values.map(() => mid);
  }

  return values.map(
    (v) => min + ((v - dataMin) / (dataMax - dataMin)) * (max - min)
  );
}

/**
 * Compute a composite power score (0–100) for a single team.
 *
 * Default weights: winRate=0.35, pointDiff=0.25, sos=0.15, form=0.20, elo=0.05
 */
export function compositeScore(
  metrics: TeamMetrics,
  weights?: {
    winRate?: number;
    pointDiff?: number;
    sos?: number;
    form?: number;
    elo?: number;
  }
): number {
  const w = {
    winRate: weights?.winRate ?? 0.35,
    pointDiff: weights?.pointDiff ?? 0.25,
    sos: weights?.sos ?? 0.15,
    form: weights?.form ?? 0.20,
    elo: weights?.elo ?? 0.05,
  };

  const winRateScore = metrics.winRate * 100;

  const diff = pointDifferential(metrics.pointsFor, metrics.pointsAgainst);
  const pointDiffScore = clamp(((diff + 30) / 60) * 100, 0, 100);

  const sosScore = metrics.strengthOfSchedule * 100;

  const formScore = metrics.recentForm * 100;

  const eloScore =
    metrics.eloRating !== undefined
      ? clamp(((metrics.eloRating - 1000) / 1000) * 100, 0, 100)
      : 50;

  const raw =
    w.winRate * winRateScore +
    w.pointDiff * pointDiffScore +
    w.sos * sosScore +
    w.form * formScore +
    w.elo * eloScore;

  return clamp(raw, 0, 100);
}

/** Determine the power tier from a composite score */
function scoreToTier(score: number): PowerTier {
  if (score >= 75) return "elite";
  if (score >= 60) return "strong";
  if (score >= 40) return "average";
  if (score >= 25) return "weak";
  return "bottom";
}

/**
 * Build full power rankings for a list of teams.
 * Returns PowerScore[] sorted descending by score (rank 1 = best).
 */
export function buildPowerRankings(
  teams: readonly TeamMetrics[],
  weights?: Parameters<typeof compositeScore>[1]
): PowerScore[] {
  const scored = teams.map((team) => {
    const diff = pointDifferential(team.pointsFor, team.pointsAgainst);

    const winRateScore = team.winRate * 100;
    const pointDifferentialScore = clamp(((diff + 30) / 60) * 100, 0, 100);
    const strengthScore = team.strengthOfSchedule * 100;
    const formScore = team.recentForm * 100;
    const eloScore =
      team.eloRating !== undefined
        ? clamp(((team.eloRating - 1000) / 1000) * 100, 0, 100)
        : 50;

    const score = compositeScore(team, weights);

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      score,
      rank: 0, // will be assigned after sort
      tier: scoreToTier(score),
      components: {
        winRateScore,
        pointDifferentialScore,
        strengthScore,
        formScore,
        eloScore,
      },
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Assign 1-indexed ranks
  return scored.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

/**
 * Simple record-based ranking by win percentage.
 * Ties broken by wins descending.
 */
export function rankByRecord(
  teams: readonly {
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    draws?: number;
  }[]
): Array<{ teamId: string; teamName: string; rank: number; winPct: number }> {
  const withPct = teams.map((t) => {
    const draws = t.draws ?? 0;
    const total = t.wins + t.losses + draws;
    const winPct = total === 0 ? 0 : (t.wins + draws * 0.5) / total;
    return { teamId: t.teamId, teamName: t.teamName, wins: t.wins, winPct };
  });

  withPct.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    return b.wins - a.wins;
  });

  return withPct.map((entry, idx) => ({
    teamId: entry.teamId,
    teamName: entry.teamName,
    rank: idx + 1,
    winPct: entry.winPct,
  }));
}

/**
 * Adjust a win-loss record for strength of schedule.
 *
 * adjWins = wins * (1 + sos - 0.5)
 * adjLosses = losses * (1 + (1 - sos) - 0.5)
 * adjWinRate clamped to [0, 1]
 */
export function strengthAdjustedRecord(
  wins: number,
  losses: number,
  sos: number
): { adjWins: number; adjLosses: number; adjWinRate: number } {
  const adjWins = wins * (1 + sos - 0.5);
  const adjLosses = losses * (1 + (1 - sos) - 0.5);

  const total = adjWins + adjLosses;
  const adjWinRate = total === 0 ? 0 : clamp(adjWins / total, 0, 1);

  return { adjWins, adjLosses, adjWinRate };
}

/** Human-readable label for a power tier */
export function tierLabel(tier: PowerTier): string {
  switch (tier) {
    case "elite":
      return "Elite";
    case "strong":
      return "Strong";
    case "average":
      return "Average";
    case "weak":
      return "Below Average";
    case "bottom":
      return "Bottom Tier";
  }
}

/**
 * Compute the rank delta between two ranking periods.
 * delta = previousRank - currentRank (positive = moved up)
 */
export function rankDelta(
  currentRank: number,
  previousRank: number
): { delta: number; direction: "up" | "down" | "same"; label: string } {
  const delta = previousRank - currentRank;

  let direction: "up" | "down" | "same";
  let label: string;

  if (delta > 0) {
    direction = "up";
    label = `↑${delta}`;
  } else if (delta < 0) {
    direction = "down";
    label = `↓${Math.abs(delta)}`;
  } else {
    direction = "same";
    label = "—";
  }

  return { delta, direction, label };
}

/** Return the top n teams from an already-sorted rankings array */
export function topN(rankings: readonly PowerScore[], n: number): PowerScore[] {
  return rankings.slice(0, n);
}

/** Return the bottom n teams from an already-sorted rankings array */
export function bottomN(
  rankings: readonly PowerScore[],
  n: number
): PowerScore[] {
  return rankings.slice(Math.max(0, rankings.length - n));
}

/** Filter rankings to a specific tier */
export function filterByTier(
  rankings: readonly PowerScore[],
  tier: PowerTier
): PowerScore[] {
  return rankings.filter((r) => r.tier === tier);
}

/** Mean composite score; returns 0 if rankings is empty */
export function averageScore(rankings: readonly PowerScore[]): number {
  if (rankings.length === 0) return 0;
  const sum = rankings.reduce((acc, r) => acc + r.score, 0);
  return sum / rankings.length;
}

/** Median composite score (not rank); returns 0 if rankings is empty */
export function medianRank(rankings: readonly PowerScore[]): number {
  if (rankings.length === 0) return 0;

  const sorted = [...rankings].sort((a, b) => a.score - b.score);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid]!.score;
  }
  return (sorted[mid - 1]!.score + sorted[mid]!.score) / 2;
}

/**
 * One-line summary of tier distribution.
 * Format: "{elite} elite, {strong} strong, {average} average, {below} below average"
 */
export function powerRankingSummary(rankings: readonly PowerScore[]): string {
  const elite = rankings.filter((r) => r.tier === "elite").length;
  const strong = rankings.filter((r) => r.tier === "strong").length;
  const average = rankings.filter((r) => r.tier === "average").length;
  const below =
    rankings.filter((r) => r.tier === "weak").length +
    rankings.filter((r) => r.tier === "bottom").length;

  return `${elite} elite, ${strong} strong, ${average} average, ${below} below average`;
}
