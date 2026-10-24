import { describe, expect, it } from "vitest";
import {
  MIN_ROUTES_FOR_SURPLUS,
  leverageBand,
  leverageNote,
  leverageSurplus,
} from "../leverage-surplus";

describe("leverageSurplus", () => {
  it("returns the raw residual when the sample is adequate", () => {
    expect(leverageSurplus({ meanResidual: 0.08, routes: 300 })).toBe(0.08);
  });

  it("is unshrunk — does not scale the value down", () => {
    // James-Stein collapses to 0 here, so any scaling would erase the metric.
    expect(leverageSurplus({ meanResidual: 0.1, routes: 100 })).toBe(0.1);
  });

  it("requires the route floor", () => {
    expect(leverageSurplus({ meanResidual: 0.1, routes: MIN_ROUTES_FOR_SURPLUS - 1 })).toBeNull();
    expect(leverageSurplus({ meanResidual: 0.1, routes: MIN_ROUTES_FOR_SURPLUS })).toBe(0.1);
  });

  it("returns null for absent or non-finite residuals", () => {
    expect(leverageSurplus({ meanResidual: null, routes: 300 })).toBeNull();
    expect(leverageSurplus({ meanResidual: Number.NaN, routes: 300 })).toBeNull();
  });
});

describe("banding", () => {
  it("bands by sign and threshold", () => {
    expect(leverageBand(0.09)).toBe("difficulty_taker");
    expect(leverageBand(-0.09)).toBe("clean_release");
    expect(leverageBand(0.01)).toBe("neutral");
    expect(leverageBand(null)).toBeNull();
  });

  it("explains the catch-rate consequence, not a projection lift", () => {
    expect(leverageNote(0.1)).toContain("lower catch rate");
    expect(leverageNote(-0.1)).toContain("flatters");
    expect(leverageNote(0)).toBeTruthy();
    expect(leverageNote(null)).toBeNull();
  });
});
