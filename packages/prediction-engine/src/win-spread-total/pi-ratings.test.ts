
import { describe, expect, it } from "vitest";
import { beatsAllBaselines, piExpectedGoalDiff, piRatingsUpdate } from "./pi-ratings";

describe("pi-ratings", () => {
  it("updates ratings toward the observed result", () => {
    const z = { home: 0, away: 0 };
    const out = piRatingsUpdate(z, z, 3, 1);
    expect(out.home.home).toBeGreaterThan(0);
    expect(out.away.away).toBeLessThan(0);
    // cross ratings move at the damped gamma rate
    expect(out.home.away).toBeCloseTo(out.home.home * 0.7, 10);
  });
  it("draw at equal ratings is a no-op", () => {
    const z = { home: 0.5, away: 0.5 };
    const out = piRatingsUpdate(z, z, 1, 1);
    expect(out.home.home).toBeCloseTo(0.5, 10);
  });
  it("expected goal diff is the home/away rating gap", () => {
    expect(piExpectedGoalDiff({ home: 1.2, away: 0 }, { home: 0, away: 0.4 })).toBeCloseTo(0.8, 10);
  });
  it("upset moves ratings more than expected result does not", () => {
    const strong = { home: 2, away: 2 };
    const weak = { home: -2, away: -2 };
    const upset = piRatingsUpdate(weak, strong, 2, 0);
    expect(Math.abs(upset.home.home - -2)).toBeGreaterThan(0.05);
  });
  it("beatsAllBaselines requires strict improvement on both metrics", () => {
    const c = { name: "x", logLoss: 0.6, brier: 0.2 };
    const b = [{ name: "pi", logLoss: 0.65, brier: 0.22 }];
    expect(beatsAllBaselines(c, b)).toBe(true);
    expect(beatsAllBaselines({ ...c, brier: 0.25 }, b)).toBe(false);
    expect(beatsAllBaselines(c, [])).toBe(true);
  });
});
