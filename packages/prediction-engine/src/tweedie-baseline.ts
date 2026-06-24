import { clarkWestTest, type ClarkWestReport, type ClarkWestSample } from "./projection-evaluation.js";

export interface TweedieProjectionSample {
  readonly sampleId: string;
  readonly season: number;
  readonly week: number;
  readonly position: string;
  readonly features: Readonly<Record<string, number>>;
  readonly actualFantasyPoints: number;
  readonly marketBaselineFantasyPoints: number;
}

export interface TweedieBaselineOptions {
  readonly clearedFeatureIds?: readonly string[];
  readonly rounds?: number;
  readonly learningRate?: number;
  readonly tweediePower?: number;
}

export interface TweedieStump {
  readonly featureId: string;
  readonly threshold: number;
  readonly leftAdjustment: number;
  readonly rightAdjustment: number;
}

export interface TweedieBaselineModel {
  readonly featureIds: readonly string[];
  readonly intercept: number;
  readonly stumps: readonly TweedieStump[];
  readonly learningRate: number;
  readonly tweediePower: number;
  readonly trainedSamples: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface TemporalProjectionSplit {
  readonly trainWeekKeys: readonly string[];
  readonly testWeekKey: string;
  readonly purgedWeekKeys: readonly string[];
  readonly embargoedWeekKeys: readonly string[];
  readonly trainSamples: readonly TweedieProjectionSample[];
  readonly testSamples: readonly TweedieProjectionSample[];
}

export interface ProjectionSplitOptions {
  readonly minTrainWeeks?: number;
  readonly purgeWeeks?: number;
  readonly embargoWeeks?: number;
}

export interface TweedieBacktestReport {
  readonly sampleSize: number;
  readonly folds: number;
  readonly clarkWest: ClarkWestReport;
  readonly priced: false;
  readonly status: "shadow";
}

export { adaptiveConformalIntervals } from "./tweedie-aci.js";
export type { AciObservation, AciInterval } from "./tweedie-aci.js";
export { clarkWestTest } from "./projection-evaluation.js";
export type { ClarkWestSample, ClarkWestReport } from "./projection-evaluation.js";

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function featureValue(sample: TweedieProjectionSample, featureId: string): number {
  const value = sample.features[featureId];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function weekKey(sample: Pick<TweedieProjectionSample, "season" | "week">): string {
  return `${sample.season}-W${String(sample.week).padStart(2, "0")}`;
}

export function tweedieDeviance(actual: number, predictedMean: number, power = 1.5): number {
  const y = Math.max(0, actual);
  const mu = Math.max(1e-9, predictedMean);
  const p = Math.min(1.99, Math.max(1.01, power));
  const first = y === 0 ? 0 : y ** (2 - p) / ((1 - p) * (2 - p));
  const second = y * mu ** (1 - p) / (1 - p);
  const third = mu ** (2 - p) / (2 - p);
  return round4(2 * (first - second + third));
}

function candidateThresholds(values: readonly number[]): readonly number[] {
  const sorted = Array.from(new Set(values.filter(Number.isFinite))).sort((a, b) => a - b);
  const thresholds: number[] = [];
  for (let i = 1; i < sorted.length; i++) thresholds.push((sorted[i - 1]! + sorted[i]!) / 2);
  return thresholds;
}

/**
 * TRUTH-IN-LABELING (do not remove without wiring the deviance gradient):
 * This is NOT a fitted Tweedie GLM. It is a gradient-boosted-stump baseline that minimizes the
 * L2 loss of `log1p(actualFantasyPoints)` — a Tweedie-FLAVORED scaffold. `tweediePower` is carried
 * on the model and `tweedieDeviance()` exists for scoring, but the boosting loss above does NOT use
 * the Tweedie deviance gradient. Until that gradient is wired into the loss ([DATA] follow-up),
 * no public-facing surface may describe this as a "fitted Tweedie model" / "Tweedie GLM". The
 * export name and any UI/marketing copy must stay honest (e.g. "boosted log1p baseline, shadow").
 */
export function fitTweedieBaseline(
  samples: readonly TweedieProjectionSample[],
  options: TweedieBaselineOptions = {},
): TweedieBaselineModel {
  const usable = samples.filter(
    (sample) =>
      sample.actualFantasyPoints >= 0 &&
      Number.isFinite(sample.actualFantasyPoints) &&
      Number.isFinite(sample.marketBaselineFantasyPoints),
  );
  const featureIds =
    options.clearedFeatureIds ??
    Array.from(new Set(usable.flatMap((sample) => Object.keys(sample.features)))).sort();
  const learningRate = options.learningRate ?? 0.2;
  const rounds = Math.max(0, options.rounds ?? 8);
  const target = usable.map((sample) => Math.log1p(sample.actualFantasyPoints));
  const intercept =
    target.length === 0 ? 0 : target.reduce((sum, value) => sum + value, 0) / target.length;
  const current = usable.map(() => intercept);
  const stumps: TweedieStump[] = [];

  for (let round = 0; round < rounds; round++) {
    let best: TweedieStump | null = null;
    let bestLoss = Number.POSITIVE_INFINITY;
    for (const featureId of featureIds) {
      const values = usable.map((sample) => featureValue(sample, featureId));
      for (const threshold of candidateThresholds(values)) {
        const residuals = target.map((value, index) => value - current[index]!);
        const left = residuals.filter((_, index) => values[index]! <= threshold);
        const right = residuals.filter((_, index) => values[index]! > threshold);
        if (left.length === 0 || right.length === 0) continue;
        const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
        const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
        const loss = residuals.reduce((sum, residual, index) => {
          const adjustment = values[index]! <= threshold ? leftMean : rightMean;
          return sum + (residual - adjustment) ** 2;
        }, 0);
        if (loss < bestLoss) {
          bestLoss = loss;
          best = {
            featureId,
            threshold,
            leftAdjustment: learningRate * leftMean,
            rightAdjustment: learningRate * rightMean,
          };
        }
      }
    }
    if (!best) break;
    stumps.push(best);
    const stump = best;
    usable.forEach((sample, index) => {
      const adjustment =
        featureValue(sample, stump.featureId) <= stump.threshold
          ? stump.leftAdjustment
          : stump.rightAdjustment;
      current[index] = (current[index] ?? intercept) + adjustment;
    });
  }

  return {
    featureIds,
    intercept: round4(intercept),
    stumps,
    learningRate,
    tweediePower: options.tweediePower ?? 1.5,
    trainedSamples: usable.length,
    priced: false,
    status: "shadow",
  };
}

export function predictTweedieFantasyPoints(
  model: TweedieBaselineModel,
  features: Readonly<Record<string, number>>,
): number {
  const score = model.stumps.reduce((sum, stump) => {
    const value = Number.isFinite(features[stump.featureId]) ? features[stump.featureId]! : 0;
    return sum + (value <= stump.threshold ? stump.leftAdjustment : stump.rightAdjustment);
  }, model.intercept);
  return round4(Math.max(0, Math.expm1(score)));
}

export function buildTemporalProjectionSplits(
  samples: readonly TweedieProjectionSample[],
  options: ProjectionSplitOptions = {},
): readonly TemporalProjectionSplit[] {
  const minTrainWeeks = options.minTrainWeeks ?? 2;
  const purgeWeeks = options.purgeWeeks ?? 1;
  const embargoWeeks = options.embargoWeeks ?? 1;
  const weeks = Array.from(new Set(samples.map(weekKey))).sort();
  const byWeek = new Map(weeks.map((key) => [key, samples.filter((sample) => weekKey(sample) === key)]));

  return weeks.slice(minTrainWeeks).map((testWeekKey, offset) => {
    const testIndex = offset + minTrainWeeks;
    const trainWeekKeys = weeks.slice(0, Math.max(0, testIndex - purgeWeeks));
    const purgedWeekKeys = weeks.slice(Math.max(0, testIndex - purgeWeeks), testIndex);
    const embargoedWeekKeys = weeks.slice(testIndex + 1, testIndex + 1 + embargoWeeks);
    return {
      trainWeekKeys,
      testWeekKey,
      purgedWeekKeys,
      embargoedWeekKeys,
      trainSamples: trainWeekKeys.flatMap((key) => byWeek.get(key) ?? []),
      testSamples: byWeek.get(testWeekKey) ?? [],
    };
  });
}

export function runTweedieBaselineBacktest(
  samples: readonly TweedieProjectionSample[],
  options: ProjectionSplitOptions & TweedieBaselineOptions = {},
): TweedieBacktestReport {
  const folds = buildTemporalProjectionSplits(samples, options);
  const scored: ClarkWestSample[] = folds.flatMap((fold) => {
    const model = fitTweedieBaseline(fold.trainSamples, options);
    return fold.testSamples.map((sample) => ({
      actual: sample.actualFantasyPoints,
      modelPrediction: predictTweedieFantasyPoints(model, sample.features),
      marketPrediction: sample.marketBaselineFantasyPoints,
    }));
  });
  return { sampleSize: scored.length, folds: folds.length, clarkWest: clarkWestTest(scored), priced: false, status: "shadow" };
}
