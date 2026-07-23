/**
 * LSRQC KERNEL v1 — differentially-private SRQC health publisher.
 *
 * ██ NEVER EMIT RAW COUNTS THROUGH THIS API. ██ `publishSrqcHealthDp` is the
 * ONLY sanctioned way to surface SRQC health counters outside the control
 * plane. Every count field is privatized with additive discrete-Laplace noise
 * (sensitivity 1, scale 1/epsilon) BEFORE it is returned; the function body
 * constructs and returns a fresh privatized object and never returns, logs, or
 * otherwise leaks the raw `SrqcHealthRaw` it was given. `windowId` is a public
 * label and passes through un-noised; every numeric count (including
 * `versionActivations`) is privatized and clamped to a non-negative integer.
 *
 * Noise source: crypto-quality by default (node:crypto). An injectable `rng`
 * (a `() => number` returning a uniform in [0,1)) makes the output
 * deterministic for tests — the same seeded rng yields the same privatized
 * tuple, and a smaller epsilon (larger scale 1/epsilon) yields larger-magnitude
 * noise for a fixed rng sequence.
 */

import { randomBytes } from "node:crypto";

/** Raw (SENSITIVE) SRQC health counters — NEVER published directly. */
export interface SrqcHealthRaw {
  /** Public window label — passes through the DP boundary un-noised. */
  readonly windowId: string;
  readonly ge2Count: number;
  readonly shadowWouldRefuse: number;
  readonly enforceRefuse: number;
  readonly versionActivations: number;
}

/** A uniform sampler in [0,1). */
export type UniformRng = () => number;

/** Crypto-quality uniform in [0,1) from 48 bits of entropy. */
function cryptoUniform(): number {
  const buf = randomBytes(6);
  const int = buf.readUIntBE(0, 6);
  return int / 2 ** 48;
}

/**
 * One discrete-Laplace-privatized count: add Laplace(0, 1/epsilon) noise (via
 * inverse-CDF from a uniform draw), round to the nearest integer, and clamp to
 * ≥ 0. Sensitivity 1 is assumed (each raw count can change by at most 1 between
 * neighboring inputs).
 */
function privatizeCount(
  count: number,
  epsilon: number,
  rng: UniformRng,
): number {
  const scale = 1 / epsilon; // b; smaller epsilon → larger scale → larger noise
  const u = rng() - 0.5; // (-0.5, 0.5)
  const sign = u < 0 ? -1 : 1;
  const noise = -scale * sign * Math.log(1 - 2 * Math.abs(u));
  const noised = Math.round(count + noise);
  return noised < 0 ? 0 : noised;
}

/**
 * Publish DP-privatized SRQC health. Returns the SAME shape as the raw input
 * with every count field privatized (discrete Laplace, sensitivity 1, scale
 * 1/epsilon) and `windowId` passed through. The raw object is never returned or
 * emitted. `epsilon` must be > 0.
 */
export function publishSrqcHealthDp(
  raw: SrqcHealthRaw,
  epsilon: number,
  rng: UniformRng = cryptoUniform,
): SrqcHealthRaw {
  if (!(epsilon > 0)) {
    throw new Error("publishSrqcHealthDp: epsilon must be > 0");
  }
  // Fresh privatized object — the raw counts are NEVER returned.
  return {
    windowId: raw.windowId,
    ge2Count: privatizeCount(raw.ge2Count, epsilon, rng),
    shadowWouldRefuse: privatizeCount(raw.shadowWouldRefuse, epsilon, rng),
    enforceRefuse: privatizeCount(raw.enforceRefuse, epsilon, rng),
    versionActivations: privatizeCount(raw.versionActivations, epsilon, rng),
  };
}
