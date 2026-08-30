import { describe, expect, it } from "vitest";
import { toPoissonFairValue } from "../poisson.js";

// NODE_ENV is "test" under vitest, so the team-rates production guard is inert here.
describe("toPoissonFairValue", () => {
  it("emits a source-tagged, draw-excluded 2-way fair value summing to 1", () => {
    const fv = toPoissonFairValue(1.6, 1.1, { now: () => new Date("2026-06-03T00:00:00Z") });
    expect(fv.source).toBe("poisson");
    expect((fv.homeFairProb ?? 0) + (fv.awayFairProb ?? 0)).toBeCloseTo(1, 4);
    expect(fv.homeFairProb!).toBeGreaterThan(fv.awayFairProb!); // higher scoring rate → favoured
    expect(fv.capturedAt).toBe("2026-06-03T00:00:00.000Z");
  });

  it("is symmetric when the rates are equal", () => {
    const fv = toPoissonFairValue(1.3, 1.3);
    expect(fv.homeFairProb!).toBeCloseTo(0.5, 4);
    expect(fv.awayFairProb!).toBeCloseTo(0.5, 4);
  });
});
