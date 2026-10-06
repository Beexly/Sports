
export type ObjectiveVec = readonly number[]; // lower is better on every objective

/** True iff a dominates b (<= everywhere, < somewhere). */
export function dominates(a: ObjectiveVec, b: ObjectiveVec): boolean {
  if (a.length !== b.length) throw new Error("multi-objective-weights: objective dims must match");
  let strict = false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
    if ((a[i] ?? 0) < (b[i] ?? 0)) strict = true;
  }
  return strict;
}

/** Pareto-nondominated subset (indices into the input array). */
export function paretoFrontier(objectives: ReadonlyArray<ObjectiveVec>): number[] {
  const keep: number[] = [];
  for (let i = 0; i < objectives.length; i++) {
    let dominated = false;
    for (let j = 0; j < objectives.length; j++) {
      if (i !== j && dominates(objectives[j] ?? [], objectives[i] ?? [])) {
        dominated = true;
        break;
      }
    }
    if (!dominated) keep.push(i);
  }
  return keep;
}

/**
 * Knee selection on a 2-objective frontier: the point maximizing perpendicular
 * distance from the chord between the two single-objective optima.
 */
export function kneeIndex(objectives2d: ReadonlyArray<readonly [number, number]>): number {
  if (objectives2d.length === 0) throw new Error("multi-objective-weights: need >= 1 point");
  const iA = objectives2d.reduce((bi, p, i) => ((p[0] ?? 0) < (objectives2d[bi]?.[0] ?? Infinity) ? i : bi), 0);
  const iB = objectives2d.reduce((bi, p, i) => ((p[1] ?? 0) < (objectives2d[bi]?.[1] ?? Infinity) ? i : bi), 0);
  const ax = objectives2d[iA]?.[0] ?? 0;
  const ay = objectives2d[iA]?.[1] ?? 0;
  const bx = objectives2d[iB]?.[0] ?? 0;
  const by = objectives2d[iB]?.[1] ?? 0;
  const denom = Math.hypot(bx - ax, by - ay);
  let best = 0;
  let bestD = -Infinity;
  for (let i = 0; i < objectives2d.length; i++) {
    const px = objectives2d[i]?.[0] ?? 0;
    const py = objectives2d[i]?.[1] ?? 0;
    const d = denom < 1e-12 ? 0 : Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / denom;
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
