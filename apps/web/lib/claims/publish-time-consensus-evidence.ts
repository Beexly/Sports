/**
 * Public consensus evidence reconstructed from the append-only odds table.
 *
 * The stored pick columns are refreshed during later cycles. The book set below
 * is therefore read at the immutable Pick.generatedAt lock, using the same
 * two-sided priced-market filters as the prediction scorers. Any gap, mismatch,
 * non-book key, or missing source snapshot withholds the public claim.
 */
import { stableBookSetId } from "@/lib/claims/public-consensus-claim";
import { isRealBookmakerKey } from "@sports/prediction-engine";

export type PublicConsensusOddsRow = {
  readonly gameId: string;
  readonly bookmaker: string;
  readonly market: string;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly homeSpreadPrice: number | null;
  readonly awaySpreadPrice: number | null;
  readonly spread: number | null;
  readonly total: number | null;
  readonly overPrice: number | null;
  readonly underPrice: number | null;
  readonly fetchedAt: Date;
};

export type PublicConsensusPickForEvidence = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: "SPREAD" | "MONEYLINE" | "TOTAL";
  readonly generatedAt: Date;
  readonly bookmakerCount: number;
};

export type PublicConsensusSource = {
  readonly sourceId: string;
  readonly provider: string;
  readonly capturedAt: Date;
};

export type PublicConsensusBookSet = {
  readonly books: readonly string[];
  readonly sourceId: string;
  readonly capturedAt: Date;
  readonly bookSetId: string;
};

function priced(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value !== 0;
}

function marketIsUsable(row: PublicConsensusOddsRow, pickType: PublicConsensusPickForEvidence["pickType"]): boolean {
  if (pickType === "MONEYLINE") {
    return row.market === "H2H" && priced(row.homePrice) && priced(row.awayPrice);
  }
  if (pickType === "TOTAL") {
    return row.market === "TOTALS" && priced(row.overPrice) && priced(row.underPrice);
  }
  return row.market === "SPREADS" && row.spread != null && priced(row.homeSpreadPrice) && priced(row.awaySpreadPrice);
}

/** Latest eligible row per real bookmaker at or before the immutable pick lock. */
export function reconstructConsensusBookSet(
  pick: PublicConsensusPickForEvidence,
  rows: readonly PublicConsensusOddsRow[],
  source: PublicConsensusSource,
): PublicConsensusBookSet | null {
  if (!Number.isFinite(pick.generatedAt.getTime())) return null;
  const asOf = pick.generatedAt.getTime();
  const latest = new Map<string, PublicConsensusOddsRow>();
  for (const row of rows) {
    if (row.gameId !== pick.gameId || !marketIsUsable(row, pick.pickType)) continue;
    if (!isRealBookmakerKey(row.bookmaker)) continue;
    const at = row.fetchedAt.getTime();
    if (!Number.isFinite(at) || at > asOf) continue;
    const key = row.bookmaker.trim().toLowerCase();
    const prior = latest.get(key);
    if (prior == null || at > prior.fetchedAt.getTime()) latest.set(key, row);
  }

  const books = [...latest.keys()].sort((a, b) => a.localeCompare(b));
  if (books.length !== pick.bookmakerCount) return null;
  if (Number.isNaN(source.capturedAt.getTime())) return null;

  return {
    books,
    sourceId: source.sourceId,
    capturedAt: source.capturedAt,
    bookSetId: stableBookSetId(source.provider, books),
  };
}
