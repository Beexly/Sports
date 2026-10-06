/**
 * arXiv:2507.13033v1 — (Exhaustive) Symbolic Regression and model selection by minimum description length
 *
 * MDL equation selection for symbolic regression: the minimum description length score L = -loglik + (k/2)
 * log n + structural bits replaces heuristic scores, with an exhaustive pre-screen over precomputed
 * sports-plausible operator sets.
 *
 * Improvement: GSE adopts the MDL formula as its standard equation-selection metric for symbolic regression (replacing PySR's heuristic score), with an exhaustive pre-screen over precomputed sports-plausible operator sets.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if the MDL top-ranked equation beats the incumbent baseline on 2025 held-out log-likelihood by >=0.005 nats/game AND the ranking is stable (top-3 unchanged under 5-fold season-block CV) AND the winner has <=10 terms.
 */

/** A candidate equation for MDL ranking. */
export interface EquationCandidate {
  id: string;
  /** Number of free parameters (terms). */
  k: number;
  /** Operator multiset size (structural complexity in bits-ish units). */
  structBits: number;
  /** Negative log-likelihood on the fit data. */
  nll: number;
}

/**
 * MDL score: nll + (k/2) log n + structBits. Lower is better.
 * n = number of observations the nll was computed on.
 */
export function mdlScore(eq: EquationCandidate, n: number): number {
  if (n <= 1) throw new Error("mdlScore: n > 1");
  if (eq.k < 0) throw new Error("mdlScore: k >= 0");
  return eq.nll + (eq.k / 2) * Math.log(n) + eq.structBits;
}

/** Rank candidates by MDL (ascending); deterministic tie-break on id. */
export function rankByMdl(eqs: readonly EquationCandidate[], n: number): EquationCandidate[] {
  return [...eqs].sort((a, b) => {
    const d = mdlScore(a, n) - mdlScore(b, n);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

/**
 * Exhaustive pre-screen: drop candidates whose operator set is not a subset
 * of a sports-plausible operator set, or with more terms than allowed.
 */
export function prescreen(
  eqs: readonly (EquationCandidate & { ops: readonly string[] })[],
  allowedOps: ReadonlySet<string>,
  maxTerms: number,
): (EquationCandidate & { ops: readonly string[] })[] {
  return eqs.filter(
    (e) => e.k <= maxTerms && e.ops.every((op) => allowedOps.has(op)),
  );
}
