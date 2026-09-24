/**
 * arXiv 2312.11955v1: Vertical Symbolic Regression
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Implement VSR-PySR: round r runs PySR restricted to growing feature subsets S_1 subset S_2 subset ..., seeding each round's population with the previous round's hall-of-fame; approximate control via residualizing on controlled features' current best form, and observational control by binning controlled variables (down/distance buckets) and fitting reduced forms per bin -- plus regime-vertical SR: run the vertical rounds over game regimes (round 1: neutral-script plays; round 2: +trailing; round 3: +leading), testing whether football relationships are regime-decomposable.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Implement VSR-PySR: round r runs PySR restricted to growing feature subsets S_1 subset S_2 subset ..., seeding each round's population with the previous round's hall-of-fame; approximate control via residualizing on controlled features' current best form, and observational control by binning controlled variables (down/distance buckets) and fitting reduced forms per bin - plus regime-vertical SR: run the vertical rounds over game regimes (round 1: neutral-script plays; round 2: +trailing; round 3: +leading), testing whether football relationships are regime-decomposable.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT vertical staging if VSR-PySR matches or beats horizontal test R^2 with <=50% of the expression length or <=50% of the compute time; REJECT if horizontal wins on both accuracy and simplicity - the oracle-free approximation does not transfer.
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
