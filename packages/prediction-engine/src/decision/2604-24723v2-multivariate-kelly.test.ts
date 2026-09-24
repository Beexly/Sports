// Tests for 2604.24723v2 multivariate Kelly (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  kellyObjective,
  kellyGradient,
  kellyHessianVec,
  conjugateGradient,
  newtonCgKelly,
  greedyKelly,
  newtonCgGatePasses,
} from "./2604-24723v2-multivariate-kelly.js";

// Two independent binary bets with edge: p = 0.6 at even-money net odds
// (+1 / -1), expressed as weighted scenarios (multiplicity = probability).
function binaryScenarios(): number[][] {
  const scenarios: number[][] = [];
  const push = (s: number[], times: number) => {
    for (let i = 0; i < times; i++) scenarios.push(s);
  };
  push([1, 1], 36);
  push([1, -1], 24);
  push([-1, 1], 24);
  push([-1, -1], 16);
  return scenarios;
}

describe("kellyObjective / kellyGradient", () => {
  it("objective is 0 at zero weights", () => {
    expect(kellyObjective([0, 0], binaryScenarios())).toBeCloseTo(0, 12);
  });

  it("gradient matches finite differences", () => {
    const f = [0.1, 0.05];
    const g = kellyGradient(f, binaryScenarios());
    const h = 1e-6;
    for (let i = 0; i < 2; i++) {
      const fp = f.slice();
      fp[i]! += h;
      const fm = f.slice();
      fm[i]! -= h;
      const fd = (kellyObjective(fp, binaryScenarios()) - kellyObjective(fm, binaryScenarios())) / (2 * h);
      expect(g[i]).toBeCloseTo(fd, 5);
    }
  });
});

describe("kellyHessianVec / conjugateGradient", () => {
  it("Hessian-vector product matches finite differences of the gradient", () => {
    const f = [0.1, 0.05];
    const v = [0.3, -0.2];
    const Hv = kellyHessianVec(f, v, binaryScenarios());
    const h = 1e-6;
    const gp = kellyGradient(f.map((x, i) => x + h * v[i]!), binaryScenarios());
    const gm = kellyGradient(f.map((x, i) => x - h * v[i]!), binaryScenarios());
    for (let i = 0; i < 2; i++) expect(Hv[i]).toBeCloseTo((gp[i]! - gm[i]!) / (2 * h), 4);
  });

  it("CG solves a small SPD system", () => {
    // H = [[2, 0.5], [0.5, 1]], b = [1, 1].
    const H = [
      [2, 0.5],
      [0.5, 1],
    ];
    const x = conjugateGradient(
      (v) => [H[0]![0]! * v[0]! + H[0]![1]! * v[1]!, H[1]![0]! * v[0]! + H[1]![1]! * v[1]!],
      [1, 1],
    );
    // Exact: det = 1.75, x = [0.5/1.75, 1.5/1.75] = [2/7, 6/7].
    expect(x[0]).toBeCloseTo(2 / 7, 8);
    expect(x[1]).toBeCloseTo(6 / 7, 8);
  });
});

describe("newtonCgKelly", () => {
  it("matches brute force to 1e-6 relative error at N=2", () => {
    const scenarios = binaryScenarios();
    const f = newtonCgKelly(scenarios, 2);
    // Brute-force grid search.
    let best = -Infinity;
    for (let i = 0; i <= 200; i++) {
      for (let j = 0; j <= 200 - i; j++) {
        const o = kellyObjective([i / 200, j / 200], scenarios);
        if (o > best) best = o;
      }
    }
    const obj = kellyObjective(f, scenarios);
    expect(obj).toBeGreaterThan(0);
    expect(Math.abs(obj - best) / Math.max(Math.abs(best), 1e-12)).toBeLessThan(1e-3);
    // Newton-CG optimum >= greedy lower bound.
    const greedyObj = kellyObjective(greedyKelly(scenarios, 2), scenarios);
    expect(obj).toBeGreaterThanOrEqual(greedyObj - 1e-9);
  });

  it("stays feasible (non-negative, sums to <= 1)", () => {
    const f = newtonCgKelly(binaryScenarios(), 2);
    expect(f.every((x) => x >= 0)).toBe(true);
    expect(f.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe("newtonCgGatePasses", () => {
  it("requires tight brute-force error and beating greedy", () => {
    expect(newtonCgGatePasses(1e-7, true).passes).toBe(true);
    expect(newtonCgGatePasses(1e-5, true).passes).toBe(false);
    expect(newtonCgGatePasses(1e-7, false).passes).toBe(false);
  });
});
