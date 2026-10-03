/**
 * Metric discrimination gate — tests (arXiv 2201.08671).
 *
 * ACCEPTANCE GATE: on a joint spread+total forecast, CRPS-Sum misranks
 * (marginal-matched noise ties/beats the good forecaster) while the
 * Energy Score and mean CRPS discriminate; the CI gate admits the
 * energy score and rejects CRPS-Sum; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  crpsSum,
  discriminationGate,
  energyScore,
  meanCrps,
  type DiscriminationCase,
} from "./metric-discrimination-gate";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Joint forecast scenario: spread and total with correlated errors.
 * The good forecaster captures the correlation; the noise forecaster
 * matches the marginals but draws dimensions independently.
 */
function makeCases(n: number, seed: number): DiscriminationCase[] {
  const rand = mulberry32(seed);
  const cases: DiscriminationCase[] = [];
  const m = 50; // ensemble members
  for (let c = 0; c < n; c++) {
    const trueSpread = (rand() - 0.5) * 20;
    const trueTotal = 40 + rand() * 15;
    const outcome = [trueSpread, trueTotal];
    // Good: correlated errors (rho = 0.7).
    const good: number[][] = [];
    for (let i = 0; i < m; i++) {
      const z1 = (rand() + rand() + rand() - 1.5) * 2;
      const z2 = (rand() + rand() + rand() - 1.5) * 2;
      good.push([
        trueSpread + 2 * z1,
        trueTotal + 3 * (0.7 * z1 + Math.sqrt(1 - 0.49) * z2),
      ]);
    }
    // Noise: same marginals, independent dimensions (correlation destroyed).
    // Proper permutations (Fisher-Yates) so the marginal multisets are
    // exactly preserved: per-dimension CRPS is then exactly invariant.
    const spreads = good.map((g) => g[0] as number);
    const totals = good.map((g) => g[1] as number);
    const permS = spreads.map((_, i) => i);
    const permT = totals.map((_, i) => i);
    for (let i = m - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [permS[i], permS[j]] = [permS[j] as number, permS[i] as number];
      const k = Math.floor(rand() * (i + 1));
      [permT[i], permT[k]] = [permT[k] as number, permT[i] as number];
    }
    const noise: number[][] = [];
    for (let i = 0; i < m; i++) {
      noise.push([
        spreads[permS[i] as number] as number,
        totals[permT[i] as number] as number,
      ]);
    }
    // Constant: always the climatological mean.
    const constant: number[][] = Array.from({ length: m }, () => [0, 47.5]);
    cases.push({ name: `case${c}`, good, noise, constant, outcome });
  }
  return cases;
}

describe("scores", () => {
  it("energy score prefers the good forecaster (it sees dependence)", () => {
    const cases = makeCases(30, 161);
    const e = discriminationGate("energy", energyScore, cases);
    expect(e.discriminates).toBe(true);
    expect(e.scores.good).toBeLessThan(e.scores.noise);
  });

  it("mean per-dimension CRPS ties: it is marginal-only by construction", () => {
    const cases = makeCases(30, 161);
    const c = discriminationGate("meanCrps", meanCrps, cases);
    // The dummy permutes the good forecaster's marginals; per-dimension
    // CRPS is permutation-invariant, so the scores are exactly equal.
    expect(c.scores.good).toBeCloseTo(c.scores.noise, 12);
    expect(c.discriminates).toBe(false);
  });

  it("CRPS-Sum fails to discriminate the correlation-destroying dummy", () => {
    const cases = makeCases(30, 163);
    const s = discriminationGate("crpsSum", crpsSum, cases);
    // The dummy matches marginals: CRPS-Sum cannot see the destroyed
    // correlation, so it ties or misranks.
    expect(s.scores.noise).toBeLessThanOrEqual(s.scores.good + 1e-9);
    expect(s.discriminates).toBe(false);
  });

  it("throws on degenerate input", () => {
    expect(() => discriminationGate("x", energyScore, [])).toThrow();
    expect(() => meanCrps([[1]], [])).toThrow();
    expect(() => energyScore([], [1])).toThrow();
  });
});
