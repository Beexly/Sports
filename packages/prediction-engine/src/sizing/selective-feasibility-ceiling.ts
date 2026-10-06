
/** Mean edge of the top keepFrac of historical edges (the perfect-selector ceiling). */
export function selectiveFeasibilityCeiling(edges: readonly number[], keepFrac: number): number {
  if (edges.length === 0) throw new Error("selective-feasibility-ceiling: need >= 1 edge");
  if (!(keepFrac > 0 && keepFrac <= 1)) throw new Error("selective-feasibility-ceiling: keepFrac in (0,1] required");
  const sorted = [...edges].sort((a, b) => b - a);
  const k = Math.max(1, Math.round(sorted.length * keepFrac));
  const top = sorted.slice(0, k);
  return top.reduce((s, v) => s + v, 0) / top.length;
}

/** Breakeven keep rate: largest keepFrac whose ceiling still clears the hurdle. */
export function breakevenKeepRate(edges: readonly number[], hurdle = 0): number {
  if (edges.length === 0) throw new Error("selective-feasibility-ceiling: need >= 1 edge");
  const sorted = [...edges].sort((a, b) => b - a);
  let acc = 0;
  let best = 0;
  for (let k = 1; k <= sorted.length; k++) {
    acc += sorted[k - 1] ?? 0;
    if (acc / k >= hurdle) best = k / sorted.length;
  }
  return best;
}

/** Volume at the ceiling: how many bets the perfect selector places. */
export function ceilingVolume(n: number, keepFrac: number): number {
  if (!(keepFrac > 0 && keepFrac <= 1)) throw new Error("selective-feasibility-ceiling: keepFrac in (0,1] required");
  return Math.max(1, Math.round(n * keepFrac));
}
