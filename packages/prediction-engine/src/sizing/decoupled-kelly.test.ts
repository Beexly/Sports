import { describe, expect, it } from "vitest";
import {
  decoupledObjective,
  decoupledSlateKelly,
  independentKelly,
} from "./decoupled-kelly";
import type { SlatePick } from "./decoupled-kelly";

const picks: SlatePick[] = [
  { p: 0.6, odds: 2.0 },
  { p: 0.55, odds: 2.2 },
  { p: 0.7, odds: 1.8 },
];
const zeroCov = picks.map(() => picks.map(() => 0));

describe("decoupled-kelly", () => {
  it("independentKelly matches the closed form and caps", () => {
    expect(independentKelly({ p: 0.6, odds: 2.0 })).toBeCloseTo(0.2, 10);
    expect(independentKelly({ p: 0.6, odds: 2.0 }, 0.1)).toBe(0.1);
    expect(independentKelly({ p: 0.4, odds: 2.0 })).toBe(0);
  });

  it("zero covariance -> decoupled matches independent (up to exposure projection)", () => {
    const f = decoupledSlateKelly(picks, zeroCov, 10, 0.25);
    const ind = picks.map((q) => independentKelly(q, 0.25));
    for (let i = 0; i < picks.length; i++) {
      expect(f[i]).toBeCloseTo(ind[i] ?? 0, 2);
    }
  });

  it("positive covariance shrinks joint stakes", () => {
    const cov = picks.map((_, i) => picks.map((_, j) => (i === j ? 0.2 : 0.08)));
    const fCorr = decoupledSlateKelly(picks, cov, 10, 0.25);
    const fInd = decoupledSlateKelly(picks, zeroCov, 10, 0.25);
    const sumCorr = fCorr.reduce((a, b) => a + b, 0);
    const sumInd = fInd.reduce((a, b) => a + b, 0);
    expect(sumCorr).toBeLessThan(sumInd);
  });

  it("respects the exposure cap", () => {
    const f = decoupledSlateKelly(picks, zeroCov, 0.2, 0.25);
    expect(f.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(f.every((x) => x >= 0 && x <= 0.25 + 1e-9)).toBe(true);
  });

  it("objective improves over the all-zero vector", () => {
    const f = decoupledSlateKelly(picks, zeroCov, 10, 0.25);
    expect(decoupledObjective(picks, f, zeroCov)).toBeGreaterThan(
      decoupledObjective(picks, [0, 0, 0], zeroCov),
    );
  });

  it("empty slate returns empty stakes", () => {
    expect(decoupledSlateKelly([], [])).toEqual([]);
  });
});
