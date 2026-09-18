export interface ConformalProjectionSample {
  readonly sampleId: string;
  readonly season: number;
  readonly week: number;
  readonly position: string;
  readonly predictedMean: number;
  readonly actualFantasyPoints: number;
}

export interface RollingConformalOptions {
  readonly fitWeeks?: number;
  readonly calibrationWeeks?: number;
  readonly targetCoverage?: number;
  readonly learningRate?: number;
}

export interface RollingConformalWindow {
  readonly testWeekKey: string;
  readonly fitWeekKeys: readonly string[];
  readonly calibrationWeekKeys: readonly string[];
  readonly fitSamples: readonly ConformalProjectionSample[];
  readonly calibrationSamples: readonly ConformalProjectionSample[];
  readonly testSamples: readonly ConformalProjectionSample[];
}

export interface MondrianConformalInterval {
  readonly sampleId: string;
  readonly position: string;
  readonly weekKey: string;
  readonly predictedMean: number;
  readonly lower: number;
  readonly upper: number;
  readonly residualQuantile: number;
  readonly alpha: number;
  readonly covered: boolean;
  /**
   * False when the conformal quantile does not exist (empty residuals or
   * ceil((n+1)(1-α)) > n). Infinite intervals are not coverage.
   */
  readonly licensed: boolean;
}

export interface PositionCoverage {
  readonly position: string;
  readonly sampleSize: number;
  readonly coverage: number;
}

export interface RollingConformalReport {
  readonly sampleSize: number;
  readonly targetCoverage: number;
  readonly windows: readonly RollingConformalWindow[];
  readonly intervals: readonly MondrianConformalInterval[];
  readonly coverage: number;
  readonly coverageByPosition: readonly PositionCoverage[];
  readonly licensedCount: number;
  readonly unlicensedCount: number;
  readonly fitCalibrationOverlapViolationCount: number;
  readonly priced: false;
  readonly status: "shadow";
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function weekKey(sample: Pick<ConformalProjectionSample, "season" | "week">): string {
  return `${sample.season}-W${String(sample.week).padStart(2, "0")}`;
}

/**
 * Split-conformal finite-sample quantile: the ceil((n+1) * p)-th order
 * statistic. Fail-closed: empty input or rank > n returns +∞. Clamping the
 * rank to n is fake tightness (the CQR hole).
 */
export function splitConformalQuantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  if (!(probability >= 0 && probability <= 1) || !Number.isFinite(probability)) {
    return Number.POSITIVE_INFINITY;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((sorted.length + 1) * probability);
  if (rank > sorted.length) return Number.POSITIVE_INFINITY;
  if (rank < 1) return Number.NEGATIVE_INFINITY;
  return sorted[rank - 1]!;
}

function quantile(values: readonly number[], probability: number): number {
  return splitConformalQuantile(values, probability);
}

function intervalFromQuantile(
  predictedMean: number,
  residualQuantile: number,
): { readonly lower: number; readonly upper: number; readonly licensed: boolean } {
  if (!Number.isFinite(residualQuantile)) {
    return {
      lower: Number.NEGATIVE_INFINITY,
      upper: Number.POSITIVE_INFINITY,
      licensed: false,
    };
  }
  return {
    lower: Math.max(0, predictedMean - residualQuantile),
    upper: predictedMean + residualQuantile,
    licensed: true,
  };
}

function coverage(samples: readonly { readonly covered: boolean }[]): number {
  if (samples.length === 0) return 0;
  return round4(samples.filter((sample) => sample.covered).length / samples.length);
}

function stateAfterCalibration(
  samples: readonly ConformalProjectionSample[],
  targetCoverage: number,
  learningRate: number,
): ReadonlyMap<string, { readonly alpha: number; readonly residuals: readonly number[] }> {
  const state = new Map<string, { alpha: number; residuals: number[] }>();
  const targetError = 1 - targetCoverage;
  for (const sample of samples) {
    const current = state.get(sample.position) ?? { alpha: targetError, residuals: [] };
    const residualQuantile = quantile(current.residuals, 1 - current.alpha);
    const { lower, upper, licensed } = intervalFromQuantile(sample.predictedMean, residualQuantile);
    const covered =
      licensed && sample.actualFantasyPoints >= lower && sample.actualFantasyPoints <= upper;
    // Unlicensed (infinite) intervals are not a coverage observation. Adapting
    // alpha as a miss drives it toward 0.02, which makes 1-α → 0.98 and the
    // quantile even less likely to exist. Hold alpha until the quantile is finite.
    const miss = covered ? 0 : 1;
    const alpha = licensed
      ? Math.min(0.5, Math.max(0.02, current.alpha + learningRate * (targetError - miss)))
      : current.alpha;
    state.set(sample.position, {
      alpha,
      residuals: [...current.residuals, Math.abs(sample.actualFantasyPoints - sample.predictedMean)],
    });
  }
  return state;
}

export function buildRollingConformalWindows(
  samples: readonly ConformalProjectionSample[],
  options: RollingConformalOptions = {},
): readonly RollingConformalWindow[] {
  const fitWeeks = options.fitWeeks ?? 4;
  const calibrationWeeks = options.calibrationWeeks ?? 2;
  const ordered = [...samples].sort(
    (a, b) => a.season - b.season || a.week - b.week || a.sampleId.localeCompare(b.sampleId),
  );
  const weeks = Array.from(new Set(ordered.map(weekKey))).sort();
  const byWeek = new Map(weeks.map((key) => [key, ordered.filter((sample) => weekKey(sample) === key)]));

  return weeks.slice(fitWeeks + calibrationWeeks).map((testWeekKey, offset) => {
    const testIndex = offset + fitWeeks + calibrationWeeks;
    const fitWeekKeys = weeks.slice(testIndex - calibrationWeeks - fitWeeks, testIndex - calibrationWeeks);
    const calibrationWeekKeys = weeks.slice(testIndex - calibrationWeeks, testIndex);
    return {
      testWeekKey,
      fitWeekKeys,
      calibrationWeekKeys,
      fitSamples: fitWeekKeys.flatMap((key) => byWeek.get(key) ?? []),
      calibrationSamples: calibrationWeekKeys.flatMap((key) => byWeek.get(key) ?? []),
      testSamples: byWeek.get(testWeekKey) ?? [],
    };
  });
}

export function runRollingMondrianConformal(
  samples: readonly ConformalProjectionSample[],
  options: RollingConformalOptions = {},
): RollingConformalReport {
  const targetCoverage = options.targetCoverage ?? 0.8;
  const learningRate = options.learningRate ?? 0.05;
  const windows = buildRollingConformalWindows(samples, options);
  const intervals = windows.flatMap((window) => {
    const state = stateAfterCalibration(window.calibrationSamples, targetCoverage, learningRate);
    return window.testSamples.map((sample) => {
      const current = state.get(sample.position) ?? { alpha: 1 - targetCoverage, residuals: [] };
      const residualQuantile = quantile(current.residuals, 1 - current.alpha);
      const { lower, upper, licensed } = intervalFromQuantile(sample.predictedMean, residualQuantile);
      const covered =
        licensed && sample.actualFantasyPoints >= lower && sample.actualFantasyPoints <= upper;
      return {
        sampleId: sample.sampleId,
        position: sample.position,
        weekKey: weekKey(sample),
        predictedMean: sample.predictedMean,
        lower: licensed ? round4(lower) : Number.NEGATIVE_INFINITY,
        upper: licensed ? round4(upper) : Number.POSITIVE_INFINITY,
        residualQuantile: licensed ? round4(residualQuantile) : Number.POSITIVE_INFINITY,
        alpha: round4(current.alpha),
        covered,
        licensed,
      };
    });
  });
  const positions = Array.from(new Set(intervals.map((interval) => interval.position))).sort();
  const fitCalibrationOverlapViolationCount = windows.filter((window) => {
    const fit = new Set(window.fitWeekKeys);
    return window.calibrationWeekKeys.some((key) => fit.has(key));
  }).length;

  return {
    sampleSize: intervals.length,
    targetCoverage,
    windows,
    intervals,
    coverage: coverage(intervals),
    coverageByPosition: positions.map((position) => {
      const positionIntervals = intervals.filter((interval) => interval.position === position);
      return { position, sampleSize: positionIntervals.length, coverage: coverage(positionIntervals) };
    }),
    licensedCount: intervals.filter((interval) => interval.licensed).length,
    unlicensedCount: intervals.filter((interval) => !interval.licensed).length,
    fitCalibrationOverlapViolationCount,
    priced: false,
    status: "shadow",
  };
}
