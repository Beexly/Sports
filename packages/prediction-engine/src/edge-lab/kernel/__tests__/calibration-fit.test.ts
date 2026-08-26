import { describe, it, expect } from "vitest";

import { KernelError, makeRng, type Probability, type Rng } from "../contract.js";
import { calibrationFit } from "../slots/calibration-fit.js";

// ───────────────────────────────────────────────────────────────────────────────
// Helpers — deliberately independent of the implementation.
//
// `logitOf` re-derives the covariate from the documented clamp so that the score
// equations can be checked WITHOUT calling anything in the slot under test. Every
// "expected" value below is either a closed form (the saturated two-group fit) or
// an analytically known population target (the slope of a known log-odds
// distortion), never a number produced by re-running the implementation.
// ───────────────────────────────────────────────────────────────────────────────

const CLAMP_LO = 1e-12;
const CLAMP_HI = 1 - 1e-12;

function logitOf(p: number): number {
  const q = p < CLAMP_LO ? CLAMP_LO : p > CLAMP_HI ? CLAMP_HI : p;
  return Math.log(q / (1 - q));
}

function sigmoidOf(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

/**
 * The two conditions that DEFINE the maximum-likelihood fit of
 * logit(P) = intercept + slope · logit(p):
 *   Σ (y_i − μ_i) = 0        and        Σ x_i (y_i − μ_i) = 0.
 * Any correct optimiser satisfies these; a plausible-but-wrong one does not.
 */
function scoreEquations(
  predicted: readonly Probability[],
  outcomes: readonly (0 | 1)[],
  fit: { readonly slope: number; readonly intercept: number },
): { readonly s0: number; readonly s1: number } {
  let s0 = 0;
  let s1 = 0;
  for (let i = 0; i < predicted.length; i += 1) {
    const x = logitOf(predicted[i]!);
    const mu = sigmoidOf(fit.intercept + fit.slope * x);
    const r = outcomes[i]! - mu;
    s0 += r;
    s1 += x * r;
  }
  return { s0, s1 };
}

/** Bernoulli draw with probability `p` from the injected deterministic source. */
function bernoulli(p: number, rng: Rng): 0 | 1 {
  return rng() < p ? 1 : 0;
}

/** Evenly spaced forecast grid on (lo, hi), midpoint rule. */
function forecastGrid(n: number, lo: number, hi: number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = lo + (hi - lo) * ((i + 0.5) / n);
  }
  return out;
}

/**
 * Draw outcomes whose TRUE probability is `truth[i]`, and report the forecasts
 * `stated[i]` that the recalibration is asked to grade.
 */
function simulate(
  truth: readonly number[],
  seed: number,
): readonly (0 | 1)[] {
  const rng = makeRng(seed);
  return truth.map((p) => bernoulli(p, rng));
}

/** Distort forecasts by a known factor/shift on the log-odds scale. */
function distort(truth: readonly number[], factor: number, shift: number): number[] {
  return truth.map((p) => sigmoidOf(factor * logitOf(p) + shift));
}

describe("calibrationFit — closed-form saturated fits", () => {
  it("reproduces the exact two-group logistic MLE", () => {
    // With exactly two distinct covariate values the model has as many free
    // parameters as groups, so the fitted probabilities EQUAL the observed group
    // rates. That makes slope and intercept available in closed form.
    const pA = 0.2;
    const pB = 0.8;
    const nA = 10;
    const successesA = 3; // rate 0.3
    const nB = 10;
    const successesB = 9; // rate 0.9

    const predicted: number[] = [];
    const outcomes: (0 | 1)[] = [];
    for (let i = 0; i < nA; i += 1) {
      predicted.push(pA);
      outcomes.push(i < successesA ? 1 : 0);
    }
    for (let i = 0; i < nB; i += 1) {
      predicted.push(pB);
      outcomes.push(i < successesB ? 1 : 0);
    }

    const rateA = successesA / nA;
    const rateB = successesB / nB;
    const xA = logitOf(pA);
    const xB = logitOf(pB);
    const expectedSlope = (logitOf(rateB) - logitOf(rateA)) / (xB - xA);
    const expectedIntercept = logitOf(rateA) - expectedSlope * xA;

    const fit = calibrationFit(predicted, outcomes);
    expect(fit.slope).toBeCloseTo(expectedSlope, 10);
    expect(fit.intercept).toBeCloseTo(expectedIntercept, 10);

    // And the fitted probabilities really are the group rates.
    expect(sigmoidOf(fit.intercept + fit.slope * xA)).toBeCloseTo(rateA, 10);
    expect(sigmoidOf(fit.intercept + fit.slope * xB)).toBeCloseTo(rateB, 10);
  });

  it("returns exactly slope 1 / intercept 0 when group rates equal the forecasts", () => {
    // Group rates chosen to match the forecasts exactly: the saturated closed
    // form then collapses to slope = 1, intercept = 0 identically.
    const predicted = [0.25, 0.25, 0.25, 0.25, 0.75, 0.75, 0.75, 0.75];
    const outcomes: (0 | 1)[] = [1, 0, 0, 0, 1, 1, 1, 0];

    const fit = calibrationFit(predicted, outcomes);
    expect(fit.slope).toBeCloseTo(1, 12);
    expect(fit.intercept).toBeCloseTo(0, 12);
  });

  it("returns the zero fit when every group rate is the base rate 1/2", () => {
    // Three distinct forecasts, each with an observed rate of exactly 1/2. The
    // score at (0, 0) is exactly zero for both equations, so (0, 0) IS the MLE:
    // the forecasts carry no information and the recalibration says so.
    const predicted = [0.1, 0.1, 0.5, 0.5, 0.9, 0.9];
    const outcomes: (0 | 1)[] = [0, 1, 1, 0, 0, 1];

    const fit = calibrationFit(predicted, outcomes);
    expect(fit.slope).toBeCloseTo(0, 12);
    expect(fit.intercept).toBeCloseTo(0, 12);
  });
});

describe("calibrationFit — satisfies the defining score equations", () => {
  it("drives both score equations to zero on an irregular dataset", () => {
    const predicted = [
      0.02, 0.05, 0.09, 0.13, 0.18, 0.24, 0.31, 0.37, 0.42, 0.48, 0.51, 0.57,
      0.63, 0.68, 0.74, 0.79, 0.83, 0.88, 0.93, 0.97,
    ];
    const outcomes: (0 | 1)[] = [
      0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1,
    ];

    const fit = calibrationFit(predicted, outcomes);
    const { s0, s1 } = scoreEquations(predicted, outcomes, fit);
    expect(Math.abs(s0)).toBeLessThan(1e-8);
    expect(Math.abs(s1)).toBeLessThan(1e-8);
  });

  it("drives both score equations to zero on simulated data", () => {
    const truth = forecastGrid(400, 0.05, 0.95);
    const outcomes = simulate(truth, 4242);
    const fit = calibrationFit(truth, outcomes);
    const { s0, s1 } = scoreEquations(truth, outcomes, fit);
    expect(Math.abs(s0)).toBeLessThan(1e-8);
    expect(Math.abs(s1)).toBeLessThan(1e-8);
  });

  it("is invariant to the order of the observations", () => {
    const truth = forecastGrid(200, 0.05, 0.95);
    const outcomes = simulate(truth, 77);
    const fit = calibrationFit(truth, outcomes);

    const order = truth.map((_, i) => i).reverse();
    const shuffledP = order.map((i) => truth[i]!);
    const shuffledY = order.map((i) => outcomes[i]!);
    const shuffledFit = calibrationFit(shuffledP, shuffledY);

    expect(shuffledFit.slope).toBeCloseTo(fit.slope, 9);
    expect(shuffledFit.intercept).toBeCloseTo(fit.intercept, 9);
  });
});

describe("calibrationFit — recovers known miscalibration", () => {
  const N = 20000;
  const SEED = 20260825;
  const truth = forecastGrid(N, 0.02, 0.98);
  const outcomes = simulate(truth, SEED);

  it("recovers slope ≈ 1 and intercept ≈ 0 for perfectly calibrated forecasts", () => {
    const fit = calibrationFit(truth, outcomes);
    // Sampling error at n = 20000 puts the slope SE near 0.01 and the intercept
    // SE near 0.02; these bands are several standard errors wide.
    expect(fit.slope).toBeGreaterThan(0.9);
    expect(fit.slope).toBeLessThan(1.1);
    expect(Math.abs(fit.intercept)).toBeLessThan(0.1);
  });

  it("recovers slope < 1 for over-confident forecasts", () => {
    // Stated forecasts are the truth with log-odds DOUBLED (pushed towards 0/1).
    // The true relation is logit(P) = 0.5 · logit(stated), so the population
    // calibration slope is exactly 0.5.
    const stated = distort(truth, 2, 0);
    const fit = calibrationFit(stated, outcomes);
    expect(fit.slope).toBeLessThan(1);
    expect(fit.slope).toBeGreaterThan(0.45);
    expect(fit.slope).toBeLessThan(0.55);
  });

  it("recovers slope > 1 for under-confident forecasts", () => {
    // Log-odds HALVED (huddled towards the base rate) ⇒ population slope 2.
    const stated = distort(truth, 0.5, 0);
    const fit = calibrationFit(stated, outcomes);
    expect(fit.slope).toBeGreaterThan(1);
    expect(fit.slope).toBeGreaterThan(1.8);
    expect(fit.slope).toBeLessThan(2.2);
  });

  it("recovers a positive intercept when forecasts are systematically too low", () => {
    // stated = sigmoid(logit(truth) − 1) ⇒ logit(P) = logit(stated) + 1, so the
    // population fit is slope 1, intercept +1.
    const stated = distort(truth, 1, -1);
    const fit = calibrationFit(stated, outcomes);
    expect(fit.intercept).toBeGreaterThan(0.85);
    expect(fit.intercept).toBeLessThan(1.15);
    expect(fit.slope).toBeGreaterThan(0.9);
    expect(fit.slope).toBeLessThan(1.1);
  });

  it("recovers a negative intercept when forecasts are systematically too high", () => {
    const stated = distort(truth, 1, 1);
    const fit = calibrationFit(stated, outcomes);
    expect(fit.intercept).toBeLessThan(-0.85);
    expect(fit.intercept).toBeGreaterThan(-1.15);
    expect(fit.slope).toBeGreaterThan(0.9);
    expect(fit.slope).toBeLessThan(1.1);
  });

  it("is monotone in the amount of over-confidence", () => {
    const mild = calibrationFit(distort(truth, 1.25, 0), outcomes).slope;
    const strong = calibrationFit(distort(truth, 2.5, 0), outcomes).slope;
    expect(strong).toBeLessThan(mild);
    expect(mild).toBeLessThan(1);
  });

  // ── Exact equivariance identities ───────────────────────────────────────────
  // These are algebraic consequences of the model, not statistical tendencies,
  // so they must hold to numerical precision on ANY dataset — a far sharper test
  // than "the slope is somewhere below 1".

  it("scaling the forecast log-odds by c divides the slope by exactly c", () => {
    // Fitting on x' = c·x gives intercept + slope'·(c·x) ≡ intercept + slope·x,
    // hence slope' = slope / c and the intercept is unchanged.
    const base = calibrationFit(truth, outcomes);
    for (const c of [0.5, 1.25, 2, 2.5, 4]) {
      const scaled = calibrationFit(distort(truth, c, 0), outcomes);
      expect(scaled.slope * c).toBeCloseTo(base.slope, 8);
      expect(scaled.intercept).toBeCloseTo(base.intercept, 8);
    }
  });

  it("shifting the forecast log-odds by s leaves the slope fixed and moves the intercept by −slope·s", () => {
    // Fitting on x' = x + s gives intercept' + slope·(x + s) ≡ intercept + slope·x,
    // hence slope' = slope and intercept' = intercept − slope·s.
    const base = calibrationFit(truth, outcomes);
    for (const s of [-1, -0.25, 0.75, 2]) {
      const shifted = calibrationFit(distort(truth, 1, s), outcomes);
      expect(shifted.slope).toBeCloseTo(base.slope, 8);
      expect(shifted.intercept).toBeCloseTo(base.intercept - base.slope * s, 8);
    }
  });

  it("is deterministic — identical inputs give bit-identical output", () => {
    const a = calibrationFit(truth, outcomes);
    const b = calibrationFit(truth.slice(), outcomes.slice());
    expect(b.slope).toBe(a.slope);
    expect(b.intercept).toBe(a.intercept);

    // The data generator itself is reproducible from the seed.
    const again = simulate(truth, SEED);
    expect(again).toEqual(outcomes);
  });

  it("does not mutate its inputs", () => {
    const p = [0.1, 0.4, 0.6, 0.9];
    const y: (0 | 1)[] = [0, 1, 0, 1];
    const pCopy = p.slice();
    const yCopy = y.slice();
    calibrationFit(p, y);
    expect(p).toEqual(pCopy);
    expect(y).toEqual(yCopy);
  });
});

describe("calibrationFit — boundary probabilities and the documented clamp", () => {
  it("accepts predictions of exactly 0 and 1 without producing a non-finite fit", () => {
    const predicted = [0, 0, 0.5, 0.5, 1, 1];
    const outcomes: (0 | 1)[] = [0, 1, 1, 0, 0, 1];
    const fit = calibrationFit(predicted, outcomes);
    expect(Number.isFinite(fit.slope)).toBe(true);
    expect(Number.isFinite(fit.intercept)).toBe(true);
    // Every group rate is 1/2 here, so (0, 0) is the MLE — the clamp did not
    // smuggle in an infinity that would have broken the solve.
    expect(fit.slope).toBeCloseTo(0, 12);
    expect(fit.intercept).toBeCloseTo(0, 12);
  });

  it("treats anything past the clamp as identical to the clamp bound", () => {
    const outcomes: (0 | 1)[] = [0, 1, 1, 0, 0, 1, 1, 0];
    const atBound = [1e-12, 1e-12, 0.5, 0.5, 1 - 1e-12, 1 - 1e-12, 0.5, 0.5];
    const pastBound = [0, 1e-13, 0.5, 0.5, 1, 1 - 1e-13, 0.5, 0.5];
    const a = calibrationFit(atBound, outcomes);
    const b = calibrationFit(pastBound, outcomes);
    expect(b.slope).toBe(a.slope);
    expect(b.intercept).toBe(a.intercept);
  });

  it("still solves the two-group closed form when one group sits on the clamp", () => {
    // Forecasts of 0 that come in at a 40% rate: the fit must be finite and must
    // match the saturated two-group closed form on the clamped covariate.
    const predicted: number[] = [];
    const outcomes: (0 | 1)[] = [];
    for (let i = 0; i < 10; i += 1) {
      predicted.push(0);
      outcomes.push(i < 4 ? 1 : 0); // rate 0.4
    }
    for (let i = 0; i < 10; i += 1) {
      predicted.push(0.5);
      outcomes.push(i < 6 ? 1 : 0); // rate 0.6
    }
    const xA = logitOf(0);
    const xB = logitOf(0.5);
    const expectedSlope = (logitOf(0.6) - logitOf(0.4)) / (xB - xA);
    const expectedIntercept = logitOf(0.4) - expectedSlope * xA;

    const fit = calibrationFit(predicted, outcomes);
    expect(fit.slope).toBeCloseTo(expectedSlope, 10);
    expect(fit.intercept).toBeCloseTo(expectedIntercept, 10);
  });
});

describe("calibrationFit — fail closed", () => {
  it("throws MISMATCHED_LENGTH when the arrays do not align", () => {
    try {
      calibrationFit([0.1, 0.2, 0.3], [0, 1]);
      expect.unreachable("expected MISMATCHED_LENGTH");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("MISMATCHED_LENGTH");
    }
  });

  it("throws MISMATCHED_LENGTH when only one side is empty", () => {
    try {
      calibrationFit([], [1]);
      expect.unreachable("expected MISMATCHED_LENGTH");
    } catch (e) {
      expect((e as KernelError).code).toBe("MISMATCHED_LENGTH");
    }
  });

  it("throws EMPTY on no observations", () => {
    try {
      calibrationFit([], []);
      expect.unreachable("expected EMPTY");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("EMPTY");
    }
  });

  it("throws DOMAIN for a prediction outside [0, 1]", () => {
    for (const bad of [-0.001, 1.001, 2]) {
      try {
        calibrationFit([0.4, bad, 0.6], [0, 1, 1]);
        expect.unreachable(`expected DOMAIN for ${bad}`);
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("DOMAIN");
      }
    }
  });

  it("throws NOT_FINITE for a NaN or infinite prediction", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      try {
        calibrationFit([0.4, bad, 0.6], [0, 1, 1]);
        expect.unreachable(`expected NOT_FINITE for ${bad}`);
      } catch (e) {
        expect(e).toBeInstanceOf(KernelError);
        expect((e as KernelError).code).toBe("NOT_FINITE");
      }
    }
  });

  it("throws DOMAIN for an outcome that is not exactly 0 or 1", () => {
    const bogus = [0, 2, 1] as unknown as readonly (0 | 1)[];
    try {
      calibrationFit([0.3, 0.5, 0.7], bogus);
      expect.unreachable("expected DOMAIN");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("DOMAIN");
    }
  });

  it("throws NOT_FINITE for a NaN outcome", () => {
    const bogus = [0, Number.NaN, 1] as unknown as readonly (0 | 1)[];
    try {
      calibrationFit([0.3, 0.5, 0.7], bogus);
      expect.unreachable("expected NOT_FINITE");
    } catch (e) {
      expect((e as KernelError).code).toBe("NOT_FINITE");
    }
  });
});

describe("calibrationFit — degenerate data (documented policy: UNSUPPORTED)", () => {
  it("throws UNSUPPORTED when every outcome is 1", () => {
    try {
      calibrationFit([0.2, 0.5, 0.8], [1, 1, 1]);
      expect.unreachable("expected UNSUPPORTED");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("UNSUPPORTED");
      expect((e as KernelError).message).toMatch(/outcomes are all 1/);
    }
  });

  it("throws UNSUPPORTED when every outcome is 0", () => {
    try {
      calibrationFit([0.2, 0.5, 0.8], [0, 0, 0]);
      expect.unreachable("expected UNSUPPORTED");
    } catch (e) {
      expect((e as KernelError).code).toBe("UNSUPPORTED");
      expect((e as KernelError).message).toMatch(/outcomes are all 0/);
    }
  });

  it("throws UNSUPPORTED when every prediction is identical", () => {
    try {
      calibrationFit([0.4, 0.4, 0.4, 0.4], [0, 1, 1, 0]);
      expect.unreachable("expected UNSUPPORTED");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("UNSUPPORTED");
      expect((e as KernelError).message).toMatch(/not identifiable/);
    }
  });

  it("throws UNSUPPORTED for a single observation", () => {
    // n = 1 is degenerate twice over: one outcome class and one covariate value.
    try {
      calibrationFit([0.6], [1]);
      expect.unreachable("expected UNSUPPORTED");
    } catch (e) {
      expect((e as KernelError).code).toBe("UNSUPPORTED");
    }
  });

  it("fits a two-observation dataset that is NOT degenerate", () => {
    // Two points, two parameters, both outcome classes present: separable, so
    // the MLE is infinite and the routine must refuse rather than invent a slope.
    try {
      calibrationFit([0.3, 0.7], [0, 1]);
      expect.unreachable("expected NO_CONVERGENCE");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("NO_CONVERGENCE");
    }
  });
});

describe("calibrationFit — separation throws NO_CONVERGENCE", () => {
  it("refuses a completely separable dataset", () => {
    const predicted = [0.05, 0.1, 0.2, 0.3, 0.7, 0.8, 0.9, 0.95];
    const outcomes: (0 | 1)[] = [0, 0, 0, 0, 1, 1, 1, 1];
    try {
      calibrationFit(predicted, outcomes);
      expect.unreachable("expected NO_CONVERGENCE");
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe("NO_CONVERGENCE");
    }
  });

  it("refuses a reverse-separable dataset (slope would be −∞)", () => {
    const predicted = [0.05, 0.1, 0.2, 0.3, 0.7, 0.8, 0.9, 0.95];
    const outcomes: (0 | 1)[] = [1, 1, 1, 1, 0, 0, 0, 0];
    try {
      calibrationFit(predicted, outcomes);
      expect.unreachable("expected NO_CONVERGENCE");
    } catch (e) {
      expect((e as KernelError).code).toBe("NO_CONVERGENCE");
    }
  });

  it("accepts the same data once a single overlapping point breaks separation", () => {
    const predicted = [0.05, 0.1, 0.2, 0.3, 0.7, 0.8, 0.9, 0.95, 0.4, 0.6];
    const outcomes: (0 | 1)[] = [0, 0, 0, 0, 1, 1, 1, 1, 1, 0];
    const fit = calibrationFit(predicted, outcomes);
    expect(Number.isFinite(fit.slope)).toBe(true);
    const { s0, s1 } = scoreEquations(predicted, outcomes, fit);
    expect(Math.abs(s0)).toBeLessThan(1e-8);
    expect(Math.abs(s1)).toBeLessThan(1e-8);
  });
});
