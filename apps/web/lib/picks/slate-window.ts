/**
 * The public slate window: which picks belong to "today" (or to `?date=`).
 *
 * Until 2026-09-05 /api/picks, /api/picks/daily-slate and the board selected
 * picks whose `generatedAt` fell inside the calendar day. Book-priced picks are
 * created on first sight of a line and then refreshed in place; the refresh
 * never re-stamps `generatedAt` (process-sport.ts pickUpdateData), while
 * signal-slate rows are re-stamped every cycle. So on 2026-09-05 the public
 * route could show 11 book-priced picks and 46 signal rows for today's NCAAF
 * games while 80 book-priced picks for the same games, created earlier in the
 * week, were invisible by construction (read-only SQL against production). On
 * NFL Sunday, lines posted on Tuesday would have vanished from the default
 * slate the same way.
 *
 * The slate is now the set of picks on games that START inside the day, and
 * only rows the pipeline still refreshes (stale-pick-policy.ts freshPickWhere).
 * The day is the US Eastern calendar day, the same convention the settlement
 * scoreboards use (settlement-score-dates.ts): a 7:00pm ET kickoff is Sunday's
 * game even though it is Monday in UTC. `?date=YYYY-MM-DD` names that Eastern
 * day. Pure; no I/O.
 */

export const SLATE_TZ = "America/New_York";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Offset of `tz` from UTC at `at`, in ms (negative for the Americas). */
function zoneOffsetMs(at: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(at)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const wall = Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);
  return wall - Math.floor(at.getTime() / 1000) * 1000;
}

/** Calendar day (YYYY-MM-DD) in the slate zone that contains `at`. */
export function slateDayKey(at: Date, tz: string = SLATE_TZ): string {
  const shifted = new Date(at.getTime() + zoneOffsetMs(at, tz));
  return shifted.toISOString().slice(0, 10);
}

/** [start, end) instants of the slate-zone calendar day named by `dayKey`. */
export function slateWindowForDay(dayKey: string, tz: string = SLATE_TZ): { start: Date; end: Date } {
  const m = YMD.exec(dayKey);
  if (!m) throw new Error(`slateWindowForDay: expected YYYY-MM-DD, got ${dayKey}`);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return { start: localMidnightUtc(y, mo, d, tz), end: localMidnightUtc(y, mo, d + 1, tz) };
}

/**
 * The UTC instant of local midnight on (y, mo, d) in `tz`. Local midnight is
 * midnight UTC minus the offset in force AT that instant; read the offset at
 * noon first (always inside the day), then once more at the candidate instant,
 * so the day of a DST switch (2am local) resolves to the offset that actually
 * applies at its midnight: 2026-11-01 (fall back) is 25 hours long, 2026-03-08
 * (spring forward) is 23.
 */
function localMidnightUtc(y: number, mo: number, d: number, tz: string): Date {
  const base = Date.UTC(y, mo, d);
  const noonOffset = zoneOffsetMs(new Date(base + 12 * 60 * 60 * 1000), tz);
  const offset = zoneOffsetMs(new Date(base - noonOffset), tz);
  return new Date(base - offset);
}

export type SlateWindow = { readonly dayKey: string; readonly start: Date; readonly end: Date };

/**
 * Resolve the slate window for a request. `dateParam` is the raw `?date=`
 * value: a YYYY-MM-DD names that Eastern day; anything else (missing,
 * malformed, a full ISO timestamp) resolves to the Eastern day containing
 * `now`, so a bad value can never produce an Invalid Date query.
 */
export function resolveSlateWindow(dateParam: string | null | undefined, now: Date = new Date()): SlateWindow {
  const raw = (dateParam ?? "").trim();
  const dayKey = YMD.test(raw) ? raw : slateDayKey(now);
  const { start, end } = slateWindowForDay(dayKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const fallback = slateDayKey(now);
    return { dayKey: fallback, ...slateWindowForDay(fallback) };
  }
  return { dayKey, start, end };
}

/** Prisma `where` fragment on the Game relation: games starting inside the window. */
export function gameInSlateWindow(window: SlateWindow): { commenceTime: { gte: Date; lt: Date } } {
  return { commenceTime: { gte: window.start, lt: window.end } };
}
