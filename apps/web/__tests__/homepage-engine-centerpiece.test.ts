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
  const world = readRepoFile("apps/web/components/redline/redline-world.tsx");
  const worldCss = readRepoFile("apps/web/components/redline/redline-world.css");

  it("leads with the thesis and routes the product surfaces", () => {
    // The RedlineWorld rebuild moved the thesis into the field component and
    // replaced the four-door grid with the stage rail, the header, and the
    // responsible close. The destinations are unchanged.
    expect(world).toContain("Leave the noise.");
    expect(world).toContain("Enter the field.");
    expect(page).toContain("The math can point. The decision stays yours.");
    expect(world).toContain('href="/packages"');
    expect(world).toContain('setPanel("board")');
    expect(world).toContain('setPanel("dfs")');
    expect(page).toContain('"/methodology"');
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
    // The field carries its own token set (--ink/--bone/--ember) in CSS; the
    // close band uses the Tailwind token layer. Neither may fall back to raw
    // casino or gray utilities.
    expect(page).not.toMatch(/\b(?:text|bg|border)-(?:gray|cyan|pink|green|yellow|emerald|orange)-/);
    expect(page).toMatch(/bg-carbon/);
    expect(page).toMatch(/border-mineral/);
    expect(page).toMatch(/text-plasma/);
    expect(page).toMatch(/text-ion-white/);
    expect(worldCss).toMatch(/var\(--ink\)/);
    expect(worldCss).toMatch(/var\(--bone\)/);
    expect(worldCss).toMatch(/var\(--ember\)/);
    expect(worldCss).not.toMatch(/#(?:00ffff|ff00ff|00ff00)/i);
  });

  it("uses real data paths — every number comes from a loader, none fabricated", () => {
    expect(page).toMatch(/\borderPacksForStorefront\b/);
    expect(page).toMatch(/\bgetActiveUpcomingWriteups\b/);
    expect(page).toMatch(/\bLIVE_PACKAGE_CATALOG\b/);
    expect(labDoor).toMatch(/\bloadNflverseUsagePulse\b/);
    // The retracted 31-11 banner must not return to the field.
    expect(world).not.toContain("31-11");
  });

  it("draws calibration on scroll with a reduced-motion-safe fallback", () => {
    expect(curve).toMatch(/IntersectionObserver/);
    expect(curve).toMatch(/prefers-reduced-motion: reduce/);
    expect(curve).toMatch(/strokeDashoffset=\{visible \? "0" : "1"\}/);
    expect(curve).toMatch(/data-testid="homepage-calibration-curve"/);
    expect(curve).toContain("{sampleSize}/30");
  });
});
