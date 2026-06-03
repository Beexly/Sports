/**
 * CLV capture — turns the pure CLV primitives (clv.ts) into something gradable
 * against REAL stored data, without any new provider.
 *
 * TWO HALVES:
 *   1. deriveClosingSnapshotFromOdds — the closing line is not a stored marker;
 *      it is the LAST odds snapshot before kickoff. The Odds table is a
 *      timestamped history (one insert per cycle, indexed on fetchedAt), so we
 *      take the most recent batch at/ before commenceTime and average across
 *      books — exactly how the scorer forms its consensus.
 *   2. gradePickClv — given the immutable lock-time line/price we published at
 *      and that closing snapshot, compute Closing-Line Value via clv.ts.
 *
 * Pure, no I/O, fully unit-testable. The settlement pipeline supplies the odds
 * rows and the lock fields; persisting the graded result is its concern.
 *
 * Conventions (match settlement.ts / scoring.ts):
 *   - Spread `line`/`spread` is HOME-perspective (negative = home favored).
 *   - Total is the combined points line.
 *   - Moneyline lock/close are American prices for the chosen side.
 *   - Sign of every CLV value: POSITIVE = beat the close.
 */

import {
  computeMoneylineClv,
  computeSpreadClv,
  computeTotalClv,
  type ClvVerdict,
  type SpreadSide,
  type TotalSide,
} from "./clv.js";

export type PickKind = "SPREAD" | "MONEYLINE" | "TOTAL";

/** Minimal odds-row shape the deriver needs (structurally a DB Odds row). */
export interface ClosingOddsRow {
  readonly market: string; // "H2H" | "SPREADS" | "TOTALS"
  readonly fetchedAt: Date;
  readonly spread: number | null; // home-perspective
  readonly total: number | null;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
}

export interface ClosingSnapshot {
  /** Home-perspective average closing spread; null if unpriced at the close. */
  readonly spreadHome: number | null;
  readonly total: number | null;
  readonly mlHomePrice: number | null; // averaged American, rounded
  readonly mlAwayPrice: number | null;
  /** fetchedAt of the snapshot used as "the close"; null if none before kickoff. */
  readonly capturedAt: Date | null;
  readonly bookmakerCount: number;
}

export type ClvKind = "POINTS" | "PROBABILITY";

export interface ClvGrade {
  readonly kind: ClvKind;
  readonly value: number; // + = beat the close (points for spread/total, prob for ML)
  readonly verdict: ClvVerdict;
  /** Closing number compared against — points for spread/total, null for ML. */
  readonly closeLine: number | null;
  /** Closing American price for the chosen side — set for ML, null otherwise. */
  readonly closePrice: number | null;
}

function avg(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Derive the closing-line snapshot for a game: the most recent odds batch at or
 * before `commenceTime`, averaged across books. Returns an all-null snapshot
 * (capturedAt null) when no odds were recorded before kickoff — in which case we
 * cannot honestly grade CLV.
 */
export function deriveClosingSnapshotFromOdds(
  rows: readonly ClosingOddsRow[],
  commenceTime: Date,
): ClosingSnapshot {
  const cutoff = commenceTime.getTime();
  const eligible = rows.filter(
    (r) => r.fetchedAt instanceof Date && r.fetchedAt.getTime() <= cutoff,
  );

  const empty: ClosingSnapshot = {
    spreadHome: null,
    total: null,
    mlHomePrice: null,
    mlAwayPrice: null,
    capturedAt: null,
    bookmakerCount: 0,
  };
  if (eligible.length === 0) return empty;

  // The close = the single latest batch (max fetchedAt) before kickoff.
  const latestTs = Math.max(...eligible.map((r) => r.fetchedAt.getTime()));
  const closingBatch = eligible.filter((r) => r.fetchedAt.getTime() === latestTs);

  const spreads = closingBatch
    .filter((r) => r.market === "SPREADS" && r.spread != null)
    .map((r) => r.spread as number);
  const totals = closingBatch
    .filter((r) => r.market === "TOTALS" && r.total != null)
    .map((r) => r.total as number);
  const homePrices = closingBatch
    .filter((r) => r.market === "H2H" && r.homePrice != null)
    .map((r) => r.homePrice as number);
  const awayPrices = closingBatch
    .filter((r) => r.market === "H2H" && r.awayPrice != null)
    .map((r) => r.awayPrice as number);

  const mlHome = avg(homePrices);
  const mlAway = avg(awayPrices);

  return {
    spreadHome: avg(spreads),
    total: avg(totals),
    mlHomePrice: mlHome == null ? null : Math.round(mlHome),
    mlAwayPrice: mlAway == null ? null : Math.round(mlAway),
    capturedAt: new Date(latestTs),
    bookmakerCount: closingBatch.length,
  };
}

/**
 * Grade a pick's Closing-Line Value from its immutable lock-time line/price and
 * the derived closing snapshot. Returns null when the close has no comparable
 * number (no coverage of that market at kickoff) — we never invent a close.
 *
 * Side is derived the same way settlement does: SPREAD/MONEYLINE are HOME when
 * the selection names the home team; TOTAL is OVER when the selection starts
 * with "OVER".
 */
export function gradePickClv(args: {
  readonly pickType: PickKind;
  readonly selection: string;
  readonly homeTeamName: string;
  readonly lockLine: number | null; // points (spread/total) we published at
  readonly lockPrice: number | null; // American (moneyline) we published at
  readonly close: ClosingSnapshot;
}): ClvGrade | null {
  const { pickType, selection, homeTeamName, lockLine, lockPrice, close } = args;

  if (pickType === "MONEYLINE") {
    if (lockPrice == null) return null;
    const side: SpreadSide = selection.startsWith(homeTeamName) ? "HOME" : "AWAY";
    const closePrice = side === "HOME" ? close.mlHomePrice : close.mlAwayPrice;
    if (closePrice == null) return null;
    const r = computeMoneylineClv(lockPrice, closePrice);
    return {
      kind: "PROBABILITY",
      value: r.clvProbability,
      verdict: r.verdict,
      closeLine: null,
      closePrice,
    };
  }

  if (pickType === "SPREAD") {
    if (lockLine == null || close.spreadHome == null) return null;
    const side: SpreadSide = selection.startsWith(homeTeamName) ? "HOME" : "AWAY";
    const r = computeSpreadClv(lockLine, close.spreadHome, side);
    return {
      kind: "POINTS",
      value: r.clvPoints,
      verdict: r.verdict,
      closeLine: close.spreadHome,
      closePrice: null,
    };
  }

  // TOTAL
  if (lockLine == null || close.total == null) return null;
  const side: TotalSide = selection.toUpperCase().startsWith("OVER") ? "OVER" : "UNDER";
  const r = computeTotalClv(lockLine, close.total, side);
  return {
    kind: "POINTS",
    value: r.clvPoints,
    verdict: r.verdict,
    closeLine: close.total,
    closePrice: null,
  };
}
