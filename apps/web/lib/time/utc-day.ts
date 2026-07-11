/**
 * UTC day bounds — the engine's calendar day, shared by every surface.
 *
 * The platform's "day" is the UTC game-day everywhere the engine commits to
 * one (slate freeze keys, settlement windows). setHours(0,0,0,0) is
 * SERVER-LOCAL midnight — identical on Vercel (TZ=UTC) but a different day on
 * any non-UTC host, and two loaders computing "today" differently can render
 * DIFFERENT days on the SAME page (T-board-utc, Codex round). Every "today"
 * window must come from this helper.
 */

/** [start, end) bounds of the current UTC calendar day. */
export function utcDayBounds(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
