export const DEFAULT_PLAYER_RATE_SHRINKAGE_K = 12;

export type PlayerRatePosteriorFamily = "beta-binomial" | "normal-normal";

export interface PlayerRatePrior {
  readonly mean: number;
  readonly sampleSize: number;
  readonly source: "empirical-bayes-peer-pool" | "position-prior" | "manual-prior";
}

export interface EmpiricalBayesRateObservation {
  readonly value: number;
  readonly sampleSize: number;
}

export interface EmpiricalBayesPriorOptions {
  readonly fallbackMean: number;
  readonly shrinkageK?: number;
  readonly source?: PlayerRatePrior["source"];
  readonly boundedRate?: boolean;
}

export interface BetaBinomialPosteriorInput {
  readonly playerId: string;
  readonly metricId: string;
  readonly successes: number;
  readonly trials: number;
  readonly prior: PlayerRatePrior;
}

export interface NormalNormalPosteriorInput {
  readonly playerId: string;
  readonly metricId: string;
  readonly sampleMean: number;
  readonly sampleSize: number;
  readonly prior: PlayerRatePrior;
  readonly observationVariance?: number;
}

export interface PlayerRatePosterior {
  readonly playerId: string;
  readonly metricId: string;
  readonly family: PlayerRatePosteriorFamily;
  readonly sampleSize: number;
  readonly observedMean: number;
  readonly unshrunkMean: number;
  readonly priorMean: number;
  readonly shrinkageK: number;
  readonly shrinkageWeight: number;
  readonly posteriorMean: number;
  readonly posteriorVariance?: number;
  readonly alpha?: number;
  readonly beta?: number;
  readonly priced: false;
  readonly status: "shadow";
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function playerRateShrinkageWeight(sampleSize: number, shrinkageK: number): number {
  const n = Math.max(0, sampleSize);
  const k = Math.max(0, shrinkageK);
  if (n + k === 0) return 0;
  return round4(n / (n + k));
}

export function buildEmpiricalBayesRatePrior(
  observations: readonly EmpiricalBayesRateObservation[],
  options: EmpiricalBayesPriorOptions,
): PlayerRatePrior {
  const usable = observations.filter(
    (observation) =>
      observation.sampleSize > 0 &&
      Number.isFinite(observation.sampleSize) &&
      Number.isFinite(observation.value),
  );
  const k = Math.max(0, options.shrinkageK ?? DEFAULT_PLAYER_RATE_SHRINKAGE_K);

  if (usable.length === 0) {
    return {
      mean: round4(options.boundedRate === true ? clamp01(options.fallbackMean) : options.fallbackMean),
      sampleSize: k,
      source: options.source ?? "empirical-bayes-peer-pool",
    };
  }

  const sampleTotal = usable.reduce((sum, observation) => sum + observation.sampleSize, 0);
  const weightedMean =
    usable.reduce((sum, observation) => sum + observation.value * observation.sampleSize, 0) /
    sampleTotal;

  return {
    mean: round4(options.boundedRate === true ? clamp01(weightedMean) : weightedMean),
    sampleSize: k,
    source: options.source ?? "empirical-bayes-peer-pool",
  };
}

export function estimateBetaBinomialRatePosterior(
  input: BetaBinomialPosteriorInput,
): PlayerRatePosterior {
  const sampleSize = Math.max(0, input.trials);
  const successes = Math.min(sampleSize, Math.max(0, input.successes));
  const priorMean = clamp01(input.prior.mean);
  const shrinkageK = Math.max(0, input.prior.sampleSize);
  const observedMean = sampleSize === 0 ? priorMean : successes / sampleSize;
  const alpha = successes + priorMean * shrinkageK;
  const beta = sampleSize - successes + (1 - priorMean) * shrinkageK;
  const posteriorMean = alpha + beta === 0 ? priorMean : alpha / (alpha + beta);

  return {
    playerId: input.playerId,
    metricId: input.metricId,
    family: "beta-binomial",
    sampleSize,
    observedMean: round4(observedMean),
    unshrunkMean: round4(observedMean),
    priorMean: round4(priorMean),
    shrinkageK,
    shrinkageWeight: playerRateShrinkageWeight(sampleSize, shrinkageK),
    posteriorMean: round4(posteriorMean),
    alpha: round4(alpha),
    beta: round4(beta),
    priced: false,
    status: "shadow",
  };
}

export function estimateNormalNormalRatePosterior(
  input: NormalNormalPosteriorInput,
): PlayerRatePosterior {
  const sampleSize = Math.max(0, input.sampleSize);
  const priorMean = input.prior.mean;
  const shrinkageK = Math.max(0, input.prior.sampleSize);
  const observedMean = sampleSize === 0 ? priorMean : input.sampleMean;
  const weight = playerRateShrinkageWeight(sampleSize, shrinkageK);
  const posteriorMean = weight * observedMean + (1 - weight) * priorMean;
  const observationVariance = Math.max(0, input.observationVariance ?? 1);
  const posteriorDenominator = sampleSize + shrinkageK;

  return {
    playerId: input.playerId,
    metricId: input.metricId,
    family: "normal-normal",
    sampleSize,
    observedMean: round4(observedMean),
    unshrunkMean: round4(observedMean),
    priorMean: round4(priorMean),
    shrinkageK,
    shrinkageWeight: weight,
    posteriorMean: round4(posteriorMean),
    posteriorVariance:
      posteriorDenominator === 0 ? 0 : round4(observationVariance / posteriorDenominator),
    priced: false,
    status: "shadow",
  };
}
