/**
 * Performance segments — units, win%, ROI and CLV broken down by sport and by market.
 *
 * This is the edge-finder. Win% on its own is a vanity number; segmented UNITS/ROI on a
 * real sample tells you WHERE the edge actually lives. Point the model at everything, then
 * lean into the sport×market segments that print — and show the receipts per segment.
 *
 * Built on the tested `portfolio()` engine (no duplicate math). Pure + deterministic.
 *
 * Honesty guardrail: `edgeBoard()` will not crown a tiny-sample segment — a 3-0 run is
 * noise, not an edge. Segments below `minSettled` are separated out, never ranked as leaders.
 */

import { portfolio, type Bet, type Portfolio } from "./clv";

export type Segment = {
  /** stable grouping key, e.g. "nba" or "nba|Total" */
  readonly key: string;
  /** human label, e.g. "NBA" or "NBA · Total" */
  readonly label: string;
  readonly portfolio: Portfolio;
};

function groupByKey(bets: readonly Bet[], keyFn: (b: Bet) => string): Map<string, Bet[]> {
  const m = new Map<string, Bet[]>();
  for (const b of bets) {
    const k = keyFn(b);
    (m.get(k) ?? m.set(k, []).get(k)!).push(b);
  }
  return m;
}

/** Group bets by an arbitrary key and compute a full portfolio per group. Sorted by profit desc. */
export function segmentBy(
  bets: readonly Bet[],
  keyFn: (b: Bet) => string,
  labelFn: (key: string, bets: readonly Bet[]) => string = (k) => k,
): Segment[] {
  const groups = groupByKey(bets, keyFn);
  const segments: Segment[] = [];
  for (const [key, segBets] of groups) {
    segments.push({ key, label: labelFn(key, segBets), portfolio: portfolio(segBets) });
  }
  return segments.sort((a, b) => b.portfolio.profit - a.portfolio.profit);
}

const titleCase = (s: string): string => (s.length <= 4 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1));

/** Units / win% / ROI / CLV per SPORT. */
export function bySport(bets: readonly Bet[]): Segment[] {
  return segmentBy(bets, (b) => b.sport, (k) => titleCase(k));
}

/** Per MARKET (Spread / Total / Moneyline / props…) across all sports. */
export function byMarket(bets: readonly Bet[]): Segment[] {
  return segmentBy(bets, (b) => b.market, (k) => k);
}

/** Per SPORT × MARKET — the finest cut, where soft markets (props) reveal themselves. */
export function bySportMarket(bets: readonly Bet[]): Segment[] {
  return segmentBy(
    bets,
    (b) => `${b.sport}|${b.market}`,
    (k) => `${titleCase(k.split("|")[0]!)} · ${k.split("|")[1]}`,
  );
}

export type EdgeBoard = {
  /** segments with a real sample (>= minSettled), ranked by ROI desc — the honest leaders. */
  readonly leaders: readonly Segment[];
  /** promising but under-sampled — watch, don't bank on. */
  readonly lowSample: readonly Segment[];
  readonly minSettled: number;
};

/**
 * Rank sport×market segments by ROI, but only those with enough settled bets to mean
 * anything. This is the honest "where do we actually have a 70%/profitable edge" board.
 */
export function edgeBoard(bets: readonly Bet[], opts: { minSettled?: number } = {}): EdgeBoard {
  const minSettled = opts.minSettled ?? 20;
  const segments = bySportMarket(bets);
  const qualified = segments.filter((s) => s.portfolio.settled >= minSettled);
  const leaders = [...qualified].sort((a, b) => b.portfolio.roi - a.portfolio.roi);
  const lowSample = segments.filter((s) => s.portfolio.settled < minSettled);
  return { leaders, lowSample, minSettled };
}
