/**
 * Neon autosuspend protection (owner directive 2026-11-13).
 *
 * gse-postgres autosuspends after 300s of inactivity. Two leaks kept it awake
 * 24/7 (~$18.47/wk): watch-warm firing every 3 minutes (faster than the 5-min
 * autosuspend), and DB-touching crons writing through the dead-of-night window
 * when no games are live.
 *
 * Rule: between 02:30 and 06:30 America/Chicago, DB-touching crons skip their
 * Neon work entirely unless a live game is in progress. The live-game signal
 * must come from a free source (ESPN scoreboard), never from Neon itself —
 * otherwise the check defeats its own purpose.
 *
 * Pure and injectable-clock so the window math is unit-testable.
 */

const QUIET_START_MINUTES = 2 * 60 + 30; // 02:30
const QUIET_END_MINUTES = 6 * 60 + 30; // 06:30

/** Minutes since midnight in America/Chicago for the given instant. */
export function chicagoMinutesSinceMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * True when `now` falls inside the 02:30–06:30 America/Chicago quiet window.
 * Callers combine this with their own live-game check: quiet window AND zero
 * live games => skip Neon queries/writes for this tick.
 */
export function isNeonQuietWindow(now: Date = new Date()): boolean {
  const minutes = chicagoMinutesSinceMidnight(now);
  return minutes >= QUIET_START_MINUTES && minutes < QUIET_END_MINUTES;
}