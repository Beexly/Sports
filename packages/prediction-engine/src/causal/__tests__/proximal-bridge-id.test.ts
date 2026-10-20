/**
 * @file __tests__/proximal-bridge-id.test.ts
 *
 * THE PROXIMAL BRIDGE MUST BE ABLE TO REFUSE, AND MUST EARN ITS ADMISSION.
 *
 * A gate that cannot refuse is a label. So each refusal code is exercised
 * with data that FAILS THAT GATE AND PASSES THE EARLIER ONES, which is
 * what proves the threshold is actually compared rather than exported and
 * admired. The well-posed case is checked against the true effect the
 * generator used, and against the unadjusted slope, so the test shows the
 * bridge CORRECTS the confounding instead of merely returning a number.
 *
 * All randomness is a deterministic 24-bit LCG:
 *   s = (Math.imul(s, 1664525) + 12345) >>> 0; return (s >>> 8) / 16777216;
 */
import { describe, it, expect } from "vitest";
import {
  BRIDGE_PARAMETER_COUNT,
  INSTRUMENT_COUNT,
  MIN_BRIDGE_E_VALUE,
  MIN_FREDHOLM_CONDITION_NUMBER,
  MIN_J_TEST_P_VALUE,
  MIN_PROXIMAL_SAMPLE_SIZE,
  proximalBridgeBasis,
  proximalInstrumentBasis,
  solveProximalBridge,
  validateProximalDataset,
  type ProximalBridgeResult,
  type ProximalDataset,
} from "../proximal-bridge-id.js";
import { eValue } from "../e-value.js";

// ---------------------------------------------------------------------------
// Deterministic randomness.
// ---------------------------------------------------------------------------

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

function normal(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// The synthetic proximal problem.
//
//   U  unmeasured confounder
//   A = 0.8 U + 0.6 X + noise        (treated)
//   Z = 0.9 U + noise                (treatment-inducing proxy)
//   W = 0.9 U + noise                (outcome-inducing proxy)
//   Y = 0.2 + beta A + gamma U + quad (U^2 - 1) + 0.3 X + noise
//
// A linear bridge h(a, w, x) = t0 + t1 a + t2 w + t3 x exists exactly
// (t1 = beta, t2 = gamma / 0.9, t3 = 0.3), so the well-posed case has a
// right answer to recover. `quad != 0` destroys that: no linear bridge
// can absorb U^2, which is what the J-test must detect.
//
// `collinearProxy` replaces Z with A + tiny noise, which makes the
// instrument matrix numerically singular and drives the condition
// number up. Nothing else in the DGP changes.
// ---------------------------------------------------------------------------

interface Dgp {
  readonly n: number;
  readonly seed: number;
  readonly beta: number;
  readonly gamma: number;
  readonly quad: number;
  readonly collinearProxy: boolean;
}

function simulate(dgp: Dgp): ProximalDataset {
  const rand = lcg(dgp.seed);
  const treatment: number[] = [];
  const treatmentProxy: number[] = [];
  const outcomeProxy: number[] = [];
  const covariate: number[] = [];
  const outcome: number[] = [];

  for (let i = 0; i < dgp.n; i++) {
    const u = normal(rand);
    const x = normal(rand);
    const a = 0.8 * u + 0.6 * x + 0.5 * normal(rand);
    const z = dgp.collinearProxy ? a + 1e-4 * normal(rand) : 0.9 * u + 0.4 * normal(rand);
    const w = 0.9 * u + 0.4 * normal(rand);
    const y =
      0.2 + dgp.beta * a + dgp.gamma * u + dgp.quad * (u * u - 1) + 0.3 * x + 0.6 * normal(rand);

    treatment.push(a);
    treatmentProxy.push(z);
    outcomeProxy.push(w);
    covariate.push(x);
    outcome.push(y);
  }

  return { treatment, treatmentProxy, outcomeProxy, covariate, outcome };
}

const WELL_POSED: Dgp = { n: 1200, seed: 555, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false };

function solve(dataset: ProximalDataset, treatmentLevel = 1, controlLevel = 0): ProximalBridgeResult {
  return solveProximalBridge(dataset, { treatmentLevel, controlLevel });
}

/** Unadjusted OLS slope of Y on A, for the confounding contrast. */
function olsSlope(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i] as number;
    sy += ys[i] as number;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    sxy += dx * ((ys[i] as number) - my);
    sxx += dx * dx;
  }
  return sxy / sxx;
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

describe("solveProximalBridge", () => {
  it("admits a well-posed proximal problem and recovers the true effect", () => {
    const dataset = simulate(WELL_POSED);
    const result = solve(dataset);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The true ATE is beta = 0.6 per unit of A.
    expect(result.ate).toBeCloseTo(WELL_POSED.beta, 1);
    expect(Math.abs(result.ate - WELL_POSED.beta)).toBeLessThan(0.12);

    // The unadjusted slope is biased upward by the confounder; the bridge
    // corrects it. Both halves are asserted so the test cannot pass by
    // returning the naive number.
    const naive = olsSlope(dataset.treatment, dataset.outcome);
    expect(Math.abs(naive - WELL_POSED.beta)).toBeGreaterThan(0.15);
    expect(Math.abs(result.ate - WELL_POSED.beta)).toBeLessThan(Math.abs(naive - WELL_POSED.beta));

    // The gates passed on measured values, not on defaults.
    expect(result.fredholmConditionNumber).not.toBeNull();
    expect(result.fredholmConditionNumber as number).toBeLessThanOrEqual(MIN_FREDHOLM_CONDITION_NUMBER);
    expect(result.jTestPValue as number).toBeGreaterThanOrEqual(MIN_J_TEST_P_VALUE);
    expect(result.eValue as number).toBeGreaterThanOrEqual(MIN_BRIDGE_E_VALUE);
    expect(result.coefficients.length).toBe(BRIDGE_PARAMETER_COUNT);
    expect(result.jDegreesOfFreedom).toBe(INSTRUMENT_COUNT - BRIDGE_PARAMETER_COUNT);
    expect(result.sampleSize).toBe(WELL_POSED.n);
    expect(result.holdoutSize).toBeGreaterThan(0);

    // The E-value is the E-value of the RR actually reported -- not a
    // separately invented number.
    expect(result.riskRatio).not.toBeNull();
    expect(result.eValue as number).toBeCloseTo(eValue(result.riskRatio as number), 10);
    expect(result.ate).toBeCloseTo(result.treatedMean - result.controlMean, 12);

    // The g-formula is evaluated at the requested level, not hardcoded:
    // doubling the contrast doubles the effect.
    const doubled = solve(dataset, 2, 0);
    expect(doubled.ok).toBe(true);
    if (doubled.ok) {
      expect(doubled.ate).toBeCloseTo(2 * result.ate, 6);
      expect(doubled.controlMean).toBeCloseTo(result.controlMean, 10);
    }
  });

  it("refuses when the Fredholm condition number exceeds 50", () => {
    // Z is A plus 1e-4 noise: the instrument matrix is numerically
    // singular, so the first-kind Fredholm equation cannot be inverted.
    const dataset = simulate({ n: 1200, seed: 771, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: true });
    const result = solve(dataset);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PROXIMAL_CONDITION_NUMBER_EXCEEDS_LIMIT");
    expect(result.fredholmConditionNumber).not.toBeNull();
    expect(result.fredholmConditionNumber as number).toBeGreaterThan(MIN_FREDHOLM_CONDITION_NUMBER);
    expect(result.reason).toContain(String(MIN_FREDHOLM_CONDITION_NUMBER));
    // The bridge was never estimated, so no effect is reported.
    expect(result.eValue).toBeNull();
  });

  it("refuses when the holdout J-test p-value is below 0.10", () => {
    // U^2 in the outcome: a linear bridge cannot satisfy the moment
    // conditions, and the holdout over-identification test sees it.
    const dataset = simulate({ n: 1200, seed: 4242, beta: 0.6, gamma: 0.3, quad: 3, collinearProxy: false });
    const result = solve(dataset);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PROXIMAL_J_TEST_FAILED");
    // Earlier gates passed, so this refusal is attributable to the J-test
    // alone -- the threshold is genuinely compared.
    expect(result.fredholmConditionNumber as number).toBeLessThanOrEqual(MIN_FREDHOLM_CONDITION_NUMBER);
    expect(result.jTestPValue).not.toBeNull();
    expect(result.jTestPValue as number).toBeLessThan(MIN_J_TEST_P_VALUE);
    expect(result.reason).toContain("J-test");
  });

  it("refuses when the VanderWeele-Ding E-value is below 1.35", () => {
    // beta = 0: a real, well-specified problem with a null effect. The
    // bridge fits and passes the J-test, but a null effect cannot
    // survive unmeasured confounding, so the E-value gate refuses.
    const dataset = simulate({ n: 1200, seed: 99, beta: 0, gamma: 0.3, quad: 0, collinearProxy: false });
    const result = solve(dataset);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PROXIMAL_E_VALUE_TOO_LOW");
    expect(result.fredholmConditionNumber as number).toBeLessThanOrEqual(MIN_FREDHOLM_CONDITION_NUMBER);
    expect(result.jTestPValue as number).toBeGreaterThanOrEqual(MIN_J_TEST_P_VALUE);
    expect(result.eValue).not.toBeNull();
    expect(result.eValue as number).toBeLessThan(MIN_BRIDGE_E_VALUE);
    expect(result.reason).toContain(String(MIN_BRIDGE_E_VALUE));
  });

  it("refuses with NO_INSTRUMENTS when a proxy is missing", () => {
    const base = simulate({ n: 400, seed: 5, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false });

    const noTreatmentProxy = solve({ ...base, treatmentProxy: null });
    expect(noTreatmentProxy.ok).toBe(false);
    if (!noTreatmentProxy.ok) {
      expect(noTreatmentProxy.code).toBe("PROXIMAL_NO_INSTRUMENTS");
      expect(noTreatmentProxy.reason).toContain("Z");
      expect(noTreatmentProxy.eValue).toBeNull();
    }

    const noOutcomeProxy = solve({ ...base, outcomeProxy: undefined });
    expect(noOutcomeProxy.ok).toBe(false);
    if (!noOutcomeProxy.ok) {
      expect(noOutcomeProxy.code).toBe("PROXIMAL_NO_INSTRUMENTS");
      expect(noOutcomeProxy.reason).toContain("W");
    }

    // A constant proxy carries no instrument either: it is reported as
    // absent rather than as an infinite condition number.
    const flatProxy = base.treatment.map(() => 1.5);
    const noVariation = solve({ ...base, treatmentProxy: flatProxy });
    expect(noVariation.ok).toBe(false);
    if (!noVariation.ok) {
      expect(noVariation.code).toBe("PROXIMAL_NO_INSTRUMENTS");
      expect(noVariation.reason).toContain("constant");
    }
  });

  it("refuses with SAMPLE_TOO_SMALL below the exported floor", () => {
    const dataset = simulate({ n: MIN_PROXIMAL_SAMPLE_SIZE - 40, seed: 13, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false });
    const result = solve(dataset);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PROXIMAL_SAMPLE_TOO_SMALL");
    expect(result.sampleSize).toBe(MIN_PROXIMAL_SAMPLE_SIZE - 40);
    expect(result.reason).toContain(String(MIN_PROXIMAL_SAMPLE_SIZE));
    // Nothing was estimated, so nothing is claimed.
    expect(result.jStatistic).toBeNull();
    expect(result.fredholmConditionNumber).toBeNull();
  });

  it("is deterministic: the same input gives the same output", () => {
    const dataset = simulate({ n: 300, seed: 2024, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false });
    const first = solve(dataset);
    const second = solve(simulate({ n: 300, seed: 2024, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false }));

    expect(second).toEqual(first);
    if (first.ok && second.ok) {
      expect(second.ate).toBe(first.ate);
      expect(second.jStatistic).toBe(first.jStatistic);
      expect(second.coefficients).toEqual(first.coefficients);
    }
  });

  it("never returns a bare boolean", () => {
    const dataset = simulate({ n: 200, seed: 808, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false });
    const admitted = solve(dataset);
    expect(typeof admitted).toBe("object");
    expect(typeof admitted.ok).toBe("boolean");
    if (!admitted.ok) {
      expect(typeof admitted.code).toBe("string");
      expect(admitted.reason.length).toBeGreaterThan(0);
    }

    const refused = solve({ ...dataset, treatmentProxy: null });
    expect(typeof refused).toBe("object");
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(typeof refused.code).toBe("string");
      expect(refused.reason.length).toBeGreaterThan(0);
    }
  });

  it("throws on malformed input", () => {
    const base = simulate({ n: 200, seed: 606, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false });

    // Empty columns: a non-positive sample size.
    expect(() => solve({ ...base, outcome: [] })).toThrow(/empty array/);
    expect(() => solve({ ...base, treatment: [] })).toThrow(/empty array/);

    // Wrong lengths.
    expect(() => solve({ ...base, covariate: (base.covariate as number[]).slice(0, 10) })).toThrow(
      /rows but outcome has/,
    );
    expect(() => solve({ ...base, treatmentProxy: (base.treatmentProxy as number[]).slice(0, 7) })).toThrow(
      /rows but outcome has/,
    );

    // Non-finite values, in a required column and in a proxy.
    const withNaN = (base.outcome as number[]).slice();
    withNaN[3] = Number.NaN;
    expect(() => solve({ ...base, outcome: withNaN })).toThrow(/finite number/);

    const withInfinity = (base.treatmentProxy as number[]).slice();
    withInfinity[11] = Number.POSITIVE_INFINITY;
    expect(() => solve({ ...base, treatmentProxy: withInfinity })).toThrow(/finite number/);

    // Degenerate contrast and bad options.
    expect(() =>
      solveProximalBridge(base, { treatmentLevel: 1, controlLevel: 1 }),
    ).toThrow(/identical/);
    expect(() =>
      solveProximalBridge(base, { treatmentLevel: Number.NaN, controlLevel: 0 }),
    ).toThrow(/finite number/);
    expect(() =>
      solveProximalBridge(base, { treatmentLevel: 1, controlLevel: 0, ridgeLambda: -1 }),
    ).toThrow(/must be > 0/);
    expect(() =>
      solveProximalBridge(base, { treatmentLevel: 1, controlLevel: 0, holdoutFraction: 1.5 }),
    ).toThrow(/strictly between 0 and 1/);

    // Non-object arguments.
    expect(() => solveProximalBridge(null as unknown as ProximalDataset, { treatmentLevel: 1, controlLevel: 0 })).toThrow(
      /expected an object/,
    );
  });

  it("throws from the exported basis and validator on malformed arguments", () => {
    expect(proximalBridgeBasis(1, 2, 3)).toEqual([1, 1, 2, 3]);
    expect(proximalInstrumentBasis(2, 3, 4)).toEqual([1, 2, 3, 4, 6, 9]);
    expect(() => proximalBridgeBasis(Number.NaN, 2, 3)).toThrow(/finite number/);
    expect(() => proximalInstrumentBasis(2, Number.POSITIVE_INFINITY, 3)).toThrow(/finite number/);

    const dataset = simulate({ n: 130, seed: 33, beta: 0.6, gamma: 0.3, quad: 0, collinearProxy: false });
    expect(() => validateProximalDataset(dataset)).not.toThrow();
    expect(() => validateProximalDataset({ ...dataset, outcome: [] })).toThrow(/empty array/);
  });

  it("pins the exported gate constants to the specified values", () => {
    // These are the thresholds the audits look for. If one moves, the
    // admission policy moved, and that must be a deliberate change.
    expect(MIN_FREDHOLM_CONDITION_NUMBER).toBe(50);
    expect(MIN_J_TEST_P_VALUE).toBe(0.1);
    expect(MIN_BRIDGE_E_VALUE).toBe(1.35);
    expect(MIN_PROXIMAL_SAMPLE_SIZE).toBeGreaterThan(0);
    expect(Number.isFinite(MIN_PROXIMAL_SAMPLE_SIZE)).toBe(true);
    expect(BRIDGE_PARAMETER_COUNT).toBe(4);
    expect(INSTRUMENT_COUNT).toBe(6);
    // Over-identification needs more moments than parameters, or the
    // J-test has no degrees of freedom and cannot gate anything.
    expect(INSTRUMENT_COUNT).toBeGreaterThan(BRIDGE_PARAMETER_COUNT);
  });
});
