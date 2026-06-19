/**
 * Sports schedule date utilities — pure, zero dependencies.
 *
 * Date formatting and manipulation helpers for game schedules,
 * pick dates, weekly breakdowns, and season tracking.
 * All functions take timestamps or Date objects; never mutate inputs.
 */

/** Millisecond constants */
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Return the start-of-day (midnight UTC) for a given date.
 */
export function startOfDayUtc(date: Date | number): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Return the end-of-day (23:59:59.999 UTC) for a given date.
 */
export function endOfDayUtc(date: Date | number): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Start of the current week (Monday 00:00:00 UTC).
 */
export function startOfWeekUtc(date: Date | number): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
  const daysFromMon = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysFromMon);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * End of the current week (Sunday 23:59:59.999 UTC).
 */
export function endOfWeekUtc(date: Date | number): Date {
  const start = startOfWeekUtc(date);
  return new Date(start.getTime() + 7 * MS_PER_DAY - 1);
}

/**
 * True if two dates fall on the same UTC calendar day.
 */
export function isSameDayUtc(a: Date | number, b: Date | number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

/**
 * True if the date is today (UTC).
 */
export function isToday(date: Date | number, now: Date | number = Date.now()): boolean {
  return isSameDayUtc(date, now);
}

/**
 * True if the date is tomorrow (UTC).
 */
export function isTomorrow(date: Date | number, now: Date | number = Date.now()): boolean {
  const tomorrow = new Date(+now + MS_PER_DAY);
  return isSameDayUtc(date, tomorrow);
}

/**
 * True if the date is in the past (before now).
 */
export function isPast(date: Date | number, now: Date | number = Date.now()): boolean {
  return +date < +now;
}

/**
 * True if the date is in the future (after now).
 */
export function isFuture(date: Date | number, now: Date | number = Date.now()): boolean {
  return +date > +now;
}

/**
 * Add N days to a date.
 */
export function addDays(date: Date | number, days: number): Date {
  return new Date(+date + days * MS_PER_DAY);
}

/**
 * Add N hours to a date.
 */
export function addHours(date: Date | number, hours: number): Date {
  return new Date(+date + hours * MS_PER_HOUR);
}

/**
 * Add N minutes to a date.
 */
export function addMinutes(date: Date | number, minutes: number): Date {
  return new Date(+date + minutes * MS_PER_MINUTE);
}

/**
 * Difference between two dates in whole days.
 * diffDays(today, yesterday) → 1
 */
export function diffDays(a: Date | number, b: Date | number): number {
  return Math.floor((+a - +b) / MS_PER_DAY);
}

/**
 * Difference in whole hours.
 */
export function diffHours(a: Date | number, b: Date | number): number {
  return Math.floor((+a - +b) / MS_PER_HOUR);
}

/**
 * Difference in whole minutes.
 */
export function diffMinutes(a: Date | number, b: Date | number): number {
  return Math.floor((+a - +b) / MS_PER_MINUTE);
}

/**
 * Week number (ISO 8601). Week 1 = week containing first Thursday of the year.
 */
export function isoWeekNumber(date: Date | number): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((+d - +yearStart) / MS_PER_DAY + 1) / 7);
}

/**
 * NFL season week number from a game date.
 * NFL regular season starts first week of September.
 * Returns null if date is clearly out of season.
 *
 * @param date Game date
 * @param seasonStart First game date of the season (defaults to heuristic)
 */
export function nflWeekNumber(date: Date | number, seasonStart?: Date | number): number | null {
  const gameDate = new Date(date);
  const year = gameDate.getUTCFullYear();
  // Heuristic: NFL season starts first Thursday of September
  const septemberFirst = new Date(Date.UTC(year, 8, 1));
  const dayOfWeek = septemberFirst.getUTCDay();
  const daysToThursday = (4 - dayOfWeek + 7) % 7;
  const defaultStart = new Date(septemberFirst.getTime() + daysToThursday * MS_PER_DAY - 3 * MS_PER_DAY); // back to Tuesday

  const start = seasonStart ?? defaultStart;
  const diff = +gameDate - +start;
  if (diff < 0) return null;
  const week = Math.floor(diff / MS_PER_WEEK) + 1;
  return week > 22 ? null : week; // 18 regular season + ~4 postseason
}

/**
 * Format a Date as a game-day string: "Sun, Sep 14" or "Sun, Sep 14, 2025".
 * Omits year when it matches `now`.
 */
export function formatGameDate(date: Date | string | number, now: Date | number = Date.now()): string {
  const d = new Date(date);
  const ref = new Date(now);
  const showYear = d.getUTCFullYear() !== ref.getUTCFullYear();
  try {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
      ...(showYear ? { year: "numeric" } : {}),
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Format a game time: "1:00 PM ET" style.
 * Appends the timezone abbreviation.
 */
export function formatGameTime(date: Date | string | number, timeZone = "America/New_York"): string {
  const d = new Date(date);
  try {
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
    const tzAbbr = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "ET";
    return `${timeStr} ${tzAbbr}`;
  } catch {
    return d.toISOString().slice(11, 16) + " UTC";
  }
}

/**
 * Group dates by UTC calendar day.
 * Useful for grouping games into day buckets.
 * Returns a Map keyed by "YYYY-MM-DD".
 */
export function groupByDay<T>(items: readonly T[], getDate: (item: T) => Date | number): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = new Date(getDate(item));
    const key = d.toISOString().slice(0, 10);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * True if a date falls on a weekend (Saturday or Sunday UTC).
 */
export function isWeekend(date: Date | number): boolean {
  const d = new Date(date).getUTCDay();
  return d === 0 || d === 6;
}

/**
 * Clamp a date to a [min, max] range.
 */
export function clampDate(date: Date | number, min: Date | number, max: Date | number): Date {
  return new Date(Math.max(+min, Math.min(+max, +date)));
}

/**
 * Parse a date string flexibly, returning null on failure.
 * Handles ISO 8601, "YYYY-MM-DD", and common US formats.
 */
export function parseDate(text: string): Date | null {
  const ts = Date.parse(text);
  if (isNaN(ts)) return null;
  return new Date(ts);
}

/**
 * Duration in human-readable form (for countdowns/timers).
 * formatDuration(90061000) → "1d 1h 1m"
 * formatDuration(3661000) → "1h 1m"
 * formatDuration(61000) → "1m 1s"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Time until a future date from now (countdown).
 * Returns null if date is in the past.
 */
export function timeUntil(date: Date | number, now: Date | number = Date.now()): string | null {
  const diff = +date - +now;
  if (diff <= 0) return null;
  return formatDuration(diff);
}

/**
 * Return all dates between start and end (inclusive), step = 1 day.
 */
export function dateRange(start: Date | number, end: Date | number): Date[] {
  const result: Date[] = [];
  let current = startOfDayUtc(start);
  const endDay = startOfDayUtc(end);
  while (current <= endDay) {
    result.push(new Date(current));
    current = new Date(current.getTime() + MS_PER_DAY);
  }
  return result;
}
