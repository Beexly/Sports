import { describe, it, expect } from "vitest";
import {
  complex,
  fromPolar,
  re,
  im,
  isReal,
  isZero,
  equals,
  add,
  subtract,
  multiply,
  divide,
  scale,
  negate,
  magnitude,
  magnitudeSquared,
  argument,
  conjugate,
  reciprocal,
  power,
  sqrt,
  nthRoots,
  exp,
  log,
  sin,
  cos,
  tan,
  sinh,
  cosh,
  quadraticRoots,
  cubicDiscriminant,
  polynomialEval,
  toString,
  toPolarString,
  dotProductComplex,
  type Complex,
} from "@/lib/math/complex-numbers";

const TOL = 1e-9;
const I: Complex = complex(0, 1);
const ONE: Complex = complex(1, 0);
const ZERO: Complex = complex(0, 0);

/** Assert two complex numbers are close. */
function expectClose(a: Complex, b: Complex, tol = TOL): void {
  expect(a.re).toBeCloseTo(b.re, 9);
  expect(a.im).toBeCloseTo(b.im, 9);
  expect(equals(a, b, Math.max(tol, 1e-9))).toBe(true);
}

// ---------------------------------------------------------------------------
// Construction & basics
// ---------------------------------------------------------------------------
describe("complex / construction", () => {
  it("builds with both parts", () => {
    const z = complex(3, 4);
    expect(z.re).toBe(3);
    expect(z.im).toBe(4);
  });

  it("defaults imaginary part to 0", () => {
    const z = complex(5);
    expect(z.re).toBe(5);
    expect(z.im).toBe(0);
  });

  it("handles negative parts", () => {
    const z = complex(-2, -7);
    expect(z.re).toBe(-2);
    expect(z.im).toBe(-7);
  });

  it("handles zero", () => {
    const z = complex(0);
    expect(z.re).toBe(0);
    expect(z.im).toBe(0);
  });

  it("re accessor returns real part", () => {
    expect(re(complex(8, 2))).toBe(8);
  });

  it("im accessor returns imaginary part", () => {
    expect(im(complex(8, 2))).toBe(2);
  });

  it("re of real number", () => {
    expect(re(complex(42))).toBe(42);
  });

  it("im of real number is 0", () => {
    expect(im(complex(42))).toBe(0);
  });
});

describe("fromPolar", () => {
  it("magnitude 1 at angle 0 -> 1", () => {
    expectClose(fromPolar(1, 0), complex(1, 0));
  });

  it("magnitude 1 at angle pi/2 -> i", () => {
    expectClose(fromPolar(1, Math.PI / 2), I);
  });

  it("magnitude 2 at angle pi -> -2", () => {
    expectClose(fromPolar(2, Math.PI), complex(-2, 0));
  });

  it("magnitude 1 at angle -pi/2 -> -i", () => {
    expectClose(fromPolar(1, -Math.PI / 2), complex(0, -1));
  });

  it("magnitude 5 at angle pi/4", () => {
    const z = fromPolar(5, Math.PI / 4);
    expect(magnitude(z)).toBeCloseTo(5, 9);
    expect(argument(z)).toBeCloseTo(Math.PI / 4, 9);
  });

  it("zero magnitude gives zero", () => {
    expectClose(fromPolar(0, 1.234), ZERO);
  });

  it("round-trips through magnitude/argument", () => {
    const z = fromPolar(3.7, 0.9);
    expectClose(fromPolar(magnitude(z), argument(z)), z);
  });
});

describe("isReal / isZero / equals", () => {
  it("isReal true for real number", () => {
    expect(isReal(complex(5, 0))).toBe(true);
  });

  it("isReal false for complex", () => {
    expect(isReal(complex(5, 1))).toBe(false);
  });

  it("isReal respects tolerance", () => {
    expect(isReal(complex(5, 1e-15))).toBe(true);
    expect(isReal(complex(5, 1e-6))).toBe(false);
  });

  it("isReal custom tolerance", () => {
    expect(isReal(complex(5, 0.01), 0.1)).toBe(true);
  });

  it("isZero true for zero", () => {
    expect(isZero(ZERO)).toBe(true);
  });

  it("isZero false for nonzero", () => {
    expect(isZero(complex(0, 1))).toBe(false);
    expect(isZero(complex(1, 0))).toBe(false);
  });

  it("isZero respects tolerance", () => {
    expect(isZero(complex(1e-15, 1e-15))).toBe(true);
    expect(isZero(complex(1e-3, 0), 1e-2)).toBe(true);
  });

  it("equals true for identical", () => {
    expect(equals(complex(1, 2), complex(1, 2))).toBe(true);
  });

  it("equals false for different", () => {
    expect(equals(complex(1, 2), complex(1, 3))).toBe(false);
    expect(equals(complex(1, 2), complex(9, 2))).toBe(false);
  });

  it("equals within tolerance", () => {
    expect(equals(complex(1, 2), complex(1 + 1e-15, 2 - 1e-15))).toBe(true);
  });

  it("equals custom tolerance", () => {
    expect(equals(complex(1, 2), complex(1.05, 2.05), 0.1)).toBe(true);
    expect(equals(complex(1, 2), complex(1.5, 2), 0.1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------
describe("add", () => {
  it("adds two complex numbers", () => {
    expectClose(add(complex(1, 2), complex(3, 4)), complex(4, 6));
  });
  it("adds negatives", () => {
    expectClose(add(complex(1, 2), complex(-3, -4)), complex(-2, -2));
  });
  it("adds zero is identity", () => {
    expectClose(add(complex(7, -3), ZERO), complex(7, -3));
  });
  it("is commutative", () => {
    expectClose(add(complex(1, 2), complex(3, 4)), add(complex(3, 4), complex(1, 2)));
  });
});

describe("subtract", () => {
  it("subtracts two complex numbers", () => {
    expectClose(subtract(complex(5, 6), complex(1, 2)), complex(4, 4));
  });
  it("subtracting self gives zero", () => {
    expectClose(subtract(complex(3, 9), complex(3, 9)), ZERO);
  });
  it("subtract zero is identity", () => {
    expectClose(subtract(complex(3, 9), ZERO), complex(3, 9));
  });
  it("negative result", () => {
    expectClose(subtract(complex(1, 1), complex(2, 3)), complex(-1, -2));
  });
});

describe("multiply", () => {
  it("i * i = -1", () => {
    expectClose(multiply(I, I), complex(-1, 0));
  });
  it("(1+i)*(1-i) = 2", () => {
    expectClose(multiply(complex(1, 1), complex(1, -1)), complex(2, 0));
  });
  it("(2+3i)*(4+5i) = -7+22i", () => {
    expectClose(multiply(complex(2, 3), complex(4, 5)), complex(-7, 22));
  });
  it("multiply by 1 is identity", () => {
    expectClose(multiply(complex(3, 4), ONE), complex(3, 4));
  });
  it("multiply by 0 is zero", () => {
    expectClose(multiply(complex(3, 4), ZERO), ZERO);
  });
  it("is commutative", () => {
    expectClose(
      multiply(complex(2, 3), complex(4, 5)),
      multiply(complex(4, 5), complex(2, 3)),
    );
  });
  it("real * real", () => {
    expectClose(multiply(complex(3, 0), complex(4, 0)), complex(12, 0));
  });
});

describe("divide", () => {
  it("(2+0i)/(1+i) ", () => {
    // (1+i)*(1-i)=2 so 2/(1+i) = 1-i
    expectClose(divide(complex(2, 0), complex(1, 1)), complex(1, -1));
  });
  it("z / 1 is identity", () => {
    expectClose(divide(complex(3, 4), ONE), complex(3, 4));
  });
  it("z / z = 1", () => {
    expectClose(divide(complex(3, 4), complex(3, 4)), ONE);
  });
  it("(4+2i)/(1+i) = 3 - i", () => {
    expectClose(divide(complex(4, 2), complex(1, 1)), complex(3, -1));
  });
  it("throws RangeError on divide by zero", () => {
    expect(() => divide(complex(1, 1), ZERO)).toThrow(RangeError);
  });
  it("throws on divide by zero (message)", () => {
    expect(() => divide(complex(1, 1), ZERO)).toThrow(/division by zero/i);
  });
  it("divide then multiply round-trips", () => {
    const a = complex(7, -2);
    const b = complex(3, 5);
    expectClose(multiply(divide(a, b), b), a);
  });
});

describe("scale", () => {
  it("scales both parts", () => {
    expectClose(scale(complex(2, 3), 4), complex(8, 12));
  });
  it("scale by 0 is zero", () => {
    expectClose(scale(complex(2, 3), 0), ZERO);
  });
  it("scale by negative", () => {
    expectClose(scale(complex(2, 3), -1), complex(-2, -3));
  });
  it("scale by 1 is identity", () => {
    expectClose(scale(complex(2, 3), 1), complex(2, 3));
  });
});

describe("negate", () => {
  it("negates both parts", () => {
    expectClose(negate(complex(2, -3)), complex(-2, 3));
  });
  it("double negate is identity", () => {
    expectClose(negate(negate(complex(2, -3))), complex(2, -3));
  });
  it("negate zero is zero", () => {
    expectClose(negate(ZERO), ZERO);
  });
  it("z + (-z) = 0", () => {
    const z = complex(5, -8);
    expectClose(add(z, negate(z)), ZERO);
  });
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------
describe("magnitude", () => {
  it("|3+4i| = 5", () => {
    expect(magnitude(complex(3, 4))).toBeCloseTo(5, 9);
  });
  it("|0| = 0", () => {
    expect(magnitude(ZERO)).toBe(0);
  });
  it("|i| = 1", () => {
    expect(magnitude(I)).toBeCloseTo(1, 9);
  });
  it("|-3-4i| = 5", () => {
    expect(magnitude(complex(-3, -4))).toBeCloseTo(5, 9);
  });
  it("|real| is abs", () => {
    expect(magnitude(complex(-7, 0))).toBeCloseTo(7, 9);
  });
});

describe("magnitudeSquared", () => {
  it("of 3+4i = 25", () => {
    expect(magnitudeSquared(complex(3, 4))).toBeCloseTo(25, 9);
  });
  it("of 0 = 0", () => {
    expect(magnitudeSquared(ZERO)).toBe(0);
  });
  it("equals magnitude squared", () => {
    const z = complex(1.5, -2.3);
    expect(magnitudeSquared(z)).toBeCloseTo(magnitude(z) ** 2, 9);
  });
});

describe("argument", () => {
  it("arg(i) = pi/2", () => {
    expect(argument(I)).toBeCloseTo(Math.PI / 2, 9);
  });
  it("arg(1) = 0", () => {
    expect(argument(ONE)).toBeCloseTo(0, 9);
  });
  it("arg(-1) = pi", () => {
    expect(argument(complex(-1, 0))).toBeCloseTo(Math.PI, 9);
  });
  it("arg(-i) = -pi/2", () => {
    expect(argument(complex(0, -1))).toBeCloseTo(-Math.PI / 2, 9);
  });
  it("arg(1+i) = pi/4", () => {
    expect(argument(complex(1, 1))).toBeCloseTo(Math.PI / 4, 9);
  });
  it("range is within -pi..pi", () => {
    const a = argument(complex(-1, -1e-9));
    expect(a).toBeGreaterThanOrEqual(-Math.PI);
    expect(a).toBeLessThanOrEqual(Math.PI);
  });
});

describe("conjugate", () => {
  it("conj(3+4i) = 3-4i", () => {
    expectClose(conjugate(complex(3, 4)), complex(3, -4));
  });
  it("conj of real is itself", () => {
    expectClose(conjugate(complex(5, 0)), complex(5, 0));
  });
  it("double conjugate is identity", () => {
    expectClose(conjugate(conjugate(complex(3, 4))), complex(3, 4));
  });
  it("z * conj(z) = |z|^2 (real)", () => {
    const z = complex(3, 4);
    expectClose(multiply(z, conjugate(z)), complex(25, 0));
  });
});

describe("reciprocal", () => {
  it("1/i = -i", () => {
    expectClose(reciprocal(I), complex(0, -1));
  });
  it("1/(1+i) = 0.5 - 0.5i", () => {
    expectClose(reciprocal(complex(1, 1)), complex(0.5, -0.5));
  });
  it("z * reciprocal(z) = 1", () => {
    const z = complex(2, -3);
    expectClose(multiply(z, reciprocal(z)), ONE);
  });
  it("throws on zero", () => {
    expect(() => reciprocal(ZERO)).toThrow(RangeError);
  });
  it("reciprocal of real", () => {
    expectClose(reciprocal(complex(4, 0)), complex(0.25, 0));
  });
});

// ---------------------------------------------------------------------------
// Powers & roots
// ---------------------------------------------------------------------------
describe("power", () => {
  it("De Moivre: (1+i)^2 = 2i", () => {
    expectClose(power(complex(1, 1), 2), complex(0, 2));
  });
  it("z^0 = 1", () => {
    expectClose(power(complex(3, 4), 0), ONE);
  });
  it("z^1 = z", () => {
    expectClose(power(complex(3, 4), 1), complex(3, 4));
  });
  it("i^2 = -1", () => {
    expectClose(power(I, 2), complex(-1, 0));
  });
  it("i^4 = 1", () => {
    expectClose(power(I, 4), ONE);
  });
  it("(1+i)^4 = -4", () => {
    expectClose(power(complex(1, 1), 4), complex(-4, 0));
  });
  it("2^3 (real) = 8", () => {
    expectClose(power(complex(2, 0), 3), complex(8, 0));
  });
  it("z^-1 = reciprocal", () => {
    const z = complex(2, 3);
    expectClose(power(z, -1), reciprocal(z));
  });
  it("z^0.5 squared = z", () => {
    const z = complex(3, 4);
    expectClose(power(power(z, 0.5), 2), z);
  });
});

describe("sqrt", () => {
  it("sqrt(-1) = i", () => {
    expectClose(sqrt(complex(-1, 0)), I);
  });
  it("sqrt(0) = 0", () => {
    expectClose(sqrt(ZERO), ZERO);
  });
  it("sqrt(4) = 2", () => {
    expectClose(sqrt(complex(4, 0)), complex(2, 0));
  });
  it("sqrt(2i) = 1+i", () => {
    expectClose(sqrt(complex(0, 2)), complex(1, 1));
  });
  it("sqrt(z)^2 = z", () => {
    const z = complex(3, -4);
    expectClose(multiply(sqrt(z), sqrt(z)), z);
  });
  it("sqrt(-4) = 2i", () => {
    expectClose(sqrt(complex(-4, 0)), complex(0, 2));
  });
  it("sqrt(3+4i) = 2+i", () => {
    expectClose(sqrt(complex(3, 4)), complex(2, 1));
  });
  it("principal root has non-negative real part", () => {
    expect(sqrt(complex(-9, 0)).re).toBeGreaterThanOrEqual(0);
  });
});

describe("nthRoots", () => {
  it("3 cube roots of unity", () => {
    const roots = nthRoots(ONE, 3);
    expect(roots.length).toBe(3);
    // Each root cubed should be 1.
    for (const r of roots) {
      expectClose(power(r, 3), ONE);
    }
  });
  it("cube roots of unity include 1", () => {
    const roots = nthRoots(ONE, 3);
    const hasOne = roots.some((r) => equals(r, ONE, 1e-9));
    expect(hasOne).toBe(true);
  });
  it("cube roots of unity sum to zero", () => {
    const roots = nthRoots(ONE, 3);
    let s = ZERO;
    for (const r of roots) s = add(s, r);
    expectClose(s, ZERO);
  });
  it("square roots of -1 are i and -i", () => {
    const roots = nthRoots(complex(-1, 0), 2);
    expect(roots.length).toBe(2);
    for (const r of roots) {
      expectClose(power(r, 2), complex(-1, 0));
    }
  });
  it("4 fourth roots of unity", () => {
    const roots = nthRoots(ONE, 4);
    expect(roots.length).toBe(4);
    for (const r of roots) {
      expectClose(power(r, 4), ONE);
    }
  });
  it("n=1 returns the number itself", () => {
    const roots = nthRoots(complex(5, 2), 1);
    expect(roots.length).toBe(1);
    expectClose(roots[0] ?? ZERO, complex(5, 2));
  });
  it("n=0 returns empty", () => {
    expect(nthRoots(ONE, 0)).toEqual([]);
  });
  it("negative n returns empty", () => {
    expect(nthRoots(ONE, -3)).toEqual([]);
  });
  it("all roots have equal magnitude", () => {
    const roots = nthRoots(complex(8, 0), 3);
    const expected = Math.cbrt(8);
    for (const r of roots) {
      expect(magnitude(r)).toBeCloseTo(expected, 9);
    }
  });
});

describe("exp", () => {
  it("Euler: exp(i*pi) ~ -1", () => {
    expectClose(exp(complex(0, Math.PI)), complex(-1, 0), 1e-9);
  });
  it("exp(0) = 1", () => {
    expectClose(exp(ZERO), ONE);
  });
  it("exp(1) = e", () => {
    expectClose(exp(complex(1, 0)), complex(Math.E, 0));
  });
  it("exp(i*pi/2) = i", () => {
    expectClose(exp(complex(0, Math.PI / 2)), I);
  });
  it("exp(a+b) = exp(a)*exp(b)", () => {
    const a = complex(1, 2);
    const b = complex(-0.5, 1);
    expectClose(exp(add(a, b)), multiply(exp(a), exp(b)));
  });
  it("exp(2*i*pi) ~ 1", () => {
    expectClose(exp(complex(0, 2 * Math.PI)), ONE, 1e-9);
  });
});

describe("log", () => {
  it("log(1) = 0", () => {
    expectClose(log(ONE), ZERO);
  });
  it("log(e) = 1", () => {
    expectClose(log(complex(Math.E, 0)), ONE);
  });
  it("log(i) = i*pi/2", () => {
    expectClose(log(I), complex(0, Math.PI / 2));
  });
  it("log(-1) = i*pi", () => {
    expectClose(log(complex(-1, 0)), complex(0, Math.PI));
  });
  it("exp(log(z)) = z", () => {
    const z = complex(3, 4);
    expectClose(exp(log(z)), z);
  });
  it("throws on zero", () => {
    expect(() => log(ZERO)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Trig / hyperbolic
// ---------------------------------------------------------------------------
describe("sin / cos / tan", () => {
  it("sin(0) = 0", () => {
    expectClose(sin(ZERO), ZERO);
  });
  it("cos(0) = 1", () => {
    expectClose(cos(ZERO), ONE);
  });
  it("sin(pi/2) = 1", () => {
    expectClose(sin(complex(Math.PI / 2, 0)), ONE);
  });
  it("cos(pi) = -1", () => {
    expectClose(cos(complex(Math.PI, 0)), complex(-1, 0));
  });
  it("sin(pi) ~ 0", () => {
    expectClose(sin(complex(Math.PI, 0)), ZERO, 1e-9);
  });
  it("sin^2 + cos^2 = 1 (complex)", () => {
    const z = complex(1, 2);
    const s = sin(z);
    const c = cos(z);
    expectClose(add(multiply(s, s), multiply(c, c)), ONE);
  });
  it("tan(0) = 0", () => {
    expectClose(tan(ZERO), ZERO);
  });
  it("tan = sin/cos", () => {
    const z = complex(0.5, 0.3);
    expectClose(tan(z), divide(sin(z), cos(z)));
  });
  it("sin(i) = i*sinh(1)", () => {
    expectClose(sin(I), complex(0, Math.sinh(1)));
  });
  it("cos(i) = cosh(1)", () => {
    expectClose(cos(I), complex(Math.cosh(1), 0));
  });
});

describe("sinh / cosh", () => {
  it("sinh(0) = 0", () => {
    expectClose(sinh(ZERO), ZERO);
  });
  it("cosh(0) = 1", () => {
    expectClose(cosh(ZERO), ONE);
  });
  it("sinh(1) (real)", () => {
    expectClose(sinh(complex(1, 0)), complex(Math.sinh(1), 0));
  });
  it("cosh(1) (real)", () => {
    expectClose(cosh(complex(1, 0)), complex(Math.cosh(1), 0));
  });
  it("cosh^2 - sinh^2 = 1 (complex)", () => {
    const z = complex(0.7, 1.1);
    const sh = sinh(z);
    const ch = cosh(z);
    expectClose(subtract(multiply(ch, ch), multiply(sh, sh)), ONE);
  });
  it("sinh(i) = i*sin(1)", () => {
    expectClose(sinh(I), complex(0, Math.sin(1)));
  });
  it("cosh(i) = cos(1)", () => {
    expectClose(cosh(I), complex(Math.cos(1), 0));
  });
});

// ---------------------------------------------------------------------------
// Polynomial roots
// ---------------------------------------------------------------------------
describe("quadraticRoots", () => {
  it("x^2 - 1 -> 1 and -1", () => {
    const roots = quadraticRoots(1, 0, -1);
    expect(roots.length).toBe(2);
    expectClose(roots[0] ?? ZERO, complex(1, 0));
    expectClose(roots[1] ?? ZERO, complex(-1, 0));
  });
  it("x^2 + 1 -> i and -i (negative discriminant)", () => {
    const roots = quadraticRoots(1, 0, 1);
    expect(roots.length).toBe(2);
    expectClose(roots[0] ?? ZERO, I);
    expectClose(roots[1] ?? ZERO, complex(0, -1));
  });
  it("x^2 - 5x + 6 -> 3 and 2", () => {
    const roots = quadraticRoots(1, -5, 6);
    expectClose(roots[0] ?? ZERO, complex(3, 0));
    expectClose(roots[1] ?? ZERO, complex(2, 0));
  });
  it("repeated root x^2 - 2x + 1 -> 1, 1", () => {
    const roots = quadraticRoots(1, -2, 1);
    expectClose(roots[0] ?? ZERO, complex(1, 0));
    expectClose(roots[1] ?? ZERO, complex(1, 0));
  });
  it("complex conjugate pair x^2 - 2x + 5 -> 1+2i, 1-2i", () => {
    const roots = quadraticRoots(1, -2, 5);
    expectClose(roots[0] ?? ZERO, complex(1, 2));
    expectClose(roots[1] ?? ZERO, complex(1, -2));
  });
  it("roots satisfy the equation", () => {
    const roots = quadraticRoots(2, -4, 10);
    for (const r of roots) {
      expectClose(polynomialEval([2, -4, 10], r), ZERO, 1e-8);
    }
  });
  it("a=0 throws RangeError", () => {
    expect(() => quadraticRoots(0, 2, 1)).toThrow(RangeError);
  });
  it("sum of roots = -b/a", () => {
    const roots = quadraticRoots(1, -7, 12);
    const s = add(roots[0] ?? ZERO, roots[1] ?? ZERO);
    expectClose(s, complex(7, 0));
  });
  it("product of roots = c/a", () => {
    const roots = quadraticRoots(1, -7, 12);
    const p = multiply(roots[0] ?? ZERO, roots[1] ?? ZERO);
    expectClose(p, complex(12, 0));
  });
});

describe("cubicDiscriminant", () => {
  it("x^3 - 1 has negative discriminant (one real root)", () => {
    expect(cubicDiscriminant(1, 0, 0, -1)).toBeLessThan(0);
  });
  it("(x-1)(x-2)(x-3) has positive discriminant (3 distinct real)", () => {
    // x^3 - 6x^2 + 11x - 6
    expect(cubicDiscriminant(1, -6, 11, -6)).toBeGreaterThan(0);
  });
  it("(x-1)^2(x-2) has zero discriminant (repeated root)", () => {
    // x^3 - 4x^2 + 5x - 2
    expect(cubicDiscriminant(1, -4, 5, -2)).toBeCloseTo(0, 6);
  });
  it("matches known formula for x^3 - x", () => {
    // x^3 + 0x^2 - x + 0 ; roots -1,0,1 distinct -> positive
    expect(cubicDiscriminant(1, 0, -1, 0)).toBeGreaterThan(0);
  });
  it("scales as expected for known cubic", () => {
    // x^3 - 3x + 2 = (x-1)^2(x+2) -> repeated root -> disc 0
    expect(cubicDiscriminant(1, 0, -3, 2)).toBeCloseTo(0, 6);
  });
});

describe("polynomialEval", () => {
  it("Horner: x^2-1 at x=2 = 3", () => {
    expectClose(polynomialEval([1, 0, -1], complex(2, 0)), complex(3, 0));
  });
  it("x^2-1 at x=i = -2", () => {
    expectClose(polynomialEval([1, 0, -1], I), complex(-2, 0));
  });
  it("constant polynomial", () => {
    expectClose(polynomialEval([7], complex(99, 99)), complex(7, 0));
  });
  it("linear 2x+1 at x=3 = 7", () => {
    expectClose(polynomialEval([2, 1], complex(3, 0)), complex(7, 0));
  });
  it("empty coeffs evaluates to 0", () => {
    expectClose(polynomialEval([], complex(5, 5)), ZERO);
  });
  it("cubic x^3 at x=1+i", () => {
    // (1+i)^3 = -2+2i
    expectClose(polynomialEval([1, 0, 0, 0], complex(1, 1)), complex(-2, 2));
  });
  it("evaluates with complex coefficients via real inputs", () => {
    // x^2 + 2x + 1 = (x+1)^2 ; at x=-1 -> 0
    expectClose(polynomialEval([1, 2, 1], complex(-1, 0)), ZERO);
  });
  it("at x=0 returns constant term", () => {
    expectClose(polynomialEval([3, 5, 9], ZERO), complex(9, 0));
  });
});

// ---------------------------------------------------------------------------
// Formatting & vectors
// ---------------------------------------------------------------------------
describe("toString", () => {
  it("real number", () => {
    expect(toString(complex(3, 0))).toBe("3");
  });
  it("a + bi", () => {
    expect(toString(complex(3, 4))).toBe("3 + 4i");
  });
  it("a - bi", () => {
    expect(toString(complex(3, -4))).toBe("3 - 4i");
  });
  it("pure imaginary 2i", () => {
    expect(toString(complex(0, 2))).toBe("2i");
  });
  it("pure imaginary -2i", () => {
    expect(toString(complex(0, -2))).toBe("-2i");
  });
  it("pure imaginary i (coefficient 1)", () => {
    expect(toString(complex(0, 1))).toBe("i");
  });
  it("pure imaginary -i", () => {
    expect(toString(complex(0, -1))).toBe("-i");
  });
  it("a + i (im coefficient 1)", () => {
    expect(toString(complex(2, 1))).toBe("2 + i");
  });
  it("a - i", () => {
    expect(toString(complex(2, -1))).toBe("2 - i");
  });
  it("zero", () => {
    expect(toString(ZERO)).toBe("0");
  });
  it("rounds to precision and trims zeros", () => {
    expect(toString(complex(1.23456, 2.5), 2)).toBe("1.23 + 2.5i");
  });
  it("respects custom precision", () => {
    expect(toString(complex(1 / 3, 0), 3)).toBe("0.333");
  });
  it("never renders -0", () => {
    expect(toString(complex(-0, 0))).toBe("0");
  });
  it("negative real with positive imaginary", () => {
    expect(toString(complex(-3, 4))).toBe("-3 + 4i");
  });
});

describe("toPolarString", () => {
  it("formats r and theta", () => {
    // 1+i -> r=sqrt2, theta=pi/4
    const s = toPolarString(complex(1, 1), 4);
    expect(s).toContain("∠");
    const [r, theta] = s.split("∠");
    expect(Number(r)).toBeCloseTo(Math.SQRT2, 3);
    expect(Number(theta)).toBeCloseTo(Math.PI / 4, 3);
  });
  it("i -> 1 at pi/2", () => {
    const s = toPolarString(I, 4);
    const [r, theta] = s.split("∠");
    expect(Number(r)).toBeCloseTo(1, 3);
    expect(Number(theta)).toBeCloseTo(Math.PI / 2, 3);
  });
  it("real positive at angle 0", () => {
    const s = toPolarString(complex(5, 0), 4);
    const [r, theta] = s.split("∠");
    expect(Number(r)).toBeCloseTo(5, 3);
    expect(Number(theta)).toBeCloseTo(0, 3);
  });
  it("uses the separator", () => {
    expect(toPolarString(complex(3, 4)).includes("∠")).toBe(true);
  });
});

describe("dotProductComplex", () => {
  it("uses conjugate of second vector", () => {
    // a=[i], b=[i] -> i * conj(i) = i * -i = 1
    const result = dotProductComplex([I], [I]);
    expectClose(result, ONE);
  });
  it("real vectors behave like real dot product", () => {
    const a = [complex(1, 0), complex(2, 0), complex(3, 0)];
    const b = [complex(4, 0), complex(5, 0), complex(6, 0)];
    // 1*4 + 2*5 + 3*6 = 32
    expectClose(dotProductComplex(a, b), complex(32, 0));
  });
  it("self dot product gives sum of magnitudes squared (real)", () => {
    const a = [complex(3, 4), complex(0, 1)];
    // |3+4i|^2 + |i|^2 = 25 + 1 = 26
    const result = dotProductComplex(a, a);
    expectClose(result, complex(26, 0));
    expect(isReal(result)).toBe(true);
  });
  it("mismatched lengths returns zero", () => {
    expectClose(dotProductComplex([I, ONE], [I]), ZERO);
  });
  it("empty vectors return zero", () => {
    expectClose(dotProductComplex([], []), ZERO);
  });
  it("general complex example", () => {
    // a=[1+i], b=[2-i] -> (1+i)*conj(2-i) = (1+i)*(2+i) = 2+i+2i-1 = 1+3i
    expectClose(dotProductComplex([complex(1, 1)], [complex(2, -1)]), complex(1, 3));
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting identities (extra coverage)
// ---------------------------------------------------------------------------
describe("identities", () => {
  it("Euler formula exp(i*theta) = cos + i*sin", () => {
    const theta = 0.7;
    expectClose(exp(complex(0, theta)), complex(Math.cos(theta), Math.sin(theta)));
  });
  it("|z1*z2| = |z1|*|z2|", () => {
    const z1 = complex(3, 4);
    const z2 = complex(1, 2);
    expect(magnitude(multiply(z1, z2))).toBeCloseTo(
      magnitude(z1) * magnitude(z2),
      9,
    );
  });
  it("arg(z1*z2) = arg(z1)+arg(z2)", () => {
    const z1 = complex(1, 1);
    const z2 = complex(0, 1);
    expect(argument(multiply(z1, z2))).toBeCloseTo(
      argument(z1) + argument(z2),
      9,
    );
  });
  it("conj(a*b) = conj(a)*conj(b)", () => {
    const a = complex(2, 3);
    const b = complex(4, -1);
    expectClose(conjugate(multiply(a, b)), multiply(conjugate(a), conjugate(b)));
  });
  it("conj(a+b) = conj(a)+conj(b)", () => {
    const a = complex(2, 3);
    const b = complex(4, -1);
    expectClose(conjugate(add(a, b)), add(conjugate(a), conjugate(b)));
  });
  it("distributive: a*(b+c) = a*b + a*c", () => {
    const a = complex(2, 1);
    const b = complex(1, -1);
    const c = complex(0, 3);
    expectClose(
      multiply(a, add(b, c)),
      add(multiply(a, b), multiply(a, c)),
    );
  });
  it("log(a*b) = log(a)+log(b) (principal, small args)", () => {
    const a = complex(1, 1);
    const b = complex(2, 0);
    expectClose(log(multiply(a, b)), add(log(a), log(b)));
  });
  it("power matches repeated multiply", () => {
    const z = complex(1, 2);
    expectClose(power(z, 3), multiply(multiply(z, z), z));
  });
});
