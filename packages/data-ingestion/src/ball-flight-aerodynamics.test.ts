/**
 * Tests for ./ball-flight-aerodynamics (arXiv:1710.02784, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT the feature if the rho-adjusted model beats the distance-only baseline by >= 0.002 log-
 * loss on the 2024-2025 holdout AND the altitude coefficient is directionally correct (positive
 * distance effect).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./ball-flight-aerodynamics";

describe("ball flight aerodynamics (arXiv:1710.02784)", () => {
  it("air density sane at STP", () => {
    const rho = mod.airDensity(15, 1013.25)!;
    expect(rho).toBeCloseTo(1.225, 2);
    expect(mod.airDensity(-300, 1013)).toBeNull();
  });
  it("pressure drops with altitude", () => {
    const p = mod.pressureAtAltitude(1013.25, 5280)!;
    expect(p).toBeLessThan(1013.25);
    expect(p).toBeGreaterThan(700);
  });
  it("projectile range increases as density falls", () => {
    const sea = mod.projectileRange(28, 35, 1.225, 0.25)!;
    const mile = mod.projectileRange(28, 35, 1.0, 0.25)!;
    expect(mile.rangeM).toBeGreaterThan(sea.rangeM);
    expect(sea.hangS).toBeGreaterThan(0);
    expect(mod.projectileRange(28, 0, 1.225, 0.25)).toBeNull();
  });
  it("FG modifier positive at altitude (directional gate)", () => {
    const rhoDen = mod.airDensity(10, mod.pressureAtAltitude(1013.25, 5280)!)!;
    const rhoSea = mod.airDensity(10, 1013.25)!;
    expect(mod.fgDistanceModifier(rhoDen, rhoSea)!).toBeGreaterThan(0);
    expect(mod.fgDistanceModifier(1, 0)).toBeNull();
  });
});
