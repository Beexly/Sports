/**
 * Source attribution for the fantasy surfaces (client-safe constants — no IO).
 *
 * The rights registry requires attribution to propagate to every derived
 * output: nflverse (CC-BY-4.0) demands it, the FFC ADP API requests a
 * link/mention, and the Sleeper posture requires attribution on enrichment.
 * This is the one line every live fantasy surface shows.
 */

export const FANTASY_DATA_ATTRIBUTION =
  "Player data: nflverse (CC-BY-4.0) · ADP via FantasyFootballCalculator.com · rosters/injury via Sleeper";

/**
 * The honest value label for live fantasy boards: what the numbers ARE (and are
 * not). Values are graded from last completed season's usage + our process
 * grade — not a forward season point projection (that stays gated behind the
 * calibration backtest). Rookies have no NFL usage history, so they are not in
 * the graded pool rather than carrying an invented value.
 */
export const FANTASY_VALUE_BASIS_NOTE =
  "Values are last-season usage + process grade — not a forward season point projection. " +
  "Rookies (no NFL usage history) are not graded and do not appear in the pool.";
