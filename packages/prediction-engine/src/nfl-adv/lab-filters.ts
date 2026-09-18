/**
 * GSE lab play filters — port of docs/research/2026-09-17/gse-lab/COMPUTATION_NOTES.md
 * and compute_team_metrics.base_sample().
 *
 * Lab success is nflfastR (EPA > 0). That is a different definition than
 * packages/prediction-engine/src/expected-metrics/success-rate.ts, which uses
 * Football Outsiders yardage fractions. Callers must not mix the two.
 *
 * No imputation: a non-finite EPA or WP is unratable, never coerced to 0.
 */

export interface LabPlay {
  /** nflverse `season_type`. */
  readonly seasonType: string;
  /** nflverse `play_type`. */
  readonly playType: string;
  /** nflverse `qb_kneel` (0/1). */
  readonly qbKneel: 0 | 1;
  /** nflverse `qb_spike` (0/1). */
  readonly qbSpike: 0 | 1;
  /** nflverse `epa`. Null / non-finite → drop. */
  readonly epa: number | null;
  /** nflverse `qtr`. */
  readonly qtr: number;
  /**
   * nflverse `wp` — possession-team win probability in [0, 1].
   * Null / non-finite is treated as "WP unknown": the play is NOT garbage-time
   * (we refuse to guess) but still needs a finite EPA to enter the sample.
   */
  readonly wp: number | null;
  /** nflverse `pass_attempt` (sacks count as attempts). */
  readonly passAttempt: 0 | 1;
  /** nflverse `rush_attempt`. */
  readonly rushAttempt: 0 | 1;
  /** nflverse `qb_scramble`. */
  readonly qbScramble: 0 | 1;
  /** nflverse `yards_gained`. */
  readonly yardsGained: number | null;
}

/** Q4 and possession WP > 0.95 or < 0.05. Unknown WP is not garbage time. */
export function isGarbageTime(play: LabPlay): boolean {
  if (play.qtr !== 4) return false;
  if (play.wp === null || !Number.isFinite(play.wp)) return false;
  return play.wp > 0.95 || play.wp < 0.05;
}

/**
 * REG, pass/run, no kneel/spike, finite EPA, not garbage time.
 * Matches compute_team_metrics.base_sample().
 */
export function inLabSample(play: LabPlay): boolean {
  if (play.seasonType !== "REG") return false;
  if (play.playType !== "pass" && play.playType !== "run") return false;
  if (play.qbKneel === 1 || play.qbSpike === 1) return false;
  if (play.epa === null || !Number.isFinite(play.epa)) return false;
  if (isGarbageTime(play)) return false;
  return true;
}

/** 4for4 / lab dropback: pass attempt (incl. sack) or scramble. */
export function isDropback(play: LabPlay): boolean {
  return play.passAttempt === 1 || play.qbScramble === 1;
}

/** Designed rush: rush attempt, not a scramble, not a kneel. */
export function isDesignedRush(play: LabPlay): boolean {
  return play.rushAttempt === 1 && play.qbScramble === 0 && play.qbKneel === 0;
}

/** Explosive: dropback >= 15 yards or designed rush >= 10 yards. */
export function isExplosive(play: LabPlay): boolean {
  if (play.yardsGained === null || !Number.isFinite(play.yardsGained)) return false;
  if (isDropback(play) && play.yardsGained >= 15) return true;
  if (isDesignedRush(play) && play.yardsGained >= 10) return true;
  return false;
}

/** nflfastR / gse-lab success flag: EPA > 0. */
export function isLabSuccess(epa: number): boolean {
  return epa > 0;
}
