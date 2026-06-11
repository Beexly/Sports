import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage engine centerpiece", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const curve = readRepoFile("apps/web/components/home/calibration-curve.tsx");

  it("replaces the legacy narrative with a data-readiness command surface", () => {
    expect(page).toContain("The board is only as smart as the data behind it.");
    expect(page).toContain("Board state");
    expect(page).toContain("Ten-second product test");
    expect(page).toContain("Source health");
    expect(page).toContain("context feeds");
    expect(page).toContain("licensed reporting");
    expect(page).toContain("Today&apos;s lanes");
    expect(page).toContain("First trend targets");
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
    expect(page).toMatch(/bg-carbon/);
    expect(page).toMatch(/bg-eclipse/);
    expect(page).toMatch(/border-mineral/);
    expect(page).toMatch(/text-orbital-cyan/);
    expect(page).toMatch(/text-ion-white/);
  });

  it("uses real data paths and honest collecting states", () => {
    expect(page).toMatch(/\bloadBoardState\b/);
    expect(page).toMatch(/\bloadBoardPasses\b/);
    expect(page).toMatch(/\bloadTrendWorkbench\b/);
    expect(page).toContain("No public rows yet");
    expect(page).toContain("Rows stay empty instead of blocking the experience or inventing data.");
    expect(page).toContain("No active scoring rows.");
    expect(page).toContain("Trend engine is ready; observations are waiting on live intake writes.");
  });

  it("draws calibration on scroll with a reduced-motion-safe fallback", () => {
    expect(curve).toMatch(/IntersectionObserver/);
    expect(curve).toMatch(/prefers-reduced-motion: reduce/);
    expect(curve).toMatch(/strokeDashoffset=\{visible \? "0" : "1"\}/);
    expect(curve).toMatch(/data-testid="homepage-calibration-curve"/);
    expect(curve).toContain("{sampleSize}/30");
  });
});
