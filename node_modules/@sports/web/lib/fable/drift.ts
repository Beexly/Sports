export type DistributionBucket = {
  readonly bucket: string;
  readonly baseline: number;
  readonly observed: number;
};

export type DriftStatistic = {
  readonly statistic: number;
  readonly drifted: boolean;
  readonly bucketCount: number;
};

export type ChiSquareDriftStatistic = DriftStatistic & {
  readonly degreesOfFreedom: number;
  readonly criticalValue: number;
};

export const SAFE_FOOTBALL_SEGMENTS = [
  "position",
  "team",
  "home_away",
  "roof",
  "surface",
  "week",
  "season",
  "division",
  "conference",
] as const;

export type SafeFootballSegment = (typeof SAFE_FOOTBALL_SEGMENTS)[number];

export type FootballSegmentParityInput = {
  readonly segment: string;
  readonly group: string;
  readonly value: number;
  readonly sampleSize: number;
};

export type SegmentParityRow = {
  readonly segment: SafeFootballSegment;
  readonly group: string;
  readonly sampleSize: number;
  readonly meanValue: number;
  readonly deltaFromOverall: number;
  readonly flagged: boolean;
};

export type SegmentParityReport =
  | {
      readonly status: "ok";
      readonly overallMean: number;
      readonly rows: readonly SegmentParityRow[];
    }
  | {
      readonly status: "blocked";
      readonly blockedSegments: readonly string[];
      readonly rows: readonly [];
    };

const EPSILON = 1e-9;

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function share(value: number, total: number): number {
  if (total <= 0 || !Number.isFinite(value) || value < 0) return EPSILON;
  return Math.max(value / total, EPSILON);
}

function totals(buckets: readonly DistributionBucket[]): { readonly baseline: number; readonly observed: number } {
  return buckets.reduce(
    (acc, bucket) => ({
      baseline: acc.baseline + Math.max(0, bucket.baseline),
      observed: acc.observed + Math.max(0, bucket.observed),
    }),
    { baseline: 0, observed: 0 }
  );
}

export function computePopulationStabilityIndex(
  buckets: readonly DistributionBucket[],
  threshold = 0.2
): DriftStatistic {
  const total = totals(buckets);
  const statistic = buckets.reduce((sum, bucket) => {
    const baselineShare = share(bucket.baseline, total.baseline);
    const observedShare = share(bucket.observed, total.observed);
    return sum + (observedShare - baselineShare) * Math.log(observedShare / baselineShare);
  }, 0);

  return {
    bucketCount: buckets.length,
    drifted: statistic >= threshold,
    statistic: round(statistic),
  };
}

export function computeKlDivergence(
  buckets: readonly DistributionBucket[],
  threshold = 0.1
): DriftStatistic {
  const total = totals(buckets);
  const statistic = buckets.reduce((sum, bucket) => {
    const baselineShare = share(bucket.baseline, total.baseline);
    const observedShare = share(bucket.observed, total.observed);
    return sum + baselineShare * Math.log(baselineShare / observedShare);
  }, 0);

  return {
    bucketCount: buckets.length,
    drifted: statistic >= threshold,
    statistic: round(statistic),
  };
}

function chiSquareCriticalValue(degreesOfFreedom: number): number {
  const lookup: Record<number, number> = {
    1: 3.8415,
    2: 5.9915,
    3: 7.8147,
    4: 9.4877,
    5: 11.0705,
    6: 12.5916,
    7: 14.0671,
    8: 15.5073,
    9: 16.919,
    10: 18.307,
  } as const;

  return lookup[degreesOfFreedom] ?? degreesOfFreedom + 2 * Math.sqrt(2 * degreesOfFreedom);
}

export function computeChiSquareDrift(
  buckets: readonly DistributionBucket[]
): ChiSquareDriftStatistic {
  const total = totals(buckets);
  const statistic = buckets.reduce((sum, bucket) => {
    const expected = share(bucket.baseline, total.baseline) * total.observed;
    if (expected <= EPSILON) return sum;
    return sum + (bucket.observed - expected) ** 2 / expected;
  }, 0);
  const degreesOfFreedom = Math.max(1, buckets.length - 1);
  const criticalValue = chiSquareCriticalValue(degreesOfFreedom);

  return {
    bucketCount: buckets.length,
    criticalValue: round(criticalValue, 4),
    degreesOfFreedom,
    drifted: statistic >= criticalValue,
    statistic: round(statistic),
  };
}

function isSafeFootballSegment(segment: string): segment is SafeFootballSegment {
  const safeSegments: readonly string[] = SAFE_FOOTBALL_SEGMENTS;
  return safeSegments.includes(segment);
}

export function assessSafeFootballSegmentParity(
  records: readonly FootballSegmentParityInput[],
  maxAbsDelta = 0.05,
  minSampleSize = 20
): SegmentParityReport {
  const blockedSegments = [...new Set(records.map((record) => record.segment).filter((segment) => !isSafeFootballSegment(segment)))];
  if (blockedSegments.length > 0) {
    return { blockedSegments, rows: [], status: "blocked" };
  }

  const usable = records.filter(
    (record) => Number.isFinite(record.value) && record.sampleSize >= minSampleSize
  );
  const totalSample = usable.reduce((sum, record) => sum + record.sampleSize, 0);
  const weightedSum = usable.reduce((sum, record) => sum + record.value * record.sampleSize, 0);
  const overallMean = totalSample > 0 ? weightedSum / totalSample : 0;

  return {
    overallMean: round(overallMean),
    rows: usable.map((record) => {
      const segment = isSafeFootballSegment(record.segment) ? record.segment : "team";
      const deltaFromOverall = record.value - overallMean;
      return {
        deltaFromOverall: round(deltaFromOverall),
        flagged: Math.abs(deltaFromOverall) > maxAbsDelta,
        group: record.group,
        meanValue: round(record.value),
        sampleSize: record.sampleSize,
        segment,
      };
    }),
    status: "ok",
  };
}
