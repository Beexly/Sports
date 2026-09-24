/**
 * Tests for ./projectile-wind-model (arXiv:2206.02397, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT iff the wind-adjusted model reduces RMSE by >= 1.5 yards vs the punter-mean baseline on
 * the windy-game holdout AND the fitted V_term lands in a physically sane range (20-40 m/s).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./projectile-wind-model";

describe("projectile wind model (arXiv:2206.02397)", () => {
  const shot = { v0ms: 28, angleDeg: 35, windMs: 0, rho: 1.225, dragK: 0.25 };
  it("tailwind extends range, headwind shortens", () => {
    const tail = mod.windRangeDelta({ ...shot, windMs: 5 })!;
    const head = mod.windRangeDelta({ ...shot, windMs: -5 })!;
    expect(tail).toBeGreaterThan(0);
    expect(head).toBeLessThan(0);
  });
  it("trajectory sane", () => {
    const t = mod.trajectoryWind(shot)!;
    expect(t.rangeM).toBeGreaterThan(20);
    expect(t.hangS).toBeGreaterThan(2);
    expect(t.apexM).toBeGreaterThan(5);
    expect(mod.trajectoryWind({ ...shot, angleDeg: 0 })).toBeNull();
  });
  it("wind sign", () => {
    expect(mod.windEffectSign(3)).toBe("tailwind");
    expect(mod.windEffectSign(-3)).toBe("headwind");
    expect(mod.windEffectSign(0.1)).toBe("calm");
    expect(mod.windEffectSign(NaN)).toBeNull();
  });
});
