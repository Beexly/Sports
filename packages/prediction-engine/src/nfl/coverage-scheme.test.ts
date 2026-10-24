import { describe, expect, it } from "vitest";
import {
  coverageFamily,
  coverageSchemeUniqueness,
  defenderOffenseDelta,
  meanClassProbabilities,
  neighborLabelMismatch,
  speedFromDisplacement,
  correctedAcceleration,
} from "./coverage-scheme.js";

describe("coverage scheme", () => {
  it("differences a pair, corrects 10 Hz speed, and averages an ensemble", () => {
    expect(coverageFamily("cover-3-zone")).toBe("zone");
    expect(coverageFamily("prevent")).toBe("zone");
    expect(defenderOffenseDelta({ x: 5, y: 1, sx: 2, sy: 0 }, { x: 2, y: 4, sx: 1, sy: 1 })).toEqual({
      dx: 3,
      dy: -3,
      dsx: 1,
      dsy: -1,
    });
    expect(speedFromDisplacement(0.4)).toBeCloseTo(4);
    expect(correctedAcceleration(10, 0.4, 2)).toBeCloseTo(20);
    const averaged = meanClassProbabilities([[0.8, 0.2], [0.4, 0.6]]);
    expect(averaged[0]).toBeCloseTo(0.6);
    expect(averaged[1]).toBeCloseTo(0.4);
    expect(coverageSchemeUniqueness(3, 4)).toBeCloseTo(5);
    expect(neighborLabelMismatch("cover-3-zone", ["cover-3-zone", "cover-1-man"])).toBeCloseTo(0.5);
  });
});
