import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage engine centerpiece", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const curve = readRepoFile("apps/web/components/home/calibration-curve.tsx");

  it("replaces the generic mid-page grids with one four-beat narrative", () => {
    expect(page).toMatch(/data-testid="engine-centerpiece"/);
    expect(page).toContain("The engine in the open");
    expect(page).toContain("01 / The Gate");
    expect(page).toContain("02 / The Pass List");
    expect(page).toContain("03 / Calibration");
    expect(page).toContain("04 / The Autopsy");
    expect(page).toContain("Watch it think, decline, and grade itself.");
    expect(page).toContain("No edge, no pick.");
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

  it("keeps the center band on design-token classes, not raw casino or gray utility colors", () => {
    expect(page).not.toMatch(/\b(?:text|bg|border)-(?:gray|cyan|pink|green|yellow|emerald|orange)-/);
    expect(page).toMatch(/surface-card/);
    expect(page).toMatch(/surface-lifted/);
    expect(page).toMatch(/text-orbital-cyan/);
    expect(page).toMatch(/text-plasma/);
  });

  it("uses real data paths and honest collecting states", () => {
    expect(page).toMatch(/\bloadHomepageAutopsy\b/);
    expect(page).toMatch(/result:\s*"LOSS"/);
    expect(page).toContain("No published, non-bootstrap pick has settled as a loss yet.");
    expect(page).toContain("No reliability curve is drawn until real settled canonical picks exist.");
    expect(page).toContain("No row is invented to make the page feel busy.");
  });

  it("draws calibration on scroll with a reduced-motion-safe fallback", () => {
    expect(curve).toMatch(/IntersectionObserver/);
    expect(curve).toMatch(/prefers-reduced-motion: reduce/);
    expect(curve).toMatch(/strokeDashoffset=\{visible \? "0" : "1"\}/);
    expect(curve).toMatch(/data-testid="homepage-calibration-curve"/);
    expect(curve).toContain("{sampleSize}/30");
  });
});
