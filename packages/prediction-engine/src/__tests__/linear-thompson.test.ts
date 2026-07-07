import { describe, it, expect } from "vitest";
import {
  createLinTsState,
  selectAction,
  updateLinTs,
  thetaEstimate,
  MAX_LIN_TS_DIM,
  type LinTsState,
} from "../linear-thompson.js";

// Deterministic data generators (seeded) — no Math.random anywhere.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded standard normal (Box–Muller; u=0 guarded), one draw per call. */
function makeGaussian(seed: number): () => number {
  const rand = mulberry32(seed);
  return () => {
    const u1 = Math.max(rand(), Number.EPSILON);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

// ============================================================
// Fixed 5-arm linear bandit with KNOWN truth theta*
// ============================================================

const THETA_STAR = [0.6, -0.4, 0.3, 0.2] as const;
const ARMS: readonly (readonly number[])[] = [
  [1, 0, 0, 0], // mean  0.60
  [0, 1, 0, 0], // mean -0.40
  [0, 0, 1, 0], // mean  0.30
  [0, 0, 0, 1], // mean  0.20
  [0.9, 0.1, 0.2, 0.3], // mean 0.62  ← true best arm (index 4)
];
const ARM_MEANS = ARMS.map((x) => x.reduce((s, xi, i) => s + xi * THETA_STAR[i]!, 0));
const BEST_ARM = 4;
const NOISE_SD = 0.5;

interface BanditRun {
  /** Σ over rounds of the TRUE mean of the chosen arm (noise-free comparison). */
  cumulativeExpectedReward: number;
  /** Chosen arm index per round. */
  choices: number[];
}

/** Run LinTS for T rounds on the fixed arm set (Gaussian rewards, seeded noise). */
function runLinTs(T: number, seed: number, noiseSeed: number): BanditRun {
  let state = createLinTsState(4, { lambda: 1, v: 0.5, seed })!;
  const noise = makeGaussian(noiseSeed);
  const choices: number[] = [];
  let cumulativeExpectedReward = 0;
  for (let t = 0; t < T; t++) {
    const decision = selectAction(state, ARMS)!;
    const arm = decision.index;
    choices.push(arm);
    cumulativeExpectedReward += ARM_MEANS[arm]!;
    const reward = ARM_MEANS[arm]! + NOISE_SD * noise();
    state = updateLinTs(state, ARMS[arm]!, reward)!;
  }
  return { cumulativeExpectedReward, choices };
}

/** Uniform-random baseline over the same arms (seeded; learns nothing). */
function runUniform(T: number, seed: number): BanditRun {
  const rand = mulberry32(seed);
  const choices: number[] = [];
  let cumulativeExpectedReward = 0;
  for (let t = 0; t < T; t++) {
    const arm = Math.floor(rand() * ARMS.length);
    choices.push(arm);
    cumulativeExpectedReward += ARM_MEANS[arm]!;
  }
  return { cumulativeExpectedReward, choices };
}

describe("linear Thompson sampling — regret vs uniform baseline", () => {
  it("strictly beats a seeded uniform-random policy over T=2000", () => {
    // OBSERVED (T=2000, LinTS seed 42 / noise seed 1234, uniform seed 99):
    //   LinTS cumulative expected reward = 1213.9000
    //   uniform cumulative expected reward = 511.4000
    //   gap = 702.5000
    // SE arithmetic: uniform's per-round chosen mean has E = 0.264 and
    // Var = E[m²]−E[m]² = 0.20688 − 0.069696 = 0.137184 (sd 0.3704), so its
    // 2000-round total is 528 ± 16.6 (1 SE) — observed 511.4 is within 1 SE.
    // The oracle ceiling is 2000·0.62 = 1240; LinTS reached 1213.9 (cumulative
    // expected regret 26.1). The 702.5 gap is ≈ 42 SEs of the uniform total's
    // sampling noise — decisively not chance.
    const lin = runLinTs(2000, 42, 1234);
    const uni = runUniform(2000, 99);
    expect(lin.cumulativeExpectedReward).toBeGreaterThan(uni.cumulativeExpectedReward); // strict
    expect(lin.cumulativeExpectedReward).toBeGreaterThan(1200); // observed 1213.9
    expect(uni.cumulativeExpectedReward).toBeLessThan(560); // observed 511.4 (528 ± 16.6 expected)
    expect(lin.cumulativeExpectedReward - uni.cumulativeExpectedReward).toBeGreaterThan(650); // observed 702.5
  });

  it("converges: pulls the true best arm in the last 500 steps", () => {
    // OBSERVED (same seeds as above): best-arm fraction over the last 500
    // steps = 0.968 (484/500). Asserted with margin at ≥ 0.9. Note the best
    // arm (mean 0.62) beats the runner-up (mean 0.60) by only 0.02 with
    // noise sd 0.5 — a hard discrimination, so 96.8% is genuine convergence.
    const lin = runLinTs(2000, 42, 1234);
    const last500 = lin.choices.slice(-500);
    const bestFraction = last500.filter((a) => a === BEST_ARM).length / 500;
    expect(bestFraction).toBeGreaterThanOrEqual(0.9); // observed 0.968
  });
});

describe("thetaEstimate — posterior sanity", () => {
  it("approaches theta* under many random-context updates", () => {
    // Feed the posterior directly (no arm selection): x ~ U[-1,1]^4,
    // r = x·theta* + 0.1·N(0,1), N=1500 updates.
    // OBSERVED (context seed 2026, noise seed 7):
    //   thetaEstimate = [0.592888, -0.399066, 0.294357, 0.199789]
    //   L2 error vs theta* = [0.6, -0.4, 0.3, 0.2]  →  0.009129122082653967
    // SE arithmetic: E[x x^T] = (1/3)·I for x ~ U[-1,1], so A ≈ (1500/3 + 1)·I
    // ≈ 501·I and each coordinate's posterior sd ≈ 0.1/√501 ≈ 0.00447; the
    // expected L2 over 4 coordinates is ≈ √4·0.00447 ≈ 0.0089 — the observed
    // 0.00913 sits right on it. Asserted with margin at < 0.03 (≈ 3.4×).
    const rand = mulberry32(2026);
    const noise = makeGaussian(7);
    let state = createLinTsState(4, { lambda: 1, v: 0.5, seed: 42 })!;
    for (let t = 0; t < 1500; t++) {
      const x = [0, 0, 0, 0].map(() => 2 * rand() - 1);
      const mean = x.reduce((s, xi, i) => s + xi * THETA_STAR[i]!, 0);
      state = updateLinTs(state, x, mean + 0.1 * noise())!;
    }
    const est = thetaEstimate(state)!;
    const l2 = Math.sqrt(est.reduce((s, e, i) => s + (e - THETA_STAR[i]!) ** 2, 0));
    expect(l2).toBeLessThan(0.03); // observed 0.009129
  });

  it("is the ridge solution on a tiny hand-checkable case", () => {
    // d=1, lambda=1, one observation x=1, r=2:
    // A = 1+1 = 2, b = 2, theta_hat = 1 exactly.
    let state = createLinTsState(1, { lambda: 1, v: 1, seed: 5 })!;
    state = updateLinTs(state, [1], 2)!;
    expect(thetaEstimate(state)).toEqual([1]);
  });
});

describe("determinism", () => {
  it("identical seeds produce identical action sequences; different seeds diverge", () => {
    const a = runLinTs(200, 42, 1234);
    const b = runLinTs(200, 42, 1234);
    expect(a.choices).toEqual(b.choices);
    expect(a.cumulativeExpectedReward).toBe(b.cumulativeExpectedReward);
    const c = runLinTs(200, 43, 1234);
    expect(c.choices).not.toEqual(a.choices);
  });

  it("re-calling selectAction on the SAME state replays the same decision", () => {
    const state = createLinTsState(4, { seed: 42 })!;
    const d1 = selectAction(state, ARMS)!;
    const d2 = selectAction(state, ARMS)!;
    expect(d1.index).toBe(d2.index);
    expect(d1.sampledTheta).toEqual(d2.sampledTheta);
  });
});

describe("refusals (null, never throw)", () => {
  it("createLinTsState refuses bad dim / lambda / v / seed", () => {
    expect(createLinTsState(0)).toBeNull();
    expect(createLinTsState(2.5)).toBeNull();
    expect(createLinTsState(MAX_LIN_TS_DIM + 1)).toBeNull();
    expect(createLinTsState(4, { lambda: 0 })).toBeNull();
    expect(createLinTsState(4, { lambda: -1 })).toBeNull();
    expect(createLinTsState(4, { lambda: Number.NaN })).toBeNull();
    expect(createLinTsState(4, { v: 0 })).toBeNull();
    expect(createLinTsState(4, { v: -0.5 })).toBeNull();
    expect(createLinTsState(4, { seed: Number.POSITIVE_INFINITY })).toBeNull();
    expect(createLinTsState(MAX_LIN_TS_DIM)).not.toBeNull(); // boundary is allowed
  });

  it("selectAction refuses empty contexts, dim mismatch, non-finite entries", () => {
    const state = createLinTsState(4, { seed: 42 })!;
    expect(selectAction(state, [])).toBeNull();
    expect(selectAction(state, [[1, 0, 0]])).toBeNull(); // wrong dim
    expect(selectAction(state, [[1, 0, 0, Number.NaN]])).toBeNull();
    expect(selectAction(state, [[1, 0, 0, 0], [0, 1, 0]])).toBeNull(); // one bad arm poisons the call
  });

  it("updateLinTs refuses dim mismatch and non-finite reward", () => {
    const state = createLinTsState(4, { seed: 42 })!;
    expect(updateLinTs(state, [1, 0, 0], 1)).toBeNull();
    expect(updateLinTs(state, [1, 0, 0, Number.POSITIVE_INFINITY], 1)).toBeNull();
    expect(updateLinTs(state, [1, 0, 0, 0], Number.NaN)).toBeNull();
    expect(updateLinTs(state, [1, 0, 0, 0], Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

describe("immutability", () => {
  it("updateLinTs returns a new state and never mutates its input", () => {
    let state = createLinTsState(3, { lambda: 2, v: 0.7, seed: 11 })!;
    state = updateLinTs(state, [1, 2, 3], 0.5)!;
    const before = JSON.parse(JSON.stringify(state)) as LinTsState;
    const next = updateLinTs(state, [0.4, -0.2, 0.9], -1.25)!;
    expect(next).not.toBe(state);
    expect(next.A).not.toBe(state.A);
    expect(next.b).not.toBe(state.b);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before); // deep-equal: untouched
    expect(next.step).toBe(state.step + 1);
  });
});

describe("linear-thompson — self-audit: overflow is refused, state stays valid", () => {
  it("updateLinTs rejects a context that overflows A (Infinity), preserving prior state", () => {
    const s = createLinTsState(2, { seed: 1 })!;
    expect(updateLinTs(s, [1e200, 1e200], 1)).toBeNull(); // x·x^T overflows -> refuse
    // prior state still usable
    expect(selectAction(s, [[1, 0], [0, 1]])).not.toBeNull();
  });
  it("updateLinTs rejects a reward that overflows b, and thetaEstimate never returns NaN", () => {
    let s = createLinTsState(2, { seed: 1 })!;
    s = updateLinTs(s, [1, 0], 1e308)!;      // b[0] = 1e308 (finite, accepted)
    expect(updateLinTs(s, [1, 0], 1e308)).toBeNull(); // would push b to Infinity -> refuse
    // thetaEstimate never leaks NaN/Infinity: a finite estimate OR an honest null.
    const theta = thetaEstimate(s);
    expect(theta === null || theta.every((t) => Number.isFinite(t))).toBe(true);
  });
});
