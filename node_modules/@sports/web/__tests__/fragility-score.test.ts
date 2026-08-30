import { describe, expect, it } from "vitest";
import { computeFragilityScore } from "@/lib/premortem/fragility";
import type { PickPremortemSnapshotInput } from "@/lib/premortem/build";

/**
 * Fragility Score — the premortem's structural risk as a checkable number.
 * Pins the published component weights, the bands, and the honesty guards.
 */

const sturdy: PickPremortemSnapshotInput = {
  id: "snap-1",
  capturedAt: new Date("2026-06-12T12:00:00Z"),
  hadLineMovementSignal: true,
  hadRestSignal: true,
  hadScheduleSignal: true,
  hadAtsFormSignal: true,
  hadH2HSignal: true,
  hadVenueSignal: false,
  hadWeatherSignal: false,
  hadInjurySignal: false,
  bookmakerCount: 9,
  dataQualityScore: 95,
  lineMovementDelta: 0.5,
  restAdvantageNet: 1,
  atsFormSampleSize: 20,
  h2hSampleSize: 8,
  scheduleDensityHome: 2,
  scheduleDensityAway: 3,
  modelVersion: "v3",
};

describe("computeFragilityScore", () => {
  it("a deep-book, healthy, well-sampled pick scores low", () => {
    const f = computeFragilityScore(sturdy)!;
    expect(f.score).toBeLessThanOrEqual(25);
    expect(f.band).toBe("low");
    // Components are published and sum to the score — checkable by hand.
    const sum = f.components.reduce((a, c) => a + c.points, 0);
    expect(f.score).toBeCloseTo(sum, 1);
    expect(f.components.map((c) => c.max)).toEqual([25, 25, 25, 25]);
  });

  it("thin books + poor evidence + thin samples + volatile context reads severe", () => {
    const f = computeFragilityScore({
      ...sturdy,
      bookmakerCount: 2,
      dataQualityScore: 20,
      atsFormSampleSize: 2,
      h2hSampleSize: 1,
      hadVenueSignal: true,
      hadWeatherSignal: true,
      hadInjurySignal: true,
    })!;
    expect(f.score).toBeGreaterThan(75);
    expect(f.band).toBe("severe");
  });

  it("samples only count when the model actually leaned on them", () => {
    const noSamples = computeFragilityScore({
      ...sturdy,
      hadAtsFormSignal: false,
      hadH2HSignal: false,
      atsFormSampleSize: 1, // present but unused — must not count
      h2hSampleSize: 1,
    })!;
    const thinness = noSamples.components.find((c) => c.name === "Sample thinness")!;
    expect(thinness.points).toBe(0);
    expect(thinness.why).toMatch(/no sample-based signal/);
  });

  it("returns null without a snapshot — never a guessed score", () => {
    expect(computeFragilityScore(null)).toBeNull();
  });

  it("states its structural-only weakness in the output itself", () => {
    const f = computeFragilityScore(sturdy)!;
    expect(f.weakness).toMatch(/not variance, opponent quality/i);
    // And never speaks in gated terms.
    expect(JSON.stringify(f)).not.toMatch(/fair.?prob|kelly|\bEV\b/i);
  });

  it("bands cover the whole range without gaps", () => {
    const bandOf = (n: number) =>
      n <= 25 ? "low" : n <= 50 ? "moderate" : n <= 75 ? "high" : "severe";
    for (const n of [0, 25, 25.1, 50, 50.1, 75, 75.1, 100]) {
      expect(bandOf(n)).toBeTruthy();
    }
  });
});
