/**
 * Ensemble independence audit — arXiv 1204.3463
 * ("Effects of Social Influence on the Wisdom of Crowds").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper findings implemented:
 *  - Track a diversity statistic D(t) per slate: 1 minus the mean pairwise
 *    correlation of component forecasts. Flag herding when component
 *    forecasts collapse without backtested error falling.
 *  - Aggregate right-skewed quantities (totals, yards) on the log scale:
 *    the paper's 77.1% vs 21.3% result for geometric-mean aggregation.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT the independence doctrine as a
 * standing ensemble-design rule (cheap, directionally supported). ADAPT the
 * geometric-mean aggregation only if it wins on backtested log-loss for
 * skewed quantities.
 */

/** Pearson correlation of two equal-length vectors. Degenerate-safe. */
export function pearsonCorrelation(
  xs: readonly number[],
  ys: readonly number[],
): number {
  if (xs.length !== ys.length || xs.length === 0) return 0;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 && syy === 0) return 1; // identical constants: perfect agreement
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Diversity statistic D(t) in [0, 2]: 1 minus the mean pairwise correlation
 * of the component forecast vectors (one vector per component, same games).
 * D near 0 means the components herd; D near 1 means pairwise-uncorrelated.
 */
export function diversityStatistic(
  componentForecasts: readonly (readonly number[])[],
): number {
  const m = componentForecasts.length;
  if (m < 2) return 1;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      sum += pearsonCorrelation(componentForecasts[i]!, componentForecasts[j]!);
      pairs++;
    }
  }
  return 1 - sum / pairs;
}

/**
 * Herding flag: true when diversity collapsed (D below threshold) while
 * backtested error did NOT fall (no payoff for the lost independence).
 */
export function herdingFlag(
  diversityNow: number,
  diversityBaseline: number,
  errorNow: number,
  errorBaseline: number,
  collapseThreshold = 0.2,
): boolean {
  return (
    diversityNow < collapseThreshold &&
    diversityNow < diversityBaseline &&
    errorNow >= errorBaseline
  );
}

/**
 * Geometric-mean aggregation for right-skewed quantities (totals, yards):
 * aggregate on the log scale, exponentiate back. All inputs must be > 0.
 */
export function geometricMeanAggregate(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let logSum = 0;
  for (const v of values) {
    if (!(v > 0) || !Number.isFinite(v)) return Number.NaN;
    logSum += Math.log(v);
  }
  return Math.exp(logSum / values.length);
}

/** Shared-input coupling inventory entry for the independence audit. */
export interface CouplingChannel {
  readonly name: string;
  readonly sharedBy: readonly string[];
}

/** Coupling score: fraction of component pairs sharing at least one channel. */
export function couplingScore(
  componentInputs: Readonly<Record<string, readonly string[]>>,
): number {
  const names = Object.keys(componentInputs);
  if (names.length < 2) return 0;
  let coupled = 0;
  let pairs = 0;
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      pairs++;
      const a = new Set(componentInputs[names[i]!]!);
      if (componentInputs[names[j]!]!.some((x) => a.has(x))) coupled++;
    }
  }
  return coupled / pairs;
}
