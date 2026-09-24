/**
 * arXiv 2006.10782v2: AI Feynman 2.0: Pareto-optimal symbolic regression exploiting graph modularity
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * AI Feynman 2.0 on nflverse team-game data (target points/drive, 8-12 features) complementing PySR, comparing Pareto fronts; the two cheapest ideas ported regardless: (a) hypothesis-testing candidate rejection replacing hard error cutoffs in PySR selection, (b) Pareto-frontier pruning after every merge/generation step; normalizing-flow + SR path to discover a closed form for the distribution of team points per game ('GSE scoring distribution law').
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Install aifeynman and run it on nflverse team-game data (target points/drive, 8-12 features) as a complement to PySR, comparing its Pareto front against PySR's hall-of-fame; port the two cheapest ideas into the GSE pipeline regardless: (a) hypothesis-testing candidate rejection replacing hard error cutoffs in PySR selection, (b) Pareto-frontier pruning after every merge/generation step in any evolutionary search; use the normalizing-flow + SR path to discover a closed-form for the distribution of team points per game ('GSE scoring distribution law').
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the Pareto-pruning + hypothesis-testing rejection port if v2-style selection yields the same top-3 equation families on clean and 5%-noise-corrupted training data (Jaccard >= 0.5 on skeleton sets) while v1-style threshold selection diverges; REJECT if the modularity detector fires on pure-noise features (false-structure test: permuted targets must return only trivial fronts).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: symreg_equation_discovery | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

export interface ParetoPoint {
  error: number;
  complexity: number;
  id: string;
}

/** Pareto frontier (minimize error and complexity). */
export function paretoFrontier(points: ParetoPoint[]): ParetoPoint[] {
  return points.filter((p) =>
    !points.some((q) => q !== p && q.error <= p.error && q.complexity <= p.complexity &&
      (q.error < p.error || q.complexity < p.complexity)),
  );
}

/** Jaccard similarity of two skeleton sets (equation families). */
export function skeletonJaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Paired t-test p-value (normal approx) for hypothesis-testing candidate rejection. */
export function pairedPvalue(a: number[], b: number[]): number {
  const n = a.length;
  const diffs = a.map((v, i) => v - b[i]!);
  const m = diffs.reduce((x, y) => x + y, 0) / n;
  const v = diffs.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, n - 1);
  const t = v <= 0 ? (m < 0 ? -Infinity : m > 0 ? Infinity : 0) : m / Math.sqrt(v / n);
  const p = 2 * (1 - normalCdfF(Math.abs(t)));
  return p;
}

function normalCdfF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Hypothesis-testing rejection: reject candidate if not significantly better. */
export function hypothesisReject(candidateErr: number[], baselineErr: number[], alpha = 0.05): boolean {
  return pairedPvalue(candidateErr, baselineErr) >= alpha;
}

/** Vertical staging: filter hall-of-fame to expressions using only subset features. */
export function verticalFilter(
  hof: { expr: string; features: string[]; error: number }[],
  allowed: Set<string>,
): { expr: string; features: string[]; error: number }[] {
  return hof.filter((e) => e.features.every((f) => allowed.has(f)));
}
