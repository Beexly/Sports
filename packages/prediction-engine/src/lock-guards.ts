/**
 * Lock-capture guards — Phase 3 (proof-engine integrity) of the Finish-Line plan.
 *
 * L-9 measured 909/909 lock prices with no matching odds-batch rows, i.e. every
 * lock appeared model-derived. Before any lock is graded/published as "proven",
 * its capture must be internally consistent:
 *
 *   1. SPREAD sign vs published side — a negative consensus spread means the home
 *      team is favored (home side). If the lock's chosen side contradicts the sign
 *      of its own spread, the capture is self-inconsistent and must be quarantined,
 *      not graded (a sign flip would mint a fabricated, wrong-sided lock).
 *   2. ML price plausibility — an American moneyline price must live in
 *      [-10000, +10000] and not be 0. A price of -50000 or 0 is a data error that
 *      would devig to a degenerate probability.
 *
 * This module is PURE. It quarantines bad rows by dropping them from the graded
 * set (never silently grading a contradictory capture). No gate is flipped and no
 * schema field is added — "quarantine" here means the row does not enter scoring.
 */

/** A minimal structural view of a bookmaker odds row (decoupled from the full type). */
export interface CaptureOddsRow {
  readonly bookmaker: string;
  readonly market: "H2H" | "SPREADS" | "TOTALS";
  readonly homePrice?: number;
  readonly awayPrice?: number;
  readonly homeSpreadPrice?: number;
  readonly awaySpreadPrice?: number;
  /** Consensus/derived spread sign for this game (negative = home favored). */
  readonly spread?: number;
}

export interface QuarantineVerdict {
  readonly ok: boolean;
  /** Reason the row was quarantined (empty when ok). */
  readonly reason: string;
}

const MIN_AMERICAN = -10_000;
const MAX_AMERICAN = 10_000;

/** An American price is plausible when it is finite, non-zero, and in range. */
export function plausibleAmericanPrice(price: number | undefined): boolean {
  if (price === undefined) return false;
  if (!Number.isFinite(price)) return false;
  if (price === 0) return false;
  return price >= MIN_AMERICAN && price <= MAX_AMERICAN;
}

/**
 * SPREAD sign vs published side. `selectionIsHomeSide` is the lock's chosen side.
 * A negative spread => home favored => the home side is the favorite. If the lock
 * picks the home side while the spread says home is the underdog (spread > 0), or
 * vice versa, the capture is self-contradictory.
 */
export function spreadSignConsistent(
  spread: number | undefined,
  selectionIsHomeSide: boolean,
): QuarantineVerdict {
  if (spread === undefined) return { ok: true, reason: "" };
  const homeFavored = spread < 0;
  if (homeFavored === selectionIsHomeSide) return { ok: true, reason: "" };
  return {
    ok: false,
    reason: `spread sign ${spread} implies home ${homeFavored ? "favored" : "underdog"} but lock selected home=${selectionIsHomeSide}`,
  };
}

/** Validate a single capture row; returns quarantine verdict (ok / reason). */
export function guardCaptureRow(
  row: CaptureOddsRow,
  selectionIsHomeSide: boolean,
): QuarantineVerdict {
  if (row.market === "SPREADS") {
    const verdict = spreadSignConsistent(row.spread, selectionIsHomeSide);
    if (!verdict.ok) return verdict;
    if (!plausibleAmericanPrice(row.homeSpreadPrice)) {
      return { ok: false, reason: `implausible home spread price ${row.homeSpreadPrice}` };
    }
    if (!plausibleAmericanPrice(row.awaySpreadPrice)) {
      return { ok: false, reason: `implausible away spread price ${row.awaySpreadPrice}` };
    }
    return { ok: true, reason: "" };
  }
  if (row.market === "H2H") {
    if (!plausibleAmericanPrice(row.homePrice)) {
      return { ok: false, reason: `implausible home ML price ${row.homePrice}` };
    }
    if (!plausibleAmericanPrice(row.awayPrice)) {
      return { ok: false, reason: `implausible away ML price ${row.awayPrice}` };
    }
    return { ok: true, reason: "" };
  }
  return { ok: true, reason: "" };
}

export interface CaptureGuardResult<T extends CaptureOddsRow> {
  readonly kept: T[];
  readonly quarantined: Array<{ row: T; reason: string }>;
}

/**
 * Filter a capture: keep rows that pass both guards, quarantine the rest.
 * `selectionIsHomeSideFor` maps a row to the lock's chosen side.
 */
export function guardCapture<T extends CaptureOddsRow>(
  rows: T[],
  selectionIsHomeSideFor: (row: T) => boolean,
): CaptureGuardResult<T> {
  const kept: T[] = [];
  const quarantined: Array<{ row: T; reason: string }> = [];
  for (const row of rows) {
    const verdict = guardCaptureRow(row, selectionIsHomeSideFor(row));
    if (verdict.ok) kept.push(row);
    else quarantined.push({ row, reason: verdict.reason });
  }
  return { kept, quarantined };
}
