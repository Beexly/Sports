
/** James-Stein shrinkage of noisy edge estimates toward their mean. */
export function shrinkEdges(edges: readonly number[], ses: readonly number[]): number[] {
  if (edges.length !== ses.length || edges.length < 4) {
    throw new Error("shrinkage-kelly: need >= 4 aligned edges (James-Stein requires p>=3, use 4+)");
  }
  const mean = edges.reduce((s, v) => s + v, 0) / edges.length;
  const p = edges.length;
  let sse = 0;
  for (let i = 0; i < p; i++) {
    const se = Math.max(ses[i] ?? 0, 1e-9);
    sse += ((edges[i] ?? 0) - mean) ** 2 / se ** 2;
  }
  const factor = Math.max(0, 1 - (p - 2) / Math.max(sse, 1e-12));
  return edges.map((e) => mean + factor * (e - mean));
}

/** Edge-implied win prob from decimal odds: p = 1/odds + edge. */
export function edgeToProb(odds: number, edge: number): number {
  if (!(odds > 1)) throw new Error("shrinkage-kelly: odds must exceed 1");
  return Math.min(Math.max(1 / odds + edge, 1e-6), 1 - 1e-6);
}

/** Kelly stake from a (possibly shrunk) edge. */
export function shrinkageKellyStake(edge: number, odds: number, kellyMultiple = 0.5, cap = 0.05): number {
  const p = edgeToProb(odds, edge);
  const b = odds - 1;
  const f = Math.max(0, (b * p - (1 - p)) / b);
  return Math.min(f * kellyMultiple, cap);
}

/** Full pipeline: shrink edges, then stake on the shrunk edges. */
export function shrinkageKellyStakes(
  edges: readonly number[],
  ses: readonly number[],
  odds: readonly number[],
  kellyMultiple = 0.5,
): number[] {
  if (edges.length !== odds.length) throw new Error("shrinkage-kelly: edges/odds must align");
  const shrunk = shrinkEdges(edges, ses);
  return shrunk.map((e, i) => shrinkageKellyStake(e, odds[i] ?? 2, kellyMultiple));
}
