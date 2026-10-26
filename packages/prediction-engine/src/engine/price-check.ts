/**
 * Class B. Books are read here, and only here, after a lock exists.
 * The market prices the side the lock already chose. It does not choose one.
 *
 * PLAY / ALT / PASS-on-price. The 7-point gap is the doctrine example
 * ("our total is 43 and the market is 50"), not a fitted constant.
 */
import type { FactorDetail } from "@sports/types";

export const DOCTRINE_PLAY_GAP_PTS = 7;

export type PriceAction = "PLAY" | "ALT" | "PASS-on-price";

export interface SpreadPriceCheck {
  readonly action: PriceAction;
  /** Points of value on the locked side. Positive means the number is better than our margin. */
  readonly edgePts: number;
  readonly side: "HOME" | "AWAY";
  readonly fairHomeSpread: number;
  /** Home-perspective line the action would bet. The consensus mean on PLAY. */
  readonly betHomeLine: number;
  readonly factor: FactorDetail;
}

function edgeForSide(marginMean: number, homeLine: number, side: "HOME" | "AWAY"): number {
  const edgeHome = marginMean + homeLine;
  return side === "HOME" ? edgeHome : -edgeHome;
}

export function priceLockedSpread(args: {
  readonly marginMean: number;
  readonly scoreMean: number;
  readonly avgSpread: number;
  readonly quotedHomeLines: readonly number[];
}): SpreadPriceCheck {
  const side: "HOME" | "AWAY" = args.marginMean >= 0 ? "HOME" : "AWAY";
  const fairHomeSpread = -args.marginMean;
  const consensusEdge = edgeForSide(args.marginMean, args.avgSpread, side);
  const qualifying = args.quotedHomeLines.filter(
    (line) => edgeForSide(args.marginMean, line, side) >= DOCTRINE_PLAY_GAP_PTS,
  );
  qualifying.sort((a, b) => {
    const da = Math.abs(a - fairHomeSpread);
    const db = Math.abs(b - fairHomeSpread);
    if (Math.abs(da - db) > 1e-9) return da - db;
    return edgeForSide(args.marginMean, a, side) - edgeForSide(args.marginMean, b, side);
  });
  const altLine = qualifying[0];
  let action: PriceAction;
  let betHomeLine: number;
  if (consensusEdge >= DOCTRINE_PLAY_GAP_PTS) {
    action = "PLAY";
    betHomeLine = args.avgSpread;
  } else if (altLine !== undefined && Math.abs(altLine - args.avgSpread) > 1e-9) {
    action = "ALT";
    betHomeLine = altLine;
  } else {
    action = "PASS-on-price";
    betHomeLine = args.avgSpread;
  }
  const edgePts = action === "ALT" && altLine !== undefined
    ? edgeForSide(args.marginMean, altLine, side)
    : consensusEdge;
  const factor: FactorDetail = {
    name: "Price check",
    impact: "neutral",
    weight: 0,
    description:
      `${action}: locked side ${side}, home margin ${args.marginMean.toFixed(2)}, ` +
      `home score ${args.scoreMean.toFixed(2)}, fair home spread ${fairHomeSpread.toFixed(2)}, ` +
      `consensus home line ${args.avgSpread.toFixed(2)}, edge ${edgePts.toFixed(2)} pts. ` +
      `PLAY requires ${DOCTRINE_PLAY_GAP_PTS} pts (doctrine example, not a fitted constant). ` +
      `The book priced the side. It did not choose it.`,
  };
  return { action, edgePts, side, fairHomeSpread, betHomeLine, factor };
}

export interface TotalPriceCheck {
  readonly action: PriceAction;
  readonly edgePts: number;
  readonly side: "OVER" | "UNDER";
  /** Band center (totalP10+totalP90)/2. Not scoreMean. */
  readonly lockedTotal: number;
  readonly betTotal: number;
  readonly factor: FactorDetail;
}

export function priceLockedTotal(args: {
  readonly scoreMean: number;
  readonly totalP10: number;
  readonly totalP90: number;
  readonly avgTotal: number;
  readonly quotedTotals: readonly number[];
}): TotalPriceCheck {
  const lockedTotal = (args.totalP10 + args.totalP90) / 2;
  // Positive: our number is higher than the market → the over is the cheap side.
  const edgeOver = lockedTotal - args.avgTotal;
  const side: "OVER" | "UNDER" = edgeOver >= 0 ? "OVER" : "UNDER";
  const consensusEdge = Math.abs(edgeOver);
  const qualifying = args.quotedTotals.filter((total) => {
    const edge = side === "OVER" ? lockedTotal - total : total - lockedTotal;
    return edge >= DOCTRINE_PLAY_GAP_PTS;
  });
  qualifying.sort((a, b) => Math.abs(a - lockedTotal) - Math.abs(b - lockedTotal));
  const alt = qualifying[0];
  let action: PriceAction;
  let betTotal: number;
  if (consensusEdge >= DOCTRINE_PLAY_GAP_PTS) {
    action = "PLAY";
    betTotal = args.avgTotal;
  } else if (alt !== undefined && Math.abs(alt - args.avgTotal) > 1e-9) {
    action = "ALT";
    betTotal = alt;
  } else {
    action = "PASS-on-price";
    betTotal = args.avgTotal;
  }
  const edgePts = action === "ALT" && alt !== undefined
    ? (side === "OVER" ? lockedTotal - alt : alt - lockedTotal)
    : consensusEdge;
  const factor: FactorDetail = {
    name: "Price check",
    impact: "neutral",
    weight: 0,
    description:
      `${action}: locked total band center ${lockedTotal.toFixed(2)} ` +
      `(scoreMean ${args.scoreMean.toFixed(2)} is the home-score stub, not the total), ` +
      `market ${args.avgTotal.toFixed(2)}, ${side} edge ${edgePts.toFixed(2)} pts. ` +
      `PLAY requires ${DOCTRINE_PLAY_GAP_PTS} pts.`,
  };
  return { action, edgePts, side, lockedTotal, betTotal, factor };
}

/**
 * The lock has no win probability. Margin points are not converted.
 * Missing input: P(home win) on LockedCoachProjection.
 */
export function priceLockedMoneyline(args: {
  readonly marginMean: number;
  readonly scoreMean: number;
}): { readonly action: "PASS-on-price"; readonly edgePts: null; readonly factor: FactorDetail } {
  const factor: FactorDetail = {
    name: "Price check",
    impact: "neutral",
    weight: 0,
    description:
      `PASS-on-price: locked home margin ${args.marginMean.toFixed(2)}, home score ${args.scoreMean.toFixed(2)}. ` +
      `Gap: LockedCoachProjection has no win probability. Margin points are not converted into one. ` +
      `File: packages/prediction-engine/src/coach-sim/markov-simulator.ts CoachProjection.`,
  };
  return { action: "PASS-on-price", edgePts: null, factor };
}
