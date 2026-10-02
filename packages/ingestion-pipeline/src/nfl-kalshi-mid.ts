/**
 * Home-side Kalshi mid from one orderbook snapshot.
 * Same gate as quote-plane gatePmTwoWay: two-way quote, spread at most 10 cents,
 * mid is (bid + ask) / 2. Not a last trade. Not blended with the games-file line.
 * The snapshot is dead 120 minutes after it was read, and dead at kickoff.
 */
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import {
  KALSHI_NFL_HOME_BOOKS,
  KALSHI_NFL_SNAPSHOT_AT,
} from "./priors/nfl-2026-w4-kalshi.js";

const SNAPSHOT_MS = Date.parse(KALSHI_NFL_SNAPSHOT_AT);
const MAX_AGE_MS = 120 * 60 * 1000;
const MAX_SPREAD = 0.1;

export function kalshiHomeMid(ctx: {
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
  now: Date;
}): { value: number; metadata: Record<string, unknown> } | null {
  if (!(ctx.commenceTime instanceof Date) || !(ctx.now instanceof Date)) return null;
  const now = ctx.now.getTime();
  if (!Number.isFinite(now) || !Number.isFinite(SNAPSHOT_MS)) return null;
  if (now < SNAPSHOT_MS || now - SNAPSHOT_MS > MAX_AGE_MS) return null;
  if (now >= ctx.commenceTime.getTime()) return null;
  const week = nflWeekOf(ctx.commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return null;
  const home = nflTeamAbbr(ctx.homeTeam);
  const away = nflTeamAbbr(ctx.awayTeam);
  if (home == null || away == null) return null;
  const book = KALSHI_NFL_HOME_BOOKS.find((row) => row.home === home && row.away === away);
  if (book == null) return null;
  const { yesBid, yesAsk } = book;
  if (!(yesBid > 0 && yesBid < 1 && yesAsk > 0 && yesAsk < 1)) return null;
  if (yesAsk < yesBid || yesAsk - yesBid > MAX_SPREAD) return null;
  const mid = (yesBid + yesAsk) / 2;
  return {
    value: mid - 0.5,
    metadata: {
      basis: "kalshi home-ticker bid/ask mid, not a close, not blended with the games-file line",
      methodTag: "prediction_market_mid_v2",
      ticker: book.ticker,
      yesBid,
      yesAsk,
      mid,
      snapshotAt: KALSHI_NFL_SNAPSHOT_AT,
    },
  };
}
