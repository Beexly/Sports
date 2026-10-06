// ============================================================
// Lipschitz-forced selection heads (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2605.02611 — "Selective Prediction from Agreement: A Lipschitz-Consistent Version Space Approach"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: selective prediction from agreement via a
 * Lipschitz-consistent version space — selection heads are
 * spectral-normalized (Lipschitz-forced) and trained on oracle
 * post/don't-post labels from graded picks. A game is in the forced set
 * when the Lipschitz envelope over the slate's game embeddings forces
 * the label: the head's value ± L·distance-to-nearest-labeled-embedding
 * keeps one sign. Bounds tighten with local per-region Lipschitz
 * constants.
 *
 * IMPROVEMENT (from ledger): Replace the empirical-disagreement abstention rule with Lipschitz-forced selection heads (spectral-normalized, trained on oracle post/don't-post labels from graded picks): post only games in the forced set computed from the Lipschitz envelope over the slate's game embeddings, then tighten bounds with local per-region Lipschitz constants.
 *
 * ACCEPTANCE GATE: ADAPT the forcing rule iff forced picks beat the empirical-disagreement baseline by ≥1 selective-ROI point at matched coverage on chronological slate evaluation.
 */

/** Euclidean distance between embedding vectors. */
export function euclid(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]!) ** 2, 0));
}

/**
 * Lipschitz envelope bounds at a query embedding: given labeled
 * (embedding, score) pairs and Lipschitz constant L, the head value at
 * the query lies in [max_i(score_i − L·d_i), min_i(score_i + L·d_i)].
 */
export function lipschitzEnvelope(
  query: number[],
  labeledEmbeddings: number[][],
  labeledScores: number[],
  L: number,
): [number, number] {
  let lo = -Infinity;
  let hi = Infinity;
  for (let i = 0; i < labeledEmbeddings.length; i++) {
    const d = euclid(query, labeledEmbeddings[i]!);
    const s = labeledScores[i]!;
    lo = Math.max(lo, s - L * d);
    hi = Math.min(hi, s + L * d);
  }
  return [lo, hi];
}

/**
 * Forced set membership: the envelope forces "post" (lo > 0), forces
 * "don't post" (hi < 0), or is unforced (straddles 0).
 */
export type ForcedLabel = "post" | "dont-post" | "unforced";

export function forcedLabel(envelope: [number, number]): ForcedLabel {
  if (envelope[0] > 0) return "post";
  if (envelope[1] < 0) return "dont-post";
  return "unforced";
}

/**
 * Local per-region Lipschitz constant: max |score_i − score_j| / d_ij
 * over labeled pairs within the region radius of the query.
 */
export function localLipschitz(
  query: number[],
  labeledEmbeddings: number[][],
  labeledScores: number[],
  regionRadius: number,
  globalL: number,
): number {
  const nearby = labeledEmbeddings
    .map((e, i) => i)
    .filter((i) => euclid(query, labeledEmbeddings[i]!) <= regionRadius);
  let local = 0;
  for (let a = 0; a < nearby.length; a++) {
    for (let b = a + 1; b < nearby.length; b++) {
      const i = nearby[a]!;
      const j = nearby[b]!;
      const d = euclid(labeledEmbeddings[i]!, labeledEmbeddings[j]!);
      if (d > 1e-12) {
        local = Math.max(local, Math.abs(labeledScores[i]! - labeledScores[j]!) / d);
      }
    }
  }
  return Math.min(local > 0 ? local : globalL, globalL);
}

export interface ForcingGate {
  forcedRoi: number;
  baselineRoi: number;
  liftPoints: number;
  coverageMatched: boolean;
  passes: boolean;
}

/**
 * Acceptance-gate helper: forced picks beat the empirical-disagreement
 * baseline by ≥1 selective-ROI point at matched coverage.
 */
export function forcingGatePasses(
  forcedRoi: number,
  baselineRoi: number,
  forcedCoverage: number,
  baselineCoverage: number,
): ForcingGate {
  const liftPoints = (forcedRoi - baselineRoi) * 100;
  const coverageMatched = Math.abs(forcedCoverage - baselineCoverage) <= 0.02;
  return { forcedRoi, baselineRoi, liftPoints, coverageMatched, passes: liftPoints >= 1 && coverageMatched };
}
