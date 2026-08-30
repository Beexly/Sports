/**
 * Trend discovery — automated cohort analysis over statistical features.
 *
 * The capability the engine was missing: instead of only re-pricing the betting
 * market, mine a body of observations for cohorts whose metric differs from the
 * field by a real, significant margin — e.g. "RB share of team targets when the
 * starting QB is 34+ is +14.7% vs younger QBs (p < 1e-15)". Each observation is
 * a single measured unit (a team-week, a player-game, a matchup) carrying a
 * numeric `metric` and a set of categorical/ordinal `features`. Bucketing rules
 * turn a feature into named cohorts; the engine compares each cohort to its
 * complement and ranks what survives a significance gate by effect size.
 *
 * Pure and deterministic (no RNG, no Date, no I/O) so the same observations
 * always yield the same trends and the maths is unit-testable. This is the
 * discovery layer; wiring a discovered trend into live scoring is a separate,
 * founder-gated MODEL_VERSION step (a trend is a hypothesis until it also beats
 * the close).
 */

export type Observation = {
  /** The thing being measured (e.g. RB target share for this team-week). */
  readonly metric: number;
  /** Categorical/ordinal attributes to cohort on (e.g. { qbAge: 37 }). */
  readonly features: Readonly<Record<string, number | string>>;
};

/** A named cohort defined by a predicate over a feature value. */
export type Bucket = {
  readonly label: string;
  readonly test: (value: number | string | undefined) => boolean;
};

export type TrendConfig = {
  /** Which feature to cohort on. */
  readonly feature: string;
  /** Named buckets over that feature. */
  readonly buckets: readonly Bucket[];
  /** Minimum observations in a cohort (and its complement) to report it. */
  readonly minSampleSize?: number;
  /** Two-sided p-value gate for "significant". Default 0.05. */
  readonly alpha?: number;
};

export type Trend = {
  readonly feature: string;
  readonly cohort: string;
  readonly n: number;
  readonly cohortMean: number;
  /** Mean of everything NOT in the cohort (the field it's measured against). */
  readonly baselineMean: number;
  readonly baselineN: number;
  /** cohortMean - baselineMean. */
  readonly absoluteDelta: number;
  /** absoluteDelta / baselineMean (the "+14.7%" figure). */
  readonly relativeDelta: number;
  /** Welch two-sample z (normal approx; samples are large in practice). */
  readonly z: number;
  readonly pValue: number;
  readonly significant: boolean;
};

const DEFAULT_MIN = 30;
const DEFAULT_ALPHA = 0.05;

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function variance(xs: readonly number[], m: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (xs.length - 1);
}

/** Abramowitz-Stegun erf approximation (max abs error ~1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Two-sided p-value for a z statistic under the normal approximation. */
export function twoSidedP(z: number): number {
  return 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
}

/** Welch comparison of two independent samples (cohort vs baseline). */
export function welchCompare(
  cohort: readonly number[],
  baseline: readonly number[],
): { z: number; pValue: number } {
  if (cohort.length < 2 || baseline.length < 2) return { z: 0, pValue: 1 };
  const mc = mean(cohort);
  const mb = mean(baseline);
  const se = Math.sqrt(variance(cohort, mc) / cohort.length + variance(baseline, mb) / baseline.length);
  if (se === 0) return { z: 0, pValue: 1 };
  const z = (mc - mb) / se;
  return { z, pValue: twoSidedP(z) };
}

/**
 * Discover cohort trends for one feature. Each bucket is compared against every
 * observation NOT in it (its complement), so the delta is "this cohort vs the
 * rest of the field". Results are sorted by |relativeDelta| (largest first).
 */
export function discoverCohortTrends(observations: readonly Observation[], config: TrendConfig): Trend[] {
  const minN = config.minSampleSize ?? DEFAULT_MIN;
  const alpha = config.alpha ?? DEFAULT_ALPHA;
  const trends: Trend[] = [];

  for (const bucket of config.buckets) {
    const inC: number[] = [];
    const out: number[] = [];
    for (const o of observations) {
      const v = o.features[config.feature];
      (bucket.test(v) ? inC : out).push(o.metric);
    }
    if (inC.length < minN || out.length < minN) continue;

    const cohortMean = mean(inC);
    const baselineMean = mean(out);
    const absoluteDelta = cohortMean - baselineMean;
    const relativeDelta = baselineMean === 0 ? 0 : absoluteDelta / baselineMean;
    const { z, pValue } = welchCompare(inC, out);

    trends.push({
      feature: config.feature,
      cohort: bucket.label,
      n: inC.length,
      cohortMean,
      baselineMean,
      baselineN: out.length,
      absoluteDelta,
      relativeDelta,
      z,
      pValue,
      significant: pValue < alpha,
    });
  }

  return trends.sort((a, b) => Math.abs(b.relativeDelta) - Math.abs(a.relativeDelta));
}

/** Convenience: only the cohorts that clear the significance gate. */
export function significantTrends(observations: readonly Observation[], config: TrendConfig): Trend[] {
  return discoverCohortTrends(observations, config).filter((t) => t.significant);
}

/** Numeric range bucket helper, e.g. range("34+", 34) or range("30-33", 30, 33). */
export function range(label: string, min: number, max = Infinity): Bucket {
  return {
    label,
    test: (v) => typeof v === "number" && v >= min && v <= max,
  };
}
