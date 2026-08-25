/**
 * Pure viewer-clock formatting helpers, shared by the CLIENT `<LocalTime>` and
 * by tests. They live outside the `"use client"` component module on purpose:
 * importing a function from a client module and calling it during server render
 * throws (Next treats the export as a client reference). Same split as
 * `lib/picks/line-freshness.ts` vs `components/picks/line-freshness-badge.tsx`.
 *
 * WHY THIS EXISTS (the bug it closes): kickoff times were formatted during
 * SERVER render with `toLocaleString("en-US", { … })` and no `timeZone`. No `TZ`
 * is set in `next.config.mjs`, `vercel.json` or any Docker config, so Node falls
 * back to UTC and every visitor — wherever they are — was shown the UTC wall
 * clock. A 1:00 PM ET kickoff rendered as "Sun, Sep 7, 5:00 PM UTC". It is not a
 * hydration mismatch: there is no flash and no React warning, just a silently
 * wrong number on the one field a bettor cannot afford to have wrong.
 *
 * The fix is to carry the ISO instant across the server/client boundary and
 * resolve it against the VIEWER's clock after mount. Never pass a `timeZone`
 * here in app code — omitting it is what makes `Intl` use the viewer's own zone.
 * The parameter exists so tests can pin a concrete zone deterministically.
 */

export type LocalTimeFormat =
  /** "Sun, Sep 7, 1:00 PM EDT" — game start, the bettor's decision clock. */
  | "kickoff"
  /** "Sunday, September 7, 2025" — headline date, no time-of-day. */
  | "date-long"
  /** "1:00 PM EDT" — time only, always carrying its zone. */
  | "clock"
  /** "Sep 7, 1:00 PM EDT" — data/refresh stamps. */
  | "stamp";

const OPTIONS: Record<LocalTimeFormat, Intl.DateTimeFormatOptions> = {
  kickoff: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  },
  "date-long": {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  },
  clock: {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  },
  stamp: {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  },
};

/**
 * Format an ISO instant on the VIEWER's clock.
 *
 * @param iso      ISO-8601 instant (the only thing that crosses the boundary).
 * @param format   One of the named presets above.
 * @param timeZone TEST-ONLY override. Omit in app code so `Intl` resolves the
 *                 viewer's own zone; passing one here re-creates the bug.
 * @returns The formatted string, or `null` when `iso` is not a real instant —
 *          callers render nothing rather than inventing a time (CLAUDE.md #5).
 */
export function formatLocalTime(
  iso: string,
  format: LocalTimeFormat,
  timeZone?: string,
): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const options: Intl.DateTimeFormatOptions = timeZone
    ? { ...OPTIONS[format], timeZone }
    : OPTIONS[format];
  return new Date(ms).toLocaleString("en-US", options);
}

/** True when `iso` parses to a real instant. */
export function isRealInstant(iso: string): boolean {
  return Number.isFinite(Date.parse(iso));
}
