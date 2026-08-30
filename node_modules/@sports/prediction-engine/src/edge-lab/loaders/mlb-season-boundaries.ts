/**
 * Shared MLB season-boundary constant for the leak-free PRIOR-SEASON
 * discipline used by every MLB player-level feature loader in this
 * directory (see statcast-features.ts and mlb-platoon-splits.ts headers for
 * the full writeup of why prior-season-only is the rule).
 *
 * Both of those loaders serve a season's PRIOR full season aggregate as the
 * feature input for games played in the CURRENT season — never same-season
 * aggregates, which would leak a player's own future-game outcomes into
 * earlier decisions within that same season (the canonical season-aggregate
 * leak this whole engine exists to refuse). The `observedAt` stamp on every
 * emitted feature must therefore be an honest instant at/after which the
 * PRIOR season's numbers were actually final, and — per the handoff's
 * "well before any current-season kickoff" margin requirement — comfortably
 * before the covered season's own Opening Day, so the as-of store's cutoff
 * enforcement (asof-store.ts) has real margin rather than a hairline
 * true-but-fragile pass.
 *
 * DELIBERATE JUDGMENT CALL: rather than trying to recover the exact
 * last-out timestamp of a given season from a boxscore/schedule feed (a
 * level of precision neither loader has the inputs for — that would require
 * cross-referencing mlb-games.ts's schedule loader per season, which is out
 * of scope here), this uses a fixed, conservative per-season constant:
 * November 15 of the season's calendar year, 00:00 UTC. That date:
 *
 *   - POSTDATES the latest World Series game ever played in modern MLB
 *     history (the 2001 World Series, postponed by the September 11
 *     attacks, concluded November 4, 2001) with 11 days of margin.
 *   - PREDATES the following season's spring training and Opening Day
 *     (always February/March at the earliest) by more than three months.
 *
 * This is an honest, explicit assumption — not a fact recovered from a
 * source — exactly like nfl-games.ts's DEFAULT_KICKOFF_ET convention. If a
 * future change wires in the real schedule-derived last-game timestamp per
 * season, this function is the single place to replace.
 */
export function mlbSeasonEndIso(season: number): string {
  return `${season}-11-15T00:00:00.000Z`;
}
