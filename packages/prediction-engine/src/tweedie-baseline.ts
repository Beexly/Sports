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

// Numerical guard on the additive log-link predictor F (mu = exp(F)).
const LOG_LINK_CLAMP = 20;
function clampLogLink(value: number): number {
  return Math.min(LOG_LINK_CLAMP, Math.max(-LOG_LINK_CLAMP, value));
}

/**
 * Gradient-boosted Tweedie baseline (shadow). The boosting loss IS the Tweedie deviance:
 * each round fits a stump to the Tweedie negative-gradient pseudo-residuals under a log link
 *   mu_i = exp(F_i),   grad_i = -y_i * exp((1-p) F_i) + exp((2-p) F_i),
 *   pseudo_i = -grad_i = y_i * exp((1-p) F_i) - exp((2-p) F_i),
 * with power p = `tweediePower` (1 < p < 2; default 1.5). The intercept is the Tweedie MLE
 * constant log(mean(y)). Leaf values use the Newton (second-order) step
 *   leaf = -sum(grad)/(sum(hess)+ridge)
 * so the boosting descends the Tweedie deviance monotonically (a raw mean-of-gradient step on the
 * log link can overshoot/diverge for small p). It is a genuinely Tweedie-fitted GBM but NOT a
 * calibrated GLM with standard errors. It stays priced=false / status="shadow" and is UNVALIDATED
 * on real data: no public surface may call it "calibrated"/"proven" until the backtest + calibration
 * harness prove it out-of-sample. The tests confirm (a) the loss depends on p and (b) the total
 * deviance is non-increasing round-over-round for p in {1.1, 1.5, 1.9}.
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
  const power = Math.min(1.99, Math.max(1.01, options.tweediePower ?? 1.5));
  const y = usable.map((sample) => Math.max(0, sample.actualFantasyPoints));
  const meanY = y.length === 0 ? 0 : y.reduce((sum, value) => sum + value, 0) / y.length;
  // Tweedie MLE constant under the log link: F0 = log(mean(y)).
  const intercept = clampLogLink(Math.log(Math.max(1e-3, meanY)));
  const current = usable.map(() => intercept);
  const stumps: TweedieStump[] = [];

  const RIDGE = 1e-6;
  for (let round = 0; round < rounds; round++) {
    // Tweedie gradient & hessian of the deviance wrt the log-link predictor F (mu = exp(F)), p in (1,2):
    //   grad_i = e^{(2-p)F} - y_i e^{(1-p)F}
    //   hess_i = (2-p) e^{(2-p)F} + (p-1) y_i e^{(1-p)F}   (> 0 for p in (1,2), y >= 0)
    // Split selection fits the negative gradient (pseudo = -grad) by squared error; the LEAF VALUE is
    // the Newton step -sum(grad)/(sum(hess)+ridge). The raw mean-of-gradient step (no hessian) could
    // overshoot and DIVERGE for small p — the Newton step descends the deviance monotonically.
    const grad = new Array<number>(usable.length);
    const hess = new Array<number>(usable.length);
    const pseudo = new Array<number>(usable.length);
    for (let i = 0; i < usable.length; i++) {
      const fc = clampLogLink(current[i]!);
      const a = Math.exp((2 - power) * fc);
      const b = y[i]! * Math.exp((1 - power) * fc);
      grad[i] = a - b;
      hess[i] = (2 - power) * a + (power - 1) * b;
      pseudo[i] = -grad[i]!;
    }

    let bestFeature: string | null = null;
    let bestThreshold = 0;
    let bestLoss = Number.POSITIVE_INFINITY;
    for (const featureId of featureIds) {
      const values = usable.map((sample) => featureValue(sample, featureId));
      for (const threshold of candidateThresholds(values)) {
        let lN = 0, rN = 0, lSum = 0, rSum = 0;
        for (let i = 0; i < values.length; i++) {
          if (values[i]! <= threshold) { lN++; lSum += pseudo[i]!; } else { rN++; rSum += pseudo[i]!; }
        }
        if (lN === 0 || rN === 0) continue;
        const leftMean = lSum / lN;
        const rightMean = rSum / rN;
        let loss = 0;
        for (let i = 0; i < values.length; i++) {
          const adjustment = values[i]! <= threshold ? leftMean : rightMean;
          loss += (pseudo[i]! - adjustment) ** 2;
        }
        if (loss < bestLoss) { bestLoss = loss; bestFeature = featureId; bestThreshold = threshold; }
      }
    }
    if (bestFeature === null) break;

    // Newton leaves for the chosen split (descends the Tweedie deviance, ridge-stabilized).
    let gL = 0, hL = 0, gR = 0, hR = 0;
    for (let i = 0; i < usable.length; i++) {
      if (featureValue(usable[i]!, bestFeature) <= bestThreshold) { gL += grad[i]!; hL += hess[i]!; }
      else { gR += grad[i]!; hR += hess[i]!; }
    }
    const stump: TweedieStump = {
      featureId: bestFeature,
      threshold: bestThreshold,
      leftAdjustment: learningRate * (-gL / (hL + RIDGE)),
      rightAdjustment: learningRate * (-gR / (hR + RIDGE)),
    };
    stumps.push(stump);
    for (let i = 0; i < usable.length; i++) {
      const adjustment =
        featureValue(usable[i]!, stump.featureId) <= stump.threshold
          ? stump.leftAdjustment
          : stump.rightAdjustment;
      current[i] = clampLogLink((current[i] ?? intercept) + adjustment);
    }
  }

  return {
    featureIds,
    intercept: round4(intercept),
    stumps,
    learningRate,
    tweediePower: power,
    trainedSamples: usable.length,
    priced: false,
    status: "shadow",
  };
}

export function predictTweedieFantasyPoints(
  model: TweedieBaselineModel,
  features: Readonly<Record<string, number>>,
): number {
  // Inverse log link: mu = exp(F).
  const score = model.stumps.reduce((sum, stump) => {
    const value = Number.isFinite(features[stump.featureId]) ? features[stump.featureId]! : 0;
    return sum + (value <= stump.threshold ? stump.leftAdjustment : stump.rightAdjustment);
  }, model.intercept);
  return round4(Math.max(0, Math.exp(clampLogLink(score))));
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
