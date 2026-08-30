/**
 * Quiet-board classification — is an all-stale odds board an INCIDENT or just
 * a quiet market?
 *
 * The whole-feed freshness gate (process-sport) rejects a board where no game
 * has a fresh bookmaker update. That is the right call near kickoff — books
 * always touch a live pregame market in the final day — but far from kickoff
 * it produces false CRITICAL alarms: observed in production 2026-07-10, where
 * mid-week MLS boards (all games 40h+ out) sat 12–19h between bookmaker
 * updates and every hourly cycle recorded a FAILED run, paging the owner and
 * flipping the cockpit posture RED while nothing was actually wrong.
 *
 * Rule: a stale board is QUIET (skip without alarm, generate nothing) when no
 * game in the feed commences within the horizon. A game already underway
 * cannot make a board "loud" either — books stop updating pregame markets at
 * start, and no pregame pick can be generated for it anyway. Only an UPCOMING
 * game inside the horizon with a dead board is a real incident.
 *
 * A quiet skip records a zero-work SUCCESS run with oddsInserted=0, which by
 * design does NOT reset the public freshness clock (the kill-switch gate only
 * counts runs with oddsInserted > 0), so this can never mask a real outage on
 * the public surface.
 */

export const DEFAULT_QUIET_BOARD_HORIZON_HOURS = 24;

/** Horizon within which an upcoming game demands a fresh board (env-tunable). */
export function quietBoardHorizonHours(): number {
  const n = Number(process.env["QUIET_BOARD_HORIZON_HOURS"]);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_QUIET_BOARD_HORIZON_HOURS;
}

/**
 * True when NO game commences within `horizonHours` after `now` — i.e. the
 * stale board belongs to a market nobody is pricing yet, not a dead feed.
 * Unparseable commence times are ignored (they cannot prove quietness is
 * violated, and per-game freshness dropping already excludes their picks).
 */
export function isQuietBoard(
  commenceTimes: Iterable<Date>,
  now: Date,
  horizonHours: number,
): boolean {
  const nowMs = now.getTime();
  const horizonMs = horizonHours * 3_600_000;
  for (const t of commenceTimes) {
    const ms = t.getTime();
    if (!Number.isFinite(ms)) continue;
    if (ms >= nowMs && ms - nowMs <= horizonMs) {
      return false; // an upcoming game inside the horizon → stale board is an incident
    }
  }
  return true;
}
