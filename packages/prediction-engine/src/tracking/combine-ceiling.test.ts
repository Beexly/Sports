import { describe, expect, it } from "vitest";
import {
  ceilingCloseness,
  combineSpeedCeiling,
  exceedanceRate,
} from "./combine-ceiling.js";

describe("combine ceiling", () => {
  it("treats the drill max as the ceiling and counts game frames above it", () => {
    expect(combineSpeedCeiling([8.1, 9.4, 8.8])).toBe(9.4);
    expect(exceedanceRate([9.0, 9.5, 9.6], 9.4)).toBeCloseTo(2 / 3, 8);
    expect(ceilingCloseness(9.6, 9.4)).toBeCloseTo(9.6 / 9.4, 8);
  });

  it("refuses an empty drill or a non-positive ceiling", () => {
    expect(combineSpeedCeiling([])).toBeNull();
    expect(exceedanceRate([9], null)).toBeNull();
    expect(ceilingCloseness(9, 0)).toBeNull();
  });
});
