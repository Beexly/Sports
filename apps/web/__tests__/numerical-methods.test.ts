/**
 * Comprehensive tests for numerical-methods.ts
 * Run: cd apps/web && npx vitest run __tests__/numerical-methods.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  // Root finding
  bisection,
  newtonRaphson,
  secantMethod,
  brentMethod,
  falsePosition,
  // Integration
  trapezoidalRule,
  simpsonsRule,
  simpsonsThreeEighths,
  gaussianQuadrature,
  rombergIntegration,
  adaptiveSimpsons,
  // ODE solvers
  eulerMethod,
  rk4,
  rk4System,
  adaptiveRK45,
  // Interpolation
  linearInterpolate,
  lagrangeInterpolation,
  newtonDividedDifference,
  cubicSplineNatural,
  bilinearInterpolation,
  // Differentiation
  forwardDiff,
  centralDiff,
  secondDerivative,
  partialDerivative,
  gradient,
  jacobian,
  // Linear algebra
  gaussianElimination,
  luDecomposition,
  luSolve,
  matMul,
  matVec,
  transpose,
  determinant,
  invertMatrix,
  // Sports
  poissonODESolver,
  calibrationCurve,
  smoothSpread,
} from "@/lib/math/numerical-methods";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TIGHT = 1e-6;
const MEDIUM = 1e-4;
const LOOSE = 1e-2;

function approx(a: number, b: number, tol = TIGHT): boolean {
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// 1. Root finding
// ---------------------------------------------------------------------------

describe("bisection", () => {
  it("finds root of x^2 - 4 in [1, 3]", () => {
    const root = bisection((x) => x * x - 4, 1, 3);
    expect(approx(root, 2)).toBe(true);
  });

  it("finds root of x^3 - x - 2 in [1, 2]", () => {
    const root = bisection((x) => x ** 3 - x - 2, 1, 2);
    expect(approx(root, 1.5213797068045678)).toBe(true);
  });

  it("finds root of sin(x) near pi in [3, 4]", () => {
    const root = bisection(Math.sin, 3, 4);
    expect(approx(root, Math.PI)).toBe(true);
  });

  it("throws if f(a) and f(b) have same sign", () => {
    expect(() => bisection((x) => x * x, 1, 3)).toThrow();
  });

  it("respects custom tolerance", () => {
    const root = bisection((x) => x - 1.5, 1, 2, 1e-3);
    expect(approx(root, 1.5, 1e-3)).toBe(true);
  });

  it("finds root of cos(x) - x in [0, 1]", () => {
    const root = bisection((x) => Math.cos(x) - x, 0, 1);
    expect(approx(root, 0.7390851332)).toBe(true);
  });

  it("finds root at negative x: x^2 - 9 in [-4, -2]", () => {
    const root = bisection((x) => x * x - 9, -4, -2);
    expect(approx(root, -3)).toBe(true);
  });
});

describe("newtonRaphson", () => {
  it("finds root of x^2 - 2 starting at 1", () => {
    const root = newtonRaphson(
      (x) => x * x - 2,
      (x) => 2 * x,
      1
    );
    expect(approx(root, Math.SQRT2)).toBe(true);
  });

  it("finds root of e^x - 3 starting at 1", () => {
    const root = newtonRaphson(
      (x) => Math.exp(x) - 3,
      (x) => Math.exp(x),
      1
    );
    expect(approx(root, Math.log(3))).toBe(true);
  });

  it("finds root of x^3 - x - 2 starting at 1.5", () => {
    const root = newtonRaphson(
      (x) => x ** 3 - x - 2,
      (x) => 3 * x * x - 1,
      1.5
    );
    expect(approx(root, 1.5213797068045678)).toBe(true);
  });

  it("throws when derivative is near zero", () => {
    // f(x)=x^2, f'(x)=2x — derivative vanishes at x=0
    expect(() =>
      newtonRaphson(
        (x) => x * x,
        (_x) => 0, // force zero derivative
        1
      )
    ).toThrow();
  });

  it("converges for sin(x) starting near 3", () => {
    const root = newtonRaphson(Math.sin, Math.cos, 3);
    expect(approx(root, Math.PI)).toBe(true);
  });
});

describe("secantMethod", () => {
  it("finds root of x^2 - 4 with x0=1, x1=3", () => {
    const root = secantMethod((x) => x * x - 4, 1, 3);
    expect(approx(root, 2)).toBe(true);
  });

  it("finds root of x^3 - x - 2", () => {
    const root = secantMethod((x) => x ** 3 - x - 2, 1, 2);
    expect(approx(root, 1.5213797068045678, MEDIUM)).toBe(true);
  });

  it("finds root of e^x - 5", () => {
    const root = secantMethod((x) => Math.exp(x) - 5, 1, 2);
    expect(approx(root, Math.log(5), MEDIUM)).toBe(true);
  });

  it("handles identical initial values gracefully", () => {
    // Should return xCurr without crashing
    const r = secantMethod((x) => x - 1, 1, 1);
    expect(typeof r).toBe("number");
  });
});

describe("brentMethod", () => {
  it("finds root of x^2 - 4 in [1, 3]", () => {
    const root = brentMethod((x) => x * x - 4, 1, 3);
    expect(approx(root, 2)).toBe(true);
  });

  it("finds root of x^3 - x - 2 in [1, 2]", () => {
    const root = brentMethod((x) => x ** 3 - x - 2, 1, 2);
    expect(approx(root, 1.5213797068045678)).toBe(true);
  });

  it("throws if no sign change", () => {
    expect(() => brentMethod((x) => x * x + 1, -2, 2)).toThrow();
  });

  it("finds cos(x) - x root in [0, 1]", () => {
    const root = brentMethod((x) => Math.cos(x) - x, 0, 1);
    expect(approx(root, 0.7390851332)).toBe(true);
  });

  it("finds root of sin(x) in [3, 4]", () => {
    const root = brentMethod(Math.sin, 3, 4);
    expect(approx(root, Math.PI)).toBe(true);
  });
});

describe("falsePosition", () => {
  it("finds root of x^2 - 4 in [1, 3]", () => {
    const root = falsePosition((x) => x * x - 4, 1, 3);
    expect(approx(root, 2, MEDIUM)).toBe(true);
  });

  it("finds root of x^3 - x - 2 in [1, 2]", () => {
    const root = falsePosition((x) => x ** 3 - x - 2, 1, 2);
    expect(approx(root, 1.5213797068045678, MEDIUM)).toBe(true);
  });

  it("throws if no sign change", () => {
    expect(() => falsePosition((x) => x * x + 1, -2, 2)).toThrow();
  });

  it("finds root of e^x - 2 in [0, 1]", () => {
    const root = falsePosition((x) => Math.exp(x) - 2, 0, 1);
    expect(approx(root, Math.log(2), MEDIUM)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Numerical integration
// ---------------------------------------------------------------------------

describe("trapezoidalRule", () => {
  it("integrates x from 0 to 1 → 0.5", () => {
    expect(approx(trapezoidalRule((x) => x, 0, 1), 0.5, MEDIUM)).toBe(true);
  });

  it("integrates sin(x) from 0 to pi → 2", () => {
    expect(approx(trapezoidalRule(Math.sin, 0, Math.PI), 2, MEDIUM)).toBe(true);
  });

  it("integrates e^x from 0 to 1 → e-1", () => {
    expect(
      approx(trapezoidalRule(Math.exp, 0, 1), Math.E - 1, MEDIUM)
    ).toBe(true);
  });

  it("integrates constant 3 from 0 to 2 → 6", () => {
    expect(approx(trapezoidalRule(() => 3, 0, 2), 6, MEDIUM)).toBe(true);
  });

  it("integrates x^2 from 0 to 1 → 1/3", () => {
    expect(
      approx(trapezoidalRule((x) => x * x, 0, 1), 1 / 3, MEDIUM)
    ).toBe(true);
  });
});

describe("simpsonsRule", () => {
  it("integrates sin(x) from 0 to pi → 2", () => {
    expect(approx(simpsonsRule(Math.sin, 0, Math.PI), 2, TIGHT)).toBe(true);
  });

  it("integrates e^x from 0 to 1 → e-1", () => {
    expect(approx(simpsonsRule(Math.exp, 0, 1), Math.E - 1, TIGHT)).toBe(true);
  });

  it("integrates x^3 from 0 to 2 → 4", () => {
    expect(approx(simpsonsRule((x) => x ** 3, 0, 2), 4, TIGHT)).toBe(true);
  });

  it("throws if n is odd", () => {
    expect(() => simpsonsRule(Math.sin, 0, 1, 101)).toThrow();
  });

  it("integrates constant 5 from 1 to 4 → 15", () => {
    expect(approx(simpsonsRule(() => 5, 1, 4), 15, MEDIUM)).toBe(true);
  });
});

describe("simpsonsThreeEighths", () => {
  it("integrates sin(x) from 0 to pi → 2", () => {
    expect(
      approx(simpsonsThreeEighths(Math.sin, 0, Math.PI), 2, MEDIUM)
    ).toBe(true);
  });

  it("throws if n not divisible by 3", () => {
    expect(() => simpsonsThreeEighths(Math.sin, 0, 1, 100)).toThrow();
  });

  it("integrates e^x from 0 to 1", () => {
    expect(
      approx(simpsonsThreeEighths(Math.exp, 0, 1), Math.E - 1, MEDIUM)
    ).toBe(true);
  });

  it("integrates x^2 from 0 to 3 → 9", () => {
    expect(
      approx(simpsonsThreeEighths((x) => x * x, 0, 3), 9, MEDIUM)
    ).toBe(true);
  });
});

describe("gaussianQuadrature", () => {
  it("2-point: integrates x^2 from -1 to 1 → 2/3", () => {
    expect(
      approx(gaussianQuadrature((x) => x * x, -1, 1, 2), 2 / 3, TIGHT)
    ).toBe(true);
  });

  it("3-point: integrates x^4 from -1 to 1 → 2/5", () => {
    expect(
      approx(gaussianQuadrature((x) => x ** 4, -1, 1, 3), 0.4, TIGHT)
    ).toBe(true);
  });

  it("5-point: integrates sin(x) from 0 to pi → 2", () => {
    expect(
      approx(gaussianQuadrature(Math.sin, 0, Math.PI, 5), 2, TIGHT)
    ).toBe(true);
  });

  it("4-point: integrates e^x from 0 to 1 → e-1", () => {
    expect(
      approx(gaussianQuadrature(Math.exp, 0, 1, 4), Math.E - 1, TIGHT)
    ).toBe(true);
  });

  it("default 5-point: integrates 1 from 0 to 1 → 1", () => {
    expect(approx(gaussianQuadrature(() => 1, 0, 1), 1, TIGHT)).toBe(true);
  });
});

describe("rombergIntegration", () => {
  it("integrates sin(x) from 0 to pi → 2", () => {
    expect(
      approx(rombergIntegration(Math.sin, 0, Math.PI), 2, TIGHT)
    ).toBe(true);
  });

  it("integrates e^x from 0 to 1 → e-1", () => {
    expect(
      approx(rombergIntegration(Math.exp, 0, 1), Math.E - 1, TIGHT)
    ).toBe(true);
  });

  it("integrates x^5 from 0 to 1 → 1/6", () => {
    expect(
      approx(rombergIntegration((x) => x ** 5, 0, 1), 1 / 6, TIGHT)
    ).toBe(true);
  });

  it("integrates constant 7 from 2 to 5 → 21", () => {
    expect(
      approx(rombergIntegration(() => 7, 2, 5), 21, MEDIUM)
    ).toBe(true);
  });
});

describe("adaptiveSimpsons", () => {
  it("integrates sin(x) from 0 to pi → 2", () => {
    expect(approx(adaptiveSimpsons(Math.sin, 0, Math.PI), 2, TIGHT)).toBe(true);
  });

  it("integrates e^x from 0 to 1 → e-1", () => {
    expect(approx(adaptiveSimpsons(Math.exp, 0, 1), Math.E - 1, TIGHT)).toBe(
      true
    );
  });

  it("integrates 1/x from 1 to 2 → ln(2)", () => {
    expect(
      approx(adaptiveSimpsons((x) => 1 / x, 1, 2), Math.log(2), MEDIUM)
    ).toBe(true);
  });

  it("integrates x^2 from 0 to 3 → 9", () => {
    expect(
      approx(adaptiveSimpsons((x) => x * x, 0, 3), 9, TIGHT)
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. ODE solvers
// ---------------------------------------------------------------------------

describe("eulerMethod", () => {
  it("solves dy/dt = -y, y(0)=1 → approx e^-t", () => {
    const result = eulerMethod((t, y) => -y, 0, 1, 0.001, 1000);
    const last = result[result.length - 1]!;
    expect(approx(last.y, Math.exp(-1), LOOSE)).toBe(true);
  });

  it("returns steps+1 points", () => {
    const result = eulerMethod((_t, y) => y, 0, 1, 0.1, 5);
    expect(result).toHaveLength(6);
  });

  it("first point is initial condition", () => {
    const result = eulerMethod((_t, _y) => 0, 2, 5, 0.1, 10);
    expect(result[0]).toEqual({ t: 2, y: 5 });
  });

  it("solves dy/dt = 0 → constant", () => {
    const result = eulerMethod((_t, _y) => 0, 0, 7, 0.1, 100);
    expect(approx(result[result.length - 1]!.y, 7)).toBe(true);
  });

  it("solves dy/dt = 1, y(0)=0 → t (linear)", () => {
    const result = eulerMethod((_t, _y) => 1, 0, 0, 0.1, 10);
    expect(approx(result[result.length - 1]!.y, 1, MEDIUM)).toBe(true);
  });
});

describe("rk4", () => {
  it("solves dy/dt = -y accurately", () => {
    const result = rk4((t, y) => -y, 0, 1, 0.1, 10);
    const last = result[result.length - 1]!;
    expect(approx(last.y, Math.exp(-1), 1e-5)).toBe(true);
  });

  it("returns steps+1 points", () => {
    const result = rk4((_t, y) => y, 0, 1, 0.1, 5);
    expect(result).toHaveLength(6);
  });

  it("first point is initial condition", () => {
    const result = rk4((_t, _y) => 0, 1, 3, 0.1, 5);
    expect(result[0]).toEqual({ t: 1, y: 3 });
  });

  it("solves dy/dt = 2t, y(0)=0 → t^2", () => {
    const result = rk4((_t, _y) => 2 * _t, 0, 0, 0.01, 100);
    const last = result[result.length - 1]!;
    expect(approx(last.y, 1, MEDIUM)).toBe(true);
  });

  it("solves logistic equation", () => {
    // dy/dt = r*y*(1 - y/K), analytical: K/(1+(K/y0-1)*e^-rt)
    const r = 0.5, K = 10, y0 = 1;
    const result = rk4((_, y) => r * y * (1 - y / K), 0, y0, 0.1, 50);
    const last = result[result.length - 1]!;
    const t = 5;
    const exact = K / (1 + (K / y0 - 1) * Math.exp(-r * t));
    expect(approx(last.y, exact, LOOSE)).toBe(true);
  });
});

describe("rk4System", () => {
  it("solves two decoupled ODEs simultaneously", () => {
    // dy1/dt = -y1, dy2/dt = -2*y2
    const fs = [(t: number, ys: number[]) => -(ys[0] ?? 0), (t: number, ys: number[]) => -2 * (ys[1] ?? 0)];
    const result = rk4System(fs, 0, [1, 1], 0.01, 100);
    const last = result[result.length - 1]!;
    expect(approx(last.ys[0]!, Math.exp(-1), MEDIUM)).toBe(true);
    expect(approx(last.ys[1]!, Math.exp(-2), MEDIUM)).toBe(true);
  });

  it("returns steps+1 points", () => {
    const fs = [(_t: number, ys: number[]) => ys[0] ?? 0];
    const result = rk4System(fs, 0, [1], 0.1, 5);
    expect(result).toHaveLength(6);
  });

  it("first point matches initial conditions", () => {
    const fs = [(_t: number, _ys: number[]) => 0, (_t: number, _ys: number[]) => 0];
    const result = rk4System(fs, 0, [3, 7], 0.1, 5);
    expect(result[0]).toEqual({ t: 0, ys: [3, 7] });
  });
});

describe("adaptiveRK45", () => {
  it("solves dy/dt = -y, y(0)=1 over [0,1]", () => {
    const result = adaptiveRK45((t, y) => -y, 0, 1, 1);
    const last = result[result.length - 1]!;
    expect(approx(last.t, 1, MEDIUM)).toBe(true);
    expect(approx(last.y, Math.exp(-1), MEDIUM)).toBe(true);
  });

  it("produces multiple steps", () => {
    const result = adaptiveRK45((t, y) => -y, 0, 1, 5);
    expect(result.length).toBeGreaterThan(2);
  });

  it("first point is initial condition", () => {
    const result = adaptiveRK45((_t, _y) => 0, 0, 5, 1);
    expect(result[0]).toEqual({ t: 0, y: 5 });
  });

  it("solves exponential growth", () => {
    const result = adaptiveRK45((t, y) => y, 0, 1, 1);
    const last = result[result.length - 1]!;
    expect(approx(last.y, Math.E, MEDIUM)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Interpolation
// ---------------------------------------------------------------------------

describe("linearInterpolate", () => {
  it("interpolates midpoint", () => {
    expect(linearInterpolate(0.5, 0, 0, 1, 1)).toBe(0.5);
  });

  it("returns y0 at x0", () => {
    expect(linearInterpolate(2, 2, 5, 4, 9)).toBe(5);
  });

  it("returns y1 at x1", () => {
    expect(linearInterpolate(4, 2, 5, 4, 9)).toBe(9);
  });

  it("extrapolates correctly", () => {
    expect(approx(linearInterpolate(3, 0, 0, 1, 2), 6)).toBe(true);
  });

  it("handles same x0 and x1 (returns y0)", () => {
    expect(linearInterpolate(5, 3, 7, 3, 9)).toBe(7);
  });
});

describe("lagrangeInterpolation", () => {
  it("interpolates through data points exactly", () => {
    const xs = [0, 1, 2];
    const ys = [1, 3, 7];
    expect(approx(lagrangeInterpolation(xs, ys, 0), 1)).toBe(true);
    expect(approx(lagrangeInterpolation(xs, ys, 1), 3)).toBe(true);
    expect(approx(lagrangeInterpolation(xs, ys, 2), 7)).toBe(true);
  });

  it("reconstructs linear function", () => {
    const xs = [0, 1];
    const ys = [2, 5];
    expect(approx(lagrangeInterpolation(xs, ys, 0.5), 3.5)).toBe(true);
  });

  it("reconstructs quadratic x^2", () => {
    const xs = [-1, 0, 1];
    const ys = [1, 0, 1];
    expect(approx(lagrangeInterpolation(xs, ys, 0.5), 0.25)).toBe(true);
  });

  it("single point → constant", () => {
    expect(lagrangeInterpolation([3], [7], 5)).toBe(7);
  });
});

describe("newtonDividedDifference", () => {
  it("interpolates through data points", () => {
    const xs = [0, 1, 2];
    const ys = [1, 3, 7];
    expect(approx(newtonDividedDifference(xs, ys, 0), 1)).toBe(true);
    expect(approx(newtonDividedDifference(xs, ys, 1), 3)).toBe(true);
    expect(approx(newtonDividedDifference(xs, ys, 2), 7)).toBe(true);
  });

  it("matches lagrange on quadratic", () => {
    const xs = [-1, 0, 1];
    const ys = [1, 0, 1]; // x^2
    expect(approx(newtonDividedDifference(xs, ys, 0.5), 0.25)).toBe(true);
  });

  it("handles cubic polynomial", () => {
    const xs = [0, 1, 2, 3];
    const ys = xs.map((x) => x ** 3);
    expect(approx(newtonDividedDifference(xs, ys, 1.5), 1.5 ** 3)).toBe(true);
  });
});

describe("cubicSplineNatural", () => {
  it("throws on unsorted xs", () => {
    expect(() => cubicSplineNatural([1, 0, 2], [1, 2, 3])).toThrow();
  });

  it("throws if fewer than 2 points", () => {
    expect(() => cubicSplineNatural([1], [1])).toThrow();
  });

  it("interpolates through knots exactly", () => {
    const xs = [0, 1, 2, 3];
    const ys = [0, 1, 4, 9]; // close to x^2 but not exact
    const s = cubicSplineNatural(xs, ys);
    expect(approx(s(0), 0, MEDIUM)).toBe(true);
    expect(approx(s(1), 1, MEDIUM)).toBe(true);
    expect(approx(s(2), 4, MEDIUM)).toBe(true);
    expect(approx(s(3), 9, MEDIUM)).toBe(true);
  });

  it("smoothly interpolates sin(x)", () => {
    const xs = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI];
    const ys = xs.map(Math.sin);
    const s = cubicSplineNatural(xs, ys);
    expect(approx(s(Math.PI / 2), 1, LOOSE)).toBe(true);
  });

  it("returns a function", () => {
    const s = cubicSplineNatural([0, 1], [0, 1]);
    expect(typeof s).toBe("function");
  });

  it("linear data: spline is linear", () => {
    const xs = [0, 1, 2];
    const ys = [0, 2, 4];
    const s = cubicSplineNatural(xs, ys);
    expect(approx(s(1.5), 3, MEDIUM)).toBe(true);
  });
});

describe("bilinearInterpolation", () => {
  it("returns corner values exactly", () => {
    expect(bilinearInterpolation(0, 0, 0, 1, 0, 1, 1, 2, 3, 4)).toBe(1);
    expect(bilinearInterpolation(1, 0, 0, 1, 0, 1, 1, 2, 3, 4)).toBe(3);
    expect(bilinearInterpolation(0, 1, 0, 1, 0, 1, 1, 2, 3, 4)).toBe(2);
    expect(bilinearInterpolation(1, 1, 0, 1, 0, 1, 1, 2, 3, 4)).toBe(4);
  });

  it("returns average at center", () => {
    const v = bilinearInterpolation(0.5, 0.5, 0, 1, 0, 1, 1, 2, 3, 4);
    expect(approx(v, 2.5)).toBe(true);
  });

  it("handles non-unit rectangle", () => {
    const v = bilinearInterpolation(5, 5, 0, 10, 0, 10, 0, 10, 10, 20);
    expect(approx(v, 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Numerical differentiation
// ---------------------------------------------------------------------------

describe("forwardDiff", () => {
  it("differentiates x^2 at x=2 → 4", () => {
    expect(approx(forwardDiff((x) => x * x, 2), 4, MEDIUM)).toBe(true);
  });

  it("differentiates sin(x) at x=0 → 1", () => {
    expect(approx(forwardDiff(Math.sin, 0), 1, MEDIUM)).toBe(true);
  });

  it("differentiates e^x at x=1 → e", () => {
    expect(approx(forwardDiff(Math.exp, 1), Math.E, MEDIUM)).toBe(true);
  });
});

describe("centralDiff", () => {
  it("differentiates x^2 at x=3 → 6", () => {
    expect(approx(centralDiff((x) => x * x, 3), 6, MEDIUM)).toBe(true);
  });

  it("differentiates sin(x) at x=pi/4 → cos(pi/4)", () => {
    expect(
      approx(centralDiff(Math.sin, Math.PI / 4), Math.cos(Math.PI / 4), MEDIUM)
    ).toBe(true);
  });

  it("differentiates log(x) at x=1 → 1", () => {
    expect(approx(centralDiff(Math.log, 1), 1, MEDIUM)).toBe(true);
  });

  it("central diff is more accurate than forward diff for sin", () => {
    const fwd = Math.abs(forwardDiff(Math.sin, Math.PI / 3) - Math.cos(Math.PI / 3));
    const ctr = Math.abs(centralDiff(Math.sin, Math.PI / 3) - Math.cos(Math.PI / 3));
    expect(ctr).toBeLessThan(fwd);
  });
});

describe("secondDerivative", () => {
  it("d^2(x^2)/dx^2 = 2", () => {
    expect(approx(secondDerivative((x) => x * x, 5), 2, MEDIUM)).toBe(true);
  });

  it("d^2(sin(x))/dx^2 = -sin(x)", () => {
    const x = 1.5;
    expect(approx(secondDerivative(Math.sin, x), -Math.sin(x), MEDIUM)).toBe(true);
  });

  it("d^2(e^x)/dx^2 = e^x", () => {
    expect(approx(secondDerivative(Math.exp, 2), Math.exp(2), MEDIUM)).toBe(true);
  });
});

describe("partialDerivative", () => {
  it("df/dx of f(x,y)=x^2+y^2 at (1,2) = 2", () => {
    const f = (x: number, y: number) => x * x + y * y;
    expect(approx(partialDerivative(f, [1, 2], 0), 2, MEDIUM)).toBe(true);
  });

  it("df/dy of f(x,y)=x*y at (3,4) = 3", () => {
    const f = (x: number, y: number) => x * y;
    expect(approx(partialDerivative(f, [3, 4], 1), 3, MEDIUM)).toBe(true);
  });
});

describe("gradient", () => {
  it("gradient of f(x,y)=x^2+y^2 at (1,2) = [2,4]", () => {
    const f = (x: number, y: number) => x * x + y * y;
    const g = gradient(f, [1, 2]);
    expect(approx(g[0]!, 2, MEDIUM)).toBe(true);
    expect(approx(g[1]!, 4, MEDIUM)).toBe(true);
  });

  it("gradient of constant is zero", () => {
    const f = (..._args: number[]) => 5;
    const g = gradient(f, [3, 7]);
    expect(approx(g[0]!, 0, MEDIUM)).toBe(true);
    expect(approx(g[1]!, 0, MEDIUM)).toBe(true);
  });
});

describe("jacobian", () => {
  it("Jacobian of identity transform", () => {
    const fs = [(x: number, y: number) => x, (_x: number, y: number) => y];
    const J = jacobian(fs, [1, 2]);
    expect(approx(J[0]![0]!, 1, MEDIUM)).toBe(true);
    expect(approx(J[0]![1]!, 0, MEDIUM)).toBe(true);
    expect(approx(J[1]![0]!, 0, MEDIUM)).toBe(true);
    expect(approx(J[1]![1]!, 1, MEDIUM)).toBe(true);
  });

  it("Jacobian of linear map", () => {
    // f1 = 2x + 3y, f2 = 5x - y → J = [[2,3],[5,-1]]
    const fs = [(x: number, y: number) => 2 * x + 3 * y, (x: number, y: number) => 5 * x - y];
    const J = jacobian(fs, [0, 0]);
    expect(approx(J[0]![0]!, 2, MEDIUM)).toBe(true);
    expect(approx(J[0]![1]!, 3, MEDIUM)).toBe(true);
    expect(approx(J[1]![0]!, 5, MEDIUM)).toBe(true);
    expect(approx(J[1]![1]!, -1, MEDIUM)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Linear algebra
// ---------------------------------------------------------------------------

describe("gaussianElimination", () => {
  it("solves 2x2 system", () => {
    // 2x + y = 5, x + 3y = 7 → x=8/5, y=9/5
    const A = [[2, 1], [1, 3]];
    const b = [5, 7];
    const x = gaussianElimination(A, b);
    expect(approx(x[0]!, 8 / 5)).toBe(true);
    expect(approx(x[1]!, 9 / 5)).toBe(true);
  });

  it("solves 3x3 system", () => {
    const A = [[1, 2, 1], [3, 8, 1], [0, 4, 1]];
    const b = [2, 12, 2];
    const x = gaussianElimination(A, b);
    // Verify by substitution
    const residual0 = 1 * x[0]! + 2 * x[1]! + 1 * x[2]! - 2;
    expect(approx(residual0, 0, MEDIUM)).toBe(true);
  });

  it("solves identity system: Ix=b → x=b", () => {
    const A = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const b = [3, 7, -2];
    const x = gaussianElimination(A, b);
    expect(approx(x[0]!, 3)).toBe(true);
    expect(approx(x[1]!, 7)).toBe(true);
    expect(approx(x[2]!, -2)).toBe(true);
  });

  it("throws for singular matrix", () => {
    expect(() => gaussianElimination([[1, 2], [2, 4]], [1, 2])).toThrow();
  });
});

describe("luDecomposition", () => {
  it("decomposes 2x2 matrix", () => {
    const A = [[4, 3], [6, 3]];
    const { L, U } = luDecomposition(A);
    // L is lower triangular with 1s on diagonal
    expect(approx(L[0]![0]!, 1)).toBe(true);
    expect(approx(L[1]![1]!, 1)).toBe(true);
    expect(approx(L[0]![1]!, 0)).toBe(true);
    // U is upper triangular
    expect(approx(U[1]![0]!, 0)).toBe(true);
    // Check LU = A
    const product = matMul(L, U);
    expect(approx(product[0]![0]!, 4)).toBe(true);
    expect(approx(product[0]![1]!, 3)).toBe(true);
  });

  it("throws for singular matrix", () => {
    expect(() => luDecomposition([[0, 1], [0, 0]])).toThrow();
  });

  it("decomposes 3x3 matrix and LU=A", () => {
    const A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
    const { L, U } = luDecomposition(A);
    const product = matMul(L, U);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(approx(product[i]![j]!, A[i]![j]!)).toBe(true);
      }
    }
  });
});

describe("luSolve", () => {
  it("solves 2x2 via LU", () => {
    const A = [[2, 1], [1, 3]];
    const b = [5, 7];
    const { L, U } = luDecomposition(A);
    const x = luSolve(L, U, b);
    expect(approx(x[0]!, 8 / 5)).toBe(true);
    expect(approx(x[1]!, 9 / 5)).toBe(true);
  });

  it("solves identity: x=b", () => {
    const L = [[1, 0], [0, 1]];
    const U = [[1, 0], [0, 1]];
    const b = [4, 6];
    const x = luSolve(L, U, b);
    expect(approx(x[0]!, 4)).toBe(true);
    expect(approx(x[1]!, 6)).toBe(true);
  });
});

describe("matMul", () => {
  it("multiplies 2x2 matrices", () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    const C = matMul(A, B);
    expect(C[0]![0]).toBe(19);
    expect(C[0]![1]).toBe(22);
    expect(C[1]![0]).toBe(43);
    expect(C[1]![1]).toBe(50);
  });

  it("identity × A = A", () => {
    const I = [[1, 0], [0, 1]];
    const A = [[3, 7], [2, -1]];
    const result = matMul(I, A);
    expect(result[0]![0]).toBe(3);
    expect(result[1]![1]).toBe(-1);
  });

  it("handles rectangular matrices", () => {
    const A = [[1, 2, 3]]; // 1x3
    const B = [[1], [2], [3]]; // 3x1
    const C = matMul(A, B);
    expect(C[0]![0]).toBe(14);
  });
});

describe("matVec", () => {
  it("multiplies 2x2 matrix by vector", () => {
    const A = [[1, 2], [3, 4]];
    const v = [1, 2];
    const result = matVec(A, v);
    expect(result[0]).toBe(5);
    expect(result[1]).toBe(11);
  });

  it("identity × v = v", () => {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const v = [4, 5, 6];
    const result = matVec(I, v);
    expect(result).toEqual([4, 5, 6]);
  });
});

describe("transpose", () => {
  it("transposes 2x2", () => {
    const A = [[1, 2], [3, 4]];
    const T = transpose(A);
    expect(T[0]![0]).toBe(1);
    expect(T[0]![1]).toBe(3);
    expect(T[1]![0]).toBe(2);
    expect(T[1]![1]).toBe(4);
  });

  it("transposes 2x3", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const T = transpose(A);
    expect(T.length).toBe(3);
    expect(T[0]?.length).toBe(2);
    expect(T[2]![1]).toBe(6);
  });

  it("double transpose is identity", () => {
    const A = [[1, 2, 3], [4, 5, 6]];
    const TT = transpose(transpose(A));
    expect(TT[0]).toEqual([1, 2, 3]);
    expect(TT[1]).toEqual([4, 5, 6]);
  });
});

describe("determinant", () => {
  it("1x1 determinant", () => {
    expect(determinant([[7]])).toBe(7);
  });

  it("2x2 determinant", () => {
    expect(determinant([[1, 2], [3, 4]])).toBe(-2);
  });

  it("3x3 determinant", () => {
    const A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    expect(approx(determinant(A), 0, MEDIUM)).toBe(true);
  });

  it("identity matrix det = 1", () => {
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    expect(approx(determinant(I), 1)).toBe(true);
  });

  it("3x3 non-singular", () => {
    const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
    expect(approx(determinant(A), 4)).toBe(true);
  });
});

describe("invertMatrix", () => {
  it("inverts 2x2 identity", () => {
    const I = [[1, 0], [0, 1]];
    const inv = invertMatrix(I);
    expect(inv[0]![0]).toBe(1);
    expect(inv[1]![1]).toBe(1);
    expect(inv[0]![1]).toBe(0);
  });

  it("inverts 2x2 matrix: A * A^-1 = I", () => {
    const A = [[2, 1], [1, 3]];
    const inv = invertMatrix(A);
    const product = matMul(A, inv);
    expect(approx(product[0]![0]!, 1)).toBe(true);
    expect(approx(product[0]![1]!, 0)).toBe(true);
    expect(approx(product[1]![0]!, 0)).toBe(true);
    expect(approx(product[1]![1]!, 1)).toBe(true);
  });

  it("inverts 3x3 matrix: A * A^-1 = I", () => {
    const A = [[1, 2, 0], [0, 1, 3], [0, 0, 1]];
    const inv = invertMatrix(A);
    const product = matMul(A, inv);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const expected = i === j ? 1 : 0;
        expect(approx(product[i]![j]!, expected, MEDIUM)).toBe(true);
      }
    }
  });

  it("throws for singular matrix", () => {
    expect(() => invertMatrix([[1, 2], [2, 4]])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. Sports-specific applications
// ---------------------------------------------------------------------------

describe("poissonODESolver", () => {
  it("returns initial prob=1 at t=0", () => {
    const result = poissonODESolver(1, 1);
    expect(result[0]).toEqual({ t: 0, prob: 1 });
  });

  it("prob decays exponentially: P(t)=e^(-lambda*t)", () => {
    const lambda = 2;
    const tMax = 1;
    const result = poissonODESolver(lambda, tMax, 0.001);
    const last = result[result.length - 1]!;
    expect(approx(last.prob, Math.exp(-lambda * tMax), LOOSE)).toBe(true);
  });

  it("produces sorted time steps", () => {
    const result = poissonODESolver(1, 2, 0.1);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.t).toBeGreaterThan(result[i - 1]!.t);
    }
  });

  it("lambda=0 → prob stays at 1", () => {
    const result = poissonODESolver(0, 1, 0.1);
    const last = result[result.length - 1]!;
    expect(approx(last.prob, 1)).toBe(true);
  });
});

describe("calibrationCurve", () => {
  it("returns bins number of entries", () => {
    const result = calibrationCurve([0.1, 0.5, 0.9], [1, 0, 1]);
    expect(result).toHaveLength(10);
  });

  it("respects custom bins count", () => {
    const result = calibrationCurve([0.1, 0.5, 0.9], [1, 0, 1], 5);
    expect(result).toHaveLength(5);
  });

  it("perfectly calibrated: conf = outcome rate", () => {
    // 100% win rate in high bin
    const confs = [0.95, 0.97, 0.96];
    const outcomes = [1, 1, 1];
    const result = calibrationCurve(confs, outcomes);
    const highBin = result[result.length - 1]!;
    expect(highBin.calibrated).toBe(1);
    expect(highBin.count).toBe(3);
  });

  it("empty bin has calibrated=0 and count=0", () => {
    const result = calibrationCurve([0.5], [1]);
    const emptyBin = result[0]!; // 0-0.1 bin
    expect(emptyBin.count).toBe(0);
    expect(emptyBin.calibrated).toBe(0);
  });

  it("midpoints are evenly spaced", () => {
    const result = calibrationCurve([], [], 4);
    const midpoints = result.map((r) => r.midpoint);
    expect(approx(midpoints[0]!, 0.125)).toBe(true);
    expect(approx(midpoints[1]!, 0.375)).toBe(true);
    expect(approx(midpoints[2]!, 0.625)).toBe(true);
    expect(approx(midpoints[3]!, 0.875)).toBe(true);
  });
});

describe("smoothSpread", () => {
  it("single element returns same array", () => {
    expect(smoothSpread([5])).toEqual([5]);
  });

  it("returns same length array", () => {
    const spreads = [1, 2, 3, 4, 5];
    expect(smoothSpread(spreads)).toHaveLength(5);
  });

  it("linear data stays linear", () => {
    const spreads = [0, 2, 4, 6, 8];
    const smoothed = smoothSpread(spreads);
    expect(approx(smoothed[0]!, 0, MEDIUM)).toBe(true);
    expect(approx(smoothed[2]!, 4, MEDIUM)).toBe(true);
    expect(approx(smoothed[4]!, 8, MEDIUM)).toBe(true);
  });

  it("does not crash on constant data", () => {
    const spreads = [3, 3, 3, 3];
    const smoothed = smoothSpread(spreads);
    smoothed.forEach((v) => expect(approx(v, 3, MEDIUM)).toBe(true));
  });

  it("window parameter is accepted without error", () => {
    expect(() => smoothSpread([1, 2, 3], 5)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Additional edge-case / cross-cutting tests
// ---------------------------------------------------------------------------

describe("cross-cutting numerical accuracy", () => {
  it("all root-finding methods agree on x^2-9=0 in [2,5]", () => {
    const f = (x: number) => x * x - 9;
    const exact = 3;
    expect(approx(bisection(f, 2, 5), exact)).toBe(true);
    expect(approx(brentMethod(f, 2, 5), exact)).toBe(true);
    expect(approx(falsePosition(f, 2, 5), exact, MEDIUM)).toBe(true);
    expect(
      approx(newtonRaphson(f, (x) => 2 * x, 4), exact)
    ).toBe(true);
    expect(approx(secantMethod(f, 2, 5), exact, MEDIUM)).toBe(true);
  });

  it("integration methods agree on sin(x) from 0 to pi", () => {
    const exact = 2;
    const tol = 1e-4;
    expect(approx(trapezoidalRule(Math.sin, 0, Math.PI), exact, tol)).toBe(true);
    expect(approx(simpsonsRule(Math.sin, 0, Math.PI), exact, tol)).toBe(true);
    expect(approx(gaussianQuadrature(Math.sin, 0, Math.PI), exact, tol)).toBe(true);
    expect(approx(rombergIntegration(Math.sin, 0, Math.PI), exact, tol)).toBe(true);
    expect(approx(adaptiveSimpsons(Math.sin, 0, Math.PI), exact, tol)).toBe(true);
  });

  it("rk4 outperforms euler on exponential decay accuracy", () => {
    const f = (t: number, y: number) => -y;
    const exact = Math.exp(-1);
    const euler = eulerMethod(f, 0, 1, 0.1, 10);
    const rk4Result = rk4(f, 0, 1, 0.1, 10);
    const eulerErr = Math.abs(euler[euler.length - 1]!.y - exact);
    const rk4Err = Math.abs(rk4Result[rk4Result.length - 1]!.y - exact);
    expect(rk4Err).toBeLessThan(eulerErr);
  });

  it("lagrange and newton DD agree on cubic polynomial", () => {
    const xs = [1, 2, 3, 4];
    const ys = xs.map((x) => x ** 3 - 2 * x + 1);
    const xTest = 2.5;
    const lag = lagrangeInterpolation(xs, ys, xTest);
    const ndd = newtonDividedDifference(xs, ys, xTest);
    expect(approx(lag, ndd, MEDIUM)).toBe(true);
  });

  it("gaussianElimination and luSolve agree", () => {
    const A = [[3, 2, -1], [2, -2, 4], [-1, 0.5, -1]];
    const b = [1, -2, 0];
    const x1 = gaussianElimination(A.map((r) => [...r]), [...b]);
    const { L, U } = luDecomposition(A.map((r) => [...r]));
    const x2 = luSolve(L, U, [...b]);
    for (let i = 0; i < 3; i++) {
      expect(approx(x1[i]!, x2[i]!, MEDIUM)).toBe(true);
    }
  });

  it("matMul(A, A^-1) is close to identity for random 3x3", () => {
    const A = [[4, 7, 2], [3, 6, 1], [2, 5, 3]];
    const inv = invertMatrix(A.map((r) => [...r]));
    const product = matMul(A, inv);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(approx(product[i]![j]!, i === j ? 1 : 0, MEDIUM)).toBe(true);
      }
    }
  });

  it("gradient magnitude at origin of f=x^2+y^2 is zero", () => {
    const f = (x: number, y: number) => x * x + y * y;
    const g = gradient(f, [0, 0]);
    expect(approx(g[0]!, 0, MEDIUM)).toBe(true);
    expect(approx(g[1]!, 0, MEDIUM)).toBe(true);
  });

  it("Poisson ODE half-life: P(t_half)=0.5 for lambda=ln(2)", () => {
    const lambda = Math.log(2);
    const result = poissonODESolver(lambda, 1, 0.001);
    const last = result[result.length - 1]!;
    expect(approx(last.prob, 0.5, LOOSE)).toBe(true);
  });
});
