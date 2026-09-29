/**
 * Market-free source agreement for the signal (no-book) path.
 *
 * THE DEFECT THIS FIXES. `generate-signal-slate.ts` and
 * `backfill-independent-trueprob.ts` both hand-build the `independentEdge`
 * summary and set
 *
 *     agreement: sources.length >= 2 ? "CONFIRMS" : "SOLO",
 *
 * That is a source COUNT, not an agreement. Two estimators reading the same
 * matchup in OPPOSITE directions are recorded as "CONFIRMS" — corroborated —
 * and `apps/web/lib/pick-explainer/grounding.ts` prints that word to customers
 * in the glass-box explainer. The engine's own referee, `assessEdge`, exists
 * precisely to catch this ("if the exchange sides with the sportsbook, our
 * model is the outlier and we stand down"), but the signal path never calls it
 * because there is no book price to referee against.
 *
 * WHAT THIS IS. The same question `assessEdge` answers — do the independents
 * back the same side? — asked without a market, so a no-book signal path can
 * answer it honestly instead of counting heads.
 *
 * WHAT THIS IS NOT. This is a descriptive correction to a field that is
 * currently false. It changes no probability, no confidence, no decision and no
 * conviction: those are computed elsewhere on this path. Whether a SPLIT should
 * *withhold* a pick is a separate, founder-gated policy question (AGENTS.md
 * "shrink solo-source edges harder", open since 2026-09-13) and is deliberately
 * NOT decided here.
 *
 * Pure, no I/O, fully unit-testable. Every vote is a probability in [0, 1].
 */

/**
 * Distance from an even read a source must clear before its vote counts.
 *
 * A source reading 0.501 has not expressed an opinion; treating it as a vote
 * would let two near-coin-flip readings manufacture corroboration. This is the
 * same band `edge-engine.ts` uses to decide whether an estimator has taken a
 * side, deliberately — one meaning of "has an opinion" across the engine.
 */
export const SOURCE_DIRECTION_EPSILON = 0.005;

/**
 * How the independent estimators relate to each other.
 *
 * Deliberately a subset of `AnchorAgreement`: with no market price there is
 * nothing for a source to *contradict*, only each other, so the honest label
 * for a genuine split is SPLIT and CONTRADICTS is unreachable.
 */
export type SourceAgreement = "CONFIRMS" | "SPLIT" | "SOLO";

/** The one field this reads. Structural, so a plain object literal qualifies. */
export interface AgreementInput {
  /** Independent P(home wins), or null/absent when the source declined. */
  readonly homeFairProb?: number | null;
}

/**
 * Do the independent estimators back the same side?
 *
 * Fail-closed by construction: anything that is not a finite probability in
 * [0, 1] is not a vote — including out-of-domain garbage, which is DROPPED
 * rather than clamped, because clamping a 1.4 into 1.0 would turn a corrupt read
 * into a maximally confident vote. A source inside `SOURCE_DIRECTION_EPSILON`
 * of 0.5 abstains. If nobody votes — or the vote is split — the answer is SPLIT,
 * never CONFIRMS: "we have no corroboration" must never be recorded as "we have
 * corroboration".
 *
 * @param independents sources that did not look at the sportsbook price
 */
export function sourceAgreement(
  independents: readonly AgreementInput[],
): SourceAgreement {
  let home = 0;
  let away = 0;
  for (const e of independents) {
    const p = e?.homeFairProb;
    if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) continue;
    if (Math.abs(p - 0.5) <= SOURCE_DIRECTION_EPSILON) continue; // abstains
    if (p > 0.5) home += 1;
    else away += 1;
  }
  const votes = home + away;
  if (votes === 0) {
    // No usable read at all, or every read sat inside the abstention band.
    // Either way there is nothing corroborating anything.
    return "SPLIT";
  }
  if (home > 0 && away > 0) return "SPLIT";
  // Exactly one source voiced an opinion: nothing cross-checked it. Reporting
  // CONFIRMS here is the bug this module exists to remove.
  if (votes === 1) return "SOLO";
  return "CONFIRMS";
}
