import { describe, expect, it } from "vitest";
import {
  projectSimplex,
  pseudoBmaPlus,
  stackedLogScore,
  stackingWeights,
} from "./logscore-stacking";

describe("logscore-stacking", () => {
  it("projectSimplex returns a valid simplex point", () => {
    const w = projectSimplex([0.5, -0.2, 0.9]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w.every((x) => x >= 0)).toBe(true);
    expect(projectSimplex([0.2, 0.3, 0.5])).toEqual([0.2, 0.3, 0.5]);
  });

  it("pseudoBmaPlus favors high elpd, penalizes high se", () => {
    const w = pseudoBmaPlus([10, 8, 5], [0.5, 0.5, 0.5]);
    expect(w[0]).toBeGreaterThan(w[1]!);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const w2 = pseudoBmaPlus([10, 9.9], [0.1, 5]);
    expect(w2[0]).toBeGreaterThan(w2[1]!); // se penalty flips the close call
    expect(() => pseudoBmaPlus([1], [1, 2])).toThrow();
  });

  it("stacking recovers the better model in M-open", () => {
    // Model 0 is uniformly better (higher pointwise log-density).
    let s = 3;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const lpd = Array.from({ length: 300 }, () => {
      const base = -1 - rng();
      return [base + 0.5, base] as const;
    });
    const w = stackingWeights(lpd);
    expect(w[0]).toBeGreaterThan(0.8);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    // stacked score beats either single model
    const single0 = stackedLogScore(lpd, [1, 0]);
    expect(stackedLogScore(lpd, w)).toBeGreaterThanOrEqual(single0 - 1e-9);
  });

  it("stacking is immune to duplicate-model pathology", () => {
    // Model 1 duplicated: BMA would double-count; stacking should not collapse onto junk.
    const lpd = Array.from({ length: 200 }, (_, i) => {
      const good = -1 - (i % 7) * 0.01;
      const bad = -2 - (i % 5) * 0.01;
      return [good, bad, bad] as const;
    });
    const w = stackingWeights(lpd);
    expect(w[0]).toBeGreaterThan(w[1]! + w[2]!);
  });

  it("rejects empty lpd matrix", () => {
    expect(() => stackingWeights([])).toThrow("empty");
  });
});
