/**
 * Sports schedule date utilities — pure, zero dependencies.
 *
 * Date formatting and manipulation helpers for game schedules,
 * pick dates, weekly breakdowns, and season tracking.
 * All functions take Date objects; never mutate inputs.
 * All arithmetic uses UTC methods only — no timezone shifts.
 */

/** Millisecond constants */
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

// ---------------------------------------------------------------------------
// Basic date arithmetic
// ---------------------------------------------------------------------------

/** Add N days to a date. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Add N hours to a date. */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

/** Add N minutes to a date. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

/**
 * Add N months to a date.
 * Handles month-end correctly: Jan 31 + 1 month = Feb 28/29.
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const originalDay = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // If day overflowed (e.g. Jan 31 → Mar 3), clamp to last day of target month
  if (d.getUTCDate() !== originalDay) {
    d.setUTCDate(0); // last day of previous month
  }
  return d;
}

/** Add N years to a date. */
export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** Subtract N days from a date. */
export function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/** Subtract N hours from a date. */
export function subHours(date: Date, hours: number): Date {
  return addHours(date, -hours);
}

/** Subtract N months from a date. */
export function subMonths(date: Date, months: number): Date {
  return addMonths(date, -months);
}

// ---------------------------------------------------------------------------
// Difference calculations
// ---------------------------------------------------------------------------

/**
 * Difference in whole days. Signed: positive if a > b.
 * Uses floor (not ceil).
 */
export function diffInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** Difference in whole hours. Signed: positive if a > b. */
export function diffInHours(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_HOUR);
}

/** Difference in whole minutes. Signed: positive if a > b. */
export function diffInMinutes(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_MINUTE);
}

/** Difference in whole weeks. Signed: positive if a > b. */
export function diffInWeeks(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_WEEK);
}

/** Approximate difference in months: diffInDays / 30.4375. Signed. */
export function diffInMonths(a: Date, b: Date): number {
  return Math.floor(diffInDays(a, b) / 30.4375);
}

// ---------------------------------------------------------------------------
// Start/end of period (UTC arithmetic only)
// ---------------------------------------------------------------------------

/** Set hours/minutes/seconds/ms to 0 (UTC). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Set to 23:59:59.999 (UTC). */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Start of week at midnight UTC.
 * @param startDay 0=Sunday (default), 1=Monday
 */
export function startOfWeek(date: Date, startDay: 0 | 1 = 0): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = (day - startDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * End of week at 23:59:59.999 UTC.
 * @param startDay 0=Sunday (default), 1=Monday
 */
export function endOfWeek(date: Date, startDay: 0 | 1 = 0): Date {
  const start = startOfWeek(date, startDay);
  return endOfDay(addDays(start, 6));
}

/** First moment of the month (UTC day 1, 00:00:00.000). */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Last moment of the month (UTC last day, 23:59:59.999). */
export function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1, 0); // day 0 of next month = last day of current
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** First moment of the year (Jan 1, 00:00:00.000 UTC). */
export function startOfYear(date: Date): Date {
  const d = new Date(date);
  d.setUTCMonth(0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Last moment of the year (Dec 31, 23:59:59.999 UTC). */
export function endOfYear(date: Date): Date {
  const d = new Date(date);
  d.setUTCMonth(11, 31);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/** True if two dates fall on the same UTC calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** True if two dates share the same UTC month and year. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/** True if two dates share the same UTC year. */
export function isSameYear(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear();
}

/** True if date is today (UTC). Reference defaults to now. */
export function isToday(date: Date, reference: Date = new Date()): boolean {
  return isSameDay(date, reference);
}

/** True if date is yesterday (UTC). Reference defaults to now. */
export function isYesterday(date: Date, reference: Date = new Date()): boolean {
  return isSameDay(date, subDays(reference, 1));
}

/** True if date is tomorrow (UTC). Reference defaults to now. */
export function isTomorrow(date: Date, reference: Date = new Date()): boolean {
  return isSameDay(date, addDays(reference, 1));
}

/** True if date is within the same calendar week as reference (Sunday start). */
export function isThisWeek(date: Date, reference: Date = new Date()): boolean {
  const ws = startOfWeek(reference);
  const we = endOfWeek(reference);
  return date.getTime() >= ws.getTime() && date.getTime() <= we.getTime();
}

/** True if date is within the same calendar month as reference. */
export function isThisMonth(date: Date, reference: Date = new Date()): boolean {
  return isSameMonth(date, reference);
}

/** True if date is after reference. */
export function isFuture(date: Date, reference: Date = new Date()): boolean {
  return date.getTime() > reference.getTime();
}

/** True if date is before reference. */
export function isPast(date: Date, reference: Date = new Date()): boolean {
  return date.getTime() < reference.getTime();
}

/** True if date falls on a Saturday or Sunday (UTC). */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** True if year is a leap year (Gregorian calendar). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const SHORT_MONTHS: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_DAYS: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format a Date using simple tokens.
 *
 * Tokens:
 *   YYYY  4-digit year
 *   YY    2-digit year
 *   MM    2-digit month (01-12)
 *   M     1-2 digit month
 *   DD    2-digit day (01-31)
 *   D     1-2 digit day
 *   HH    24h hour (00-23)
 *   H     hour (0-23)
 *   mm    minutes (00-59)
 *   ss    seconds (00-59)
 *   MMM   short month name (Jan-Dec) — must appear as whole token
 *   MMMM  full month name — must appear as whole token
 *   ddd   short day name (Sun-Sat) — must appear as whole token
 *   dddd  full day name — must appear as whole token
 *
 * Examples:
 *   formatDate(d, 'YYYY-MM-DD') → '2024-01-15'
 *   formatDate(d, 'MMM D, YYYY') → 'Jan 15, 2024'
 */
export function formatDate(date: Date, format: string): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const weekday = date.getUTCDay();

  return format
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year).slice(-2))
    .replace(/MMMM/g, LONG_MONTHS[month] ?? '')
    .replace(/MMM/g, SHORT_MONTHS[month] ?? '')
    .replace(/MM/g, String(month + 1).padStart(2, '0'))
    .replace(/M/g, String(month + 1))
    .replace(/dddd/g, LONG_DAYS[weekday] ?? '')
    .replace(/ddd/g, SHORT_DAYS[weekday] ?? '')
    .replace(/DD/g, String(day).padStart(2, '0'))
    .replace(/D/g, String(day))
    .replace(/HH/g, String(hours).padStart(2, '0'))
    .replace(/H/g, String(hours))
    .replace(/mm/g, String(minutes).padStart(2, '0'))
    .replace(/ss/g, String(seconds).padStart(2, '0'));
}

/**
 * Format a date relative to a reference date.
 * Past: "just now", "X minutes ago", "X hours ago", "yesterday", "X days ago", etc.
 * Future: "in X minutes", "in X hours", "tomorrow", "in X days", etc.
 */
export function formatRelative(date: Date, reference: Date = new Date()): string {
  const diffMs = date.getTime() - reference.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPastDir = diffMs < 0;

  const minutes = Math.floor(absDiffMs / MS_PER_MINUTE);
  const hours = Math.floor(absDiffMs / MS_PER_HOUR);
  const days = Math.floor(absDiffMs / MS_PER_DAY);
  const weeks = Math.floor(absDiffMs / MS_PER_WEEK);
  const months = Math.floor(absDiffMs / (30.4375 * MS_PER_DAY));
  const years = Math.floor(absDiffMs / (365.25 * MS_PER_DAY));

  if (absDiffMs < MS_PER_MINUTE) return 'just now';

  if (isPastDir) {
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  } else {
    if (minutes < 60) return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    if (hours < 24) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    if (days === 1) return 'tomorrow';
    if (days < 7) return `in ${days} days`;
    if (weeks < 5) return `in ${weeks} week${weeks !== 1 ? 's' : ''}`;
    if (months < 12) return `in ${months} month${months !== 1 ? 's' : ''}`;
    return `in ${years} year${years !== 1 ? 's' : ''}`;
  }
}

/**
 * Format a date for sports schedule display.
 * Returns "Sun, Jan 15 · 4:25 PM" style.
 * Uses UTC-based formatting.
 */
export function formatGameTime(date: Date): string {
  const weekday = SHORT_DAYS[date.getUTCDay()] ?? '';
  const month = SHORT_MONTHS[date.getUTCMonth()] ?? '';
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  const minuteStr = String(minutes).padStart(2, '0');

  return `${weekday}, ${month} ${day} · ${hour12}:${minuteStr} ${ampm}`;
}

/**
 * Format a millisecond duration as human-readable.
 * Examples: "2h 35m", "45m", "30s", "1d 3h"
 * Skips zero components; always shows smallest non-zero unit.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';

  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

// ---------------------------------------------------------------------------
// NFL-specific
// ---------------------------------------------------------------------------

/**
 * First Thursday of September for the given year.
 * Returns UTC Date at noon (12:00:00 UTC).
 */
export function nflSeasonStart(year: number): Date {
  const sep1 = new Date(Date.UTC(year, 8, 1, 12, 0, 0)); // Sep 1 at noon UTC
  const dayOfWeek = sep1.getUTCDay(); // 0=Sun, 4=Thu
  const daysToThursday = (4 - dayOfWeek + 7) % 7;
  return new Date(sep1.getTime() + daysToThursday * MS_PER_DAY);
}

/**
 * NFL season year for a date.
 * Jan–Jul → previous year's season (e.g. Jan 2024 → 2023 season).
 * Aug–Dec → current year's season.
 */
export function nflSeasonYear(date: Date): number {
  const month = date.getUTCMonth(); // 0-indexed
  return month <= 6 ? date.getUTCFullYear() - 1 : date.getUTCFullYear();
}

/**
 * NFL week number from a game date.
 * Returns 1-18 for regular season weeks.
 * Returns 0 if before the season start.
 * Returns 19+ for postseason.
 * If seasonStart not provided, estimates from the year of date.
 */
export function nflWeekFromDate(date: Date, seasonStart?: Date): number {
  const year = nflSeasonYear(date);
  const start = seasonStart ?? nflSeasonStart(year);
  const diff = date.getTime() - start.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / MS_PER_WEEK) + 1;
}

// ---------------------------------------------------------------------------
// Sports calendar utilities
// ---------------------------------------------------------------------------

type SportName = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB';

interface SeasonDates {
  start: Date;
  end: Date;
  playoffs: Date;
  offseason: Date;
}

/**
 * Approximate season dates for each sport.
 * All dates are to the 1st of the month at noon UTC.
 *
 * NFL:   Sep-Jan
 * NBA:   Oct-Jun
 * MLB:   Apr-Oct
 * NHL:   Oct-Jun
 * NCAAF: Sep-Jan
 * NCAAB: Nov-Apr
 */
export function sportsSeasonDates(sport: SportName, year: number): SeasonDates {
  function d(y: number, month: number): Date {
    return new Date(Date.UTC(y, month - 1, 1, 12, 0, 0));
  }

  switch (sport) {
    case 'NFL':
      return { start: d(year, 9), end: d(year + 1, 1), playoffs: d(year + 1, 1), offseason: d(year + 1, 2) };
    case 'NBA':
      return { start: d(year, 10), end: d(year + 1, 6), playoffs: d(year + 1, 4), offseason: d(year + 1, 7) };
    case 'MLB':
      return { start: d(year, 4), end: d(year, 10), playoffs: d(year, 10), offseason: d(year, 11) };
    case 'NHL':
      return { start: d(year, 10), end: d(year + 1, 6), playoffs: d(year + 1, 4), offseason: d(year + 1, 7) };
    case 'NCAAF':
      return { start: d(year, 9), end: d(year + 1, 1), playoffs: d(year + 1, 1), offseason: d(year + 1, 2) };
    case 'NCAAB':
      return { start: d(year, 11), end: d(year + 1, 4), playoffs: d(year + 1, 3), offseason: d(year + 1, 5) };
  }
}

/**
 * True if the date falls within the season (start ≤ date < offseason).
 * @param year if omitted, infers from date
 */
export function isInSeason(date: Date, sport: string, year?: number): boolean {
  const knownSports: SportName[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];
  if (!knownSports.includes(sport as SportName)) return false;
  const y = year ?? date.getUTCFullYear();
  // Check both year and year-1 seasons to catch winter-spanning sports
  for (const checkYear of [y, y - 1]) {
    const { start, offseason } = sportsSeasonDates(sport as SportName, checkYear);
    if (date.getTime() >= start.getTime() && date.getTime() < offseason.getTime()) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Countdown utilities
// ---------------------------------------------------------------------------

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // total ms remaining
}

/**
 * Countdown to a target date from a reference (default now).
 * Returns 0s if target is in the past.
 */
export function countdownTo(target: Date, reference: Date = new Date()): CountdownResult {
  const total = Math.max(0, target.getTime() - reference.getTime());
  if (total === 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

  const days = Math.floor(total / MS_PER_DAY);
  const hours = Math.floor((total % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND);

  return { days, hours, minutes, seconds, total };
}

/**
 * Format a countdown as "3d 14h 22m" or "45m 30s".
 * Omits zero leading components; always shows minutes+seconds.
 */
export function formatCountdown(target: Date, reference: Date = new Date()): string {
  const { days, hours, minutes, seconds } = countdownTo(target, reference);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  // Always show minutes and seconds
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Week/day utilities
// ---------------------------------------------------------------------------

/** Day of week name. */
export function dayOfWeekName(date: Date, format: 'short' | 'long' = 'short'): string {
  return format === 'long' ? (LONG_DAYS[date.getUTCDay()] ?? '') : (SHORT_DAYS[date.getUTCDay()] ?? '');
}

/** Month name. */
export function monthName(date: Date, format: 'short' | 'long' = 'short'): string {
  return format === 'long' ? (LONG_MONTHS[date.getUTCMonth()] ?? '') : (SHORT_MONTHS[date.getUTCMonth()] ?? '');
}

/**
 * ISO 8601 week number (1-53).
 * Week 1 = week containing the first Thursday of the year.
 */
export function isoWeek(date: Date): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}

/**
 * Year of the ISO week (may differ from calendar year near Jan 1 or Dec 31).
 */
export function isoWeekYear(date: Date): number {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

// ---------------------------------------------------------------------------
// Date range utilities
// ---------------------------------------------------------------------------

/**
 * Array of dates from start to end (inclusive) at given step.
 * Default step is 'day'.
 */
export function dateRange(start: Date, end: Date, step: 'day' | 'week' | 'month' = 'day'): Date[] {
  const result: Date[] = [];
  let current = startOfDay(start);
  const endDay = startOfDay(end);

  while (current.getTime() <= endDay.getTime()) {
    result.push(new Date(current));
    if (step === 'day') {
      current = addDays(current, 1);
    } else if (step === 'week') {
      current = addDays(current, 7);
    } else {
      current = addMonths(current, 1);
    }
  }

  return result;
}

/** True if date falls within [start, end] inclusive. */
export function isInRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

/**
 * Number of days of overlap between two date ranges.
 * Returns 0 if no overlap.
 */
export function overlapDays(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): number {
  const overlapStart = Math.max(a.start.getTime(), b.start.getTime());
  const overlapEnd = Math.min(a.end.getTime(), b.end.getTime());
  if (overlapEnd <= overlapStart) return 0;
  return Math.floor((overlapEnd - overlapStart) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a date string. Accepts:
 *   'YYYY-MM-DD'
 *   'YYYY-MM-DDTHH:MM:SS'
 *   'YYYY-MM-DDTHH:MM:SSZ'
 * Returns null if unparseable.
 */
export function parseDate(input: string): Date | null {
  // ISO 8601 patterns
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z?)?$/;
  if (!isoPattern.test(input)) return null;

  // Ensure date-only strings parse as UTC
  let normalized = input;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    normalized = input + 'T00:00:00Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input)) {
    // no Z suffix → treat as UTC
    normalized = input + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) {
    normalized = input + ':00Z';
  }

  const ts = Date.parse(normalized);
  if (isNaN(ts)) return null;
  return new Date(ts);
}

/**
 * Parse a date string with flexible format support.
 * Also accepts: 'M/D/YYYY', 'M/D/YY', 'Month D, YYYY' (e.g. 'January 15, 2024')
 * Returns null if unparseable.
 */
export function parseFlexibleDate(input: string): Date | null {
  // First try strict ISO parsing
  const iso = parseDate(input);
  if (iso !== null) return iso;

  // M/D/YYYY or M/D/YY
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const slashMatch = slashPattern.exec(input);
  if (slashMatch) {
    let year = parseInt(slashMatch[3] ?? '0', 10);
    if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
    const month = parseInt(slashMatch[1] ?? '0', 10);
    const day = parseInt(slashMatch[2] ?? '0', 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  // "Month D, YYYY" e.g. "January 15, 2024"
  const longMonthMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8,
    oct: 9, nov: 10, dec: 11,
  };
  const longPattern = /^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/;
  const longMatch = longPattern.exec(input.trim());
  if (longMatch) {
    const monthIdx = longMonthMap[longMatch[1]?.toLowerCase() ?? ''];
    if (monthIdx === undefined) return null;
    const day = parseInt(longMatch[2] ?? '0', 10);
    const year = parseInt(longMatch[3] ?? '0', 10);
    if (day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, monthIdx, day));
  }

  return null;
}

// ---------------------------------------------------------------------------
// Age calculation
// ---------------------------------------------------------------------------

/** Completed years since birthDate. Reference defaults to now. */
export function age(birthDate: Date, reference: Date = new Date()): number {
  let years = reference.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birthDate.getUTCDate())) {
    years--;
  }
  return years;
}

// ---------------------------------------------------------------------------
// Human-friendly output
// ---------------------------------------------------------------------------

/** Ordinal suffix: 1→'1st', 2→'2nd', 11→'11th', 21→'21st', etc. */
export function ordinalSuffix(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/** Format day as 'January 15th, 2024'. */
export function dayOrdinal(date: Date): string {
  const month = LONG_MONTHS[date.getUTCMonth()] ?? '';
  const day = ordinalSuffix(date.getUTCDate());
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

// ---------------------------------------------------------------------------
// Quarter
// ---------------------------------------------------------------------------

/** Quarter of year: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec (UTC months). */
export function quarterOfYear(date: Date): 1 | 2 | 3 | 4 {
  const month = date.getUTCMonth(); // 0-indexed
  return (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4;
}

// ---------------------------------------------------------------------------
// Extended API — added to satisfy full spec (L117)
// ---------------------------------------------------------------------------

// --- Basic arithmetic additions ---

/** Add N weeks to a date. */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/** Add N seconds to a date. */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * MS_PER_SECOND);
}

/** Subtract N days from a date (alias for addDays with negative). */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

// --- Diff functions (abs-floor semantics per spec) ---

/** floor(|a-b| / ms_per_day) — always non-negative. */
export function diffDays(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** floor(|a-b| / ms_per_hour) — always non-negative. */
export function diffHours(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / MS_PER_HOUR);
}

/** floor(|a-b| / ms_per_minute) — always non-negative. */
export function diffMinutes(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / MS_PER_MINUTE);
}

/** year diff * 12 + month diff (signed, a minus b). */
export function diffMonths(a: Date, b: Date): number {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

/** floor(diffDays(a,b) / 365) — always non-negative. */
export function diffYears(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (365.25 * MS_PER_DAY));
}

// --- Start/end of period additions ---

/** First day of quarter at 00:00:00.000 local (Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct). */
export function startOfQuarter(date: Date): Date {
  const d = new Date(date);
  const month = d.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  d.setMonth(quarterStartMonth, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Last day of quarter at 23:59:59.999 local. */
export function endOfQuarter(date: Date): Date {
  const d = new Date(date);
  const month = d.getMonth();
  const quarterEndMonth = Math.floor(month / 3) * 3 + 2;
  // Last day of quarterEndMonth
  d.setMonth(quarterEndMonth + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Set minutes/seconds/ms to 0, preserving hours (local). */
export function startOfHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/** Set to xx:59:59.999 local. */
export function endOfHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(59, 59, 999);
  return d;
}

// --- Comparison additions ---

/** True if a < b. */
export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

/** True if a > b. */
export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

/** True if date falls on a weekday (Mon–Fri). */
export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

/** True if date is a valid Date object. */
export function isValid(date: Date): boolean {
  return !isNaN(date.getTime());
}

// --- Getters ---

/** Day of year: 1–366. Uses local calendar. */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = MS_PER_DAY;
  return Math.floor(diff / oneDay);
}

/** ISO week number: 1–53. */
export function getWeekOfYear(date: Date): number {
  return isoWeek(date);
}

/** Days in a month. month is 1-12. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Days in a year: 365 or 366. */
export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Quarter of year: 1–4. */
export function getQuarter(date: Date): 1 | 2 | 3 | 4 {
  return quarterOfYear(date);
}

/** Timezone offset in minutes (date.getTimezoneOffset()). */
export function getTimezoneOffset(date: Date): number {
  return date.getTimezoneOffset();
}

/** Returns new Date with time set; original not mutated. */
export function setTime(date: Date, hours: number, minutes: number, seconds: number = 0, ms: number = 0): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, seconds, ms);
  return d;
}

// --- Formatting additions ---


function ordinalDay(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Format a Date with token support including Do (ordinal day).
 * Tokens: YYYY, YY, MM, DD, HH, mm, ss, dddd, ddd, MMMM, MMM, Do
 */
export function formatDateEx(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const weekday = date.getDay();

  const SHORT_MONTHS_LOCAL: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const LONG_MONTHS_LOCAL: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SHORT_DAYS_LOCAL: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LONG_DAYS_LOCAL: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return format
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year).slice(-2))
    .replace(/MMMM/g, LONG_MONTHS_LOCAL[month] ?? '')
    .replace(/MMM/g, SHORT_MONTHS_LOCAL[month] ?? '')
    .replace(/MM/g, String(month + 1).padStart(2, '0'))
    .replace(/dddd/g, LONG_DAYS_LOCAL[weekday] ?? '')
    .replace(/ddd/g, SHORT_DAYS_LOCAL[weekday] ?? '')
    .replace(/Do/g, ordinalDay(day))
    .replace(/DD/g, String(day).padStart(2, '0'))
    .replace(/HH/g, String(hours).padStart(2, '0'))
    .replace(/mm/g, String(minutes).padStart(2, '0'))
    .replace(/ss/g, String(seconds).padStart(2, '0'));
}

/**
 * Format date range: "Jan 5–7, 2025" same month, "Jan 5 – Feb 3, 2025" diff month,
 * "Dec 30, 2024 – Jan 2, 2025" diff year.
 */
export function formatDateRange(start: Date, end: Date): string {
  const SHORT_MONTHS_LOCAL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sy = start.getFullYear();
  const ey = end.getFullYear();
  const sm = start.getMonth();
  const em = end.getMonth();
  const sd = start.getDate();
  const ed = end.getDate();

  if (sy === ey && sm === em) {
    return `${SHORT_MONTHS_LOCAL[sm]} ${sd}–${ed}, ${sy}`;
  } else if (sy === ey) {
    return `${SHORT_MONTHS_LOCAL[sm]} ${sd} – ${SHORT_MONTHS_LOCAL[em]} ${ed}, ${sy}`;
  } else {
    return `${SHORT_MONTHS_LOCAL[sm]} ${sd}, ${sy} – ${SHORT_MONTHS_LOCAL[em]} ${ed}, ${ey}`;
  }
}

/** ISO 8601 string. */
export function toISO(date: Date): string {
  return date.toISOString();
}

/** HTTP date format. */
export function toUTCString(date: Date): string {
  return date.toUTCString();
}

// --- Parsing additions ---

/**
 * Parse a date string. Accepts: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, MM-DD-YYYY,
 * "Jan 6, 2025", ISO 8601. Throws if unrecognized.
 */
export function parseDateStrict(str: string): Date {
  const s = str.trim();

  // ISO 8601 with time
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const ts = Date.parse(s);
    if (!isNaN(ts)) return new Date(ts);
  }

  // YYYY-MM-DD
  const yyyymmddDash = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (yyyymmddDash) {
    const y = yyyymmddDash[1] ?? '0';
    const m = yyyymmddDash[2] ?? '0';
    const d = yyyymmddDash[3] ?? '0';
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }

  // YYYY/MM/DD
  const yyyymmddSlash = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(s);
  if (yyyymmddSlash) {
    const y = yyyymmddSlash[1] ?? '0';
    const m = yyyymmddSlash[2] ?? '0';
    const d = yyyymmddSlash[3] ?? '0';
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }

  // MM/DD/YYYY
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (mmddyyyy) {
    const m = mmddyyyy[1] ?? '0';
    const d = mmddyyyy[2] ?? '0';
    const y = mmddyyyy[3] ?? '0';
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }

  // MM-DD-YYYY
  const mmddyyyyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
  if (mmddyyyyDash) {
    const m = mmddyyyyDash[1] ?? '0';
    const d = mmddyyyyDash[2] ?? '0';
    const y = mmddyyyyDash[3] ?? '0';
    return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  }

  // "Jan 6, 2025" or "January 6, 2025"
  const MONTH_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const namedMonth = /^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (namedMonth) {
    const mon = namedMonth[1] ?? '';
    const day = namedMonth[2] ?? '0';
    const year = namedMonth[3] ?? '0';
    const mIdx = MONTH_MAP[mon.toLowerCase()];
    if (mIdx !== undefined) {
      return new Date(Date.UTC(parseInt(year, 10), mIdx, parseInt(day, 10)));
    }
  }

  throw new Error(`parseDateStrict: unrecognized date format: "${str}"`);
}

/**
 * Parse a time string. Accepts: "HH:MM", "HH:MM:SS", "H:MM AM/PM".
 */
export function parseTime(str: string): { hours: number; minutes: number; seconds: number } {
  const s = str.trim();

  // H:MM AM/PM or HH:MM AM/PM
  const ampm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i.exec(s);
  if (ampm) {
    let hours = parseInt(ampm[1] ?? '0', 10);
    const minutes = parseInt(ampm[2] ?? '0', 10);
    const seconds = ampm[3] ? parseInt(ampm[3], 10) : 0;
    const period = (ampm[4] ?? '').toUpperCase();
    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    return { hours, minutes, seconds };
  }

  // HH:MM or HH:MM:SS
  const twentyFour = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (twentyFour) {
    const hours = parseInt(twentyFour[1] ?? '0', 10);
    const minutes = parseInt(twentyFour[2] ?? '0', 10);
    const seconds = twentyFour[3] ? parseInt(twentyFour[3], 10) : 0;
    return { hours, minutes, seconds };
  }

  throw new Error(`parseTime: unrecognized time format: "${str}"`);
}

/**
 * Parse a duration string to milliseconds.
 * Accepts: "2h", "30m", "1h30m", "90s", "1h30m45s".
 */
export function parseDuration(str: string): number {
  const s = str.trim();
  if (!s) throw new Error('parseDuration: empty string');

  // Match combinations like 1h30m45s
  const pattern = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
  const match = pattern.exec(s);
  if (!match || (!match[1] && !match[2] && !match[3])) {
    throw new Error(`parseDuration: invalid format: "${str}"`);
  }

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  return hours * MS_PER_HOUR + minutes * MS_PER_MINUTE + seconds * MS_PER_SECOND;
}

// --- Sports schedule helpers ---

/**
 * NFL week dates: week 1 starts on first Thursday of September.
 * Week spans Thu–Wed.
 */
export function nflWeekDates(year: number, week: number): { start: Date; end: Date } {
  // First Thursday of September
  const sep1 = new Date(Date.UTC(year, 8, 1));
  const dayOfWeek = sep1.getUTCDay(); // 0=Sun, 4=Thu
  const daysToThursday = (4 - dayOfWeek + 7) % 7;
  const week1Start = new Date(Date.UTC(year, 8, 1 + daysToThursday));
  const start = new Date(week1Start.getTime() + (week - 1) * MS_PER_WEEK);
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);
  return { start, end };
}

/** NBA season: Oct 1 (year) to Jun 30 (year+1). */
export function nbaSeasonDates(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 9, 1)),      // Oct 1
    end: new Date(Date.UTC(year + 1, 5, 30)),   // Jun 30 year+1
  };
}

/** MLB season: April 1 to Oct 31. */
export function mlbSeasonDates(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 3, 1)),   // Apr 1
    end: new Date(Date.UTC(year, 9, 31)),    // Oct 31
  };
}

/** NHL season: Oct 1 to Jun 30 (year+1). */
export function nhlSeasonDates(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 9, 1)),      // Oct 1
    end: new Date(Date.UTC(year + 1, 5, 30)),   // Jun 30 year+1
  };
}

/**
 * Is date within the sport's season?
 * sport: 'nfl' | 'nba' | 'mlb' | 'nhl' (lowercase)
 */
export function isInSeasonEx(date: Date, sport: 'nfl' | 'nba' | 'mlb' | 'nhl'): boolean {
  const t = date.getTime();
  const year = date.getUTCFullYear();

  if (sport === 'nfl') {
    // Check current year's season and prior year's season (spans Sep–Jan)
    for (const y of [year, year - 1]) {
      const { start } = nflWeekDates(y, 1);
      // NFL ends around Feb: roughly 18 weeks = 126 days
      const end = new Date(start.getTime() + 126 * MS_PER_DAY);
      if (t >= start.getTime() && t <= end.getTime()) return true;
    }
    return false;
  }

  if (sport === 'nba') {
    for (const y of [year, year - 1]) {
      const { start, end } = nbaSeasonDates(y);
      if (t >= start.getTime() && t <= end.getTime()) return true;
    }
    return false;
  }

  if (sport === 'mlb') {
    const { start, end } = mlbSeasonDates(year);
    return t >= start.getTime() && t <= end.getTime();
  }

  if (sport === 'nhl') {
    for (const y of [year, year - 1]) {
      const { start, end } = nhlSeasonDates(y);
      if (t >= start.getTime() && t <= end.getTime()) return true;
    }
    return false;
  }

  return false;
}

/** Day of week name for a game date. */
export function gameDay(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return days[date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
}

/**
 * Next typical game day for sport.
 * NFL: next Sunday. NBA/NHL: tomorrow. MLB: tomorrow.
 */
export function nextGameDay(date: Date, sport: 'nfl' | 'nba' | 'mlb' | 'nhl'): Date {
  if (sport === 'nfl') {
    // Next Sunday
    const d = new Date(date);
    const day = d.getDay();
    const daysUntilSunday = (7 - day) % 7 || 7;
    return addDays(d, daysUntilSunday);
  }
  // NBA/NHL/MLB: tomorrow
  return addDays(date, 1);
}

/** Hours from baseDate to gameDate. Negative if past. */
export function hoursUntilGame(gameDate: Date, baseDate: Date = new Date()): number {
  return (gameDate.getTime() - baseDate.getTime()) / MS_PER_HOUR;
}

/**
 * MLB doubleheader risk: weekends (Sat or Sun) in August or September.
 */
export function isDoubleheaderRisk(date: Date, sport: 'mlb'): boolean {
  if (sport !== 'mlb') return false;
  const month = date.getMonth(); // 0-indexed; 7=Aug, 8=Sep
  const day = date.getDay();    // 0=Sun, 6=Sat
  return (month === 7 || month === 8) && (day === 0 || day === 6);
}

/**
 * Timezone label by offset (minutes).
 * -300=ET, -360=CT, -420=MT, -480=PT, 0=UTC, else 'UTC'.
 */
export function timezoneLabel(date: Date): string {
  const offset = date.getTimezoneOffset();
  if (offset === 300) return 'ET';
  if (offset === 360) return 'CT';
  if (offset === 420) return 'MT';
  if (offset === 480) return 'PT';
  if (offset === 0) return 'UTC';
  return 'UTC';
}

// --- Batch utilities additions ---

/**
 * Group dates by YYYY-MM-DD key.
 */
export function groupByDayRecord(dates: Date[]): Record<string, Date[]> {
  const result: Record<string, Date[]> = {};
  for (const d of dates) {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!result[key]) result[key] = [];
    result[key].push(d);
  }
  return result;
}

/**
 * Group dates by YYYY-MM key.
 */
export function groupByMonth(dates: Date[]): Record<string, Date[]> {
  const result: Record<string, Date[]> = {};
  for (const d of dates) {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!result[key]) result[key] = [];
    result[key].push(d);
  }
  return result;
}

/** Sort dates ascending or descending. */
export function sortDates(dates: Date[], direction: 'asc' | 'desc' = 'asc'): Date[] {
  return [...dates].sort((a, b) => direction === 'asc' ? a.getTime() - b.getTime() : b.getTime() - a.getTime());
}

/** Deduplicate dates by calendar day (UTC). Returns one date per unique day. */
export function uniqueDays(dates: Date[]): Date[] {
  const seen = new Set<string>();
  const result: Date[] = [];
  for (const d of dates) {
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  }
  return result;
}

/** Count dates by day of week. Key: 0=Sun..6=Sat. */
export function countByDayOfWeek(dates: Date[]): Record<number, number> {
  const result: Record<number, number> = {};
  for (const d of dates) {
    const dow = d.getDay();
    result[dow] = (result[dow] ?? 0) + 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Retained exports from original file for backward compatibility
// ---------------------------------------------------------------------------

/** @deprecated Use startOfDay */
export function startOfDayUtc(date: Date | number): Date {
  return startOfDay(new Date(date));
}

/** @deprecated Use endOfDay */
export function endOfDayUtc(date: Date | number): Date {
  return endOfDay(new Date(date));
}

/** @deprecated Use startOfWeek with startDay=1 */
export function startOfWeekUtc(date: Date | number): Date {
  return startOfWeek(new Date(date), 1);
}

/** @deprecated Use endOfWeek with startDay=1 */
export function endOfWeekUtc(date: Date | number): Date {
  return endOfWeek(new Date(date), 1);
}

/** @deprecated Use isSameDay */
export function isSameDayUtc(a: Date | number, b: Date | number): boolean {
  return isSameDay(new Date(a), new Date(b));
}

/** @deprecated Use isoWeek */
export function isoWeekNumber(date: Date | number): number {
  return isoWeek(new Date(date));
}

/** @deprecated Use nflWeekFromDate */
export function nflWeekNumber(date: Date | number, seasonStart?: Date | number): number | null {
  const result = nflWeekFromDate(new Date(date), seasonStart ? new Date(seasonStart) : undefined);
  return result === 0 ? null : result;
}

/** @deprecated Use formatGameTime (signature changed) */
export function formatGameDate(date: Date | string | number, now: Date | number = Date.now()): string {
  const d = new Date(date);
  const ref = new Date(now);
  const showYear = d.getUTCFullYear() !== ref.getUTCFullYear();
  try {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
      ...(showYear ? { year: 'numeric' } : {}),
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * Time until a future date from now (countdown).
 * Returns null if date is in the past.
 * @deprecated Use formatCountdown
 */
export function timeUntil(date: Date | number, now: Date | number = Date.now()): string | null {
  const diff = +date - +now;
  if (diff <= 0) return null;
  return formatDuration(diff);
}

/** Group items by UTC calendar day. */
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

/** Clamp a date to a [min, max] range. */
export function clampDate(date: Date | number, min: Date | number, max: Date | number): Date {
  return new Date(Math.max(+min, Math.min(+max, +date)));
}
