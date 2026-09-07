import { describe, expect, it } from "vitest";
import {
  altitudeGainFeet,
  DENVER_ELEVATION_FT,
  isSignificantAltitudeJump,
  SEA_LEVEL_ELEVATION_FT,
} from "../stadium-altitude.js";

describe("altitudeGainFeet", () => {
  it("computes the sea-level-to-Denver gain a visiting team experiences", () => {
    expect(altitudeGainFeet(DENVER_ELEVATION_FT, SEA_LEVEL_ELEVATION_FT)).toBe(5280);
  });

  it("returns zero when both teams share an elevation (no disadvantage)", () => {
    expect(altitudeGainFeet(DENVER_ELEVATION_FT, DENVER_ELEVATION_FT)).toBe(0);
  });

  it("returns negative when the visitor is descending, not climbing", () => {
    expect(altitudeGainFeet(SEA_LEVEL_ELEVATION_FT, DENVER_ELEVATION_FT)).toBe(-5280);
  });
});

describe("isSignificantAltitudeJump", () => {
  it("flags the real Denver-from-sea-level case as significant", () => {
    const gain = altitudeGainFeet(DENVER_ELEVATION_FT, SEA_LEVEL_ELEVATION_FT);
    expect(isSignificantAltitudeJump(gain)).toBe(true);
  });

  it("does not flag a small, ordinary metro-to-metro elevation difference", () => {
    // e.g. two teams a few hundred feet apart — well below any physiological threshold.
    expect(isSignificantAltitudeJump(400)).toBe(false);
  });

  it("respects a caller-supplied threshold instead of the default", () => {
    expect(isSignificantAltitudeJump(2000, 1500)).toBe(true);
    expect(isSignificantAltitudeJump(2000, 2500)).toBe(false);
  });
});
