/**
 * Known-answer series.
 *
 * Prior art: coppeliaMLA/simsets (MIT) generates a series whose factor
 * contributions are known, so a model can be checked against the answer.
 * This file does not copy that code. The series here is deterministic:
 * y_t = intercept + slope * t + noise_t.
 */

export interface KnownAnswerSeries {
  observed: number[];
  intercept: number[];
  slope: number[];
  noise: number[];
}

export function knownAnswerSeries(
  length: number,
  intercept: number,
  slope: number,
  noise: readonly number[],
): KnownAnswerSeries {
  if (!Number.isInteger(length) || length < 2) {
    throw new Error("known-answer series needs at least 2 points");
  }
  if (noise.length !== length) {
    throw new Error("noise length must equal the series length");
  }
  if (![intercept, slope, ...noise].every(Number.isFinite)) {
    throw new Error("known-answer series rejects non-finite inputs");
  }
  const interceptPart = Array.from({ length }, () => intercept);
  const slopePart = Array.from({ length }, (_, t) => slope * t);
  const noisePart = [...noise];
  const observed = interceptPart.map((c, t) => c + (slopePart[t] ?? 0) + (noisePart[t] ?? 0));
  return { observed, intercept: interceptPart, slope: slopePart, noise: noisePart };
}

/** Recovers the planted slope when intercept and noise are known. */
export function recoverPlantedSlope(
  observed: readonly number[],
  intercept: number,
  noise: readonly number[],
): number {
  if (observed.length !== noise.length || observed.length < 2) {
    throw new Error("observed and noise must be the same length, at least 2");
  }
  const cleaned = observed.map((y, t) => y - intercept - (noise[t] ?? 0));
  const last = cleaned.length - 1;
  return ((cleaned[last] ?? 0) - (cleaned[0] ?? 0)) / last;
}
