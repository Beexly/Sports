
export type MinimizationPoint = readonly number[];

/** True iff a weakly dominates b (minimization) with at least one strict win. */
export function dominates(a: MinimizationPoint, b: MinimizationPoint): boolean {
  if (a.length !== b.length) throw new Error("pareto-nas: points must share dimensionality");
  let strict = false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    if (ai > bi) return false;
    if (ai < bi) strict = true;
  }
  return strict;
}

/** NSGA-II nondominated sort: returns fronts as index lists (front 0 = Pareto front). */
export function nondominatedSort(points: readonly MinimizationPoint[]): number[][] {
  const n = points.length;
  const fronts: number[][] = [];
  const dominatedBy = new Array<number>(n).fill(0);
  const dominatesList: number[][] = Array.from({ length: n }, () => []);
  let front: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (dominates(points[i] ?? [], points[j] ?? [])) dominatesList[i]!.push(j);
      else if (dominates(points[j] ?? [], points[i] ?? [])) dominatedBy[i] = (dominatedBy[i] ?? 0) + 1;
    }
    if (dominatedBy[i] === 0) front.push(i);
  }
  while (front.length > 0) {
    fronts.push(front);
    const next: number[] = [];
    for (const i of front) {
      for (const j of dominatesList[i] ?? []) {
        dominatedBy[j] = (dominatedBy[j] ?? 1) - 1;
        if (dominatedBy[j] === 0) next.push(j);
      }
    }
    front = next;
  }
  return fronts;
}

/**
 * Knee point of a 2-D Pareto front: the front member with max perpendicular distance
 * to the line joining the two extreme points (max log-loss/ECE trade-off curvature).
 * Returns the index into `front`.
 */
export function paretoKnee(front: readonly MinimizationPoint[]): number {
  if (front.length === 0) throw new Error("pareto-nas: empty front");
  if (front.length < 3) return 0;
  const a = front[0] ?? [0, 0];
  const b = front[front.length - 1] ?? [0, 0];
  const dx = (b[0] ?? 0) - (a[0] ?? 0);
  const dy = (b[1] ?? 0) - (a[1] ?? 0);
  const norm = Math.hypot(dx, dy) || 1;
  let best = 0;
  let bestDist = -Infinity;
  for (let i = 0; i < front.length; i++) {
    const p = front[i] ?? [0, 0];
    const dist = Math.abs(dy * ((p[0] ?? 0) - (a[0] ?? 0)) - dx * ((p[1] ?? 0) - (a[1] ?? 0))) / norm;
    if (dist > bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
