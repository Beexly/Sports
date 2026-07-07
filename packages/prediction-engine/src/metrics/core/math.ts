export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function clampScore(value: number): number {
  return clamp(value, 0, 100);
}

export function normalizeClamped(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function logit(probability: number): number {
  const bounded = clamp(probability, 0.000001, 0.999999);
  return Math.log(bounded / (1 - bounded));
}

export function softplus(value: number): number {
  if (value > 30) return value;
  if (value < -30) return Math.exp(value);
  return Math.log1p(Math.exp(value));
}

export function zScore(value: number, mean: number, standardDeviation: number): number {
  if (standardDeviation <= 0 || !Number.isFinite(standardDeviation)) return 0;
  return (value - mean) / standardDeviation;
}

export function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function weightedMean(values: readonly { readonly value: number; readonly weight: number }[]): number {
  const valid = values.filter((entry) => Number.isFinite(entry.value) && entry.weight > 0);
  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 0;
  return valid.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

export function protectedBasis(value: number, knots: readonly number[] = [-1, 0, 1]): readonly number[] {
  const bounded = clamp(value, -8, 8);
  return [
    bounded,
    bounded ** 2,
    bounded ** 3,
    ...knots.map((knot) => Math.max(0, bounded - knot) ** 3),
    Math.log1p(Math.abs(bounded)),
    sigmoid(1.7 * bounded),
  ];
}
