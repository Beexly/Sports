/**
 * C5 board ranking helpers (cat:C5).
 *
 * Sort published picks by EDGE (modelProb − marketImplied), not confidence.
 * Confidence remains score/100 display — never treat it as win%.
 *
 * Partial-rank ties (arxiv 2501.02505 / 2406.19563 spirit): when |edge_i − edge_j|
 * ≤ epsilon, assign the same rank cluster so we do not emit fake 51/49 precision.
 *
 * Advisory humility (arxiv 2311.03490): flag when a probability interval crosses
 * 0.5 or the market implied p. ADVISORY ONLY — does not flip launch gates,
 * MODEL_VERSION, or withhold published rows by itself.
 *
 * Measurement / ordering only. Safe to call from board/signals surfaces.
 */

export const EDGE_TIE_EPSILON = 0.01; // 1pp — documented default for inseparable edges

export type EdgeRankable = {
  readonly id: string;
  /** Model probability for the taken side in [0,1], when known. */
  readonly modelProb: number | null;
  /** Market fair / implied probability for the taken side in [0,1], when known. */
  readonly marketImplied: number | null;
  /** Display confidence score 0–100 (NOT a win%). Fallback only when edge unknown. */
  readonly confidenceScore: number | null;
  /** Optional symmetric half-width for advisory CI (probability points). */
  readonly probHalfWidth?: number | null;
};

export type EdgeRanked<T extends EdgeRankable = EdgeRankable> = T & {
  readonly edge: number | null;
  /** Dense cluster id; equal for tied edges. Lower = better edge rank. */
  readonly rankCluster: number;
  /** Human label when clustered with peers. */
  readonly tieLabel: string | null;
  readonly advisoryCrossesHalf: boolean;
  readonly advisoryCrossesMarket: boolean;
};

export function computeEdge(modelProb: number | null, marketImplied: number | null): number | null {
  if (modelProb == null || marketImplied == null) return null;
  if (!Number.isFinite(modelProb) || !Number.isFinite(marketImplied)) return null;
  return modelProb - marketImplied;
}

export function advisoryFlags(
  modelProb: number | null,
  marketImplied: number | null,
  halfWidth: number | null | undefined,
): { crossesHalf: boolean; crossesMarket: boolean } {
  if (modelProb == null || !Number.isFinite(modelProb)) {
    return { crossesHalf: false, crossesMarket: false };
  }
  const hw = halfWidth != null && Number.isFinite(halfWidth) && halfWidth > 0 ? Math.abs(halfWidth) : null;
  if (hw == null) return { crossesHalf: false, crossesMarket: false };
  const lo = modelProb - hw;
  const hi = modelProb + hw;
  const crossesHalf = lo < 0.5 && hi > 0.5;
  const crossesMarket =
    marketImplied != null &&
    Number.isFinite(marketImplied) &&
    lo < marketImplied &&
    hi > marketImplied;
  return { crossesHalf, crossesMarket };
}

type MutableRanked<T extends EdgeRankable> = T & {
  edge: number | null;
  rankCluster: number;
  tieLabel: string | null;
  advisoryCrossesHalf: boolean;
  advisoryCrossesMarket: boolean;
};

function edgeSortKey(edge: number | null, confidenceScore: number | null, id: string): [number, number, number, string] {
  // Tuple compare: edged rows (0) before edgeless (1); then -edge; then -confidence; then id.
  if (edge != null) return [0, -edge, 0, id];
  const conf = confidenceScore != null && Number.isFinite(confidenceScore) ? confidenceScore : Number.NEGATIVE_INFINITY;
  return [1, 0, -conf, id];
}

function cmpKeys(a: ReturnType<typeof edgeSortKey>, b: ReturnType<typeof edgeSortKey>): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
  if (a[2] !== b[2]) return a[2] < b[2] ? -1 : 1;
  return a[3].localeCompare(b[3]);
}

/**
 * Sort by edge descending (best edge first). Rows without edge fall after edged
 * rows, ordered by confidence score descending as a display fallback only.
 * Then assign partial-rank clusters for inseparable edges.
 *
 * Does not mutate the input array or row objects.
 */
export function rankByEdge<T extends EdgeRankable>(
  rows: readonly T[],
  epsilon: number = EDGE_TIE_EPSILON,
): EdgeRanked<T>[] {
  const eps = Number.isFinite(epsilon) && epsilon >= 0 ? epsilon : EDGE_TIE_EPSILON;

  const enriched: MutableRanked<T>[] = rows.map((r) => {
    const edge = computeEdge(r.modelProb, r.marketImplied);
    const adv = advisoryFlags(r.modelProb, r.marketImplied, r.probHalfWidth);
    return {
      ...r,
      edge,
      rankCluster: 0,
      tieLabel: null,
      advisoryCrossesHalf: adv.crossesHalf,
      advisoryCrossesMarket: adv.crossesMarket,
    };
  });

  enriched.sort((a, b) =>
    cmpKeys(
      edgeSortKey(a.edge, a.confidenceScore, a.id),
      edgeSortKey(b.edge, b.confidenceScore, b.id),
    ),
  );

  // Partial-rank: only cluster consecutive *edged* rows within epsilon.
  // Edgeless rows each get their own cluster (confidence fallback is not a tie claim).
  for (let i = 0; i < enriched.length; i++) {
    const cur = enriched[i]!;
    if (i === 0) {
      cur.rankCluster = 0;
      continue;
    }
    const prev = enriched[i - 1]!;
    const bothEdged = cur.edge != null && prev.edge != null;
    if (bothEdged && Math.abs(prev.edge! - cur.edge!) <= eps) {
      cur.rankCluster = prev.rankCluster;
    } else {
      cur.rankCluster = prev.rankCluster + 1;
    }
  }

  const sizes = new Map<number, number>();
  for (const r of enriched) sizes.set(r.rankCluster, (sizes.get(r.rankCluster) ?? 0) + 1);
  for (const r of enriched) {
    const n = sizes.get(r.rankCluster) ?? 1;
    // Only label multi-member *edged* clusters — never claim a tie on confidence fallback.
    r.tieLabel = n > 1 && r.edge != null ? "too close to call / tied cluster" : null;
  }

  return enriched;
}
