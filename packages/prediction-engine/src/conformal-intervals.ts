import {
  EqualizedCoverageManager,
  type PregameFeatures as EqualizedCoveragePregameFeatures,
} from "./calibration/1908-05428-equalized-coverage.js";

export interface ConformalProjectionSample {
  readonly sampleId: string;
  readonly season: number;
  readonly week: number;
  readonly position: string;
  readonly predictedMean: number;
  readonly actualFantasyPoints: number;
  readonly pregameFeatures?: EqualizedCoveragePregameFeatures;
}

export interface RollingConformalOptions {
  readonly fitWeeks?: number;
  readonly calibrationWeeks?: number;
  readonly targetCoverage?: number;
  readonly learningRate?: number;
  readonly equalizedCoverageStrataKeys?: readonly string[];
  readonly equalizedCoverageMinSamples?: number;
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

function quantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Split-conformal finite-sample quantile: use the ceil((n+1) * p)-th order statistic
  // (the (n+1) correction). Without it the residual quantile is systematically too small
  // on small per-position samples, so "calibrated" intervals run narrower than the target
  // coverage. ACI adapts alpha online and partly compensates, but the correction makes the
  // small-sample behavior honest. ceil((n+1)*p) >= ceil(n*p), so intervals only widen.
  const rank = Math.ceil((sorted.length + 1) * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
}

function coverage(samples: readonly { readonly covered: boolean }[]): number {
  if (samples.length === 0) return 0;
  return round4(samples.filter((sample) => sample.covered).length / samples.length);
}

function stateAfterCalibration(
  samples: readonly ConformalProjectionSample[],
  targetCoverage: number,
  learningRate: number,
  options?: RollingConformalOptions,
): {
  readonly alphaByPosition: ReadonlyMap<string, number>;
  readonly equalizedManager: EqualizedCoverageManager;
  readonly residualsByPosition: ReadonlyMap<string, number[]>;
} {
  const alphaByPosition = new Map<string, number>();
  const residualsByPosition = new Map<string, number[]>();
  const targetError = 1 - targetCoverage;

  const equalizedManager = new EqualizedCoverageManager({
    minSamples: options?.equalizedCoverageMinSamples,
    stratumKeys: options?.equalizedCoverageStrataKeys,
  });

  for (const sample of samples) {
    const currentAlpha = alphaByPosition.get(sample.position) ?? targetError;
    const currentResiduals = residualsByPosition.get(sample.position) ?? [];
    const residual = Math.abs(sample.actualFantasyPoints - sample.predictedMean);

    if (sample.pregameFeatures) {
      equalizedManager.add(sample.pregameFeatures, residual);
    }

    const residualQuantile = quantile(currentResiduals, 1 - currentAlpha);
    const lower = Math.max(0, sample.predictedMean - residualQuantile);
    const upper = sample.predictedMean + residualQuantile;
    const covered = sample.actualFantasyPoints >= lower && sample.actualFantasyPoints <= upper;
    const miss = covered ? 0 : 1;
    const nextAlpha = Math.min(0.5, Math.max(0.02, currentAlpha + learningRate * (targetError - miss)));

    alphaByPosition.set(sample.position, nextAlpha);
    residualsByPosition.set(sample.position, [...currentResiduals, residual]);
  }
  return { alphaByPosition, equalizedManager, residualsByPosition };
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
    const { alphaByPosition, equalizedManager, residualsByPosition } = stateAfterCalibration(window.calibrationSamples, targetCoverage, learningRate, options);
    return window.testSamples.map((sample) => {
      const currentAlpha = alphaByPosition.get(sample.position) ?? (1 - targetCoverage);

      let residualQuantile = 0;
      if (sample.pregameFeatures && options.equalizedCoverageStrataKeys) {
        const res = equalizedManager.quantile(sample.pregameFeatures, 1 - currentAlpha);
        residualQuantile = res.quantile;
      } else {
        const currentResiduals = residualsByPosition.get(sample.position) ?? [];
        residualQuantile = quantile(currentResiduals, 1 - currentAlpha);
      }

      const lower = Math.max(0, sample.predictedMean - residualQuantile);
      const upper = sample.predictedMean + residualQuantile;
      return {
        sampleId: sample.sampleId,
        position: sample.position,
        weekKey: weekKey(sample),
        predictedMean: sample.predictedMean,
        lower: round4(lower),
        upper: round4(upper),
        residualQuantile: round4(residualQuantile),
        alpha: round4(currentAlpha),
        covered: sample.actualFantasyPoints >= lower && sample.actualFantasyPoints <= upper,
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
    fitCalibrationOverlapViolationCount,
    priced: false,
    status: "shadow",
  };
}
