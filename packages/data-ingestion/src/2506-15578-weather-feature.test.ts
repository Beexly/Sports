/**
 * Tests for ./2506-15578-weather-feature (arXiv:2506.15578, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT if local/semi-local EMOS beats raw by >=5% CRPSS on wind speed at 0-3d leads on the 2023-2024 holdout; REJECT if gain <5% and rely on the ANET2 wind flow instead.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2506-15578-weather-feature";

describe("2506-15578 Statistical post-processing of operational dual-resolution wind-speed", () => {
  it("air density is ~1.225 kg/m^3 at STP", () => {
    expect(mod.airDensity(15, 1013.25)).toBeCloseTo(1.225, 2);
    expect(mod.airDensity(15, 1013.25)!).toBeGreaterThan(mod.airDensity(35, 1013.25)!);
    expect(mod.airDensity(-300, 1013)).toBeNull();
  });
  it("wind drag scales linearly and vanishes in domes", () => {
    expect(mod.windTotalAdjustment(20)).toBeCloseTo(-2.4, 10);
    expect(mod.windTotalAdjustment(0)).toBeCloseTo(0, 10);
    const dome = mod.gameWeatherFeature(20, 1013, 25, 0, true);
    expect(dome.windAdjPts).toBeCloseTo(0, 10);
    const open = mod.gameWeatherFeature(20, 1013, 25, 0, false);
    expect(open.windAdjPts!).toBeLessThan(0);
  });
  it("precipitation classification thresholds", () => {
    expect(mod.precipitationClass(0)).toBe("dry");
    expect(mod.precipitationClass(1)).toBe("damp");
    expect(mod.precipitationClass(5)).toBe("wet");
    expect(mod.precipitationClass(-1)).toBeNull();
  });
});
