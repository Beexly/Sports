/**
 * Canonical sample order for seeded estimators (determinism fix, 2026-09-11).
 *
 * Why this exists: the deployments' eligibility gate flipped GREEN → RED between
 * two evaluations 15 minutes apart on 09-10 with EVERY measured field identical
 * (n 392, brier 0.2111, ece 0.0639, deployed n 270, ece raw 0.0969, eceDebiased
 * 0.060636) — the only moving numbers were the seeded noise estimate and its
 * bootstrap bound (eceNoise 0.051233 → 0.051463, bound 0.045248 → 0.050217),
 * which crossed the 0.05 floor and auto-unpublished the product.
 *
 * Cause: both seeded estimators are ORDER-SENSITIVE —
 *   - `debiasedExpectedCalibrationError` consumes one PRNG draw per row in array
 *     order for its Monte Carlo null, and
 *   - `bootstrapDebiasedEceLowerBound` resamples `rows[floor(rand() * n)]`,
 * so a different permutation of the SAME rows produces different draws and a
 * different value. The canonical pick query carries no ORDER BY, so Postgres is
 * free to return any order and did.
 *
 * Fix: every seeded estimator is fed a canonically ordered copy. Sorting by
 * (p, y) is sufficient for multiset determinism: rows that are equal on both
 * coordinates are interchangeable for the draw sequence, so any permutation of
 * the same multiset yields the identical ordered sequence and therefore the
 * identical value. The sort is stable, so ties keep their incoming order.
 *
 * This changes the exact draw sequence (and therefore the last decimals of the
 * seeded values) once, on purpose. It does not change any floor, any seed, or
 * any metric definition.
 */

import type { CalibrationSample } from "@sports/prediction-engine";

/** Returns a canonically ordered COPY; the input array is never mutated. */
export function canonicalSampleOrder<T extends CalibrationSample>(
  samples: readonly T[],
): T[] {
  return [...samples].sort((a, b) => (a.p - b.p) || (a.y - b.y));
}

/**
 * Cheap deterministic signature of a sample multiset, independent of row order.
 * Used to tell "the metrics moved" apart from "the same metrics were scored
 * again and answered differently". 32-bit FNV-1a over the canonical order.
 */
export function sampleSignature(samples: readonly CalibrationSample[]): string {
  const ordered = canonicalSampleOrder(samples);
  let hash = 0x811c9dc5;
  const bump = (byte: number): void => {
    hash ^= byte & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  };
  for (const s of ordered) {
    const p = Math.round(s.p * 1e6);
    const y = Math.round(s.y * 1e6);
    for (let shift = 0; shift < 24; shift += 8) bump((p >>> shift) & 0xff);
    for (let shift = 0; shift < 24; shift += 8) bump((y >>> shift) & 0xff);
  }
  return `${ordered.length}:${hash.toString(16).padStart(8, "0")}`;
}
