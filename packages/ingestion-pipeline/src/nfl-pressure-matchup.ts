/**
 * Pressure matchup for the 2026 week-4 slate only. Other weeks abstain
 * because this table was counted through week 3. Using it earlier would
 * leak, and using it later would be a stale snapshot we have not rebuilt.
 */
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_PRESSURE_EDGE } from "./priors/nfl-2026-w4-pressure.js";

export function pressureMatchup(ctx: {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}): { value: number; metadata: Record<string, unknown> } | null {
  if (!(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = nflTeamAbbr(ctx.homeTeam);
  const away = nflTeamAbbr(ctx.awayTeam);
  if (home == null || away == null) return null;
  const value = NFL_2026_W4_PRESSURE_EDGE[`${home}|${away}`];
  if (value == null || !Number.isFinite(value)) return null;
  return {
    value,
    metadata: {
      basis: "qb_hit per dropback, home net minus away net, weeks before this game",
      countedThroughWeek: 3,
      priorSeason: 2025,
      fourthDownNotVoted: true,
    },
  };
}
