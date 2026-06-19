/**
 * complex-numbers.ts
 *
 * Pure TypeScript complex-number math library for Galaxy Sports Edge.
 *
 * Zero npm dependencies (Node/TS built-ins only). No `any`. No classes —
 * a complex number is the plain {@link Complex} record and every operation
 * is a pure function operating on it.
 *
 * A complex number z = re + im·i is represented as `{ re, im }`.
 */

/** A complex number z = re + im·i. */
export interface Complex {
  /** Real part. */
  re: number;
  /** Imaginary part (coefficient of i). */
  im: number;
}

// ---------------------------------------------------------------------------
// 1. Construction & basics
// ---------------------------------------------------------------------------

/**
 * Construct a complex number. The imaginary part defaults to 0, so
 * `complex(5)` is the real number 5.
 */
export function complex(re: number, im = 0): Complex {
  return { re, im };
}

/**
 * Construct a complex number from polar coordinates:
 * z = magnitude · (cos θ + i·sin θ).
 */
export function fromPolar(magnitude: number, angleRad: number): Complex {
  return {
    re: magnitude * Math.cos(angleRad),
    im: magnitude * Math.sin(angleRad),
  };
}

/** Real part accessor. */
export function re(z: Complex): number {
  return z.re;
}

/** Imaginary part accessor. */
export function im(z: Complex): number {
  return z.im;
}

/** True when the imaginary part is within `tol` of zero. */
export function isReal(z: Complex, tol = 1e-12): boolean {
  return Math.abs(z.im) <= tol;
}

/** True when both parts are within `tol` of zero. */
export function isZero(z: Complex, tol = 1e-12): boolean {
  return Math.abs(z.re) <= tol && Math.abs(z.im) <= tol;
}

/** True when `a` and `b` are equal within `tol` on both components. */
export function equals(a: Complex, b: Complex, tol = 1e-12): boolean {
  return Math.abs(a.re - b.re) <= tol && Math.abs(a.im - b.im) <= tol;
}

// ---------------------------------------------------------------------------
// 2. Arithmetic
// ---------------------------------------------------------------------------

/** Sum: (a.re + b.re) + (a.im + b.im)·i. */
export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

/** Difference: (a.re - b.re) + (a.im - b.im)·i. */
export function subtract(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

/**
 * Product: (a·b) using the FOIL expansion
 * (a.re·b.re - a.im·b.im) + (a.re·b.im + a.im·b.re)·i.
 */
export function multiply(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

/**
 * Quotient a / b.
 *
 * @throws {RangeError} when `b` is zero (division by zero).
 */
export function divide(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) {
    throw new RangeError("Complex division by zero");
  }
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

/** Scalar multiply z by a real number k. */
export function scale(z: Complex, k: number): Complex {
  return { re: z.re * k, im: z.im * k };
}

/** Additive inverse: -z. */
export function negate(z: Complex): Complex {
  return { re: -z.re, im: -z.im };
}

// ---------------------------------------------------------------------------
// 3. Properties
// ---------------------------------------------------------------------------

/** Modulus |z| = sqrt(re² + im²), computed with Math.hypot for stability. */
export function magnitude(z: Complex): number {
  return Math.hypot(z.re, z.im);
}

/** |z|² = re² + im² (avoids the square root when only the square is needed). */
export function magnitudeSquared(z: Complex): number {
  return z.re * z.re + z.im * z.im;
}

/** Argument (phase) of z in radians via atan2, in the range (-π, π]. */
export function argument(z: Complex): number {
  return Math.atan2(z.im, z.re);
}

/** Complex conjugate: re - im·i. */
export function conjugate(z: Complex): Complex {
  return { re: z.re, im: -z.im };
}

/**
 * Multiplicative inverse 1 / z.
 *
 * @throws {RangeError} when `z` is zero.
 */
export function reciprocal(z: Complex): Complex {
  const denom = z.re * z.re + z.im * z.im;
  if (denom === 0) {
    throw new RangeError("Reciprocal of zero is undefined");
  }
  return { re: z.re / denom, im: -z.im / denom };
}

// ---------------------------------------------------------------------------
// 4. Powers & roots
// ---------------------------------------------------------------------------

/**
 * z raised to a real exponent n via De Moivre's theorem in polar form:
 * z^n = r^n · (cos(nθ) + i·sin(nθ)).
 *
 * Defined for fractional and negative n (principal branch through `argument`).
 * For z = 0 returns 0 (when n > 0) and is otherwise governed by Math.pow.
 */
export function power(z: Complex, n: number): Complex {
  if (n === 0) {
    return { re: 1, im: 0 };
  }
  const r = magnitude(z);
  const theta = argument(z);
  const rn = Math.pow(r, n);
  const angle = theta * n;
  return {
    re: rn * Math.cos(angle),
    im: rn * Math.sin(angle),
  };
}

/** Principal square root (the root with non-negative real part / on the cut). */
export function sqrt(z: Complex): Complex {
  if (z.re === 0 && z.im === 0) {
    return { re: 0, im: 0 };
  }
  const r = magnitude(z);
  // Principal-branch formula avoids cancellation and yields the root in the
  // right half-plane (or non-negative imaginary part on the negative real axis).
  const reOut = Math.sqrt((r + z.re) / 2);
  const imMag = Math.sqrt((r - z.re) / 2);
  const imOut = z.im < 0 ? -imMag : imMag;
  return { re: reOut, im: imOut };
}

/**
 * All n distinct nth roots of z, ordered by increasing argument.
 * Returns an empty array when n <= 0.
 */
export function nthRoots(z: Complex, n: number): Complex[] {
  if (n <= 0 || !Number.isInteger(n)) {
    return [];
  }
  const r = magnitude(z);
  const theta = argument(z);
  const rootR = Math.pow(r, 1 / n);
  const roots: Complex[] = [];
  for (let k = 0; k < n; k++) {
    const angle = (theta + 2 * Math.PI * k) / n;
    roots.push({
      re: rootR * Math.cos(angle),
      im: rootR * Math.sin(angle),
    });
  }
  return roots;
}

/** Complex exponential e^z = e^re · (cos im + i·sin im). */
export function exp(z: Complex): Complex {
  const expRe = Math.exp(z.re);
  return {
    re: expRe * Math.cos(z.im),
    im: expRe * Math.sin(z.im),
  };
}

/**
 * Principal natural logarithm: ln|z| + i·arg(z).
 *
 * @throws {RangeError} when `z` is zero (log undefined).
 */
export function log(z: Complex): Complex {
  if (z.re === 0 && z.im === 0) {
    throw new RangeError("Logarithm of zero is undefined");
  }
  return {
    re: Math.log(magnitude(z)),
    im: argument(z),
  };
}

// ---------------------------------------------------------------------------
// 5. Trig / hyperbolic
// ---------------------------------------------------------------------------

/** sin(z) = sin(re)·cosh(im) + i·cos(re)·sinh(im). */
export function sin(z: Complex): Complex {
  return {
    re: Math.sin(z.re) * Math.cosh(z.im),
    im: Math.cos(z.re) * Math.sinh(z.im),
  };
}

/** cos(z) = cos(re)·cosh(im) - i·sin(re)·sinh(im). */
export function cos(z: Complex): Complex {
  return {
    re: Math.cos(z.re) * Math.cosh(z.im),
    im: -Math.sin(z.re) * Math.sinh(z.im),
  };
}

/** tan(z) = sin(z) / cos(z). */
export function tan(z: Complex): Complex {
  return divide(sin(z), cos(z));
}

/** sinh(z) = sinh(re)·cos(im) + i·cosh(re)·sin(im). */
export function sinh(z: Complex): Complex {
  return {
    re: Math.sinh(z.re) * Math.cos(z.im),
    im: Math.cosh(z.re) * Math.sin(z.im),
  };
}

/** cosh(z) = cosh(re)·cos(im) + i·sinh(re)·sin(im). */
export function cosh(z: Complex): Complex {
  return {
    re: Math.cosh(z.re) * Math.cos(z.im),
    im: Math.sinh(z.re) * Math.sin(z.im),
  };
}

// ---------------------------------------------------------------------------
// 6. Polynomial roots
// ---------------------------------------------------------------------------

/**
 * Roots of the quadratic a·x² + b·x + c = 0.
 *
 * Handles a negative (complex) discriminant, returning a conjugate pair.
 * Returns two roots (which coincide when the discriminant is zero).
 *
 * @throws {RangeError} when a === 0 (not a quadratic).
 */
export function quadraticRoots(a: number, b: number, c: number): Complex[] {
  if (a === 0) {
    throw new RangeError("Coefficient 'a' must be non-zero for a quadratic");
  }
  const disc = b * b - 4 * a * c;
  const twoA = 2 * a;
  const sqrtDisc = sqrt({ re: disc, im: 0 });
  const negB: Complex = { re: -b, im: 0 };
  const root1 = scale(add(negB, sqrtDisc), 1 / twoA);
  const root2 = scale(subtract(negB, sqrtDisc), 1 / twoA);
  return [root1, root2];
}

/**
 * Discriminant of the cubic a·x³ + b·x² + c·x + d.
 *
 * Δ = 18abcd − 4b³d + b²c² − 4ac³ − 27a²d².
 * Δ > 0: three distinct real roots; Δ = 0: a repeated root;
 * Δ < 0: one real root and a complex-conjugate pair.
 */
export function cubicDiscriminant(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  return (
    18 * a * b * c * d -
    4 * b * b * b * d +
    b * b * c * c -
    4 * a * c * c * c -
    27 * a * a * d * d
  );
}

/**
 * Evaluate a polynomial at the complex point z using Horner's method.
 *
 * `coeffs` is ordered highest-degree first, e.g. [1, 0, -1] => x² − 1.
 * An empty coefficient list evaluates to 0.
 */
export function polynomialEval(coeffs: number[], z: Complex): Complex {
  let acc: Complex = { re: 0, im: 0 };
  for (let i = 0; i < coeffs.length; i++) {
    const coeff = coeffs[i] ?? 0;
    acc = add(multiply(acc, z), { re: coeff, im: 0 });
  }
  return acc;
}

// ---------------------------------------------------------------------------
// 7. Formatting & vectors
// ---------------------------------------------------------------------------

/** Trim trailing zeros from a fixed-precision string (e.g. "2.5000" -> "2.5"). */
function fmt(value: number, precision: number): string {
  // Normalize -0 to 0 so we never render "-0".
  const v = value === 0 ? 0 : value;
  const fixed = v.toFixed(precision);
  // Strip insignificant trailing zeros and a dangling decimal point.
  return fixed.replace(/\.?0+$/, "").replace(/^(-?\d+)$/, "$1");
}

/**
 * Human-readable "a + bi" form.
 *
 * - Pure real (im ≈ 0): "a"
 * - Pure imaginary (re ≈ 0, im ≠ 0): "bi" (e.g. "2i", "-i", "i")
 * - Otherwise: "a + bi" / "a - bi"
 */
export function toString(z: Complex, precision = 4): string {
  const reZero = Math.abs(z.re) <= 1e-12;
  const imZero = Math.abs(z.im) <= 1e-12;

  if (imZero) {
    return fmt(z.re, precision);
  }

  // Helper to render |im| as a coefficient, collapsing 1 -> "" so we get "i".
  const imAbs = Math.abs(z.im);
  const imCoeff = Math.abs(imAbs - 1) <= 1e-12 ? "" : fmt(imAbs, precision);

  if (reZero) {
    const sign = z.im < 0 ? "-" : "";
    return `${sign}${imCoeff}i`;
  }

  const reStr = fmt(z.re, precision);
  const op = z.im < 0 ? "-" : "+";
  return `${reStr} ${op} ${imCoeff}i`;
}

/** Polar "r∠θ" form, with both values rounded to `precision`. */
export function toPolarString(z: Complex, precision = 4): string {
  const r = fmt(magnitude(z), precision);
  const theta = fmt(argument(z), precision);
  return `${r}∠${theta}`;
}

/**
 * Hermitian dot product Σ aᵢ · conj(bᵢ).
 *
 * Returns 0 (the complex zero) when the vectors have mismatched lengths.
 */
export function dotProductComplex(a: Complex[], b: Complex[]): Complex {
  if (a.length !== b.length) {
    return { re: 0, im: 0 };
  }
  let acc: Complex = { re: 0, im: 0 };
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? { re: 0, im: 0 };
    const bi = b[i] ?? { re: 0, im: 0 };
    acc = add(acc, multiply(ai, conjugate(bi)));
  }
  return acc;
}
