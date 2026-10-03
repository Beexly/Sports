import { clarkWestTest, type ClarkWestReport, type ClarkWestSample } from "./projection-evaluation.js";

export interface EnsemblePredictionSample {
  readonly sampleId: string;
  readonly season: number;
  readonly week: number;
  readonly actualFantasyPoints: number;
  readonly marketBaselineFantasyPoints: number;
  readonly modelPredictions: Readonly<Record<string, number>>;
}

export interface EarnedWeightEnsembleOptions {
  readonly learningRate?: number;
  readonly lossCap?: number;
  readonly minOutOfSampleSamples?: number;
  readonly initialWeights?: Readonly<Record<string, number>>;
}

export interface EarnedWeightPrediction {
  readonly sampleId: string;
  readonly weekKey: string;
  readonly actual: number;
  readonly ensemblePrediction: number;
  readonly equalWeightPrediction: number;
  readonly marketPrediction: number;
  readonly weightsBefore: Readonly<Record<string, number>>;
  readonly boundedLosses: Readonly<Record<string, number>>;
}

export interface EarnedWeightPromotionGate {
  readonly beatsEqualWeight: boolean;
  readonly beatsMarket: boolean;
  readonly passes: boolean;
  readonly priced: false;
}

export interface EarnedWeightEnsembleReport {
  readonly sampleSize: number;
  readonly modelIds: readonly string[];
  readonly finalWeights: Readonly<Record<string, number>>;
  readonly ensembleMae: number;
  readonly equalWeightMae: number;
  readonly marketMae: number;
  readonly ensembleVsEqualWeight: ClarkWestReport;
  readonly ensembleVsMarket: ClarkWestReport;
  readonly promotionGate: EarnedWeightPromotionGate;
  readonly predictions: readonly EarnedWeightPrediction[];
  readonly priced: false;
  readonly status: "shadow";
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function toWeekKey(sample: Pick<EnsemblePredictionSample, "season" | "week">): string {
  return `${sample.season}-W${String(sample.week).padStart(2, "0")}`;
}

function activeModelIds(sample: EnsemblePredictionSample): readonly string[] {
  return Object.entries(sample.modelPredictions)
    .filter(([, value]) => Number.isFinite(value))
    .map(([modelId]) => modelId)
    .sort();
}

function normalizeWeights(modelIds: readonly string[], weights: ReadonlyMap<string, number>): Readonly<Record<string, number>> {
  if (modelIds.length === 0) return {};
  const raw = modelIds.map((modelId) => Math.max(0, weights.get(modelId) ?? 1));
  const total = raw.reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    modelIds.map((modelId, index) => [modelId, round4(total > 0 ? raw[index]! / total : 1 / modelIds.length)]),
  );
}

function weightedMean(values: Readonly<Record<string, number>>, weights: Readonly<Record<string, number>>): number {
  return Object.entries(weights).reduce((sum, [modelId, weight]) => sum + (values[modelId] ?? 0) * weight, 0);
}

function mae(values: readonly { readonly actual: number; readonly prediction: number }[]): number {
  if (values.length === 0) return 0;
  return round4(values.reduce((sum, value) => sum + Math.abs(value.actual - value.prediction), 0) / values.length);
}

export function boundedAbsoluteLoss(actual: number, prediction: number, lossCap = 30): number {
  return round4(Math.min(Math.max(0, lossCap), Math.abs(actual - prediction)));
}

export function updateHedgeWeights(
  currentWeights: Readonly<Record<string, number>>,
  boundedLosses: Readonly<Record<string, number>>,
  options: Pick<EarnedWeightEnsembleOptions, "learningRate" | "lossCap"> = {},
): Readonly<Record<string, number>> {
  const learningRate = options.learningRate ?? 0.35;
  const lossCap = Math.max(1e-9, options.lossCap ?? 30);
  const modelIds = Array.from(new Set([...Object.keys(currentWeights), ...Object.keys(boundedLosses)])).sort();
  const updated = new Map<string, number>();
  for (const modelId of modelIds) {
    const prior = Math.max(0, currentWeights[modelId] ?? 1);
    const loss = Math.max(0, boundedLosses[modelId] ?? 0);
    updated.set(modelId, prior * Math.exp(-learningRate * loss / lossCap));
  }
  return normalizeWeights(modelIds, updated);
}

export function runEarnedWeightEnsembleBacktest(
  samples: readonly EnsemblePredictionSample[],
  options: EarnedWeightEnsembleOptions = {},
): EarnedWeightEnsembleReport {
  const learningRate = options.learningRate ?? 0.35;
  const lossCap = options.lossCap ?? 30;
  const minOutOfSampleSamples = options.minOutOfSampleSamples ?? 30;
  const ordered = [...samples].sort(
    (a, b) => a.season - b.season || a.week - b.week || a.sampleId.localeCompare(b.sampleId),
  );
  let globalWeights = new Map(Object.entries(options.initialWeights ?? {}));
  const predictions: EarnedWeightPrediction[] = [];
  const allModelIds = new Set<string>();

  for (const sample of ordered) {
    const modelIds = activeModelIds(sample);
    if (modelIds.length === 0 || !Number.isFinite(sample.actualFantasyPoints)) continue;
    modelIds.forEach((modelId) => allModelIds.add(modelId));
    const weightsBefore = normalizeWeights(modelIds, globalWeights);
    const equalWeightPrediction =
      modelIds.reduce((sum, modelId) => sum + sample.modelPredictions[modelId]!, 0) / modelIds.length;
    const ensemblePrediction = weightedMean(sample.modelPredictions, weightsBefore);
    const boundedLosses = Object.fromEntries(
      modelIds.map((modelId) => [
        modelId,
        boundedAbsoluteLoss(sample.actualFantasyPoints, sample.modelPredictions[modelId]!, lossCap),
      ]),
    );
    predictions.push({
      sampleId: sample.sampleId,
      weekKey: toWeekKey(sample),
      actual: sample.actualFantasyPoints,
      ensemblePrediction: round4(ensemblePrediction),
      equalWeightPrediction: round4(equalWeightPrediction),
      marketPrediction: sample.marketBaselineFantasyPoints,
      weightsBefore,
      boundedLosses,
    });
    const updatedActiveWeights = updateHedgeWeights(weightsBefore, boundedLosses, { learningRate, lossCap });
    globalWeights = new Map([...globalWeights.entries(), ...Object.entries(updatedActiveWeights)]);
  }

  const ensembleVsMarketSamples: ClarkWestSample[] = predictions.map((prediction) => ({
    actual: prediction.actual,
    modelPrediction: prediction.ensemblePrediction,
    marketPrediction: prediction.marketPrediction,
  }));
  const ensembleVsEqualSamples: ClarkWestSample[] = predictions.map((prediction) => ({
    actual: prediction.actual,
    modelPrediction: prediction.ensemblePrediction,
    marketPrediction: prediction.equalWeightPrediction,
  }));
  const ensembleMae = mae(predictions.map((prediction) => ({ actual: prediction.actual, prediction: prediction.ensemblePrediction })));
  const equalWeightMae = mae(predictions.map((prediction) => ({ actual: prediction.actual, prediction: prediction.equalWeightPrediction })));
  const marketMae = mae(predictions.map((prediction) => ({ actual: prediction.actual, prediction: prediction.marketPrediction })));
  const ensembleVsEqualWeight = clarkWestTest(ensembleVsEqualSamples);
  const ensembleVsMarket = clarkWestTest(ensembleVsMarketSamples);
  const beatsEqualWeight =
    predictions.length >= minOutOfSampleSamples && ensembleVsEqualWeight.beatsMarket && ensembleMae < equalWeightMae;
  const beatsMarket =
    predictions.length >= minOutOfSampleSamples && ensembleVsMarket.beatsMarket && ensembleMae < marketMae;

  return {
    sampleSize: predictions.length,
    modelIds: Array.from(allModelIds).sort(),
    finalWeights: normalizeWeights(Array.from(allModelIds).sort(), globalWeights),
    ensembleMae,
    equalWeightMae,
    marketMae,
    ensembleVsEqualWeight,
    ensembleVsMarket,
    promotionGate: { beatsEqualWeight, beatsMarket, passes: beatsEqualWeight && beatsMarket, priced: false },
    predictions,
    priced: false,
    status: "shadow",
  };
}
