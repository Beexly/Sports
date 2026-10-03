/**
 * Never show a customer a bet our own model prices worse than the book.
 *
 * The engine computes, for every book-priced pick, an `independentEdge` whose
 * `expectedClv` is the signed edge of the side we took against the market's
 * own fair price. A NEGATIVE value is the engine saying, in its own numbers,
 * that this side is priced worse than the book is offering.
 *
 * `scoring.ts` has withheld such rows at mint since the PASS-leak fix. That gate
 * is FORWARD-ONLY: it decides what gets created, and it has no reach over rows
 * already in the table. Measured on production 2026-09-13T20:20Z, read-only SQL
 * over published PENDING rows carrying an edge estimate:
 *
 *   published PENDING rows with an edge estimate   71
 *   of those, expectedClv < 0                       9
 *   of those 9, independentEdge.decision = PASS     9   (the predicates agree exactly)
 *   worst                                      -0.1742
 *
 * Nine rows minted before the gate deployed are still on the board, including
 * San Diego Padres -1.5 at -0.0591 and Los Angeles Dodgers -1.5 at -0.1356. A
 * mint-time gate cannot reach them, so the display must.
 *
 * The predicate is IMPORTED, never restated here: `pricesWorseThanMarket` in
 * @sports/types, which the mint gate in scoring.ts imports from the same place.
 * Two gates spelling one rule two ways is exactly how they drift apart, and a
 * drift in this direction publishes a bet we said not to take.
 *
 * It lives in @sports/types rather than in the engine for a concrete reason:
 * nineteen web test files replace @sports/prediction-engine with a partial mock
 * defining only the symbols they need, so importing it from there resolved to
 * undefined under those mocks and collapsed the board lane to empty. That was
 * caught by the board suite before this shipped (10 pre-existing failures went
 * to 15). @sports/types is the boundary both sides already cross intact.
 *
 * Why `expectedClv < 0` and not `decision === "PASS"`: the two select the same
 * nine rows today, but `decision` also carries CONTRADICTS, whose `expectedClv`
 * is legitimately 0.0 rather than negative (the agreement factor zeroes it).
 * Gating on the decision label would drop rows that are not adverse. The signed
 * number is the claim; the label is a summary of it.
 *
 * What this deliberately does NOT do:
 *   - No estimate means NO VOTE. A row without an `independentEdge`, or with a
 *     non-finite `expectedClv`, is silence and is kept. Absence is never read
 *     as disagreement. This is the same asymmetry the conviction gate is built
 *     on, and it must survive every future edit.
 *   - Exactly zero is kept. Zero is "no edge either way", not "adverse".
 *   - It writes NOTHING. `isPublished` is untouched, so a suppressed row still
 *     settles and still counts in the public record, win or lose. This hides a
 *     bet we should not have offered; it does not quietly erase it from our
 *     track record. Retracting a pick from the record would be the dishonest
 *     move and is not what this is.
 *   - It never reorders and never re-scores. The surviving set is a subset.
 *
 * The upstream fix already landed. This is the half that reaches the rows the
 * upstream fix was too late for, and it stays useful afterwards as a display
 * invariant: whatever mints a pick, the board cannot show an adverse one.
 */

import { pricesWorseThanMarket, type IndependentEdgeSummary } from "@sports/types";

/** The shape this rule needs. Callers may carry any other fields alongside. */
export type AdverseEdgeRow = {
  /** Prisma stores the factor breakdown as JSON; shape is validated here, not assumed. */
  readonly factorBreakdown?: unknown;
};

/**
 * Pull the edge summary out of a stored factor breakdown without trusting its
 * shape. A malformed or legacy blob yields null, which is silence, which keeps
 * the row — a parse failure must never be read as a reason to hide a pick.
 */
export function readIndependentEdge(factorBreakdown: unknown): IndependentEdgeSummary | null {
  if (!factorBreakdown || typeof factorBreakdown !== "object") return null;
  const edge = (factorBreakdown as Record<string, unknown>)["independentEdge"];
  if (!edge || typeof edge !== "object") return null;
  const clv = (edge as Record<string, unknown>)["expectedClv"];
  if (typeof clv !== "number" || !Number.isFinite(clv)) return null;
  return edge as IndependentEdgeSummary;
}

/** True when the engine's own estimate prices this side worse than the book. */
export function isAdverseEdgeRow(row: AdverseEdgeRow): boolean {
  return pricesWorseThanMarket(readIndependentEdge(row.factorBreakdown));
}

/**
 * Drop every row the engine prices worse than the market. Order of the
 * survivors is unchanged; nothing is written.
 */
export function dropAdverseEdgePicks<T extends AdverseEdgeRow>(rows: readonly T[]): T[] {
  return rows.filter((row) => !isAdverseEdgeRow(row));
}

/** How many rows the rule removed — for ops counters, never a silent cap. */
export function countAdverseEdgePicks(rows: readonly AdverseEdgeRow[]): number {
  return rows.length - dropAdverseEdgePicks(rows).length;
}
