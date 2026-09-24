/**
 * Topological ordering for causal discovery (arXiv 2301.11898v2).
 *
 * DAGuerreotype learns a consensus topological ordering of
 * team-strength indicators, which then constrains downstream
 * NOTEARS/PCMCI+ runs (edges must respect the learned order),
 * shrinking their search space. This module carries the portable
 * ordering machinery: Kendall's tau between learned orderings
 * (stability across season blocks), rank-stability aggregation of
 * per-block orderings, order-respecting edge filtering, and the
 * football-directionality audit.
 *
 * ACCEPTANCE GATE: ADOPT the ordering as a constraint layer iff
 * (a) Kendall's tau >= 0.6 between odd/even-season orderings,
 * (b) order-constrained NOTEARS matches unconstrained Brier within
 * 0.002 while using <= 70% of edges,
 * (c) >= 80% of high-confidence order pairs respect football
 * directionality (pressure before sacks before defensive EPA);
 * REJECT if tau < 0.5.
 *
 * Research-only module. Not wired into any live causal path.
 */

/** Kendall's tau between two total orderings (arrays of indicator ids). */
export function kendallTau(a: readonly string[], b: readonly string[]): number {
  if (a.length !== b.length || a.length < 2) {
    throw new Error("kendallTau: need >= 2 aligned items");
  }
  const rankB = new Map<string, number>();
  b.forEach((id, i) => rankB.set(id, i));
  if (a.some((id) => !rankB.has(id))) throw new Error("kendallTau: mismatched items");
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const ra = (rankB.get(a[i] as string) as number) - (rankB.get(a[j] as string) as number);
      if (ra < 0) concordant++;
      else if (ra > 0) discordant++;
    }
  }
  const total = concordant + discordant;
  return total === 0 ? 1 : (concordant - discordant) / total;
}

export interface OrderPair {
  before: string;
  after: string;
  confidence: number;
}

/**
 * Rank-stability aggregation: average rank per indicator across
 * per-season-block orderings; ties broken by first-seen order.
 */
export function aggregateOrderings(orderings: ReadonlyArray<readonly string[]>): string[] {
  if (orderings.length === 0) throw new Error("aggregateOrderings: no orderings");
  const rankSum = new Map<string, number>();
  const firstSeen: string[] = [];
  for (const ord of orderings) {
    ord.forEach((id, i) => {
      rankSum.set(id, (rankSum.get(id) ?? 0) + i);
      if (!firstSeen.includes(id)) firstSeen.push(id);
    });
  }
  const n = orderings.length;
  return [...firstSeen].sort((x, y) => {
    const dx = (rankSum.get(x) as number) / n - (rankSum.get(y) as number) / n;
    if (Math.abs(dx) > 1e-12) return dx;
    return firstSeen.indexOf(x) - firstSeen.indexOf(y);
  });
}

/**
 * Keep only edges that respect the consensus ordering (parent before
 * child); report the kept-edge fraction for gate (b).
 */
export function constrainEdges(
  edges: ReadonlyArray<{ from: string; to: string }>,
  ordering: readonly string[],
): { kept: Array<{ from: string; to: string }>; keptFraction: number } {
  if (edges.length === 0) return { kept: [], keptFraction: 1 };
  const rank = new Map<string, number>();
  ordering.forEach((id, i) => rank.set(id, i));
  const kept = edges.filter(
    (e) =>
      rank.has(e.from) &&
      rank.has(e.to) &&
      (rank.get(e.from) as number) < (rank.get(e.to) as number),
  );
  return { kept, keptFraction: kept.length / edges.length };
}

/**
 * Football-directionality audit for gate (c): fraction of
 * high-confidence order pairs that respect the expected direction.
 */
export function directionalityAudit(
  pairs: readonly OrderPair[],
  expectedBefore: ReadonlyMap<string, string>, // indicator -> must-come-before indicator
  minConfidence = 0.8,
): { fraction: number; n: number } {
  const hi = pairs.filter((p) => p.confidence >= minConfidence);
  if (hi.length === 0) return { fraction: 1, n: 0 };
  // A pair respects directionality when the expected "must follow"
  // relation is not violated: i.e. if expectedBefore says X must come
  // before Y, a pair (Y before X) violates it.
  let respect = 0;
  for (const p of hi) {
    let violated = false;
    for (const [x, y] of expectedBefore) {
      if (p.before === y && p.after === x) violated = true;
    }
    if (!violated) respect++;
  }
  return { fraction: respect / hi.length, n: hi.length };
}

/** Gate verdict from the three acceptance conditions. */
export function orderingVerdict(
  tauOddEven: number,
  brierGap: number, // |constrained - unconstrained|
  keptFraction: number,
  directionality: number,
): "adopt" | "reject" | "inconclusive" {
  if (tauOddEven < 0.5) return "reject";
  if (
    tauOddEven >= 0.6 &&
    brierGap <= 0.002 &&
    keptFraction <= 0.7 &&
    directionality >= 0.8
  ) {
    return "adopt";
  }
  return "inconclusive";
}
