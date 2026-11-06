/**
 * Stale-settlement detection — pure alerting math for the settlement
 * single-point-of-failure risk (see _logs/DECISIONS.md and
 * RISK_AND_FAILURE_REGISTER.md).
 *
 * The settlement path (`settleSport`, called by both the data-refresh worker
 * and the Vercel `settle-picks` cron) can silently fail: if neither caller
 * runs, settled-eligible picks sit in PENDING forever and nothing surfaces it.
 * This module computes, from the REAL pending-pick rows (Pick.result=PENDING
 * joined to Game.commenceTime/Game.status), how many picks are past the point
 * where settlement should have happened.
 *
 * Definitions:
 *   estimated game end = commenceTime + estimatedGameDurationHours
 *   settle-eligible    = game status is FINAL, or now >= estimated game end
 *   stale              = settle-eligible AND now >= estimated end + graceHours
 *
 * POSTPONED/CANCELED games are excluded — their picks are handled by the
 * void path, not score-based settlement, so they must not page the operator.
 *
 * Pure: no clock reads, no DB. The caller supplies `now` and the rows.
 */

/** Mirrors the Prisma GameStatus enum (packages/db/prisma/schema.prisma). */
export type SettlementGameStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINAL"
  | "POSTPONED"
  | "CANCELED";

/** The slice of a PENDING pick's game needed to assess settlement staleness. */
export interface PendingPickGameInfo {
  /** Game.commenceTime — scheduled start of the game. */
  commenceTime: Date;
  /** Game.status at query time. */
  gameStatus: SettlementGameStatus;
}

export interface StaleSettlementOptions {
  /**
   * Conservative upper bound on how long a game runs after commenceTime.
   * 4h covers NFL/MLB/NHL/NBA including overtime; soccer finishes sooner.
   */
  estimatedGameDurationHours?: number;
  /**
   * How long after the estimated game end we tolerate an ungraded pick before
   * flagging it. settleSport pulls scores with daysFrom=2 and the cron runs on
   * a fixed schedule, so 6h of slack absorbs normal cron/provider latency.
   */
  graceHours?: number;
}

export interface StaleSettlementReport {
  /** Picks settle-eligible AND ungraded past the grace window. Alert when > 0. */
  count: number;
  /**
   * Hours since the estimated game end of the OLDEST stale pick, or null when
   * count is 0. Tells the operator how long settlement has been down.
   */
  oldestAgeHours: number | null;
  /** Settle-eligible but still inside the grace window (not yet alarming). */
  eligibleWithinGrace: number;
  /** Hours after commenceTime at which a pending pick becomes stale. */
  thresholdHours: number;
  graceHours: number;
  estimatedGameDurationHours: number;
}

export const DEFAULT_ESTIMATED_GAME_DURATION_HOURS = 4;
export const DEFAULT_SETTLEMENT_GRACE_HOURS = 6;

const MS_PER_HOUR = 3_600_000;

/**
 * Compute how many PENDING picks are settle-eligible but still ungraded past
 * the grace window — the readiness signal for a silently failing settlement
 * cron.
 *
 * @param pendingPicks - One entry per pick with result=PENDING (real rows;
 *                       games may repeat when they carry multiple picks).
 * @param now          - Current time, injected for purity/testability.
 * @param options      - Duration/grace overrides; sane defaults otherwise.
 */
export function assessStaleSettlement(
  pendingPicks: readonly PendingPickGameInfo[],
  now: Date,
  options: StaleSettlementOptions = {},
): StaleSettlementReport {
  const estimatedGameDurationHours =
    options.estimatedGameDurationHours ?? DEFAULT_ESTIMATED_GAME_DURATION_HOURS;
  const graceHours = options.graceHours ?? DEFAULT_SETTLEMENT_GRACE_HOURS;
  const thresholdHours = estimatedGameDurationHours + graceHours;

  let count = 0;
  let eligibleWithinGrace = 0;
  let oldestAgeHours: number | null = null;

  for (const pick of pendingPicks) {
    // Voided-path games: not score-settleable, never stale.
    if (pick.gameStatus === "POSTPONED" || pick.gameStatus === "CANCELED") {
      continue;
    }

    const estimatedEndMs =
      pick.commenceTime.getTime() + estimatedGameDurationHours * MS_PER_HOUR;
    const isEligible =
      pick.gameStatus === "FINAL" || now.getTime() >= estimatedEndMs;
    if (!isEligible) continue;

    const hoursSinceEstimatedEnd =
      (now.getTime() - estimatedEndMs) / MS_PER_HOUR;

    if (hoursSinceEstimatedEnd >= graceHours) {
      count++;
      if (oldestAgeHours === null || hoursSinceEstimatedEnd > oldestAgeHours) {
        oldestAgeHours = hoursSinceEstimatedEnd;
      }
    } else {
      eligibleWithinGrace++;
    }
  }

  return {
    count,
    oldestAgeHours:
      oldestAgeHours === null ? null : Math.round(oldestAgeHours * 10) / 10,
    eligibleWithinGrace,
    thresholdHours,
    graceHours,
    estimatedGameDurationHours,
  };
}
