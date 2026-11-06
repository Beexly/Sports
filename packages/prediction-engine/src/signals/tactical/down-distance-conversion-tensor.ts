/**
 * Down / distance / red-zone conversion lookup (Rung 1 descriptive capture).
 *
 * MEASURED on nflverse 2019-2025 REG (see docs/research/2026-09-19-opp-adj-epa-path/,
 * allseat_mills_v2.json). Definitions matter and are pinned here:
 * - RZ tensor: TD rate per pass/run SNAP from that yardline_100 bin (field-goal
 *   attempts excluded - they deflated the 11-15 bin in the first pass and created a
 *   false anomaly).
 * - 4th down: conversion rate per pass/run ATTEMPT, conversion = first_down==1 OR
 *   touchdown==1 (a TD on fourth down IS a conversion). SELECTION BIAS: teams
 *   attempt fourth downs where they expect to convert, so these rates describe
 *   ATTEMPTED fourth downs, not a guarantee for any offense.
 *
 * The previously circulated lookup (53.0 / 41.8 / 33.2 / 24.9) did NOT reproduce on
 * this corpus and is dead; use the measured table below. Weight 0.00 until a
 * Rung-2 outcome test passes.
 */

export const CONVERSION_TENSOR_METHOD_TAG = "down_distance_tensor_v1" as const;

/** Measured RZ TD rate per pass/run snap by yardline_100 bin (2019-2025). */
export const RZ_TD_RATE_PER_SNAP: ReadonlyArray<{
  readonly min: number;
  readonly max: number;
  readonly rate: number;
  readonly nSnaps: number;
}> = [
  { min: 1, max: 2, rate: 0.4344, nSnaps: 4968 },
  { min: 3, max: 5, rate: 0.3422, nSnaps: 4948 },
  { min: 6, max: 10, rate: 0.1966, nSnaps: 7905 },
  { min: 11, max: 15, rate: 0.1094, nSnaps: 8989 },
  { min: 16, max: 20, rate: 0.072, nSnaps: 9127 },
];

/** Measured fourth-down conversion rate per attempt by yards-to-go bin (2019-2025). */
export const FOURTH_DOWN_CONVERSION: ReadonlyArray<{
  readonly label: string;
  readonly minYdstogo: number;
  readonly maxYdstogo: number;
  readonly rate: number;
  readonly nAttempts: number;
}> = [
  { label: "4th&1", minYdstogo: 1, maxYdstogo: 1, rate: 0.6699, nAttempts: 2081 },
  { label: "4th&2-3", minYdstogo: 2, maxYdstogo: 3, rate: 0.5617, nAttempts: 1257 },
  { label: "4th&4-6", minYdstogo: 4, maxYdstogo: 6, rate: 0.4747, nAttempts: 889 },
  { label: "4th&7+", minYdstogo: 7, maxYdstogo: 99, rate: 0.2804, nAttempts: 988 },
];

/** Measured 4th&1 conversion split by play type (run is the goal-line weapon). */
export const FOURTH_AND_ONE_SPLIT = {
  run: { n: 1552, rate: 0.712 },
  pass: { n: 529, rate: 0.5463 },
} as const;

function requireYardline(v: number): number {
  if (!Number.isFinite(v) || v < 1 || v > 99 || !Number.isInteger(v)) {
    throw new Error(`conversion-tensor: yardline_100 must be an integer in [1,99], got ${v}`);
  }
  return v;
}

function requireYdstogo(v: number): number {
  if (!Number.isFinite(v) || v < 1 || v > 99 || !Number.isInteger(v)) {
    throw new Error(`conversion-tensor: ydstogo must be a positive integer, got ${v}`);
  }
  return v;
}

/** TD probability per snap from the given yardline_100 (clamped to the tensor range). */
export function rzTdRate(yardline100: number): { rate: number; nSnaps: number; extrapolated: boolean } {
  const y = requireYardline(yardline100);
  if (y > 20) {
    // Beyond the measured range: nearest-bin rate with the extrapolated flag set.
    const tail = RZ_TD_RATE_PER_SNAP[RZ_TD_RATE_PER_SNAP.length - 1];
    if (!tail) {
      throw new Error("conversion-tensor: RZ table unexpectedly empty");
    }
    return { rate: tail.rate, nSnaps: tail.nSnaps, extrapolated: true };
  }
  for (const row of RZ_TD_RATE_PER_SNAP) {
    if (y >= row.min && y <= row.max) {
      return { rate: row.rate, nSnaps: row.nSnaps, extrapolated: false };
    }
  }
  throw new Error(`conversion-tensor: no bin matched yardline_100 ${y}`);
}

/** Fourth-down conversion rate per attempt for the given yards-to-go. */
export function fourthDownConversion(
  ydstogo: number,
): { rate: number; nAttempts: number; label: string; extrapolated: boolean } {
  const g = requireYdstogo(ydstogo);
  for (const row of FOURTH_DOWN_CONVERSION) {
    if (g >= row.minYdstogo && g <= row.maxYdstogo) {
      return { rate: row.rate, nAttempts: row.nAttempts, label: row.label, extrapolated: false };
    }
  }
  throw new Error(`conversion-tensor: no bin matched ydstogo ${g}`);
}
