import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FE-02: one floating launcher per corner on public routes.
 *
 * ObservatoryBeacon (mounted on the home page once the visitor scrolls past
 * the hero) used to sit bottom-right, the same corner as the globally
 * mounted CommandPalette — a real, live collision. Moved to top-right,
 * which no public component occupies.
 *
 * ThermalVision and GhostJarvis (bottom-left, would collide with
 * PageExplainer's "Nova" launcher) are not part of this fix: C-89 already
 * unmounted SentientShell — their only mount point — from every public
 * route, and the component files are explicitly kept for /cockpit use
 * (apps/web/app/layout.tsx comment above PageExplainerAuto). Nothing on a
 * public route renders them today.
 *
 * top-6 (24px) was the first attempt — Devin Review (PR #737) caught that
 * it lands inside the sticky Nav's own 0-64px band (styles/pickpilot-kit.css
 * .nav-inner height: 64px) at the same z-50, covering whatever sits in the
 * nav's right side. top-20 (80px) clears it with a 16px gap.
 */

const NAV_HEIGHT_PX = 64;
const BEACON_TOP_PX = 80; // top-20 in Tailwind's default spacing scale (20 * 4px)
describe("floating launcher corners (public routes)", () => {
  it("ObservatoryBeacon no longer claims the command palette's corner", () => {
    const src = readFileSync(
      join(process.cwd(), "components/motion/observatory-beacon.tsx"),
      "utf8",
    );
    expect(src).toMatch(/fixed top-20 right-6/);
    expect(src).not.toMatch(/fixed bottom-\d+ right-\d+/);
  });

  it("clears the sticky Nav's height, so it never covers nav controls", () => {
    const navCss = readFileSync(join(process.cwd(), "styles/pickpilot-kit.css"), "utf8");
    const match = navCss.match(/\.nav-inner\s*\{[^}]*height:\s*(\d+)px/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(NAV_HEIGHT_PX);
    expect(BEACON_TOP_PX).toBeGreaterThan(NAV_HEIGHT_PX);
  });

  it("CommandPalette keeps the public bottom-right corner (nothing else public claims it)", () => {
    const commandPalette = readFileSync(
      join(process.cwd(), "components/ui/command-palette.tsx"),
      "utf8",
    );
    expect(commandPalette).toMatch(/fixed bottom-5 right-5/);
  });

  it("PageExplainer (the home/public launcher) keeps bottom-left; nothing public shares it", () => {
    const pageExplainer = readFileSync(
      join(process.cwd(), "components/explainers/page-explainer.tsx"),
      "utf8",
    );
    expect(pageExplainer).toMatch(/fixed bottom-5 left-5/);

    // ThermalVision/GhostJarvis are bottom-left/bottom-right respectively,
    // but neither is imported by app/layout.tsx or app/page.tsx (the only
    // public mount points) — SentientShell, their sole mount point, is
    // reserved for /cockpit only (C-89).
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const homePage = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    for (const dead of ["ThermalVision", "GhostJarvis", "SentientShell"]) {
      expect(layout.includes(`<${dead}`)).toBe(false);
      expect(homePage.includes(`<${dead}`)).toBe(false);
    }
  });
});
