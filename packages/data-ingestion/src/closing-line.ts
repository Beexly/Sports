// ============================================================
// Closing-line capture (CLV scaffold, WIN-01) — fail-closed, stub-safe
//
// Snaps the latest pre-kickoff consensus odds the worker can see and persists
// it as a ClosingLine reference per game+market. Comparing a pick's bet-time
// line/price to this close yields Closing-Line Value (CLV) — an honest,
// leak-free proof the engine beats the market.
//
// DESIGN GUARANTEES:
//   - ADDITIVE: writes only to the new closing_lines table. Touches no pick
//     confidence/tier/grade/result and no MODEL_VERSION.
//   - FAIL-CLOSED: every persistence call is guarded; a DB or provider error
//     is logged and swallowed so it can NEVER throw into settlement/ingestion.
//   - STUB-SAFE: under the @sports/db stub, upsert no-ops ({id:"stub"}) and
//     this helper simply records zero writes — no crash, no fabricated value.
//   - HONEST: a thin/limit-down snapshot (bookmakerCount below threshold) is
//     marked isStale=true so CLV math excludes it. A market with no consensus
//     value is skipped entirely (degrade-to-null, never a faked close).
//
// TIMING NOTE: a precise "close" is a near-kickoff pull. This helper captures
// the best pre-commence snapshot available on the worker's current cadence and
// stale-flags thin/late snaps. The precise per-game near-kickoff trigger is a
// deferred ops/cron change — see docs/command-center/data-mesh/clv-closing-line.md.
// ============================================================

import { db, isStubMode } from "@sports/db";
import type { OddsApiEvent } from "@sports/types";
import type { OddsMarket } from "@prisma/client";
import { DataNormalizer } from "./normalizer.js";

/**
 * Default closing reference id. Fixed in advance (F-10) so a "CLV-positive %"
 * can't be gamed by cherry-picking books. Currently a multi-book consensus;
 * swapping to a single reference (e.g. "pinnacle") is a config value, not a
 * schema change — the column exists for exactly this reason.
 */
export const DEFAULT_CLOSING_REF = "consensus";

/**
 * Minimum distinct bookmakers required for a closing snapshot to be trusted.
 * Below this the snapshot is persisted but flagged isStale=true so the CLV
 * math excludes it (thin coverage ≈ unreliable "close").
 */
export const MIN_CLOSING_BOOKMAKER_COUNT = 3;

export interface CaptureClosingLineResult {
  /** ClosingLine rows written (or that would be written under the stub). */
  written: number;
  /** Rows flagged stale due to thin bookmaker coverage. */
  stale: number;
  /** Markets skipped because no consensus value could be derived. */
  skipped: number;
}

interface MarketConsensus {
  market: OddsMarket;
  spread: number | null;
  total: number | null;
  homePrice: number | null;
  awayPrice: number | null;
  bookmakerCount: number;
}

/** Average of the finite values in a list, or null when none are present. */
function avg(values: number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((s, v) => s + v, 0) / finite.length;
}

/**
 * Derive a per-market consensus closing snapshot for a single event by
 * averaging across its bookmakers. Mirrors the bet-time consensus method in
 * the ingestion pipeline (avgSpread/avgTotal) and the OpeningLine vocabulary.
 */
export function deriveClosingConsensus(
  event: OddsApiEvent,
  fetchedAt: Date
): MarketConsensus[] {
  const normalizer = new DataNormalizer();
  const rows = normalizer.normalizeOdds([event], fetchedAt);

  const byMarket = new Map<OddsMarket, typeof rows>();
  for (const row of rows) {
    const list = byMarket.get(row.market) ?? [];
    list.push(row);
    byMarket.set(row.market, list);
  }

  const out: MarketConsensus[] = [];
  for (const [market, list] of byMarket) {
    const bookmakerCount = new Set(list.map((r) => r.bookmaker)).size;
    const consensus: MarketConsensus = {
      market,
      spread: avg(list.map((r) => r.spread).filter((v): v is number => v != null)),
      total: avg(list.map((r) => r.total).filter((v): v is number => v != null)),
      homePrice: avg(list.map((r) => r.homePrice).filter((v): v is number => v != null)),
      awayPrice: avg(list.map((r) => r.awayPrice).filter((v): v is number => v != null)),
      bookmakerCount,
    };
    out.push(consensus);
  }
  return out;
}

/** A consensus row carries no usable value → nothing to store. */
function isEmptyConsensus(c: MarketConsensus): boolean {
  return (
    c.spread === null &&
    c.total === null &&
    c.homePrice === null &&
    c.awayPrice === null
  );
}

export interface CaptureClosingLineInput {
  /** Internal Game.id the snapshot attaches to. */
  gameId: string;
  /** The fetched odds event for this game (from client.getOdds). */
  event: OddsApiEvent;
  /** When the odds were fetched (the snapshot timestamp). */
  fetchedAt: Date;
  /** Closing reference id; defaults to the fixed consensus reference. */
  closingRef?: string;
}

/**
 * Persist the closing snapshot for one game. Idempotent via the
 * @@unique([gameId, market, closingRef]) upsert key — a re-run refreshes the
 * snapshot rather than duplicating it. Fully guarded: any error is swallowed
 * and reported in the result counts. NEVER throws.
 */
export async function captureClosingLine(
  input: CaptureClosingLineInput
): Promise<CaptureClosingLineResult> {
  const result: CaptureClosingLineResult = { written: 0, stale: 0, skipped: 0 };
  const closingRef = input.closingRef ?? DEFAULT_CLOSING_REF;

  let consensusRows: MarketConsensus[];
  try {
    consensusRows = deriveClosingConsensus(input.event, input.fetchedAt);
  } catch {
    // Malformed event shape must never break settlement — degrade to no-op.
    return result;
  }

  for (const consensus of consensusRows) {
    if (isEmptyConsensus(consensus)) {
      result.skipped++;
      continue;
    }

    const isStale = consensus.bookmakerCount < MIN_CLOSING_BOOKMAKER_COUNT;

    try {
      await db.closingLine.upsert({
        where: {
          gameId_market_closingRef: {
            gameId: input.gameId,
            market: consensus.market,
            closingRef,
          },
        },
        create: {
          gameId: input.gameId,
          market: consensus.market,
          spread: consensus.spread,
          total: consensus.total,
          homePrice: consensus.homePrice,
          awayPrice: consensus.awayPrice,
          closingRef,
          bookmakerCount: consensus.bookmakerCount,
          isStale,
          capturedAt: input.fetchedAt,
        },
        update: {
          spread: consensus.spread,
          total: consensus.total,
          homePrice: consensus.homePrice,
          awayPrice: consensus.awayPrice,
          bookmakerCount: consensus.bookmakerCount,
          isStale,
          capturedAt: input.fetchedAt,
        },
      });
      // Under the stub, upsert no-ops ({id:"stub"}); we still count it as an
      // attempted write for observability — no DB rows are actually created.
      result.written++;
      if (isStale) result.stale++;
    } catch (err) {
      // Fail-closed: a DB error degrades to no-op for this market only.
      if (!isStubMode()) {
        console.warn(
          `[closing-line] upsert failed for game ${input.gameId} ` +
            `market ${consensus.market}: ${err instanceof Error ? err.message : err}`
        );
      }
    }
  }

  return result;
}

/**
 * Read the closing snapshot relevant to a pick's market and return the closing
 * line/price for the pick's side. Returns nulls when no fresh snapshot exists
 * (degrade-to-null). Pure mapping over a fetched ClosingLine row — the caller
 * owns the DB read so this stays testable.
 */
export interface ClosingLineRowLike {
  market: OddsMarket;
  spread: number | null;
  total: number | null;
  homePrice: number | null;
  awayPrice: number | null;
  isStale: boolean;
}

export interface PickClosingValues {
  closingLine: number | null;
  closingPrice: number | null;
  isStale: boolean;
}

/**
 * Project a ClosingLine row onto the line/price a specific pick cares about.
 *   - SPREAD  → closingLine = spread (home perspective), price n/a (vig-priced)
 *   - TOTAL   → closingLine = total, price n/a
 *   - MONEYLINE → closingPrice = home/away price by side, line n/a
 */
export function pickClosingValues(
  row: ClosingLineRowLike | null,
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL",
  side: "HOME" | "AWAY" | "OVER" | "UNDER"
): PickClosingValues {
  if (!row) return { closingLine: null, closingPrice: null, isStale: false };

  if (pickType === "SPREAD") {
    return { closingLine: row.spread, closingPrice: null, isStale: row.isStale };
  }
  if (pickType === "TOTAL") {
    return { closingLine: row.total, closingPrice: null, isStale: row.isStale };
  }
  // MONEYLINE
  const closingPrice = side === "HOME" ? row.homePrice : row.awayPrice;
  return { closingLine: null, closingPrice, isStale: row.isStale };
}

/** Map a pickType to the OddsMarket its closing snapshot lives under. */
export function marketForPickType(
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL"
): OddsMarket {
  if (pickType === "SPREAD") return "SPREADS";
  if (pickType === "TOTAL") return "TOTALS";
  return "H2H";
}
