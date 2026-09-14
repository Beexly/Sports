import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("homepage engine centerpiece", () => {
  const page = readRepoFile("apps/web/app/page.tsx");
  const labDoor = readRepoFile(
    "apps/web/components/landing/nflverse-lab-door.tsx"
  );
  const curve = readRepoFile("apps/web/components/home/calibration-curve.tsx");

  it("leads with the thesis and routes to the four doors", () => {
    // FIELD (2026-09-10, founder-approved) rewrote the thesis: the second half
    // was "Galaxy turns it into <signal>" and is now "We find the <signal>".
    // The doctrine's hero is Noise. / Signal. with the closer "We detect. You
    // decide." — brand-forward chrome was retired on purpose, so pinning
    // "Galaxy turns it into" held the page to copy the redesign removed.
    expect(page).toContain("The market is full of");
    expect(page).toContain("We find the");
    expect(page).toContain("We detect. You decide.");
    // Same pass reworded the doors heading to a question.
    expect(page).toContain("What are you here to decide?");
    // "The Lab" label lives in the NflverseLabDoor component (P16-01 moved it
    // off the page's critical path via Suspense); the other three are inline.
    for (const door of ["Board", "Intelligence", "Fantasy & Daily"]) {
      expect(page).toContain(door);
    }
    expect(labDoor).toContain("The Lab");
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
    // orbital-cyan is listed under "Legacy names" in tailwind.config.ts and the
    // homepage uses it zero times: FIELD retired the cyan accent ("no
    // cyan-to-magenta fade") in favour of plasma. Demanding the legacy token
    // would have pushed the front door back onto a dead palette.
    expect(page).toMatch(/text-plasma/);
    expect(page).toMatch(/text-ion-white/);
  });

  it("uses real data paths — every number comes from a loader, none fabricated", () => {
    expect(page).toMatch(/\bloadBoardState\b/);
    expect(page).toMatch(/\bloadPublicCalibrationReport\b/);
    expect(labDoor).toMatch(/\bloadNflverseUsagePulse\b/);
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
