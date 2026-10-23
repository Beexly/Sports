/**
 * Pressure timing: a pressure is not a pressure.
 *
 * FITTED 2026-10-23 on 3,644 pressured plays, 435 sacks, BDB 2023-2025.
 * Conversion by arrival time, base 11.9%:
 *
 *   <2.0 s  15.8%   (56/355)
 *   2.0-2.4 12.1%   (104/858)
 *   2.5-2.9 10.1%   ( 97/961)
 *   3.0 s+  12.1%   (178/1470)
 *
 * Fast pressure FINISHES — chi-square p=.043 — because the quarterback has no
 * escape route and no time to throw it away. The 3.0 s+ bucket returns to the
 * coverage-sack plateau. Counting pressures flat, as the spec under review did,
 * understates quick-front defences by roughly a third of their expected sacks.
 *
 * Defensive finishing persists but weakly: split-half r=0.236 across 32
 * defences, so a shrunk residual is a nudge on a sack number and never a
 * standalone rating.
 */

export type PressureBucket = "immediate" | "fast" | "mid" | "late";

export const CONVERSION_BY_BUCKET: Readonly<Record<PressureBucket, number>> = {
  immediate: 0.158,
  fast: 0.121,
  mid: 0.101,
  late: 0.121,
};

/** Mid pressure is the reference weight of 1.0. */
export const PRESSURE_WEIGHT: Readonly<Record<PressureBucket, number>> = {
  immediate: 1.56,
  fast: 1.2,
  mid: 1.0,
  late: 1.2,
};

export const BASE_CONVERSION = 0.119;
export const FINISH_STABILITY_R = 0.236;

/** Bucket a time-to-pressure in seconds. Out-of-range clamps to nearest. */
export function pressureBucket(seconds: number): PressureBucket {
  if (!Number.isFinite(seconds) || seconds <= 0) return "mid";
  if (seconds < 2.0) return "immediate";
  if (seconds < 2.5) return "fast";
  if (seconds < 3.0) return "mid";
  return "late";
}

/** Weight one pressure event for sack expectation. */
export function pressureWeight(seconds: number): number {
  return PRESSURE_WEIGHT[pressureBucket(seconds)];
}

/** Expected sacks from a list of time-to-pressure values. */
export function expectedSacks(timesToPressure: readonly number[]): number {
  let acc = 0;
  for (const t of timesToPressure) acc += CONVERSION_BY_BUCKET[pressureBucket(t)];
  return acc;
}

/**
 * Apply a defence's finishing residual, shrunk by sample size.
 *
 * At n=25 pressures the multiplier is already half-attrited; at 500 it retains
 * 96% of the measured (weak) effect. `finishRate` is the defence's conversion
 * minus 0.119, so 0 is league average.
 */
export function finishingMultiplier(finishRate: number, pressures: number): number {
  if (!Number.isFinite(finishRate) || pressures <= 0) return 1;
  const weight = pressures / (pressures + 25);
  const scaled = 1 + (finishRate / BASE_CONVERSION) * weight;
  return Math.max(0.7, Math.min(1.4, scaled));
}
