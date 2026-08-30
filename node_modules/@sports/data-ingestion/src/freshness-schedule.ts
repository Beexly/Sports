import { FRESHNESS_THRESHOLD_MS } from "./config.js";

/**
 * Time-to-game-aware freshness thresholds (opt-in via ODDS_FRESHNESS_MODE).
 *
 * A single global max-age treats a line for tonight's 7pm game the same as a
 * line for a game 30 hours out. That is wrong in both directions: near first
 * pitch, lineups/injuries/sharp money move lines by the minute and an old line
 * is a fake edge; a day out, an 10-hour-old line is still a faithful read of
 * the market. So the honest gate is a sliding scale: THE CLOSER THE GAME, THE
 * FRESHER THE LINE MUST BE.
 *
 * Modes (env ODDS_FRESHNESS_MODE):
 *   - unset / "fixed"  -> the flat FRESHNESS_THRESHOLD_MS everywhere (today's
 *     behavior; ODDS_FRESHNESS_MAX_HOURS still controls it).
 *   - "dynamic"        -> the schedule below, which is NEVER looser than the
 *     fixed threshold (it is clamped to it), so enabling dynamic mode can only
 *     tighten the gate. Trust-safe by construction.
 *
 * Schedule (hours to start -> max line age):
 *   started / <= 3h -> 2h    (lineups posted, sharp money landing)
 *   <= 8h           -> 4h    (afternoon of an evening game)
 *   <= 24h          -> 8h    (same-day morning lines)
 *   > 24h           -> 12h   (future slates; overnight lines are fine)
 */

const HOUR = 60 * 60 * 1000;

export type FreshnessMode = "fixed" | "dynamic";

export function freshnessMode(): FreshnessMode {
  return process.env["ODDS_FRESHNESS_MODE"] === "dynamic" ? "dynamic" : "fixed";
}

/** The dynamic schedule, pure and clock-free (callers pass `now`). */
export function dynamicFreshnessThresholdMs(commenceTime: Date, now: Date): number {
  const hoursToStart = (commenceTime.getTime() - now.getTime()) / HOUR;
  let scheduled: number;
  if (hoursToStart <= 3) scheduled = 2 * HOUR;
  else if (hoursToStart <= 8) scheduled = 4 * HOUR;
  else if (hoursToStart <= 24) scheduled = 8 * HOUR;
  else scheduled = 12 * HOUR;
  // Dynamic mode may only TIGHTEN relative to the operator's fixed ceiling.
  return Math.min(scheduled, FRESHNESS_THRESHOLD_MS);
}

/**
 * Threshold for one game under the active mode. Without a commence time
 * (unknown game) we fall back to the fixed threshold rather than guessing.
 */
export function resolveFreshnessThresholdMs(
  commenceTime: Date | undefined,
  now: Date,
): number {
  if (freshnessMode() === "dynamic" && commenceTime) {
    return dynamicFreshnessThresholdMs(commenceTime, now);
  }
  return FRESHNESS_THRESHOLD_MS;
}
