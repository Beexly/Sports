/**
 * Easing functions — pure math, zero dependencies.
 *
 * Standard CSS-equivalent and physics-based easing.
 * All functions take t ∈ [0,1] and return a value in (approximately) [0,1].
 * Elastic and back easings may slightly exceed [0,1].
 *
 * Reference: https://easings.net (Robert Penner's equations, public domain)
 */

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Clamp t to [0, 1]. */
export function clampT(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/**
 * Lerp with easing: interpolates from `start` to `end` using `easingFn(t)`.
 */
export function applyEasing(
  start: number,
  end: number,
  t: number,
  easingFn: (t: number) => number,
): number {
  return start + (end - start) * easingFn(t);
}

// ---------------------------------------------------------------------------
// Linear
// ---------------------------------------------------------------------------

export function easeLinear(t: number): number {
  return t;
}

// ---------------------------------------------------------------------------
// Quadratic
// ---------------------------------------------------------------------------

export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ---------------------------------------------------------------------------
// Cubic
// ---------------------------------------------------------------------------

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ---------------------------------------------------------------------------
// Quartic
// ---------------------------------------------------------------------------

export function easeInQuart(t: number): number {
  return t * t * t * t;
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// ---------------------------------------------------------------------------
// Sine
// ---------------------------------------------------------------------------

export function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

export function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ---------------------------------------------------------------------------
// Exponential
// ---------------------------------------------------------------------------

export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutExpo(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

// ---------------------------------------------------------------------------
// Circular
// ---------------------------------------------------------------------------

export function easeInCirc(t: number): number {
  return 1 - Math.sqrt(1 - t * t);
}

export function easeOutCirc(t: number): number {
  return Math.sqrt(1 - Math.pow(t - 1, 2));
}

export function easeInOutCirc(t: number): number {
  return t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
}

// ---------------------------------------------------------------------------
// Back (overshoots)
// ---------------------------------------------------------------------------

export function easeInBack(t: number, overshoot = 1.70158): number {
  const c3 = overshoot + 1;
  return c3 * t * t * t - overshoot * t * t;
}

export function easeOutBack(t: number, overshoot = 1.70158): number {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}

export function easeInOutBack(t: number, overshoot = 1.70158): number {
  const c2 = overshoot * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2;
}

// ---------------------------------------------------------------------------
// Elastic
// ---------------------------------------------------------------------------

export function easeInElastic(
  t: number,
  amplitude = 1,
  period = 0.3,
): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
  return -(
    amplitude *
    Math.pow(2, 10 * (t - 1)) *
    Math.sin(((t - 1 - s) * (2 * Math.PI)) / period)
  );
}

export function easeOutElastic(
  t: number,
  amplitude = 1,
  period = 0.3,
): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
  return (
    amplitude *
      Math.pow(2, -10 * t) *
      Math.sin(((t - s) * (2 * Math.PI)) / period) +
    1
  );
}

export function easeInOutElastic(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const period = 0.45;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / period)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / period)) / 2 + 1;
}

// ---------------------------------------------------------------------------
// Bounce
// ---------------------------------------------------------------------------

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    t -= 1.5 / d1;
    return n1 * t * t + 0.75;
  } else if (t < 2.5 / d1) {
    t -= 2.25 / d1;
    return n1 * t * t + 0.9375;
  } else {
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  }
}

export function easeInBounce(t: number): number {
  return 1 - easeOutBounce(1 - t);
}

export function easeInOutBounce(t: number): number {
  return t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * Discrete step function — jump at the START of each step (CSS `step-start`).
 */
export function stepsStart(t: number, steps: number): number {
  return Math.min(1, Math.ceil(t * steps) / steps);
}

/**
 * Discrete step function — jump at the END of each step (CSS `step-end`).
 */
export function stepsEnd(t: number, steps: number): number {
  return Math.min(1, Math.floor(t * steps) / steps);
}

// ---------------------------------------------------------------------------
// Cubic Bezier
// ---------------------------------------------------------------------------

/**
 * Returns a function that approximates the CSS `cubic-bezier(x1,y1,x2,y2)` curve.
 *
 * Presets:
 *   ease        = cubicBezier(0.25, 0.1, 0.25, 1.0)
 *   ease-in     = cubicBezier(0.42, 0, 1, 1)
 *   ease-out    = cubicBezier(0, 0, 0.58, 1)
 *   ease-in-out = cubicBezier(0.42, 0, 0.58, 1)
 *
 * Uses binary search on the x-parameter to find t, then evaluates y.
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  // Bernstein polynomial for x(t) and y(t)
  function sampleX(t: number): number {
    return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  }
  function sampleY(t: number): number {
    return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  }

  return function bezierEasing(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Binary search to find t such that sampleX(t) ≈ x
    let lo = 0;
    let hi = 1;
    let t = x; // initial guess

    for (let i = 0; i < 30; i++) {
      const xGuess = sampleX(t);
      if (Math.abs(xGuess - x) < 1e-7) break;
      if (xGuess < x) {
        lo = t;
      } else {
        hi = t;
      }
      t = (lo + hi) / 2;
    }

    return sampleY(t);
  };
}

// ---------------------------------------------------------------------------
// Convenience map
// ---------------------------------------------------------------------------

export const EASINGS = {
  linear: easeLinear,
  inQuad: easeInQuad,
  outQuad: easeOutQuad,
  inOutQuad: easeInOutQuad,
  inCubic: easeInCubic,
  outCubic: easeOutCubic,
  inOutCubic: easeInOutCubic,
  inQuart: easeInQuart,
  outQuart: easeOutQuart,
  inOutQuart: easeInOutQuart,
  inSine: easeInSine,
  outSine: easeOutSine,
  inOutSine: easeInOutSine,
  inExpo: easeInExpo,
  outExpo: easeOutExpo,
  inOutExpo: easeInOutExpo,
  inCirc: easeInCirc,
  outCirc: easeOutCirc,
  inOutCirc: easeInOutCirc,
  inBack: easeInBack,
  outBack: easeOutBack,
  inOutBack: easeInOutBack,
  inElastic: easeInElastic,
  outElastic: easeOutElastic,
  inOutElastic: easeInOutElastic,
  outBounce: easeOutBounce,
  inBounce: easeInBounce,
  inOutBounce: easeInOutBounce,
} as const;

export type EasingName = keyof typeof EASINGS;
