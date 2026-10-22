import { describe, expect, it } from "vitest";
import { reliabilityCorrectedSlope } from "./reliability-ratio.js";

describe("reliability ratio", () => {
  it("undoes attenuation when half the observed variance is noise", () => {
    expect(reliabilityCorrectedSlope(0.4, 1, 1)).toBeCloseTo(0.8);
    expect(() => reliabilityCorrectedSlope(0.4, 0, 1)).toThrow(/positive/);
  });
});
