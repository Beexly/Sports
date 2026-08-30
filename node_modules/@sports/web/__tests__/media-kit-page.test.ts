import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(__dirname, "..", "app", "media-kit", "page.tsx"), "utf8");

describe("/media-kit page", () => {
  it("renders the required media-kit positioning", () => {
    expect(src).toContain("Reach an audience built around evidence");
    expect(src).toContain("GSE is building a sports intelligence audience");
    expect(src).toContain("GSN is the future media umbrella");
  });

  it("does not include fake traffic, revenue, or win-rate claims", () => {
    for (const banned of ["monthly visitors", "active sponsors", "verified win rate", "guaranteed ROI", "YouTube monetized"]) {
      expect(src).not.toContain(banned);
    }
    expect(src).toContain("No fabricated audience numbers.");
    expect(src).toContain("No fabricated revenue");
  });

  it("includes sponsorship packages and sponsor-control boundaries", () => {
    expect(src).toContain("SPONSORSHIP_PACKAGES");
    expect(src).toContain("SPONSOR_CANNOT_CONTROL");
    expect(src).toContain("Sponsors cannot control");
  });
});
