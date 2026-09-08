/**
 * The one-word status the independent-edge block wears on a pick card.
 *
 * C-252. The badge used to read "priced into ranking" whenever the card had a
 * finite `rankingP` and a finite `trueProb`. Both are true on every signal-slate
 * row, and a signal-slate row has NO book price at all: the generator sets
 * `marketFairProb: null` on purpose (`generate-signal-slate.ts`, "No book line on
 * pure signal slate - omit market, never invent 0.5") and the rationale printed
 * two lines below the badge says, verbatim, "No book price is attached to this
 * pick." So the card asserted a price and denied one, in the same box.
 *
 * Measured on production 2026-09-08 (read-only SELECT, 14 days of published
 * picks): 428 of 435 published MONEYLINE picks carry an `independentEdge`
 * object, and only 41 of those carry a `marketFairProb` inside it. The
 * contradicting badge was therefore the common case on the moneyline board,
 * not an edge case.
 *
 * "Priced" here has to mean what a customer reads it to mean - a bookmaker's
 * price took part - not the engine's internal sense of "the independent model
 * drove the ranking path" (`ranking-prob.ts`, `priced: source !== "confidence"`).
 * Those are different claims and only one of them is about money.
 *
 * This module decides display text only. It reads no gate, changes no ranking,
 * and moves no number.
 */

/** The three honest states, exactly as rendered. */
export type IndependentEdgeBadge =
  | "priced into ranking"
  | "model signal, no book price"
  | "signal only";

export type IndependentEdgeBadgeInput = {
  /** factorBreakdown.rankingP — the sort probability actually stored. */
  readonly rankingP: number | null;
  /** factorBreakdown.rankingSource — how rankingP was derived. */
  readonly rankingSource: string | null;
  /** independentEdge.trueProb — the blended independent estimate. */
  readonly trueProb: number | null;
  /** independentEdge.marketFairProb — de-vig book fair, null when no real book. */
  readonly marketFairProb: number | null;
};

function finiteUnitOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * "priced into ranking" requires BOTH halves of the claim to hold: independents
 * drove the ranking AND a book price exists for the side. Drop the price and the
 * honest badge names what is left - a model estimate. Drop the ranking role and
 * it is the pre-existing "signal only".
 */
export function independentEdgeRankingBadge(
  input: IndependentEdgeBadgeInput,
): IndependentEdgeBadge {
  // Devin, on this file. The first draft accepted a finite `trueProb` as
  // sufficient evidence that independents drove the ranking. They are not the
  // same claim, and `backfill-independent-trueprob.ts` is the proof: it writes
  // independentEdge.trueProb onto SETTLED picks for calibration and says in its
  // own comment that it deliberately leaves rankingSource and rankingP as
  // published, a confidence echo. A backfilled row therefore has a finite
  // trueProb and a confidence ranking, and the badge would have claimed the
  // estimate drove a ranking it never touched.
  //
  // rankingSource is the field that records what actually drove it, so it is
  // the only field read. `deriveRankingProbability` emits exactly these two
  // values when independents took part; anything else, including an absent
  // source on an old row, falls to "signal only", which is the conservative
  // answer when the claim cannot be established.
  const drivesRanking =
    finiteUnitOrNull(input.rankingP) !== null &&
    (input.rankingSource === "independent_trueProb" ||
      input.rankingSource === "blend_indep_conf");
  if (!drivesRanking) return "signal only";
  return finiteUnitOrNull(input.marketFairProb) !== null
    ? "priced into ranking"
    : "model signal, no book price";
}
