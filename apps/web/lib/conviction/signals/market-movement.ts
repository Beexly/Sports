/**
 * Market-movement signal — does the market's own movement since we locked our
 * read AGREE with the side we took?
 *
 * WHY THIS IS THE SHARPEST THING WE ALREADY HAVE. Every other corroborating
 * source is an opinion about the game. This one is money. When a number moves
 * after we post, somebody with a stake moved it, and the direction of that move
 * is independent evidence about our side. The move AGAINST us is the valuable
 * half: the market drifting off our number after we published is the clearest
 * outside signal that we are wrong, and under the gate contract that is a hold.
 *
 * WHAT "TOWARD US" MEANS, market by market. In every case we are asking whether
 * the market came ONTO our side, not whether we would still get a good price:
 *
 *   SPREAD    our side's posted number going DOWN (-3.5 to -4.5, or +7 to +6)
 *             means the market made our team a bigger favourite / smaller dog.
 *             That is the market agreeing with us, and it is a worse price for
 *             a bettor. This is a corroboration signal, not a CLV signal — the
 *             CLV ledger measures the opposite framing and lives elsewhere.
 *   TOTAL     the number moving UP corroborates an OVER, DOWN corroborates an
 *             UNDER.
 *   MONEYLINE our side's implied probability RISING (the price shortening).
 *
 * WHAT IT WILL NOT DO. It returns null — never NEUTRAL — when there is nothing
 * real to read: fewer than two usable snapshots, no side, or prices/lines the
 * archive never captured. A single snapshot is ABSENT DATA, not a flat line,
 * and reading it as "no movement" would manufacture a NEUTRAL vote out of
 * nothing. Absent data is not evidence (gate-contract.ts).
 *
 * HONEST LIMIT ON THE MONEYLINE READ. `MarketSnapshot.price` is one side's
 * posted American price, so it still carries that book's vig; a one-sided quote
 * cannot be de-vigged. We therefore compare like with like — the same side, the
 * same market, earliest capture against latest — and read only the DIRECTION of
 * the change. We never call the result a fair probability, and nothing here
 * feeds scoring or MODEL_VERSION.
 *
 * Source: `odds_line_snapshots` (append-only line archive, written by
 * packages/ingestion-pipeline/src/line-archive.ts). Columns this signal's
 * loader is expected to project: `capturedAt`, `price`, `line`, plus a distinct
 * `book` count per capture.
 */

import { americanToImpliedProbability } from "@sports/prediction-engine";

import type { GateCandidate, SignalRead, SignalFn } from "@/lib/conviction/gate-contract";

export type MarketSnapshot = {
  readonly capturedAt: Date;
  readonly bookmakerCount: number;
  /** American price for our side, when resolvable. */
  readonly price: number | null;
  /** Posted line for our side, when the market has one. */
  readonly line: number | null;
};

export type MarketMovementDeps = {
  readonly loadSnapshots: (gameId: string, pickType: string) => Promise<readonly MarketSnapshot[]>;
};

/**
 * NOISE FLOOR, SPREADS AND TOTALS — half a point.
 *
 * Books post spreads and totals on a half-point grid, so half a point is the
 * smallest tick the market can actually move. Anything strictly inside it is
 * not a move at all: it is two books rounding the same opinion differently, or
 * one book shading juice without touching the number. Movement must EXCEED the
 * floor to count; a move of exactly half a point reads NEUTRAL, because a
 * single tick is where a real move and a re-quote are indistinguishable and the
 * gate should not hold a pick on a coin-flip.
 */
export const POINT_NOISE_FLOOR = 0.5;

/**
 * NOISE FLOOR, MONEYLINES — half a cent of implied probability (0.005).
 *
 * American prices near even money step in 5-cent ticks (-110 to -115 is about
 * 1.1 points of implied probability), so half a cent sits comfortably BELOW one
 * real tick: a genuine single-tick move registers, while rounding, a different
 * book's identical opinion, or a juice-only shade does not. As above, movement
 * must exceed the floor; exactly at it is NEUTRAL.
 */
export const PROBABILITY_NOISE_FLOOR = 0.005;

/** Two usable snapshots is the minimum that can show movement at all. */
export const MIN_SNAPSHOTS = 2;
/** Five or more captures is as complete as this signal's evidence ever gets. */
export const FULL_EVIDENCE_SNAPSHOTS = 5;

/** American prices are discontinuous across ±100; |price| < 100 is not a real quote. */
const MIN_ABS_AMERICAN_PRICE = 100;

export type MovementUnit = "points" | "probability";

export type MarketMovementReading = {
  readonly verdict: "CONFIRMS" | "CONTRADICTS" | "NEUTRAL";
  /** Signed magnitude of the move. Positive = the market came TOWARD our side. */
  readonly towardUs: number;
  readonly unit: MovementUnit;
  /** How many snapshots actually carried a usable number. */
  readonly snapshotsUsed: number;
  /**
   * 0-1, from snapshot count only:
   *   2 -> 0.50, 3 -> 0.67, 4 -> 0.83, 5 or more -> 1.00
   * (linear between the 2-snapshot minimum and the 5-snapshot ceiling).
   */
  readonly completeness: number;
  /** Distinct books behind the LATEST usable capture, as the archive recorded it. */
  readonly bookmakerCount: number;
};

function isUsablePrice(price: number | null): price is number {
  return (
    typeof price === "number" &&
    Number.isFinite(price) &&
    Math.abs(price) >= MIN_ABS_AMERICAN_PRICE
  );
}

function isUsableLine(line: number | null): line is number {
  return typeof line === "number" && Number.isFinite(line);
}

function completenessFor(snapshotsUsed: number): number {
  if (snapshotsUsed <= MIN_SNAPSHOTS) return 0.5;
  if (snapshotsUsed >= FULL_EVIDENCE_SNAPSHOTS) return 1;
  return 0.5 + ((snapshotsUsed - MIN_SNAPSHOTS) * 0.5) / (FULL_EVIDENCE_SNAPSHOTS - MIN_SNAPSHOTS);
}

/** Sort ascending by capture time; equal timestamps keep their given order. */
function chronological(snapshots: readonly MarketSnapshot[]): MarketSnapshot[] {
  return snapshots
    .map((snapshot, index) => ({ snapshot, index }))
    .sort((a, b) => {
      const delta = a.snapshot.capturedAt.getTime() - b.snapshot.capturedAt.getTime();
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((entry) => entry.snapshot);
}

/** Does this side make sense for this market? A mismatch is unreadable, not neutral. */
function sideFitsMarket(pickType: GateCandidate["pickType"], side: NonNullable<GateCandidate["side"]>): boolean {
  if (pickType === "TOTAL") return side === "over" || side === "under";
  return side === "home" || side === "away";
}

/**
 * The pure read: snapshots in, movement out, or null when there is no real
 * movement to read. No I/O, no clock, no database — every input is passed in.
 */
export function readMarketMovement(
  pickType: GateCandidate["pickType"],
  side: GateCandidate["side"],
  snapshots: readonly MarketSnapshot[],
): MarketMovementReading | null {
  if (side === null) return null;
  if (!sideFitsMarket(pickType, side)) return null;

  const usesLine = pickType === "SPREAD" || pickType === "TOTAL";
  const usable = chronological(snapshots).filter((snapshot) =>
    usesLine ? isUsableLine(snapshot.line) : isUsablePrice(snapshot.price),
  );
  if (usable.length < MIN_SNAPSHOTS) return null;

  const first = usable[0];
  const last = usable[usable.length - 1];
  // Length is already checked above; this keeps the narrowing real under
  // noUncheckedIndexedAccess rather than asserting it away.
  if (first === undefined || last === undefined) return null;

  let towardUs: number;
  let unit: MovementUnit;

  if (usesLine) {
    // Guarded by the `usable` filter above; re-checked so the narrowing is real.
    if (!isUsableLine(first.line) || !isUsableLine(last.line)) return null;
    unit = "points";
    if (pickType === "SPREAD") {
      // Our number going DOWN (-3.5 -> -4.5) = the market made our team more of
      // a favourite = the market came toward us.
      towardUs = first.line - last.line;
    } else if (side === "over") {
      towardUs = last.line - first.line;
    } else {
      towardUs = first.line - last.line;
    }
  } else {
    if (!isUsablePrice(first.price) || !isUsablePrice(last.price)) return null;
    unit = "probability";
    // Our side's price shortening = its implied probability rising = toward us.
    towardUs = americanToImpliedProbability(last.price) - americanToImpliedProbability(first.price);
  }

  const floor = unit === "points" ? POINT_NOISE_FLOOR : PROBABILITY_NOISE_FLOOR;
  const verdict =
    towardUs > floor ? "CONFIRMS" : towardUs < -floor ? "CONTRADICTS" : "NEUTRAL";

  return {
    verdict,
    towardUs,
    unit,
    snapshotsUsed: usable.length,
    completeness: completenessFor(usable.length),
    bookmakerCount: last.bookmakerCount,
  };
}

function sideLabel(candidate: GateCandidate): string {
  switch (candidate.side) {
    case "home":
      return candidate.homeTeamName;
    case "away":
      return candidate.awayTeamName;
    case "over":
      return "the over";
    case "under":
      return "the under";
    default:
      return candidate.selection;
  }
}

function trimNumber(value: number, decimals: number): string {
  return Number(value.toFixed(decimals)).toString();
}

function formatPoints(magnitude: number): string {
  const text = trimNumber(magnitude, 2);
  return text === "1" ? "1 point" : `${text} points`;
}

function booksClause(bookmakerCount: number): string {
  if (!Number.isFinite(bookmakerCount) || bookmakerCount < 1) return "";
  return bookmakerCount === 1 ? ", from the one book pricing it" : `, across ${bookmakerCount} books`;
}

export function describeMovement(candidate: GateCandidate, reading: MarketMovementReading): string {
  const who = sideLabel(candidate);
  const books = booksClause(reading.bookmakerCount);
  const magnitude = Math.abs(reading.towardUs);

  if (reading.unit === "points") {
    if (reading.verdict === "CONFIRMS") {
      return `The market has moved ${formatPoints(magnitude)} toward ${who} since we posted this${books}.`;
    }
    if (reading.verdict === "CONTRADICTS") {
      return `The market has moved ${formatPoints(magnitude)} away from ${who} since we posted this${books}.`;
    }
    return `The number on ${who} has not really moved since we posted this${books}.`;
  }

  const swing = trimNumber(magnitude * 100, 1);
  if (reading.verdict === "CONFIRMS") {
    return `The market is coming our way — the price on ${who} has shortened ${swing} points since we posted this${books}.`;
  }
  if (reading.verdict === "CONTRADICTS") {
    return `The market has moved off ${who} — the price has drifted out ${swing} points since we posted this${books}.`;
  }
  return `The price on ${who} has barely moved since we posted this${books}.`;
}

export const MARKET_MOVEMENT_BASIS = "odds_line_snapshots (append-only line archive)";

/**
 * Build the signal. The database read is injected, so this module is unit
 * testable with no database, no network and no clock.
 */
export function createMarketMovementSignal(deps: MarketMovementDeps): SignalFn {
  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    if (candidate.side === null) return null;

    const snapshots = await deps.loadSnapshots(candidate.gameId, candidate.pickType);
    const reading = readMarketMovement(candidate.pickType, candidate.side, snapshots);
    if (reading === null) return null;

    return {
      key: "market-movement",
      verdict: reading.verdict,
      reason: describeMovement(candidate, reading),
      basis: MARKET_MOVEMENT_BASIS,
      completeness: reading.completeness,
    };
  };
}
