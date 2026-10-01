import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_REST } from "./priors/nfl-2026-rest.js";

export function restDays2026(ctx: {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}): { homeRest: number; awayRest: number } | null {
  if (!(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026) return null;
  const home = nflTeamAbbr(ctx.homeTeam);
  const away = nflTeamAbbr(ctx.awayTeam);
  if (home == null || away == null) return null;
  const row = NFL_2026_REST.find(
    (item) => item.week === week.week && item.home === home && item.away === away,
  );
  return row == null ? null : { homeRest: row.homeRest, awayRest: row.awayRest };
}
