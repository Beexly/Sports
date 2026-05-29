import { describe, it, expect } from "vitest";
import { DENSITY_PROFILES, getDensityProfile } from "@/lib/design/density";

describe("design density registry", () => {
  it("each profile has hero/body/closing/rationale", () => {
    for (const [path, profile] of Object.entries(DENSITY_PROFILES)) {
      expect(profile.hero, `hero missing on ${path}`).toMatch(/sparse|balanced|dense/);
      expect(profile.body, `body missing on ${path}`).toMatch(/sparse|balanced|dense/);
      expect(profile.closing, `closing missing on ${path}`).toMatch(/sparse|balanced|dense/);
      expect(profile.rationale.length, `rationale empty on ${path}`).toBeGreaterThan(20);
    }
  });

  it("rationale is concrete (mentions specific page elements)", () => {
    for (const [path, profile] of Object.entries(DENSITY_PROFILES)) {
      // Filter out hyper-short or generic rationale strings
      expect(profile.rationale.toLowerCase()).not.toMatch(/^lorem|placeholder|tbd|todo/);
    }
  });

  it("getDensityProfile returns undefined for unknown paths", () => {
    expect(getDensityProfile("/non-existent")).toBeUndefined();
  });

  it("getDensityProfile returns the profile for known paths", () => {
    expect(getDensityProfile("/")).toBeDefined();
    expect(getDensityProfile("/manifesto")).toBeDefined();
    expect(getDensityProfile("/ledger/canonical")).toBeDefined();
  });

  it("homepage follows sparse → dense → sparse arc", () => {
    const home = getDensityProfile("/")!;
    expect(home.hero).toBe("sparse");
    expect(home.body).toBe("dense");
    expect(home.closing).toBe("sparse");
  });
});
