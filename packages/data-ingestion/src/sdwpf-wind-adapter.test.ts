/**
 * Tests for ./sdwpf-wind-adapter (arXiv:2208.04360v2, lane=weather).
 *
 * ACCEPTANCE GATE: ADAPT: the benchmark data and task definition are exactly what GSE needs to stand up a credible
 * wind-forecasting lane — value as substrate, not just method.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./sdwpf-wind-adapter";

describe("SDWPF wind adapter (arXiv:2208.04360v2)", () => {
  const t0 = Date.now();
  const iso = (m: number): string => new Date(t0 + m * 60000).toISOString();
  const readings = [
    { turbineId: "t1", recordedAt: iso(0), windSpeed: 5, windDir: 90, powerKw: 100 },
    { turbineId: "t1", recordedAt: iso(30), windSpeed: 8, windDir: 95, powerKw: 400 },
    { turbineId: "t1", recordedAt: iso(60), windSpeed: 12, windDir: 100, powerKw: 900 },
  ];
  it("power curve monotone", () => {
    expect(mod.powerCurveMonotone(readings, 1000)).toBe(true);
    expect(mod.powerCurveMonotone([...readings, { ...readings[2], windSpeed: 15, powerKw: 100 }], 1000)).toBe(false);
    expect(mod.powerCurveMonotone([], 1000)).toBeNull();
  });
  it("ramp events", () => {
    const ramps = mod.rampEvents(readings, 60, 500);
    expect(ramps.length).toBeGreaterThan(0);
    expect(mod.rampEvents(readings, 60, 10000)).toEqual([]);
  });
  it("capacity factor", () => {
    expect(mod.capacityFactor(readings, 1000)).toBeCloseTo(1400 / 3000, 10);
    expect(mod.capacityFactor([], 1000)).toBeNull();
    expect(mod.isTurbineReading({ ...readings[0], windDir: 400 })).toBe(false);
  });
});
