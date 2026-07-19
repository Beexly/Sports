import { describe, expect, it } from "vitest";
import { welchOneSidedNonInferiority } from "../clv-non-inferiority.js";
import { zCritOneSided } from "../normal-quantile.js";

function repeat(value: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => value + 0.0001 * Math.sin(i));
}

describe("welchOneSidedNonInferiority", () => {
  it("fails closed when either side has fewer than minN rows", () => {
    const result = welchOneSidedNonInferiority(repeat(0.02, 50), repeat(0.015, 200), {
      epsilon: 0.0005,
      alphaAdj: 0.05,
      minN: 100,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/insufficient graded CLV rows/);
  });

  it("passes when the challenger is clearly non-inferior (well above champion - epsilon)", () => {
    const result = welchOneSidedNonInferiority(repeat(0.02, 300), repeat(0.015, 300), {
      epsilon: 0.0005,
      alphaAdj: 0.05,
      minN: 100,
    });
    expect(result.pass).toBe(true);
    expect(result.oneSidedP).toBeLessThan(0.05);
  });

  it("fails when the challenger is materially worse than champion - epsilon", () => {
    const result = welchOneSidedNonInferiority(repeat(0.0, 300), repeat(0.02, 300), {
      epsilon: 0.0005,
      alphaAdj: 0.05,
      minN: 100,
    });
    expect(result.pass).toBe(false);
  });

  it("uses a real (non-hardcoded) zCrit matching zCritOneSided(alphaAdj)", () => {
    const result = welchOneSidedNonInferiority(repeat(0.02, 300), repeat(0.015, 300), {
      epsilon: 0.0005,
      alphaAdj: 0.01,
      minN: 100,
    });
    expect(result.zCrit).toBeCloseTo(zCritOneSided(0.01), 9);
    expect(result.zCrit).not.toBeCloseTo(1.64485, 2); // not the skeleton's hardcoded alpha=0.05 value
  });

  it("a tighter alphaAdj (Bonferroni) can flip an otherwise-passing result to fail", () => {
    // Constructed (and verified numerically) so the one-sided p lands at
    // ~0.01296 — strictly between 0.01 and 0.05 — so alpha=0.05 passes and
    // the Bonferroni-tightened alpha=0.01 fails on the identical statistic.
    const champion = Array.from({ length: 300 }, (_, i) => 0.015 + 0.01 * Math.sin(i * 1.834567));
    const challenger = Array.from({ length: 300 }, (_, i) => 0.0158 + 0.01 * Math.sin(i * 2.399963));
    const loose = welchOneSidedNonInferiority(challenger, champion, { epsilon: 0.0005, alphaAdj: 0.05, minN: 100 });
    const tight = welchOneSidedNonInferiority(challenger, champion, { epsilon: 0.0005, alphaAdj: 0.01, minN: 100 });
    expect(loose.oneSidedP).toBe(tight.oneSidedP); // same statistic, alpha changes only the gate
    expect(loose.oneSidedP).toBeGreaterThan(0.01);
    expect(loose.oneSidedP).toBeLessThan(0.05);
    expect(loose.pass).toBe(true);
    expect(tight.pass).toBe(false);
  });
});
