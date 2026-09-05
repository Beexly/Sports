/**
 * Tests for the instrumented (randomized-publication) e-processes.
 *
 * Three layers, in rising order of importance:
 *   1. Analytic pins — exact expectations computed in closed form, no
 *      simulation noise: unbiasedness, the range-constant's validity, and the
 *      variance-proxy's failure at the paper's exact numbers (1.4371).
 *   2. Operating characteristics on SEEDED synthetic worlds — Type I control
 *      under a hostile null, power under a real contrast. Synthetic fixtures
 *      only; nothing here is product data.
 *   3. The Theorem 7 demonstration — regime K (knowledge, no influence) and
 *      regime E (echo: influence, no knowledge) produce transcripts on which
 *      the naive skill statistic explodes IDENTICALLY, while the coin's
 *      shift e-process separates them. The paper's central claim, executed.
 */
import { describe, expect, it } from "vitest";
import {
  hoeffdingWidth,
  initShiftEProcess,
  initValueEProcess,
  ipwScore,
  updateShiftEProcess,
  updateValueEProcess,
  type ShiftEProcessState,
  type ValueEProcessState,
} from "../instrumented-eprocess";

/** Deterministic 32-bit PRNG so every run of this suite sees identical data. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("analytic pins", () => {
  it("ipwScore is exactly unbiased for the causal contrast", () => {
    // Fixed potential rewards r1, r0 and any pi: the pi-weighted average of
    // the score over the two arms must equal r1 - r0 exactly.
    for (const pi of [0.1, 0.3, 0.5, 0.9]) {
      for (const [r1, r0] of [
        [0.8, 0.3],
        [0.0, 1.0],
        [0.5, 0.5],
      ] as const) {
        const sPublished = ipwScore(
          { publishedCandidate: true, pi, reward: r1 },
          1
        );
        const sBaseline = ipwScore(
          { publishedCandidate: false, pi, reward: r0 },
          1
        );
        expect(pi * sPublished + (1 - pi) * sBaseline).toBeCloseTo(r1 - r0, 12);
      }
    }
  });

  it("the variance-proxy e-factor breaks at the paper's exact numbers", () => {
    // Mean-zero score: +9 w.p. 0.1, -1 w.p. 0.9. Variance 9. With the
    // (invalid) variance constant at lambda = 0.3 the expectation exceeds 1.
    const lambda = 0.3;
    const varianceProxy =
      Math.exp(-((lambda * lambda * 9) / 2)) *
      (0.1 * Math.exp(lambda * 9) + 0.9 * Math.exp(-lambda));
    expect(varianceProxy).toBeCloseTo(1.4371, 3);
    expect(varianceProxy).toBeGreaterThan(1);
  });

  it("the Hoeffding range constant keeps the same e-factor valid", () => {
    // Same score arises from pi = 0.1, B = 0.9: published arm 0.9/0.1 = +9,
    // baseline arm -0.9/0.9 = -1. Width w = B/(pi(1-pi)) = 10, w^2/8 = 12.5.
    const w = hoeffdingWidth(0.9, 0.1);
    expect(w).toBeCloseTo(10, 12);
    for (const lambda of [0.05, 0.1, 0.2, 0.3, 0.5, 1]) {
      const rangeConstant =
        Math.exp(-((lambda * lambda * w * w) / 8)) *
        (0.1 * Math.exp(lambda * 9) + 0.9 * Math.exp(-lambda));
      expect(rangeConstant).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it("the shift factor is an exact e-value under independence, whatever the estimates", () => {
    // With arbitrary (even terrible) predictable arm estimates p1, p0 and the
    // pi-mixture marginal, the factor's expectation under ANY true outcome law
    // q shared by both arms (within a stratum) is exactly 1.
    for (const [p1, p0, pi, q] of [
      [0.9, 0.1, 0.5, 0.5],
      [0.7, 0.6, 0.2, 0.35],
      [0.01, 0.99, 0.8, 0.9],
    ] as const) {
      let expectation = 0;
      for (const z of [1, 0] as const) {
        const piZ = z === 1 ? pi : 1 - pi;
        for (const y of [1, 0] as const) {
          const qY = y === 1 ? q : 1 - q;
          const arm = z === 1 ? (y === 1 ? p1 : 1 - p1) : y === 1 ? p0 : 1 - p0;
          const mix =
            pi * (y === 1 ? p1 : 1 - p1) + (1 - pi) * (y === 1 ? p0 : 1 - p0);
          expectation += piZ * qY * (arm / mix);
        }
      }
      expect(expectation).toBeCloseTo(1, 12);
    }
  });
});

describe("operating characteristics (seeded synthetic worlds)", () => {
  const ALPHA = 0.05;
  const CONFIG = { rewardBound: 1, alpha: ALPHA };

  it("Type I: a hostile null world crosses at most alpha of the time", () => {
    // Null world: the reward is generated first, THEN both arms receive it —
    // publication is causally inert (Delta_t = 0 exactly) — while the reward
    // process itself drifts adversarially with history so nothing about the
    // world is iid or stationary.
    const sims = 400;
    const rounds = 600;
    let crossings = 0;
    for (let sim = 0; sim < sims; sim++) {
      const rand = mulberry32(1000 + sim);
      let state: ValueEProcessState = initValueEProcess(CONFIG);
      let drift = 0.5;
      for (let t = 0; t < rounds; t++) {
        drift = Math.min(0.9, Math.max(0.1, drift + (rand() - 0.5) * 0.1));
        const reward = rand() < drift ? Math.min(1, drift + 0.05) : drift * 0.5;
        const pi = 0.3 + 0.4 * ((t % 7) / 6); // known, varying schedule
        state = updateValueEProcess(
          state,
          { publishedCandidate: rand() < pi, pi, reward },
          CONFIG
        );
      }
      if (state.crossed) crossings += 1;
    }
    // Ville guarantees <= 5% in expectation over infinite horizons; give the
    // finite-sample estimate slack (binomial sd at p=.05, n=400 is ~1.1%).
    expect(crossings / sims).toBeLessThanOrEqual(ALPHA + 0.02);
  });

  it("power: a real contrast is detected with high frequency", () => {
    // Candidate arm's reward exceeds the baseline arm's by 0.15 in mean.
    const sims = 100;
    const rounds = 2500;
    let crossings = 0;
    for (let sim = 0; sim < sims; sim++) {
      const rand = mulberry32(9000 + sim);
      let state: ValueEProcessState = initValueEProcess(CONFIG);
      for (let t = 0; t < rounds; t++) {
        const pi = 0.5;
        const publishedCandidate = rand() < pi;
        const mean = publishedCandidate ? 0.55 : 0.4;
        const reward = Math.min(1, Math.max(0, mean + (rand() - 0.5) * 0.4));
        state = updateValueEProcess(
          state,
          { publishedCandidate, pi, reward },
          CONFIG
        );
      }
      if (state.crossed) crossings += 1;
    }
    expect(crossings / sims).toBeGreaterThanOrEqual(0.9);
  });
});

describe("the Theorem 7 demonstration: transcripts cannot separate knowledge from echo — the coin can", () => {
  const ROUNDS = 4000;
  const ALPHA = 0.01;

  /**
   * Both regimes publish the same sharp rule f(X) and randomize an audit arm
   * that publishes the 0.5 baseline instead. Regime K: outcomes follow f(X)
   * regardless of publication. Regime E: outcomes follow WHATEVER was
   * published. On candidate rounds the two regimes are literally
   * indistinguishable; only the coin's baseline arm separates them.
   */
  function runRegime(echo: boolean, seed: number) {
    const rand = mulberry32(seed);
    let naiveLogSkill = 0; // transcript-only skill statistic vs market 0.5
    let shift: ShiftEProcessState = initShiftEProcess();
    for (let t = 0; t < ROUNDS; t++) {
      const fx = rand() < 0.5 ? 0.75 : 0.25; // sharp published rule
      const pi = 0.85; // candidate published most of the time
      const publishedCandidate = rand() < pi;
      const published = publishedCandidate ? fx : 0.5;
      const outcomeProb = echo ? published : fx;
      const y: 0 | 1 = rand() < outcomeProb ? 1 : 0;
      // Naive statistic: likelihood ratio of the CANDIDATE rule against the
      // market's 0.5, accumulated over candidate-published rounds only — the
      // best a transcript-based evaluator can do.
      if (publishedCandidate) {
        naiveLogSkill += Math.log((y === 1 ? fx : 1 - fx) / 0.5);
      }
      shift = updateShiftEProcess(
        shift,
        { publishedCandidate, pi, outcome: y, stratum: fx >= 0.5 ? "hi" : "lo" },
        ALPHA
      );
    }
    return { naiveLogSkill, shift };
  }

  it("the naive transcript statistic certifies 'skill' in BOTH regimes", () => {
    const knowledge = runRegime(false, 42);
    const echo = runRegime(true, 42);
    // Both explode past any evidence threshold: the trap.
    expect(knowledge.naiveLogSkill).toBeGreaterThan(Math.log(1 / ALPHA));
    expect(echo.naiveLogSkill).toBeGreaterThan(Math.log(1 / ALPHA));
  });

  it("the shift e-process stays controlled under knowledge and detects echo", () => {
    const knowledge = runRegime(false, 42);
    const echo = runRegime(true, 42);
    // Regime K: outcome law identical across arms — no crossing at alpha=1%.
    expect(knowledge.shift.crossed).toBe(false);
    // Regime E: the baseline arm's outcomes follow 0.5 while the candidate
    // arm's follow f(X) — the arm-conditional laws separate and the e-process
    // accumulates decisive evidence of performativity.
    expect(echo.shift.crossed).toBe(true);
    expect(echo.shift.logMPeak).toBeGreaterThan(Math.log(1 / ALPHA));
  });
});
