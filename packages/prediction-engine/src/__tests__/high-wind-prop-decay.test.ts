import { describe, expect, it } from "vitest";
import {
  HIGH_WIND_METHOD_TAG,
  MEASURED_WIND_TABLE,
  WindContextError,
  windPropDecay,
  windPropDecayGuarded,
} from "../signals/environmental/high-wind-prop-decay.js";

describe("high-wind prop decay", () => {
  it("exposes the measured method tag and table", () => {
    expect(HIGH_WIND_METHOD_TAG).toBe("high_wind_prop_decay_v1");
    expect(MEASURED_WIND_TABLE.baseline.attempts).toBe(66528);
    expect(MEASURED_WIND_TABLE.mid.completionDeltaPp).toBe(-1.5);
    expect(MEASURED_WIND_TABLE.high.established).toBe(false);
  });

  it("is neutral below 15 mph", () => {
    const r = windPropDecay(10, "passing_yards");
    expect(r.bin).toBe("0-14");
    expect(r.applies).toBe(false);
    expect(r.completionDeltaPp).toBe(0);
    expect(r.notEstablished).toBe(false);
  });

  it("applies the measured 15-19 mph effects", () => {
    const r = windPropDecay(17, "passing_props");
    expect(r.bin).toBe("15-19");
    expect(r.applies).toBe(true);
    expect(r.completionDeltaPp).toBe(-1.5);
    expect(r.yardsPerAttemptDelta).toBeCloseTo(-0.318, 3);
    expect(r.deepTargetRelativeDelta).toBeCloseTo(-0.166, 3);
    expect(r.notEstablished).toBe(false);
  });

  it("returns neutral + notEstablished for >= 20 mph (n=1,796, effects inside noise)", () => {
    const r = windPropDecay(25, "completions");
    expect(r.bin).toBe(">=20");
    expect(r.applies).toBe(false);
    expect(r.completionDeltaPp).toBe(0);
    expect(r.notEstablished).toBe(true);
  });

  it("refuses spread / moneyline / total contexts outright", () => {
    for (const market of ["spread", "moneyline", "total"] as const) {
      expect(() => windPropDecayGuarded(18, market)).toThrow(WindContextError);
    }
  });

  it("passes prop contexts through the guard", () => {
    expect(windPropDecayGuarded(17, "passing_yards").applies).toBe(true);
  });

  it("throws on impossible wind readings", () => {
    expect(() => windPropDecay(-3, "passing_yards")).toThrow(WindContextError);
    expect(() => windPropDecay(Number.NaN, "passing_yards")).toThrow(WindContextError);
  });
});
