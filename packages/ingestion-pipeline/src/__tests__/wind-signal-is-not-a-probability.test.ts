/**
 * The one CONTINUOUS_VALUE signal that actually returns a value today is
 * pinned against the REAL registry entry, not a stand-in.
 *
 * `continuous-value-never-blended.test.ts` mocks the registry, so it proves the
 * runner's behaviour but cannot see the shipped signal. This file imports
 * `nflWindElasticitySignal` itself and asserts the blend predicate refuses what
 * it genuinely emits: a passing-yards multiplier, a number that sits in [0, 1]
 * and would therefore pass every range check if it were ever placed in a
 * probability field.
 *
 * That last point is why this guard exists. The scalar is not obviously
 * malformed. Nothing downstream could detect the mistake by inspecting the
 * number. The only thing standing between a 0.92 yards multiplier and a
 * published "92% win probability" is that it is never written into
 * `homeFairProb` in the first place.
 */
import { describe, expect, it } from "vitest";
import { isSignalProbabilityValue } from "@sports/types";
import { nflWindElasticitySignal } from "../signal-registry-definitions.js";

const CTX = {
  sportKey: "americanfootball_nfl",
  homeTeam: "Buffalo Bills",
  awayTeam: "Detroit Lions",
  commenceTime: new Date("2026-09-19T00:20:00.000Z"),
  env: { WIND_MPH: "18" } as Record<string, string | undefined>,
  now: () => new Date("2026-09-19T00:00:00.000Z"),
  skipNetworkIndependents: true,
};

describe("nflWindElasticitySignal emits a scalar, never a probability", () => {
  it("declares itself CONTINUOUS_VALUE", () => {
    expect(nflWindElasticitySignal.outputKind).toBe("CONTINUOUS_VALUE");
  });

  it("actually returns a value for this context, so the checks below are not vacuous", async () => {
    const out = await nflWindElasticitySignal.evaluate?.(CTX);
    expect(out).not.toBeNull();
    expect(out).toBeDefined();
  });

  it("returns a scalar the blend predicate REFUSES", async () => {
    const out = await nflWindElasticitySignal.evaluate?.(CTX);
    expect(isSignalProbabilityValue(out)).toBe(false);
  });

  it("carries no probability fields at all, so structural typing cannot leak it", async () => {
    const out = await nflWindElasticitySignal.evaluate?.(CTX);
    expect(out).not.toBeNull();
    expect(Object.keys(out ?? {})).not.toContain("homeFairProb");
    expect(Object.keys(out ?? {})).not.toContain("awayFairProb");
  });

  it("emits a multiplier that would pass a naive [0,1] range check, which is the trap", async () => {
    const out = (await nflWindElasticitySignal.evaluate?.(CTX)) as { value: number } | null;
    expect(out).not.toBeNull();
    expect(Number.isFinite(out?.value)).toBe(true);
    // Stated, not asserted as a bound on the physics: the point is only that a
    // range check cannot distinguish this number from a win probability.
    expect(out!.value).toBeGreaterThanOrEqual(0);
    expect(out!.value).toBeLessThanOrEqual(1);
  });
});
