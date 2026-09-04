/**
 * THE platform day boundary — one definition, read by every consumer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE CONVENTION (do not change without an owner decision — see below)
 * ─────────────────────────────────────────────────────────────────────────
 * A platform "day" is the **UTC calendar day**: `[00:00:00.000Z, 24:00Z)`.
 * Its key is the UTC `YYYY-MM-DD`. There is no local-time and no
 * America/New_York variant of this boundary anywhere in the data layer.
 *
 * WHY UTC, and why this file exists
 * ---------------------------------
 * "Today" is not cosmetic here. At least five things depend on a day
 * definition and they must not be allowed to disagree:
 *
 *   1. the FREE tier's "2 picks/day" teaser window  (an ENTITLEMENT boundary)
 *   2. "today's board" / the daily-slate counts
 *   3. the public No-Bet pass list ("gated today")
 *   4. settled-result day grouping (honest-record drafts)
 *   5. operator/track-record "published today" counts
 *
 * Production already runs UTC (Vercel functions default to `TZ=UTC`) and the
 * commit-reveal layer already pins a UTC game-day on disk — see
 * `dailySlateKey()` in packages/prediction-engine/src/slate-commitment.ts and
 * the DAY-BOUNDARY DESIGN note in
 * packages/ingestion-pipeline/src/freeze-slate-commitments.ts, which freezes
 * one immutable Merkle root per `(sport, UTC game-day)`. Those roots are
 * public and immutable, so UTC is not a preference — it is already the
 * published contract. This module makes the app layer say the same thing out
 * loud instead of re-deriving it thirteen different ways.
 *
 * What this replaces
 * ------------------
 * Before this file the repo computed "today" with two different idiom
 * families that happen to coincide ONLY while the process timezone is UTC:
 *
 *   - runtime-LOCAL: `date-fns` `startOfDay()`/`endOfDay()`, `setHours(0,…)`
 *   - explicit UTC:  `setUTCHours(0,…)`, `toISOString().slice(0, 10)`
 *
 * Several payloads mixed both — e.g. a slate whose COUNTS came from a
 * runtime-local window but whose `date` LABEL was a UTC `toISOString()`
 * slice. Under `TZ=UTC` that is invisible; under any other zone the label and
 * the window describe different days. Reading the boundary from here removes
 * the ambient-timezone dependency entirely: these functions never consult the
 * host zone, so the answer is the same on Vercel, in CI, in a Docker worker,
 * and on a laptop in Denver.
 *
 * OWNER DECISION (deliberately NOT taken here)
 * --------------------------------------------
 * UTC midnight means a US West Coast free user's "2 picks/day" teaser rolls
 * over at 5pm local (4pm during PST). Moving the entitlement boundary to an
 * ET "sports day" is a defensible product call, but it MOVES when a live
 * paywall resets and is therefore an owner decision, not a refactor. This
 * module deliberately ships the CURRENT production boundary (UTC) and pins
 * it. If the owner later wants the sports-day convention, change it HERE —
 * one edit, every consumer follows.
 */

/**
 * The zone every platform day boundary is anchored to. Not configurable at
 * runtime on purpose: a boundary that can be moved by an env var is a
 * boundary that can silently move a live entitlement.
 */
export const PLATFORM_DAY_ZONE = "UTC" as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A single platform day, expressed every way a caller needs it. */
export interface UtcDayWindow {
  /** Inclusive start — `YYYY-MM-DDT00:00:00.000Z`. */
  readonly start: Date;
  /** EXCLUSIVE end — the next day's `00:00:00.000Z`. Use with Prisma `lt`. */
  readonly end: Date;
  /** Inclusive end — `YYYY-MM-DDT23:59:59.999Z`. Use with Prisma `lte`. */
  readonly endInclusive: Date;
  /** The day's key, `YYYY-MM-DD` (UTC). */
  readonly key: string;
}

function assertValid(instant: Date): void {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    // Callers sanitize first (see lib/parse-date-param.ts). Falling back to
    // "now" here would silently answer for a DIFFERENT day than the caller
    // asked about, which is exactly the class of bug this module exists to
    // prevent — so refuse loudly instead.
    throw new RangeError("day-boundary: invalid Date");
  }
}

/**
 * The UTC calendar-day key (`YYYY-MM-DD`) containing `instant`.
 *
 * This is the one function that turns an instant into a day label. Never
 * hand-roll `toISOString().slice(0, 10)` next to a query window again — that
 * is how a payload ends up with a UTC label over a local-time window.
 */
export function utcDayKey(instant: Date): string {
  assertValid(instant);
  return instant.toISOString().slice(0, 10);
}

/**
 * The UTC calendar day containing `instant`, optionally shifted by whole
 * days (`offsetDays: -1` = yesterday, `1` = tomorrow).
 *
 * Pure and zone-independent: the result depends only on `instant`, never on
 * the host's `TZ`. Always pass the caller's injected clock — reading
 * `new Date()` inside a day-window helper makes the window untestable and
 * lets the label and the window straddle midnight in the same request.
 */
export function utcDayWindow(instant: Date, offsetDays = 0): UtcDayWindow {
  assertValid(instant);
  if (!Number.isInteger(offsetDays)) {
    throw new RangeError("day-boundary: offsetDays must be a whole number of days");
  }
  const start = new Date(
    Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate() + offsetDays,
    ),
  );
  const end = new Date(start.getTime() + MS_PER_DAY);
  return {
    start,
    end,
    endInclusive: new Date(end.getTime() - 1),
    key: start.toISOString().slice(0, 10),
  };
}
