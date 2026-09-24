/**
 * Bounded-abstention pick posting — arXiv 2602.04714
 * ("Bounded-Abstention Multi-horizon Time-series Forecasting").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes the
 * published slate and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: post the weekly picks as a bounded-abstention system —
 * a calibrated coverage quantile over engine edge scores hits the target
 * posting fraction exactly (post the top-c fraction by edge, where the
 * threshold is the (1-c)-quantile of the edge-score distribution), so
 * selective ROI is achieved by construction rather than ad-hoc
 * thresholds. Multi-horizon: one threshold per horizon (this week, rest of
 * month) with the per-horizon budgets summing to the weekly post budget.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff realized posting
 * coverage lands within 0.05 of target c across >=3 consecutive weeks AND
 * selective ROI at that coverage is >= the fixed-threshold baseline.
 */

/**
 * Coverage threshold: the (1 - targetCoverage)-quantile of edge scores;
 * posting everything above it yields exactly the target posting fraction
 * (up to ties).
 */
export function coverageThreshold(
  edgeScores: readonly number[],
  targetCoverage: number,
): number {
  const c = Math.min(Math.max(targetCoverage, 0), 1);
  if (edgeScores.length === 0) return Number.POSITIVE_INFINITY;
  const s = [...edgeScores].sort((a, b) => a - b);
  // Top-c quantile index: floor((1 - c) * n); c = 0 posts nothing.
  const rank = Math.floor((1 - c) * s.length);
  if (rank >= s.length) return Number.POSITIVE_INFINITY;
  return s[rank]!;
}

export interface CandidatePick {
  readonly id: string;
  readonly edge: number;
}

/** Post the candidates at or above the threshold (ties post). */
export function selectPicks(
  candidates: ReadonlyArray<CandidatePick>,
  threshold: number,
): CandidatePick[] {
  return candidates.filter((c) => c.edge >= threshold);
}

/**
 * Split a weekly post budget across horizons: each horizon's threshold is
 * computed on its own edge-score distribution with its budget fraction.
 */
export function horizonThresholds(
  edgesByHorizon: ReadonlyArray<readonly number[]>,
  budgetFractions: readonly number[],
): number[] {
  return edgesByHorizon.map((edges, h) =>
    coverageThreshold(edges, budgetFractions[h] ?? 0),
  );
}

/** Selective ROI of the posted set (mean realized profit per pick). */
export function selectiveRoi(
  posted: ReadonlyArray<CandidatePick>,
  realizedProfit: Readonly<Record<string, number>>,
): number {
  if (posted.length === 0) return 0;
  let s = 0;
  for (const p of posted) s += realizedProfit[p.id] ?? 0;
  return s / posted.length;
}

/** Realized posting coverage vs target (for the gate's 0.05 check). */
export function coverageDeviation(
  postedCount: number,
  candidateCount: number,
  targetCoverage: number,
): number {
  if (candidateCount === 0) return Number.NaN;
  return Math.abs(postedCount / candidateCount - targetCoverage);
}
