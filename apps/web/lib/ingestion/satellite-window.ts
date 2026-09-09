/**
 * When the nflverse SATELLITE assets (snap counts, injuries, depth charts, Next
 * Gen Stats) run alongside the primary weekly-stats refresh.
 *
 * C-244. `/api/cron/refresh-player-stats` only ever ran the satellites behind
 * `?mode=full`, and the scheduled invocation in `vercel.json` carries no query
 * string — so on the schedule they never ran at all. Measured on production
 * 2026-09-08: `depth_chart_entries` held ZERO rows, and injuries, snap counts
 * and Next Gen Stats topped out at season 2025. (Season 2025 is also where
 * `player_game_stats` tops out, because nflverse has not published 2026 REG
 * rows yet — so for those three the reading is "not yet due", not "stale". The
 * empty depth-chart table is the one that is unambiguously a gap: a full season
 * of 2025 never landed either.) The consequence is not a rounding error: when
 * nflverse ships 2026 week 1 the primary path picks it up within thirty
 * minutes and the four satellites stay exactly where they are, for the season.
 *
 * The route's own header records why the default is primary-only: on
 * 2026-08-06 the satellites OOM'd a HOBBY serverless function ~90s past the
 * primary. That reason is now out of date — the account is on the Vercel Pro
 * plan (verified 2026-09-08) with a larger memory ceiling and the 300s budget
 * the route already declares. Out of date is not the same as disproven: nobody
 * has measured a full run on Pro, so this does not flip the default. It runs
 * the satellites ONCE A DAY and leaves every other invocation primary-only.
 *
 * The daily hour is an operational choice, not a derivation, and is written
 * down as one: 10:00 UTC is simply a quiet slot in `vercel.json` (09:00
 * ingest-player-stats, 09:30 hydrate-cold-plane, 11:00 generate-drafts).
 *
 * WHY A CLOCK WINDOW RATHER THAN A COVERAGE CHECK. Running the satellites
 * whenever their newest week lags the primary's is the better-looking design
 * and the worse-behaving one here: the depth-chart table is EMPTY, so the lag
 * is unbounded and every one of the 48 daily invocations would take the heavy
 * path until it succeeded — the precise failure the primary-only default was
 * chosen to avoid. A coverage check needs a cooldown, and a cooldown needs
 * state; a clock window IS the cooldown, with no state and nothing to get
 * wrong.
 *
 * The cleaner fix belongs to the founder and is one line: give the
 * `refresh-player-stats` cron entry in `vercel.json` its own `?mode=full`
 * schedule. Agents may not edit that file, so this closes the gap from inside
 * the route until they do.
 */

/** Quiet slot in the cron schedule. Operational choice; see the note above. */
export const SATELLITE_DAILY_HOUR_UTC = 10;

export type SatelliteDecision = {
  readonly runFull: boolean;
  /**
   * `requested` — an explicit `?mode=full|all`.
   * `daily-window` — the scheduled once-a-day satellite run.
   * `primary-only` — every other invocation.
   */
  readonly reason: "requested" | "daily-window" | "primary-only";
};

/**
 * Decide whether this invocation runs the satellites.
 *
 * An EXPLICIT `?mode=` always wins, in both directions: `full`/`all` forces
 * them on, and any other explicit value (`primary`) forces them off even
 * inside the daily window. An operator who names the mode gets the mode they
 * named — a clock that overrode them would make the parameter a suggestion.
 */
export function decideSatelliteRun(searchParams: URLSearchParams, now: Date): SatelliteDecision {
  const raw = searchParams.get("mode");
  if (raw !== null) {
    const mode = raw.toLowerCase();
    const explicitFull = mode === "full" || mode === "all";
    return { runFull: explicitFull, reason: explicitFull ? "requested" : "primary-only" };
  }
  // The cron fires twice an hour (0,30). Take the first of the two so the
  // window is one run a day, not two.
  const inWindow = now.getUTCHours() === SATELLITE_DAILY_HOUR_UTC && now.getUTCMinutes() < 30;
  return { runFull: inWindow, reason: inWindow ? "daily-window" : "primary-only" };
}
