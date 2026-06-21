import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage engine centerpiece", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const curve = readRepoFile("apps/web/components/home/calibration-curve.tsx");

  it("leads with the thesis and routes to the four doors", () => {
    expect(page).toContain("The market is full of");
    expect(page).toContain("Galaxy turns it into");
    expect(page).toContain("We detect. You decide.");
    expect(page).toContain("Pick the decision you came to make.");
    for (const door of ["Board", "The Lab", "Intelligence", "Fantasy & Daily"]) {
      expect(page).toContain(door);
    }
  });

  it("does not render fabricated ledger or settlement examples", () => {
    for (const legacyCopy of [
      "SEA -1.5",
      "ATL/NYM under",
      "Public Ledger preview",
      "Six recent settlements",
      "Gate Cam",
      "Three questions",
    ]) {
      expect(page).not.toContain(legacyCopy);
    }
  });

  it("keeps the front door on design-token classes, not raw casino or gray utility colors", () => {
    expect(page).not.toMatch(/\b(?:text|bg|border)-(?:gray|cyan|pink|green|yellow|emerald|orange)-/);
    expect(page).toMatch(/bg-carbon/);
    expect(page).toMatch(/bg-eclipse/);
    expect(page).toMatch(/border-mineral/);
    expect(page).toMatch(/text-orbital-cyan/);
    expect(page).toMatch(/text-ion-white/);
  });

  it("uses real data paths — every number comes from a loader, none fabricated", () => {
    expect(page).toMatch(/\bloadBoardState\b/);
    expect(page).toMatch(/\bloadPublicCalibrationReport\b/);
    expect(page).toMatch(/\bloadNflverseUsagePulse\b/);
    expect(page).toContain("calibration.sampleSize");
    expect(page).toContain("state.publishedToday.length");
  });

  it("draws calibration on scroll with a reduced-motion-safe fallback", () => {
    expect(curve).toMatch(/IntersectionObserver/);
    expect(curve).toMatch(/prefers-reduced-motion: reduce/);
    expect(curve).toMatch(/strokeDashoffset=\{visible \? "0" : "1"\}/);
    expect(curve).toMatch(/data-testid="homepage-calibration-curve"/);
    expect(curve).toContain("{sampleSize}/30");
  });
});
