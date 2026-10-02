/**
 * Penalty differential for the 2026 week-4 slate only.
 * The window is each club's last five games before this week:
 * 2026 weeks 1-3 plus the last two 2025 regular-season games.
 * The bridge refuses a sample under five. This table has five.
 * Earlier use would leak. Later use is a stale window.
 */
import { evalPenaltyDifferentialMomentum } from "./signals-bridge.js";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_W4_PENALTY } from "./priors/nfl-2026-w4-penalty.js";

export function penaltyMatchup(ctx: {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}): { value: number; metadata: Record<string, unknown> } | null {
  if (!(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = nflTeamAbbr(ctx.homeTeam);
  const away = nflTeamAbbr(ctx.awayTeam);
  if (home == null || away == null || home === away) return null;
  const homeRow = NFL_2026_W4_PENALTY[home];
  const awayRow = NFL_2026_W4_PENALTY[away];
  if (homeRow == null || awayRow == null) return null;
  const bridged = evalPenaltyDifferentialMomentum({
    teamName: home,
    opponentName: away,
    rollingFiveGameNetPenaltyYards: homeRow.netYards,
    teamPreSnapFoulsPerGame: homeRow.preSnapPerGame,
    opponentPreSnapFoulsPerGame: awayRow.preSnapPerGame,
    teamDpiBeneficiaryYardsPerGame: homeRow.dpiBeneficiaryYardsPerGame,
    opponentDpiBeneficiaryYardsPerGame: awayRow.dpiBeneficiaryYardsPerGame,
    gamesSampled: 5,
  });
  if (!bridged.ok) return null;
  return {
    value: bridged.data.expectedSpreadTiltPoints,
    metadata: {
      basis: "last five team-games before week 4, home perspective, not a 2026-only window",
      gamesSampled: 5,
      homeNetYards: homeRow.netYards,
      awayNetYards: awayRow.netYards,
      disciplineTier: bridged.data.disciplineTier,
      window: "2025 weeks 17-18 plus 2026 weeks 1-3",
    },
  };
}
