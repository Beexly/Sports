import { describe, expect, it } from "vitest";
import { DEFAULT_MIN_CALIBRATION_SAMPLE } from "../calibration-floors";
import { DEFAULT_MIN_CALIBRATION_SAMPLE as fromBarrel } from "../index";
import { coverageFor } from "../../../prediction-engine/src/certificate/stratum-coverage";

describe("calibration floors — one home, byte-identical 100", () => {
  it("DEFAULT_MIN_CALIBRATION_SAMPLE is 100", () => {
    expect(DEFAULT_MIN_CALIBRATION_SAMPLE).toBe(100);
    expect(fromBarrel).toBe(100);
  });

  it("stratum coverage default floor uses the same constant", () => {
    const c = coverageFor("NFL|MONEYLINE|v5.2.1", 99);
    expect(c.floor).toBe(100);
    expect(c.meetsFloor).toBe(false);
    expect(coverageFor("NFL|MONEYLINE|v5.2.1", 100).meetsFloor).toBe(true);
  });
});
