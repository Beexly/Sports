/**
 * Central Time formatting. Every customer-facing time on the site reads CST/CDT.
 *
 * Founder 2026-09-12: "all times should be from CST central time."
 * America/Chicago honors DST automatically, so this is CST in winter and
 * CDT in summer — which is what "Central" means to a US customer.
 */

export const CENTRAL_TZ = "America/Chicago";

/** Format a Date as h:mm a in Central Time, e.g. "7:35 PM". */
export function formatCentralTime(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Format a Date as "Sun, Sep 14 · 7:35 PM CT" in Central Time. */
export function formatCentralDateTime(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${day} · ${formatCentralTime(date)} CT`;
}

/** Format a Date as YYYY-MM-DD in Central Time (for day-keyed grouping). */
export function centralDateKey(d: Date | string | number = new Date()): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Day-of-week index in Central Time (0 = Sunday). */
export function centralDayIndex(d: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    weekday: "short",
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Short "CT" suffix for any already-formatted Central time. */
export const CT_SUFFIX = "CT";
