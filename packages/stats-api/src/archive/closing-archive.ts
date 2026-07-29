/**
 * Self-owned closing archive — free CLV later without Odds API spine.
 * Append-only pure engine; persistence is caller's job.
 */

import { selfClvFromArchive, type FormulaResult } from "../formulas/derived.js";

export type QuoteTouch = {
  eventId: string;
  market: string;
  book?: string;
  side: string;
  decimalOdds: number;
  asOf: string;
  source: "gamma" | "own" | "odds_api_optional";
};

export type ClosingArchiveEntry = QuoteTouch & {
  role: "open" | "touch" | "close";
  archivedAt: string;
};

export type ClosingArchive = {
  append(entry: ClosingArchiveEntry): void;
  opens(eventId: string, market: string, side: string): ClosingArchiveEntry | null;
  closes(eventId: string, market: string, side: string): ClosingArchiveEntry | null;
  touches(eventId: string): readonly ClosingArchiveEntry[];
};

export function makeMemoryClosingArchive(): ClosingArchive {
  const rows: ClosingArchiveEntry[] = [];
  return {
    append(entry) {
      if (!Number.isFinite(entry.decimalOdds) || entry.decimalOdds <= 1) {
        throw new Error("refuse archive: invalid decimal odds");
      }
      rows.push({ ...entry });
    },
    opens(eventId, market, side) {
      return (
        rows.find(
          (r) =>
            r.eventId === eventId &&
            r.market === market &&
            r.side === side &&
            r.role === "open",
        ) ?? null
      );
    },
    closes(eventId, market, side) {
      const hits = rows.filter(
        (r) =>
          r.eventId === eventId &&
          r.market === market &&
          r.side === side &&
          (r.role === "close" || r.role === "touch"),
      );
      return hits.length ? hits[hits.length - 1]! : null;
    },
    touches(eventId) {
      return rows.filter((r) => r.eventId === eventId);
    },
  };
}

/** Compute self-CLV from archive open→close; refuse if incomplete. */
export function selfClvFromClosingArchive(
  archive: ClosingArchive,
  eventId: string,
  market: string,
  side: string,
): FormulaResult {
  const open = archive.opens(eventId, market, side);
  const close = archive.closes(eventId, market, side);
  if (!open || !close) {
    return {
      value: NaN,
      formulaId: "derived.self_clv_bps",
      cohort: "own_close_archive",
      n: 0,
      licenseSpdx: "Proprietary-GSE",
      attributionRequired: false,
      ok: false,
      refuseCode: "archive_incomplete",
    };
  }
  return selfClvFromArchive(open.decimalOdds, close.decimalOdds, {
    cohort: `own_close_archive:${eventId}:${market}:${side}`,
  });
}
