/**
 * Relative time formatting utilities — pure math, zero dependencies.
 *
 * Produces human-readable relative strings like "2h ago", "in 3 days",
 * "just now". Locale-aware via Intl.RelativeTimeFormat when available,
 * with a plain-English fallback.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export type RelativeTimeUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

export interface RelativeTimeResult {
  /** Human-readable string, e.g. "2 hours ago" or "in 3 days" */
  readonly label: string;
  /** Value passed to Intl.RelativeTimeFormat */
  readonly value: number;
  /** Unit passed to Intl.RelativeTimeFormat */
  readonly unit: RelativeTimeUnit;
  /** Milliseconds since epoch of the reference date */
  readonly diffMs: number;
}

/**
 * Format a date as a relative time string.
 *
 * @param date - The date to format (Date object or ISO string)
 * @param now  - Reference point for "now" (default: Date.now())
 * @param locale - BCP47 locale string (default: "en")
 */
export function relativeTime(
  date: Date | string | number,
  now: Date | number = Date.now(),
  locale = "en",
): RelativeTimeResult {
  const targetMs = date instanceof Date ? date.getTime() : typeof date === "string" ? Date.parse(date) : date;
  const nowMs = now instanceof Date ? now.getTime() : now;
  const diffMs = targetMs - nowMs;
  const absDiff = Math.abs(diffMs);

  let value: number;
  let unit: RelativeTimeUnit;

  if (absDiff < MINUTE) {
    value = Math.round(diffMs / SECOND);
    unit = "second";
  } else if (absDiff < HOUR) {
    value = Math.round(diffMs / MINUTE);
    unit = "minute";
  } else if (absDiff < DAY) {
    value = Math.round(diffMs / HOUR);
    unit = "hour";
  } else if (absDiff < WEEK) {
    value = Math.round(diffMs / DAY);
    unit = "day";
  } else if (absDiff < MONTH) {
    value = Math.round(diffMs / WEEK);
    unit = "week";
  } else if (absDiff < YEAR) {
    value = Math.round(diffMs / MONTH);
    unit = "month";
  } else {
    value = Math.round(diffMs / YEAR);
    unit = "year";
  }

  let label: string;
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    label = rtf.format(value, unit);
  } catch {
    label = formatFallback(value, unit);
  }

  return { label, value, unit, diffMs };
}

function formatFallback(value: number, unit: RelativeTimeUnit): string {
  const abs = Math.abs(value);
  const past = value < 0;
  const unitStr = abs === 1 ? unit : `${unit}s`;

  if (unit === "second" && abs < 5) return "just now";
  return past ? `${abs} ${unitStr} ago` : `in ${abs} ${unitStr}`;
}

/**
 * Quick helper: how long ago was a date?
 * Returns a string like "3h ago", "2d ago", "just now".
 */
export function timeAgo(date: Date | string | number, now: Date | number = Date.now()): string {
  return relativeTime(date, now).label;
}

/**
 * Check if a date is "stale" (older than the given threshold in ms).
 */
export function isStale(date: Date | string | number, thresholdMs: number, now: number = Date.now()): boolean {
  const targetMs = date instanceof Date ? date.getTime() : typeof date === "string" ? Date.parse(date) : date;
  return now - targetMs > thresholdMs;
}

/**
 * Format a Date as a compact absolute string: "Jun 19" or "Jun 19, 2025".
 * Shows year only when different from the reference year.
 */
export function compactDate(date: Date | string | number, now: Date | number = Date.now()): string {
  const d = date instanceof Date ? date : new Date(date);
  const refDate = now instanceof Date ? now : new Date(now);
  const showYear = d.getFullYear() !== refDate.getFullYear();

  try {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(showYear ? { year: "numeric" } : {}),
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
