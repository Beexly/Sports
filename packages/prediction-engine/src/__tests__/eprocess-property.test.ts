/**
 * Property-based fuzz over the forecast-skill e-process (the live module;
 * barrel-exported and wired to pipeline/live-orchestrator.ts). Guards the
 * martingale-shaped contract without rebuilding the algorithm:
 *
 *   - wealth is nonnegative and finite on valid ledgers;
 *   - first crossing is sticky in time and monotone in the threshold.
 *
 * NOTE (2026-09-05): this file formerly also fuzzed bernoulli-eprocess.ts and
 * instrumented-eprocess.ts. Both modules are archived (zero barrel exports,
 * zero non-test importers) so their property tests moved with them to
 * packages/prediction-engine/attic/. Only the live-module properties remain.
 *
 * Citations for the technique the live module implements: Ville (1939);
 * Ramdas–Grünwald–Vovk–Shafer anytime-valid e-processes; Waudby-Smith & Ramdas
 * testing-by-betting.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { forecastSkillEProcess, type ForecastSkillPoint } from "../forecast-skill-eprocess.js";

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

/** Outcome bit for forecast-skill ledger points. */
const outcome = fc.constantFrom(0, 1) as fc.Arbitrary<0 | 1>;

describe("forecast-skill wealth is nonnegative and finite on valid ledgers", () => {
  it("wealth stays positive and finite; p-value stays in (0, 1]", () => {
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

describe("forecast-skill first crossing is sticky and monotone in the threshold", () => {
  it("tight crossing implies loose crossing no later; crossing is sticky", () => {
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
});
