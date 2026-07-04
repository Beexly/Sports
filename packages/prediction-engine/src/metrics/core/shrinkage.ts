import { clamp01, round, weightedMean } from "./math.js";

export interface EmpiricalBayesShrinkageInput {
  readonly observed: number;
  readonly prior: number;
  readonly sampleSize: number;
  readonly priorStrength: number;
}

export function empiricalBayesShrink(input: EmpiricalBayesShrinkageInput): number {
  const sampleSize = Math.max(0, input.sampleSize);
  const priorStrength = Math.max(0, input.priorStrength);
  const denominator = sampleSize + priorStrength;
  if (denominator <= 0) return round(input.prior, 4);
  return round((sampleSize * input.observed + priorStrength * input.prior) / denominator, 4);
}

export interface ProbabilityShrinkageInput {
  readonly observed: number;
  readonly prior: number;
  readonly sampleSize: number;
  readonly priorStrength: number;
}

export function shrinkProbability(input: ProbabilityShrinkageInput): number {
  return clamp01(
    empiricalBayesShrink({
      observed: clamp01(input.observed),
      prior: clamp01(input.prior),
      priorStrength: input.priorStrength,
      sampleSize: input.sampleSize,
    }),
  );
}

export function shrinkWeightedMean(
  values: readonly { readonly value: number; readonly weight: number }[],
  prior: number,
  priorStrength: number,
): number {
  const observedWeight = values.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  const observed = weightedMean(values);
  return empiricalBayesShrink({ observed, prior, priorStrength, sampleSize: observedWeight });
}
