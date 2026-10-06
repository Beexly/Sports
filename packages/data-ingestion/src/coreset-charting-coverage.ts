/**
 * Active Learning for Convolutional Neural Networks: A Core-Set Approach
 *
 * arXiv:1708.00489v4 · lane:active_learning · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add the core-set coverage layer to the charting/labeling pipeline: pool = season's games,
 * representation = engine's game embedding (final-layer activations before the pick head -- the
 * paper's Delta analog), distance = l2 in that space; k-Center-Greedy (furthest-first) from the
 * already-charted set s^0 with budget b = weekly charting capacity, optional robust-k-center with
 * Xi = 1e-4*n to skip outlier games -- deployed as a pre-filter inside the BADGE/ACS-FW active-
 * learning pipeline, not standalone ('chart a set of games such that every game archetype is
 * within delta of a charted game').
 *
 * ACCEPTANCE GATE: ADOPT as the coverage layer iff k-center-greedy at 20% charting budget beats random at 20%
 * budget by >= 0.005 log-loss on the 2024 holdout.
 *
 * Ingest role: feature builder (k-center-greedy charting coverage layer).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1708.00489v4" as const;
export const LANE = "active_learning" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as the coverage layer iff k-center-greedy at 20% charting budget beats random at 20%
 * budget by >= 0.005 log-loss on the 2024 holdout.`;

export const CONFIG = {
  enabled: false,
  budgetFrac: 0.2,
  robustXi: 1e-4,
  logLossGainThreshold: 0.005,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function l2(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length) return null;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (!Number.isFinite(d)) return null;
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * k-Center-Greedy (furthest-first) from the already-charted set s0.
 * 'Chart a set of games such that every game archetype is within delta of a charted game.'
 */
export function kCenterGreedy(
  points: readonly number[][],
  seeded: readonly number[],
  budget: number,
): number[] {
  const n = points.length;
  if (n === 0 || !Number.isFinite(budget)) return [];
  const selected = new Set<number>();
  for (const s of seeded) if (Number.isInteger(s) && s >= 0 && s < n) selected.add(s);
  if (budget <= 0) return [...selected];
  const b = Math.min(Math.floor(budget), n - selected.size);
  const dim = points[0]?.length ?? 0;
  for (let t = 0; t < b; t++) {
    let best = -1;
    let bestD = -1;
    for (let i = 0; i < n; i++) {
      if (selected.has(i)) continue;
      let dMin = Infinity;
      for (const s of selected) {
        const d = l2(points[i] ?? [], points[s] ?? []);
        if (d === null) {
          dMin = NaN;
          break;
        }
        if (d < dMin) dMin = d;
      }
      if (Number.isNaN(dMin)) continue;
      if (selected.size === 0) dMin = dim > 0 ? 1 : 0;
      if (dMin > bestD) {
        bestD = dMin;
        best = i;
      }
    }
    if (best === -1) break;
    selected.add(best);
  }
  return [...selected];
}

/** Robust k-center: skip the xi*n most outlying candidates (paper's Xi trick). */
export function robustKCenter(
  points: readonly number[][],
  seeded: readonly number[],
  budget: number,
  xi = 1e-4,
): number[] {
  const n = points.length;
  if (n === 0) return [];
  const skip = Math.floor(xi * n);
  if (skip <= 0) return kCenterGreedy(points, seeded, budget);
  const centroid = points[0]?.map((_, j) => points.reduce((a, p) => a + (p[j] ?? 0), 0) / n) ?? [];
  const dist = points.map((p, i) => ({ i, d: l2(p, centroid) ?? Infinity }));
  dist.sort((a, b) => b.d - a.d);
  const skipSet = new Set(dist.slice(0, skip).map((x) => x.i));
  const kept = points.map((p, i) => ({ p, i })).filter((x) => !skipSet.has(x.i));
  const remap = new Map(kept.map((x, k) => [k, x.i]));
  const keptSeeded = seeded.map((s) => kept.findIndex((x) => x.i === s)).filter((s) => s >= 0);
  const sel = kCenterGreedy(kept.map((x) => x.p), keptSeeded, budget);
  return sel.map((k) => remap.get(k) ?? -1).filter((i) => i >= 0);
}

/** Coverage radius: max over pool of distance to nearest selected (the delta). */
export function coverageRadius(points: readonly number[][], selected: readonly number[]): number | null {
  if (points.length === 0 || selected.length === 0) return null;
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    let dMin = Infinity;
    for (const s of selected) {
      const d = l2(points[i] ?? [], points[s] ?? []);
      if (d === null) return null;
      if (d < dMin) dMin = d;
    }
    if (dMin > max) max = dMin;
  }
  return max;
}
