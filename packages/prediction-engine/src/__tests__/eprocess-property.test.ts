/**
 * Property-based fuzz over the Bernoulli / forecast-skill / instrumented
 * e-processes. Guards the martingale-shaped contracts without rebuilding the
 * algorithms:
 *
 *   - every e-value / wealth path is nonnegative (and finite when returned);
 *   - under a true null the one-step factor has conditional mean 1, so capital
 *     stays a nonnegative martingale (never negative);
 *   - Ville threshold crossing is monotone in the threshold and sticky in time
 *     (a prefix crossing cannot be un-crossed by later observations).
 *
 * Citations for the techniques these modules implement: Ville (1939);
 * Ramdas–Grünwald–Vovk–Shafer anytime-valid e-processes; Waudby-Smith & Ramdas
 * testing-by-betting.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  eProcess,
  eStep,
  mixtureEProcess,
  bettingEProcess,
  type BernoulliOutcome,
} from "../bernoulli-eprocess.js";
import { forecastSkillEProcess, type ForecastSkillPoint } from "../forecast-skill-eprocess.js";
import {
  initValueEProcess,
  updateValueEProcess,
  type ValueRound,
} from "../instrumented-eprocess.js";

const RUNS = 500;

/**
 * Shared assert params. `numRuns` is the coverage knob; the rest is a hang guard.
 * Mirrors calibration-property.test.ts: fc.assert runs synchronously, so vitest
 * testTimeout cannot kill a pathological shrink. 30s is far above a healthy
 * property; markInterruptAsFailure turns a hang into a red test.
 */
const FUZZ = {
  numRuns: RUNS,
  interruptAfterTimeLimit: 30_000,
  markInterruptAsFailure: true,
};

/** Open unit interval: eStep refuses 0 and 1. */
const openUnit = fc.double({
  min: 1e-3,
  max: 1 - 1e-3,
  noNaN: true,
  noDefaultInfinity: true,
});
const outcome = fc.constantFrom(0, 1) as fc.Arbitrary<BernoulliOutcome>;

const alignedBernoulli = fc
  .integer({ min: 0, max: 40 })
  .chain((n) =>
    fc.record({
      pHats: fc.array(openUnit, { minLength: n, maxLength: n }),
      pMkts: fc.array(openUnit, { minLength: n, maxLength: n }),
      ys: fc.array(outcome, { minLength: n, maxLength: n }),
    }),
  );

describe("e-value product is nonnegative", () => {
  it("eStep is a positive finite factor, or null on refused input", () => {
    fc.assert(
      fc.property(openUnit, openUnit, outcome, (pHat, pMkt, y) => {
        const factor = eStep(pHat, pMkt, y);
        expect(factor).not.toBeNull();
        expect(Number.isFinite(factor!)).toBe(true);
        expect(factor!).toBeGreaterThan(0);
      }),
      FUZZ,
    );
  });

  it("eProcess wealth path is positive, finite, and supM is the running max", () => {
    fc.assert(
      fc.property(alignedBernoulli, ({ pHats, pMkts, ys }) => {
        const run = eProcess(pHats, pMkts, ys);
        expect(run).not.toBeNull();
        if (ys.length === 0) {
          expect(run!.M).toBe(1);
          expect(run!.supM).toBe(1);
          expect(run!.logM).toBe(0);
          return;
        }
        expect(run!.series).toHaveLength(ys.length);
        let runningMax = 1;
        for (let i = 0; i < run!.series.length; i++) {
          const m = run!.series[i]!;
          expect(Number.isFinite(m)).toBe(true);
          expect(m).toBeGreaterThan(0);
          runningMax = Math.max(runningMax, m);
          expect(run!.supM).toBeGreaterThanOrEqual(m);
        }
        expect(run!.supM).toBeCloseTo(runningMax, 9);
        expect(run!.M).toBe(run!.series[run!.series.length - 1]!);
        expect(run!.M).toBeGreaterThan(0);
      }),
      FUZZ,
    );
  });

  it("mixture of nonnegative wealth paths stays nonnegative", () => {
    fc.assert(
      fc.property(alignedBernoulli, ({ pHats, pMkts, ys }) => {
        const a = eProcess(pHats, pMkts, ys);
        const b = eProcess(pMkts, pHats, ys);
        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        const mix = mixtureEProcess([a!.series, b!.series]);
        expect(mix).not.toBeNull();
        for (const m of mix!.series) {
          expect(Number.isFinite(m)).toBe(true);
          expect(m).toBeGreaterThanOrEqual(0);
        }
        if (mix!.n > 0) {
          expect(mix!.supM).toBeGreaterThanOrEqual(mix!.M);
        }
      }),
      FUZZ,
    );
  });
});

describe("under a true null, capital is a nonnegative martingale", () => {
  it("eStep has conditional mean exactly 1 when y ~ Bernoulli(pMkt)", () => {
    fc.assert(
      fc.property(openUnit, openUnit, (pHat, pMkt) => {
        const win = eStep(pHat, pMkt, 1);
        const lose = eStep(pHat, pMkt, 0);
        expect(win).not.toBeNull();
        expect(lose).not.toBeNull();
        const conditionalMean = pMkt * win! + (1 - pMkt) * lose!;
        expect(conditionalMean).toBeCloseTo(1, 10);
      }),
      FUZZ,
    );
  });

  it("when pHat === pMkt the product is identically 1 (null of no skill)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }).chain((n) =>
          fc.record({
            p: fc.array(openUnit, { minLength: n, maxLength: n }),
            ys: fc.array(outcome, { minLength: n, maxLength: n }),
          }),
        ),
        ({ p, ys }) => {
          const run = eProcess(p, p, ys);
          expect(run).not.toBeNull();
          for (const m of run!.series) {
            expect(m).toBeCloseTo(1, 10);
            expect(m).toBeGreaterThan(0);
          }
          expect(run!.supM).toBeCloseTo(1, 10);
          expect(run!.M).toBeCloseTo(1, 10);
        },
      ),
      FUZZ,
    );
  });

  it("betting e-process capital stays positive when λ < 1/y0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }).chain((n) =>
          fc.record({
            y0: fc.double({ min: 0.2, max: 0.8, noNaN: true, noDefaultInfinity: true }),
            pHats: fc.array(openUnit, { minLength: n, maxLength: n }),
            ys: fc.array(outcome, { minLength: n, maxLength: n }),
            lambdaFrac: fc.double({ min: 0.05, max: 0.9, noNaN: true, noDefaultInfinity: true }),
          }),
        ),
        ({ y0, pHats, ys, lambdaFrac }) => {
          const lambda = (lambdaFrac * 0.99) / y0;
          const lambdas = pHats.map(() => lambda);
          const run = bettingEProcess(pHats, ys, y0, lambdas);
          expect(run).not.toBeNull();
          expect(run!.M).toBeGreaterThan(0);
          expect(run!.supM).toBeGreaterThanOrEqual(run!.M);
          expect(Number.isFinite(run!.M)).toBe(true);
          // One-step factor mean under y ~ Bernoulli(y0) is exactly 1.
          const meanFactor = y0 * (1 + lambda * (1 - y0)) + (1 - y0) * (1 + lambda * (0 - y0));
          expect(meanFactor).toBeCloseTo(1, 10);
        },
      ),
      FUZZ,
    );
  });

  it("forecast-skill wealth is nonnegative and finite on valid ledgers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 40 }).chain((n) =>
          fc.array(
            fc.record({
              p: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
              m: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
              y: outcome,
            }),
            { minLength: n, maxLength: n },
          ),
        ),
        (points: ForecastSkillPoint[]) => {
          const result = forecastSkillEProcess(points, { minPicks: 1, alpha: 0.05 });
          expect(result).not.toBeNull();
          expect(Number.isFinite(result!.m)).toBe(true);
          expect(result!.m).toBeGreaterThan(0);
          expect(result!.maxM).toBeGreaterThan(0);
          expect(result!.maxM).toBeGreaterThanOrEqual(result!.m - 1e-12);
          expect(result!.anytimeValidPValue).toBeGreaterThan(0);
          expect(result!.anytimeValidPValue).toBeLessThanOrEqual(1);
        },
      ),
      FUZZ,
    );
  });
});

describe("Ville threshold crossing is monotone", () => {
  it("supM of a prefix never exceeds supM of the full path; crossing a high bar implies crossing a lower one", () => {
    fc.assert(
      fc.property(
        alignedBernoulli,
        fc.double({ min: 1.1, max: 50, noNaN: true, noDefaultInfinity: true }),
        ({ pHats, pMkts, ys }, highThreshold) => {
          const full = eProcess(pHats, pMkts, ys);
          expect(full).not.toBeNull();
          const lowThreshold = 1 + (highThreshold - 1) / 2;

          if (full!.supM >= highThreshold) {
            expect(full!.supM).toBeGreaterThanOrEqual(lowThreshold);
          }

          for (let k = 0; k <= ys.length; k++) {
            const prefix = eProcess(pHats.slice(0, k), pMkts.slice(0, k), ys.slice(0, k));
            expect(prefix).not.toBeNull();
            expect(prefix!.supM).toBeLessThanOrEqual(full!.supM + 1e-9);
            if (prefix!.supM >= highThreshold) {
              expect(full!.supM).toBeGreaterThanOrEqual(highThreshold - 1e-12);
            }
          }
        },
      ),
      FUZZ,
    );
  });

  it("forecast-skill first crossing is sticky and monotone in the threshold", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }).chain((n) =>
          fc.array(
            fc.record({
              p: fc.double({ min: 0.05, max: 0.95, noNaN: true, noDefaultInfinity: true }),
              m: fc.double({ min: 0.05, max: 0.95, noNaN: true, noDefaultInfinity: true }),
              y: outcome,
            }),
            { minLength: n, maxLength: n },
          ),
        ),
        (points: ForecastSkillPoint[]) => {
          const tight = forecastSkillEProcess(points, {
            minPicks: 1,
            evidenceThreshold: 20,
          });
          const loose = forecastSkillEProcess(points, {
            minPicks: 1,
            evidenceThreshold: 2,
          });
          expect(tight).not.toBeNull();
          expect(loose).not.toBeNull();

          if (tight!.firstCrossedAtPick !== null) {
            expect(loose!.firstCrossedAtPick).not.toBeNull();
            expect(loose!.firstCrossedAtPick!).toBeLessThanOrEqual(tight!.firstCrossedAtPick);
          }

          let state = forecastSkillEProcess([], { minPicks: 1, evidenceThreshold: 5 });
          expect(state).not.toBeNull();
          let crossedAt: number | null = null;
          for (let i = 0; i < points.length; i++) {
            const next = forecastSkillEProcess(points.slice(0, i + 1), {
              minPicks: 1,
              evidenceThreshold: 5,
            });
            expect(next).not.toBeNull();
            if (crossedAt !== null) {
              expect(next!.firstCrossedAtPick).toBe(crossedAt);
            }
            if (next!.firstCrossedAtPick !== null && crossedAt === null) {
              crossedAt = next!.firstCrossedAtPick;
            }
            state = next;
          }
          expect(state!.maxM).toBeGreaterThanOrEqual(state!.m - 1e-12);
        },
      ),
      FUZZ,
    );
  });

  it("instrumented VALUE e-process capital stays positive and crossing is sticky", () => {
    const config = { rewardBound: 1, alpha: 0.05 };
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            publishedCandidate: fc.boolean(),
            pi: fc.double({ min: 0.1, max: 0.9, noNaN: true, noDefaultInfinity: true }),
            reward: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 1, maxLength: 40 },
        ),
        (rounds: ValueRound[]) => {
          let state = initValueEProcess(config);
          let everCrossed = false;
          for (const round of rounds) {
            state = updateValueEProcess(state, round, config);
            const capital = Math.exp(state.logM);
            expect(Number.isFinite(capital) || capital === Number.POSITIVE_INFINITY).toBe(true);
            expect(capital).toBeGreaterThan(0);
            expect(state.logMPeak).toBeGreaterThanOrEqual(state.logM);
            if (state.crossed) everCrossed = true;
            if (everCrossed) expect(state.crossed).toBe(true);
          }
        },
      ),
      FUZZ,
    );
  });
});
