import { describe, expect, it } from "vitest";
import { drawNb } from "../synthetic-nb";

/**
 * NB2 dispersion property test — the check that would have caught φ = 12.
 *
 * `φ` is not a tuning knob; it is the entire tail. For NB2:
 *
 *     var = μ + μ²/φ        →        VMR = var/μ = 1 + μ/φ
 *
 * so φ alone decides how fat the scoring distribution's tail is, and therefore
 * every over/under tail probability the engine emits. `drawNb`'s docstring
 * asserted this identity but nothing verified it, and nothing tied φ to any
 * observed baseball number — so an inherited φ = 12 sat in `synthetic-nb.ts:54`
 * and `nb-rbpf.ts` unchallenged.
 *
 * Research finding being pinned here: measured MLB team-runs variance-to-mean is
 * ≈2.15 (independently corroborated — a committed test fixture in an outside
 * repo measured 2.21 over 14,223 team-matches with k≈3.8, and sabermetric
 * method-of-moments NB fits cluster r≈3.9–4.85). At μ≈4.3 that implies
 *
 *     φ = μ / (VMR − 1) = 4.3 / 1.15 ≈ 3.74
 *
 * φ = 12 implies VMR ≈ 1.36 — a far thinner tail than baseball actually has,
 * which systematically understates extreme totals.
 *
 * These tests are distribution-level facts, not model-output assertions: they
 * hold for any correct NB2 sampler, so they stay valid if the engine changes.
 */

const MLB_TEAM_RUNS_MEAN = 4.3;
/** Empirically measured MLB team-runs variance-to-mean ratio. */
const MLB_OBSERVED_VMR = 2.15;

/** Sample mean and (population) variance of n draws at (mu, phi). */
function moments(mu: number, phi: number, n: number, seed: number) {
  const rng = { state: seed };
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const y = drawNb(rng, mu, phi);
    sum += y;
    sumSq += y * y;
  }
  const mean = sum / n;
  return { mean, variance: sumSq / n - mean * mean };
}

const N = 200_000;

describe("NB2 moment identity: var = mu + mu^2/phi", () => {
  // Spread across the range the engine actually uses: NHL goals (~2.8),
  // MLB runs (~4.3), and a high-scoring environment (~5.5).
  it.each([
    { mu: 2.8, phi: 3.7 },
    { mu: 4.3, phi: 3.74 },
    { mu: 4.3, phi: 12 },
    { mu: 5.5, phi: 6 },
  ])("holds for mu=$mu, phi=$phi", ({ mu, phi }) => {
    const { mean, variance } = moments(mu, phi, N, 12345);
    const expectedVar = mu + (mu * mu) / phi;

    // Monte-Carlo tolerance: generous enough to be stable across seeds, tight
    // enough that a wrong parameterization (e.g. NB1, or 1/phi inverted) fails.
    expect(mean).toBeCloseTo(mu, 1);
    expect(variance / expectedVar).toBeGreaterThan(0.94);
    expect(variance / expectedVar).toBeLessThan(1.06);
  });

  it("is not Poisson — variance strictly exceeds the mean when phi is finite", () => {
    const { mean, variance } = moments(4.3, 3.74, N, 999);
    expect(variance).toBeGreaterThan(mean * 1.5);
  });

  it("approaches Poisson (VMR -> 1) as phi grows large", () => {
    const { mean, variance } = moments(4.3, 100_000, N, 4242);
    expect(variance / mean).toBeGreaterThan(0.94);
    expect(variance / mean).toBeLessThan(1.06);
  });
});

describe("phi must reproduce the OBSERVED baseball dispersion", () => {
  it("phi ~= 3.74 reproduces the measured MLB VMR of ~2.15", () => {
    const { mean, variance } = moments(MLB_TEAM_RUNS_MEAN, 3.74, N, 2026);
    const vmr = variance / mean;
    expect(vmr).toBeGreaterThan(MLB_OBSERVED_VMR - 0.15);
    expect(vmr).toBeLessThan(MLB_OBSERVED_VMR + 0.15);
  });

  it("REGRESSION GUARD: phi = 12 does NOT reproduce it — this is why 12 was wrong", () => {
    const { mean, variance } = moments(MLB_TEAM_RUNS_MEAN, 12, N, 2026);
    const vmr = variance / mean;

    // phi=12 implies VMR = 1 + 4.3/12 ~= 1.36, nowhere near the observed 2.15.
    expect(vmr).toBeLessThan(1.5);
    expect(MLB_OBSERVED_VMR - vmr).toBeGreaterThan(0.6);
  });

  it("the closed form phi = mu / (VMR - 1) recovers the sampler's own dispersion", () => {
    // Round-trip: pick a phi, measure VMR, invert it, get phi back.
    for (const phi of [3.0, 3.74, 6.0, 12.0]) {
      const { mean, variance } = moments(MLB_TEAM_RUNS_MEAN, phi, N, 77);
      const recovered = mean / (variance / mean - 1);
      expect(recovered / phi).toBeGreaterThan(0.85);
      expect(recovered / phi).toBeLessThan(1.15);
    }
  });
});
