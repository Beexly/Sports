/**
 * Tests for apps/web/lib/math/calculus.ts
 *
 * Run from apps/web/:
 *   npx vitest run __tests__/calculus.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  // Differentiation
  derivative,
  derivative2,
  partialDerivative,
  gradient,
  jacobian,
  richardsonExtrapolation,
  // Integration
  trapezoidalRule,
  simpsonsRule,
  simpsons38Rule,
  gaussLegendreQuadrature,
  adaptiveQuadrature,
  doubleIntegral,
  // Series
  taylorExpansion,
  fouriercoefficientA,
  fouriercoefficientB,
  geometricSeries,
  powerSeries,
  fibonacciSequence,
  arithmeticSeriesSum,
  // Optimization
  goldenSectionSearch,
  gradientDescent,
  newtonRaphsonOpt,
  constrainedMinimum,
  nelderMead,
  // Transforms
  discreteFourierTransform,
  inverseDFT,
  dftMagnitude,
  dftPhase,
  laplacianSmoother,
  movingAverageFilter,
  // Sports
  velocityFromPosition,
  accelerationFromVelocity,
  workFromForce,
  powerCurve,
  momentOfInertia,
  trajectoryRange,
  spinRPMToRad,
  dragForce,
} from "@/lib/math/calculus";

const ABS = (tol: number) => ({ tolerance: tol });
const approx = (expected: number, tol = 1e-3) =>
  expect.closeTo(expected, Math.max(0, Math.round(-Math.log10(tol))));

// ---------------------------------------------------------------------------
// 1. Numerical differentiation
// ---------------------------------------------------------------------------

describe("derivative", () => {
  it("d/dx x² at x=3 → 6", () => {
    expect(derivative((x) => x * x, 3)).toBeCloseTo(6, 4);
  });

  it("d/dx x³ at x=2 → 12", () => {
    expect(derivative((x) => x ** 3, 2)).toBeCloseTo(12, 4);
  });

  it("d/dx sin(x) at x=0 → 1", () => {
    expect(derivative(Math.sin, 0)).toBeCloseTo(1, 5);
  });

  it("d/dx e^x at x=1 → e", () => {
    expect(derivative(Math.exp, 1)).toBeCloseTo(Math.E, 4);
  });

  it("d/dx constant → 0", () => {
    expect(derivative(() => 5, 10)).toBeCloseTo(0, 6);
  });

  it("custom h changes result", () => {
    const r1 = derivative((x) => x * x, 3, 1e-5);
    const r2 = derivative((x) => x * x, 3, 1e-4);
    expect(Math.abs(r1 - 6)).toBeLessThan(1e-4);
    expect(Math.abs(r2 - 6)).toBeLessThan(1e-3);
  });
});

describe("derivative2", () => {
  it("d²/dx² x² at x=5 → 2", () => {
    expect(derivative2((x) => x * x, 5)).toBeCloseTo(2, 3);
  });

  it("d²/dx² sin(x) at x=0 → 0", () => {
    expect(derivative2(Math.sin, 0)).toBeCloseTo(0, 3);
  });

  it("d²/dx² e^x at x=0 → 1", () => {
    expect(derivative2(Math.exp, 0)).toBeCloseTo(1, 3);
  });

  it("d²/dx² x³ at x=2 → 12", () => {
    expect(derivative2((x) => x ** 3, 2)).toBeCloseTo(12, 2);
  });
});

describe("partialDerivative", () => {
  it("∂/∂x of f(x,y)=x²+y at (3,4) → 6", () => {
    const f = (x: number, y: number) => x * x + y;
    expect(partialDerivative(f, [3, 4], 0)).toBeCloseTo(6, 4);
  });

  it("∂/∂y of f(x,y)=x²+y at (3,4) → 1", () => {
    const f = (x: number, y: number) => x * x + y;
    expect(partialDerivative(f, [3, 4], 1)).toBeCloseTo(1, 4);
  });

  it("∂/∂z of f(x,y,z)=xyz at (2,3,4) → 6", () => {
    const f = (x: number, y: number, z: number) => x * y * z;
    expect(partialDerivative(f, [2, 3, 4], 2)).toBeCloseTo(6, 4);
  });
});

describe("gradient", () => {
  it("gradient of f(x,y)=x²+y² at (1,2) → [2,4]", () => {
    const f = (x: number, y: number) => x * x + y * y;
    const g = gradient(f, [1, 2]);
    expect(g[0]).toBeCloseTo(2, 4);
    expect(g[1]).toBeCloseTo(4, 4);
  });

  it("gradient of constant → zero vector", () => {
    const f = () => 42;
    const g = gradient(f, [1, 2, 3]);
    g.forEach((v) => expect(v).toBeCloseTo(0, 5));
  });

  it("gradient length matches input length", () => {
    const f = (...args: number[]) => args.reduce((s, v) => s + v, 0);
    expect(gradient(f, [1, 2, 3, 4]).length).toBe(4);
  });
});

describe("jacobian", () => {
  it("Jacobian of [x², xy] at (2,3)", () => {
    const fns = [
      (x: number[]) => (x[0] ?? 0) ** 2,
      (x: number[]) => (x[0] ?? 0) * (x[1] ?? 0),
    ];
    const J = jacobian(fns, [2, 3]);
    expect(J[0]?.[0]).toBeCloseTo(4, 3);   // ∂(x²)/∂x = 2x = 4
    expect(J[0]?.[1]).toBeCloseTo(0, 3);   // ∂(x²)/∂y = 0
    expect(J[1]?.[0]).toBeCloseTo(3, 3);   // ∂(xy)/∂x = y = 3
    expect(J[1]?.[1]).toBeCloseTo(2, 3);   // ∂(xy)/∂y = x = 2
  });

  it("Jacobian is m×n", () => {
    const fns = [
      (x: number[]) => (x[0] ?? 0) + (x[1] ?? 0),
      (x: number[]) => (x[0] ?? 0) - (x[1] ?? 0),
      (x: number[]) => (x[0] ?? 0) * (x[1] ?? 0),
    ];
    const J = jacobian(fns, [1, 1]);
    expect(J.length).toBe(3);
    expect(J[0]?.length).toBe(2);
  });
});

describe("richardsonExtrapolation", () => {
  it("d/dx x² at x=3 → 6 (more accurate)", () => {
    expect(richardsonExtrapolation((x) => x * x, 3)).toBeCloseTo(6, 6);
  });

  it("d/dx sin(x) at x=π/4", () => {
    expect(richardsonExtrapolation(Math.sin, Math.PI / 4)).toBeCloseTo(
      Math.cos(Math.PI / 4),
      6
    );
  });

  it("is more accurate than plain central difference for x^4", () => {
    const f = (x: number) => x ** 4;
    const exact = 4 * 2 ** 3; // 32
    const plain = Math.abs(derivative(f, 2, 1e-3) - exact);
    const rich = Math.abs(richardsonExtrapolation(f, 2, 1e-3) - exact);
    expect(rich).toBeLessThan(plain);
  });
});

// ---------------------------------------------------------------------------
// 2. Numerical integration
// ---------------------------------------------------------------------------

describe("trapezoidalRule", () => {
  it("∫₀¹ x² dx → 1/3", () => {
    expect(trapezoidalRule((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 3);
  });

  it("∫₀^π sin(x) dx → 2", () => {
    expect(trapezoidalRule(Math.sin, 0, Math.PI)).toBeCloseTo(2, 3);
  });

  it("∫₀¹ 1 dx → 1", () => {
    expect(trapezoidalRule(() => 1, 0, 1)).toBeCloseTo(1, 8);
  });

  it("∫₀² x dx → 2", () => {
    expect(trapezoidalRule((x) => x, 0, 2)).toBeCloseTo(2, 6);
  });
});

describe("simpsonsRule", () => {
  it("∫₀¹ x² dx → 1/3", () => {
    expect(simpsonsRule((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 5);
  });

  it("∫₀^π sin(x) dx → 2", () => {
    expect(simpsonsRule(Math.sin, 0, Math.PI)).toBeCloseTo(2, 5);
  });

  it("∫₀¹ e^x dx → e-1", () => {
    expect(simpsonsRule(Math.exp, 0, 1)).toBeCloseTo(Math.E - 1, 5);
  });

  it("odd n is auto-corrected", () => {
    expect(simpsonsRule((x) => x * x, 0, 1, 7)).toBeCloseTo(1 / 3, 4);
  });
});

describe("simpsons38Rule", () => {
  it("∫₀¹ x² dx → 1/3", () => {
    expect(simpsons38Rule((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 5);
  });

  it("∫₀^π sin(x) dx → 2", () => {
    expect(simpsons38Rule(Math.sin, 0, Math.PI)).toBeCloseTo(2, 4);
  });

  it("n not divisible by 3 is auto-corrected", () => {
    expect(simpsons38Rule((x) => x * x, 0, 1, 10)).toBeCloseTo(1 / 3, 4);
  });
});

describe("gaussLegendreQuadrature", () => {
  it("∫₀¹ x² dx → 1/3", () => {
    expect(gaussLegendreQuadrature((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 10);
  });

  it("∫₀^π sin(x) dx → 2", () => {
    expect(gaussLegendreQuadrature(Math.sin, 0, Math.PI)).toBeCloseTo(2, 5);
  });

  it("∫₋₁¹ 1 dx → 2", () => {
    expect(gaussLegendreQuadrature(() => 1, -1, 1)).toBeCloseTo(2, 10);
  });

  it("∫₀¹ x⁴ dx → 0.2", () => {
    expect(gaussLegendreQuadrature((x) => x ** 4, 0, 1)).toBeCloseTo(0.2, 8);
  });
});

describe("adaptiveQuadrature", () => {
  it("∫₀¹ x² dx → 1/3", () => {
    expect(adaptiveQuadrature((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 5);
  });

  it("∫₀^π sin(x) dx → 2", () => {
    expect(adaptiveQuadrature(Math.sin, 0, Math.PI)).toBeCloseTo(2, 5);
  });

  it("∫₀¹ e^x dx → e-1", () => {
    expect(adaptiveQuadrature(Math.exp, 0, 1)).toBeCloseTo(Math.E - 1, 5);
  });
});

describe("doubleIntegral", () => {
  it("∫∫ 1 dA over [0,1]×[0,1] → 1", () => {
    expect(doubleIntegral(() => 1, 0, 1, 0, 1)).toBeCloseTo(1, 4);
  });

  it("∫∫ x+y dA over [0,1]×[0,1] → 1", () => {
    expect(doubleIntegral((x, y) => x + y, 0, 1, 0, 1)).toBeCloseTo(1, 3);
  });

  it("∫∫ xy dA over [0,2]×[0,3] → 9", () => {
    expect(doubleIntegral((x, y) => x * y, 0, 2, 0, 3)).toBeCloseTo(9, 2);
  });
});

// ---------------------------------------------------------------------------
// 3. Series and sequences
// ---------------------------------------------------------------------------

describe("taylorExpansion", () => {
  it("sin(x) about 0 at x=0.1 (5 terms)", () => {
    expect(taylorExpansion(Math.sin, 0, 0.1, 6)).toBeCloseTo(Math.sin(0.1), 3);
  });

  it("e^x about 0 at x=1 (6 terms)", () => {
    expect(taylorExpansion(Math.exp, 0, 1, 6)).toBeCloseTo(Math.E, 1);
  });

  it("cos(x) about 0 at x=0 → 1", () => {
    expect(taylorExpansion(Math.cos, 0, 0, 4)).toBeCloseTo(1, 5);
  });
});

describe("fouriercoefficientA", () => {
  it("a₀ of f(x)=1 over period 2π → 2 (since a₀=(2/T)*T=2 or depends on convention)", () => {
    // a_0 = (2/T) * integral_0^T 1 * cos(0) dx = (2/2π) * 2π = 2
    const a0 = fouriercoefficientA(() => 1, 0);
    expect(a0).toBeCloseTo(2, 3);
  });

  it("a₁ of f(x)=cos(2πx/T) over period 2π → 1", () => {
    const T = 2 * Math.PI;
    const a1 = fouriercoefficientA((x) => Math.cos((2 * Math.PI * x) / T), 1, T);
    expect(a1).toBeCloseTo(1, 3);
  });

  it("a₁ of odd function sin(x) over [0,2π] is near 0", () => {
    // sin is odd function, so a_1 contribution via cos integral should be 0
    const a1 = fouriercoefficientA(Math.sin, 1);
    expect(Math.abs(a1)).toBeLessThan(0.01);
  });
});

describe("fouriercoefficientB", () => {
  it("b₁ of f(x)=sin(2πx/T) over period 2π → 1", () => {
    const T = 2 * Math.PI;
    const b1 = fouriercoefficientB((x) => Math.sin((2 * Math.PI * x) / T), 1, T);
    expect(b1).toBeCloseTo(1, 3);
  });

  it("b₁ of even function cos(x) → near 0", () => {
    const b1 = fouriercoefficientB(Math.cos, 1);
    expect(Math.abs(b1)).toBeLessThan(0.02);
  });

  it("b_n of constant function → 0", () => {
    const bn = fouriercoefficientB(() => 3, 2);
    expect(Math.abs(bn)).toBeLessThan(0.01);
  });
});

describe("geometricSeries", () => {
  it("sum a=1, r=0.5, n=4: 1+0.5+0.25+0.125=1.875", () => {
    expect(geometricSeries(1, 0.5, 4)).toBeCloseTo(1.875, 10);
  });

  it("r=0 → returns a", () => {
    expect(geometricSeries(5, 0, 10)).toBeCloseTo(5, 10);
  });

  it("r=1 → a*n", () => {
    expect(geometricSeries(3, 1, 7)).toBeCloseTo(21, 10);
  });

  it("r=-1 → oscillating", () => {
    // a*(1-(-1)^n)/(1-(-1)) = a*(1-1)/2 = 0 for even n
    expect(geometricSeries(1, -1, 2)).toBeCloseTo(0, 10);
  });

  it("large r, n=0 → 0", () => {
    expect(geometricSeries(2, 10, 0)).toBeCloseTo(0, 10);
  });
});

describe("powerSeries", () => {
  it("[1,0,1] at x=2 → 1 + 4 = 5 (1 + 0*x + 1*x²)", () => {
    expect(powerSeries([1, 0, 1], 2)).toBeCloseTo(5, 10);
  });

  it("[1,1,1,1,...] approximates geometric series sum at x=0.5", () => {
    // sum_{k=0}^{19} (0.5)^k = (1 - 0.5^20)/(1 - 0.5) ≈ 2*(1 - 0.5^20)
    const coeffs = new Array(20).fill(1) as number[];
    const expected = (1 - 0.5 ** 20) / (1 - 0.5);
    expect(powerSeries(coeffs, 0.5)).toBeCloseTo(expected, 5);
  });

  it("empty coefficients → 0", () => {
    expect(powerSeries([], 5)).toBe(0);
  });

  it("[3] at any x → 3", () => {
    expect(powerSeries([3], 100)).toBeCloseTo(3, 10);
  });
});

describe("fibonacciSequence", () => {
  it("first 10 Fibonacci numbers", () => {
    expect(fibonacciSequence(10)).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
  });

  it("n=1 → [0]", () => {
    expect(fibonacciSequence(1)).toEqual([0]);
  });

  it("n=2 → [0,1]", () => {
    expect(fibonacciSequence(2)).toEqual([0, 1]);
  });

  it("n=0 → []", () => {
    expect(fibonacciSequence(0)).toEqual([]);
  });

  it("n=5 → [0,1,1,2,3]", () => {
    expect(fibonacciSequence(5)).toEqual([0, 1, 1, 2, 3]);
  });

  it("each term = sum of previous two (for n=15)", () => {
    const fib = fibonacciSequence(15);
    for (let i = 2; i < 15; i++) {
      expect(fib[i]).toBe((fib[i - 1] ?? 0) + (fib[i - 2] ?? 0));
    }
  });
});

describe("arithmeticSeriesSum", () => {
  it("S_5 for a=1, d=1: 1+2+3+4+5=15", () => {
    expect(arithmeticSeriesSum(1, 1, 5)).toBeCloseTo(15, 10);
  });

  it("S_0 → 0", () => {
    expect(arithmeticSeriesSum(5, 3, 0)).toBeCloseTo(0, 10);
  });

  it("a=0, d=2, n=4: 0+2+4+6=12", () => {
    expect(arithmeticSeriesSum(0, 2, 4)).toBeCloseTo(12, 10);
  });

  it("d=0 → a*n", () => {
    expect(arithmeticSeriesSum(7, 0, 5)).toBeCloseTo(35, 10);
  });
});

// ---------------------------------------------------------------------------
// 4. Optimization
// ---------------------------------------------------------------------------

describe("goldenSectionSearch", () => {
  it("finds minimum of (x-2)² in [0,4]", () => {
    expect(goldenSectionSearch((x) => (x - 2) ** 2, 0, 4)).toBeCloseTo(2, 4);
  });

  it("finds minimum of x⁴ in [-3,3]", () => {
    expect(goldenSectionSearch((x) => x ** 4, -3, 3)).toBeCloseTo(0, 3);
  });

  it("minimum of sin in [0, π] is at π/2 (sin is concave — maximize by negating)", () => {
    // We minimize -sin (i.e. find the minimum of the negated function)
    const xMin = goldenSectionSearch((x) => -Math.sin(x), 0, Math.PI);
    expect(xMin).toBeCloseTo(Math.PI / 2, 3);
  });

  it("respects tight bracket", () => {
    const x = goldenSectionSearch((x) => (x - 1) ** 2, 0.9, 1.5);
    expect(x).toBeCloseTo(1, 3);
  });
});

describe("gradientDescent", () => {
  it("minimizes f(x,y)=x²+y² from (5,5)", () => {
    const result = gradientDescent(
      (x, y) => x * x + y * y,
      [5, 5],
      0.1,
      500,
      1e-7
    );
    expect(result[0]).toBeCloseTo(0, 2);
    expect(result[1]).toBeCloseTo(0, 2);
  });

  it("minimizes f(x)=(x-3)² from x=0", () => {
    const result = gradientDescent((x) => (x - 3) ** 2, [0], 0.1, 1000, 1e-8);
    expect(result[0]).toBeCloseTo(3, 2);
  });

  it("returns array of same length as initial", () => {
    const result = gradientDescent(
      (x, y, z) => x * x + y * y + z * z,
      [1, 2, 3]
    );
    expect(result.length).toBe(3);
  });
});

describe("newtonRaphsonOpt", () => {
  it("finds minimum of (x-2)² → x=2", () => {
    expect(newtonRaphsonOpt((x) => (x - 2) ** 2, 0)).toBeCloseTo(2, 4);
  });

  it("finds minimum of x² → x=0", () => {
    expect(newtonRaphsonOpt((x) => x ** 2, 1)).toBeCloseTo(0, 4);
  });

  it("handles starting at the solution", () => {
    expect(newtonRaphsonOpt((x) => (x - 5) ** 2, 5)).toBeCloseTo(5, 4);
  });
});

describe("constrainedMinimum", () => {
  it("minimizes x²+y² within [1,3]×[1,3] → (1,1)", () => {
    const result = constrainedMinimum(
      (x, y) => x * x + y * y,
      [2, 2],
      [[1, 3], [1, 3]]
    );
    expect(result[0]).toBeCloseTo(1, 2);
    expect(result[1]).toBeCloseTo(1, 2);
  });

  it("stays within bounds", () => {
    const result = constrainedMinimum(
      (x) => (x - 10) ** 2,
      [0],
      [[-5, 5]]
    );
    expect(result[0]!).toBeGreaterThanOrEqual(-5 - 1e-6);
    expect(result[0]!).toBeLessThanOrEqual(5 + 1e-6);
  });
});

describe("nelderMead", () => {
  it("finds minimum of (x-2)²+(y-3)² from (0,0)", () => {
    const result = nelderMead((x) => (x[0]! - 2) ** 2 + (x[1]! - 3) ** 2, [0, 0]);
    expect(result[0]).toBeCloseTo(2, 2);
    expect(result[1]).toBeCloseTo(3, 2);
  });

  it("finds minimum of x²", () => {
    const result = nelderMead((x) => (x[0]! - 1) ** 2, [5], 1000);
    expect(result[0]).toBeCloseTo(1, 2);
  });

  it("returns same-length array as initial", () => {
    const result = nelderMead((x) => x[0]! ** 2 + x[1]! ** 2 + x[2]! ** 2, [1, 2, 3]);
    expect(result.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 5. Transforms
// ---------------------------------------------------------------------------

describe("discreteFourierTransform", () => {
  it("DFT of constant signal has energy only in DC bin", () => {
    const signal = [1, 1, 1, 1];
    const { re, im } = discreteFourierTransform(signal);
    expect(re[0]).toBeCloseTo(4, 8);
    expect(re[1]).toBeCloseTo(0, 5);
    expect(re[2]).toBeCloseTo(0, 5);
    expect(Math.abs(im[0] ?? 0)).toBeCloseTo(0, 5);
  });

  it("DFT of single cosine has peaks at ±k", () => {
    const N = 8;
    const k = 1;
    const signal = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * k * n) / N));
    const { re } = discreteFourierTransform(signal);
    // Bins 1 and N-1 should have magnitude N/2 each
    expect(Math.abs(re[1] ?? 0)).toBeCloseTo(N / 2, 5);
    expect(Math.abs(re[N - 1] ?? 0)).toBeCloseTo(N / 2, 5);
  });

  it("DFT of impulse → flat spectrum", () => {
    const signal = [1, 0, 0, 0, 0, 0, 0, 0];
    const { re, im } = discreteFourierTransform(signal);
    re.forEach((r) => expect(r).toBeCloseTo(1, 8));
    im.forEach((v) => expect(Math.abs(v)).toBeCloseTo(0, 8));
  });

  it("output length matches input length", () => {
    const signal = [1, 2, 3, 4, 5];
    const { re, im } = discreteFourierTransform(signal);
    expect(re.length).toBe(5);
    expect(im.length).toBe(5);
  });
});

describe("inverseDFT", () => {
  it("round-trip: IDFT(DFT(signal)) ≈ signal", () => {
    const signal = [1, 2, 3, 4];
    const { re, im } = discreteFourierTransform(signal);
    const recovered = inverseDFT(re, im);
    signal.forEach((v, i) => expect(recovered[i]).toBeCloseTo(v, 5));
  });

  it("IDFT of DC-only spectrum → constant signal", () => {
    const N = 4;
    const re = [N, 0, 0, 0];
    const im = [0, 0, 0, 0];
    const out = inverseDFT(re, im);
    out.forEach((v) => expect(v).toBeCloseTo(1, 8));
  });
});

describe("dftMagnitude", () => {
  it("magnitude of [3,4] → 5", () => {
    const mag = dftMagnitude([3], [4]);
    expect(mag[0]).toBeCloseTo(5, 8);
  });

  it("magnitude of zero spectrum → zeros", () => {
    const mag = dftMagnitude([0, 0], [0, 0]);
    mag.forEach((v) => expect(v).toBeCloseTo(0, 8));
  });

  it("magnitude is non-negative", () => {
    const { re, im } = discreteFourierTransform([1, -1, 1, -1]);
    dftMagnitude(re, im).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });
});

describe("dftPhase", () => {
  it("phase of [1,0] → 0", () => {
    expect(dftPhase([1], [0])[0]).toBeCloseTo(0, 8);
  });

  it("phase of [0,1] → π/2", () => {
    expect(dftPhase([0], [1])[0]).toBeCloseTo(Math.PI / 2, 8);
  });

  it("phase of [-1,0] → π", () => {
    expect(Math.abs(dftPhase([-1], [0])[0] ?? 0)).toBeCloseTo(Math.PI, 8);
  });

  it("output length matches input length", () => {
    const phase = dftPhase([1, 2, 3], [4, 5, 6]);
    expect(phase.length).toBe(3);
  });
});

describe("laplacianSmoother", () => {
  it("returns same length", () => {
    const out = laplacianSmoother([1, 10, 1, 10, 1], 0.5);
    expect(out.length).toBe(5);
  });

  it("empty signal → []", () => {
    expect(laplacianSmoother([])).toEqual([]);
  });

  it("flat signal is unchanged", () => {
    const signal = [3, 3, 3, 3, 3];
    const out = laplacianSmoother(signal, 0.5);
    out.forEach((v) => expect(v).toBeCloseTo(3, 3));
  });

  it("smoothed spike is attenuated", () => {
    const signal = [0, 0, 100, 0, 0];
    const out = laplacianSmoother(signal, 1.0);
    // The center value should be reduced from 100
    expect(out[2] ?? 0).toBeLessThan(100);
    expect(out[2] ?? 0).toBeGreaterThan(0);
  });

  it("lambda=0 → no smoothing", () => {
    const signal = [1, 5, 2, 8, 3];
    const out = laplacianSmoother(signal, 0);
    out.forEach((v, i) => expect(v).toBeCloseTo(signal[i] ?? 0, 3));
  });
});

describe("movingAverageFilter", () => {
  it("windowSize=1 → same signal", () => {
    const signal = [1, 2, 3, 4, 5];
    const out = movingAverageFilter(signal, 1);
    out.forEach((v, i) => expect(v).toBeCloseTo(signal[i] ?? 0, 8));
  });

  it("causal window=3 at index 2: avg of [1,2,3]=2", () => {
    const out = movingAverageFilter([1, 2, 3, 4, 5], 3);
    expect(out[2]).toBeCloseTo(2, 8);
  });

  it("first element equals itself (causal, only 1 point available)", () => {
    const out = movingAverageFilter([10, 20, 30], 3);
    expect(out[0]).toBeCloseTo(10, 8);
  });

  it("window=2 at index 1: avg of [5,10]=7.5", () => {
    const out = movingAverageFilter([5, 10, 15], 2);
    expect(out[1]).toBeCloseTo(7.5, 8);
  });

  it("empty signal → []", () => {
    expect(movingAverageFilter([], 3)).toEqual([]);
  });

  it("smooths a noisy signal (output variance < input variance)", () => {
    const noisy = [1, 10, 2, 9, 3, 8, 2, 10];
    const smooth = movingAverageFilter(noisy, 3);
    const varOf = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    };
    expect(varOf(smooth)).toBeLessThan(varOf(noisy));
  });
});

// ---------------------------------------------------------------------------
// 6. Sports applications
// ---------------------------------------------------------------------------

describe("velocityFromPosition", () => {
  it("uniform motion: positions=[0,1,2,3], times=[0,1,2,3] → v=1 everywhere", () => {
    const v = velocityFromPosition([0, 1, 2, 3], [0, 1, 2, 3]);
    v.forEach((vel) => expect(vel).toBeCloseTo(1, 8));
  });

  it("zero motion → zero velocity", () => {
    const v = velocityFromPosition([5, 5, 5], [0, 1, 2]);
    v.forEach((vel) => expect(vel).toBeCloseTo(0, 8));
  });

  it("returns same length as positions", () => {
    const v = velocityFromPosition([1, 4, 9, 16], [0, 1, 2, 3]);
    expect(v.length).toBe(4);
  });

  it("single point → [0]", () => {
    const v = velocityFromPosition([7], [0]);
    expect(v[0]).toBeCloseTo(0, 8);
  });

  it("accelerating motion: p=t² at t=[0,1,2,3], central diff v[1]=(4-0)/2=2", () => {
    const positions = [0, 1, 4, 9];
    const times = [0, 1, 2, 3];
    const v = velocityFromPosition(positions, times);
    // v[1] = (p[2]-p[0])/(t[2]-t[0]) = (4-0)/2 = 2
    expect(v[1]).toBeCloseTo(2, 8);
  });
});

describe("accelerationFromVelocity", () => {
  it("uniform velocity → zero acceleration", () => {
    const a = accelerationFromVelocity([5, 5, 5, 5], [0, 1, 2, 3]);
    a.forEach((acc) => expect(acc).toBeCloseTo(0, 8));
  });

  it("linearly increasing velocity (constant accel)", () => {
    const v = [0, 1, 2, 3]; // v = t
    const t = [0, 1, 2, 3];
    const a = accelerationFromVelocity(v, t);
    // Central diff at interior: a[1] = (v[2]-v[0])/(t[2]-t[0]) = 2/2 = 1
    expect(a[1]).toBeCloseTo(1, 8);
    expect(a[2]).toBeCloseTo(1, 8);
  });
});

describe("workFromForce", () => {
  it("constant force F=1 over s=[0,1] → W=1", () => {
    expect(workFromForce([1, 1], [0, 1])).toBeCloseTo(1, 8);
  });

  it("F=0 → W=0", () => {
    expect(workFromForce([0, 0, 0], [0, 1, 2])).toBeCloseTo(0, 8);
  });

  it("linearly increasing force", () => {
    // F=x over [0,2]: W = ∫₀² x dx = 2
    expect(workFromForce([0, 1, 2], [0, 1, 2])).toBeCloseTo(2, 8);
  });

  it("single point → 0", () => {
    expect(workFromForce([5], [0])).toBe(0);
  });
});

describe("powerCurve", () => {
  it("constant work rate → constant power", () => {
    const work = [0, 1, 2, 3];
    const times = [0, 1, 2, 3];
    const power = powerCurve(work, times);
    // Interior central diff: (2-0)/2 = 1
    expect(power[1]).toBeCloseTo(1, 8);
  });

  it("zero work → zero power", () => {
    const power = powerCurve([0, 0, 0], [0, 1, 2]);
    power.forEach((p) => expect(p).toBeCloseTo(0, 8));
  });

  it("output length matches work length", () => {
    const power = powerCurve([1, 4, 9], [0, 1, 2]);
    expect(power.length).toBe(3);
  });
});

describe("momentOfInertia", () => {
  it("I = m·r²: m=[1], r=[2] → 4", () => {
    expect(momentOfInertia([1], [2])).toBeCloseTo(4, 8);
  });

  it("two masses: m=[1,2], r=[1,2] → 1+8=9", () => {
    expect(momentOfInertia([1, 2], [1, 2])).toBeCloseTo(9, 8);
  });

  it("zero radius → zero contribution", () => {
    expect(momentOfInertia([100], [0])).toBeCloseTo(0, 8);
  });

  it("zero mass → zero", () => {
    expect(momentOfInertia([0, 0], [3, 4])).toBeCloseTo(0, 8);
  });
});

describe("trajectoryRange", () => {
  it("45° gives maximum range: R = v0²/g", () => {
    const v0 = 10;
    const g = 9.81;
    expect(trajectoryRange(v0, 45, g)).toBeCloseTo(v0 * v0 / g, 5);
  });

  it("0° → zero range", () => {
    expect(trajectoryRange(10, 0)).toBeCloseTo(0, 8);
  });

  it("90° → zero range (straight up)", () => {
    expect(trajectoryRange(10, 90)).toBeCloseTo(0, 8);
  });

  it("default g = 9.81", () => {
    const r = trajectoryRange(20, 30);
    expect(r).toBeCloseTo(20 * 20 * Math.sin(Math.PI / 3) / 9.81, 4);
  });

  it("symmetric: angle and 90-angle give same range", () => {
    const r30 = trajectoryRange(15, 30);
    const r60 = trajectoryRange(15, 60);
    expect(r30).toBeCloseTo(r60, 5);
  });
});

describe("spinRPMToRad", () => {
  it("60 RPM → 2π rad/s", () => {
    expect(spinRPMToRad(60)).toBeCloseTo(2 * Math.PI, 8);
  });

  it("0 RPM → 0 rad/s", () => {
    expect(spinRPMToRad(0)).toBeCloseTo(0, 8);
  });

  it("120 RPM → 4π rad/s", () => {
    expect(spinRPMToRad(120)).toBeCloseTo(4 * Math.PI, 8);
  });

  it("1 RPM → 2π/60 rad/s", () => {
    expect(spinRPMToRad(1)).toBeCloseTo(2 * Math.PI / 60, 8);
  });
});

describe("dragForce", () => {
  it("v=0 → F=0", () => {
    expect(dragForce(0)).toBeCloseTo(0, 8);
  });

  it("F scales with v²: doubling v quadruples F", () => {
    const f1 = dragForce(10);
    const f2 = dragForce(20);
    expect(f2).toBeCloseTo(4 * f1, 5);
  });

  it("default parameters: Cd=0.47, A=0.045, rho=1.225", () => {
    const v = 10;
    const expected = 0.5 * 0.47 * 0.045 * 1.225 * v * v;
    expect(dragForce(v)).toBeCloseTo(expected, 8);
  });

  it("custom Cd doubles force when Cd doubles", () => {
    const f1 = dragForce(10, 0.47);
    const f2 = dragForce(10, 0.94);
    expect(f2).toBeCloseTo(2 * f1, 5);
  });

  it("result is always non-negative", () => {
    expect(dragForce(5)).toBeGreaterThan(0);
  });
});
