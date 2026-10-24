import { describe, expect, it } from "vitest";
import { travelFactor } from "../travel-factor";

describe("travelFactor — the L3 distance read", () => {
  it("emits a factor with the measured miles for known codes", () => {
    const r = travelFactor("BAL", "CIN");
    expect(r.miles).toBe(423);
    expect(r.factor?.description).toContain("423 miles");
    expect(r.factor?.name).toBe("Travel: BAL to CIN");
    expect(r.gap).toBeUndefined();
  });

  it("is direction-agnostic on the number", () => {
    expect(travelFactor("CIN", "BAL").miles).toBe(423);
  });

  it("names the gap when a code is missing", () => {
    const r = travelFactor("", "CIN");
    expect(r.factor).toBeUndefined();
    expect(r.gap).toContain("team code missing");
  });

  it("names the gap when a code is unknown to the geocode table", () => {
    const r = travelFactor("XXX", "CIN");
    expect(r.factor).toBeUndefined();
    expect(r.gap).toContain("stadium geocode missing for XXX");
  });
});
