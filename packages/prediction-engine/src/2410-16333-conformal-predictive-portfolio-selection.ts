/**
 * arXiv:2410.16333 — Conformal Predictive Portfolio Selection
 *
 * Conformal predictive portfolio selection for DFS: cost-aware high-risk/low-risk rule — select the max
 * upper bound among low-risk candidates after subtracting expected rake and fading high ownership; the
 * paper's sign error is corrected (select max upper, not lowest r).
 *
 * Improvement: Build DFS portfolio selection on conformal predictive intervals with a cost-aware high-risk/low-risk rule: select the maximum upper bound among low-risk candidates after subtracting expected rake and fading high-ownership lineups, correcting the paper's frictionless 3-asset orientation (verified against the sign error in an A/B) before it ever touches real slates.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the corrected rule if it beats projection-maximizing selection on 2024–2025 ROI with statistical significance (paired test over slates); REJECT the paper's as-written orientation if the A/B shows the literal lowest-r version underperforms (confirming the sign error).
 */

/** One DFS portfolio candidate with its conformal interval. */
export interface PortfolioCandidate {
  id: string;
  /** Point projection. */
  proj: number;
  /** Conformal interval half-width. */
  halfWidth: number;
  /** Expected rake cost. */
  rake: number;
  /** Projected ownership (0..1). */
  ownership: number;
}

/** Risk class from interval width relative to projection. */
export function riskClass(c: PortfolioCandidate, widthRatio = 0.25): "low" | "high" {
  if (c.proj <= 0) throw new Error("riskClass: proj > 0");
  return c.halfWidth / c.proj <= widthRatio ? "low" : "high";
}

/**
 * Corrected selection rule: among LOW-risk candidates, pick the maximum
 * upper bound (proj + halfWidth) net of rake and an ownership fade.
 * (The paper's as-written orientation selected the lowest r — the sign error.)
 */
export function selectPortfolio(
  candidates: readonly PortfolioCandidate[],
  ownershipFade = 10,
): PortfolioCandidate {
  const low = candidates.filter((c) => riskClass(c) === "low");
  if (low.length === 0) throw new Error("selectPortfolio: no low-risk candidates");
  let best = low[0]!;
  let bestScore = -Infinity;
  for (const c of low) {
    const score = c.proj + c.halfWidth - c.rake - ownershipFade * c.ownership;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}
