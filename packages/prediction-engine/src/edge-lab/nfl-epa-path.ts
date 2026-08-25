/**
 * NFL EPA independent-fair-value path status.
 *
 * build-independent-fair-values already queries TeamGameEfficiency. If that
 * table is empty, NFL moneyline p is Kalshi/FPI/Elo only and the nflverse
 * EPA branch is dead. This helper interprets a COUNT — it does not query.
 * priced:false. Pure.
 */

export const NFL_EPA_PATH_TAG = "nfl_epa_path_v1" as const;

export type EpaPathStatus = {
  readonly methodTag: typeof NFL_EPA_PATH_TAG;
  readonly live: boolean;
  readonly season: number;
  readonly rows: number;
  readonly reason: string;
  readonly priced: false;
};

/** Honest empty-vs-live verdict from a row count the caller already fetched. */
export function nflEpaPathStatus(season: number, rows: number): EpaPathStatus {
  const tag = NFL_EPA_PATH_TAG;
  if (!Number.isInteger(season) || season < 1999) {
    return {
      methodTag: tag,
      live: false,
      season,
      rows: Number.isFinite(rows) ? rows : 0,
      reason: "bad_season",
      priced: false,
    };
  }
  const n = Number.isFinite(rows) && rows > 0 ? Math.floor(rows) : 0;
  if (n === 0) {
    return {
      methodTag: tag,
      live: false,
      season,
      rows: 0,
      reason: "empty — run cron /api/cron/backfill-team-efficiency; NFL p is Kalshi/FPI/Elo only",
      priced: false,
    };
  }
  return {
    methodTag: tag,
    live: true,
    season,
    rows: n,
    reason: `TeamGameEfficiency has ${n} rows for ${season}`,
    priced: false,
  };
}
