/**
 * One aggregated 2026 pre-game line, de-vigged with the engine's Shin reader.
 * Not a closing line. Not a per-book consensus. Vintage is not stamped on
 * the source file. A missing game, a missing week, or a price pair the
 * reader refuses all abstain. The spread column is not used: it is integer
 * points in the source, and turning it into a probability would be a map.
 */
import { noVigFromAmericanPrices } from "@sports/prediction-engine/src/market-read.js";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { NFL_2026_PREGAME_LINES, type PregameLine } from "./priors/nfl-2026-pregame-lines.js";

export function find2026PregameLine(ctx: {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}): PregameLine | null {
  if (!(ctx.commenceTime instanceof Date)) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026) return null;
  const home = nflTeamAbbr(ctx.homeTeam);
  const away = nflTeamAbbr(ctx.awayTeam);
  if (home == null || away == null) return null;
  return (
    NFL_2026_PREGAME_LINES.find(
      (row) => row.week === week.week && row.gameType === "REG" && row.home === home && row.away === away,
    ) ?? null
  );
}

export function pregameMarketAnchor(ctx: {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}): { value: number; metadata: Record<string, unknown> } | null {
  const line = find2026PregameLine(ctx);
  if (line == null) return null;
  const read = noVigFromAmericanPrices([line.homeMl, line.awayMl]);
  if (read == null) return null;
  const fairHome = read.fairProbabilities[0];
  if (fairHome == null || !Number.isFinite(fairHome)) return null;
  return {
    value: fairHome - 0.5,
    metadata: {
      basis: "shin de-vig of one aggregated pre-game line, not a close, not per-book",
      methodTag: read.methodTag,
      homeMl: line.homeMl,
      awayMl: line.awayMl,
      fairHome,
      bookHoldPct: read.bookHoldPct,
      vintage: "unstated",
    },
  };
}
