import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldMountThermalVision } from "../components/motion/thermal-vision";

/**
 * Launch-day chrome + affordance pins.
 *
 * These lock behaviour a visitor sees in the first few seconds: the nav bar
 * surviving a route transition, the un-wired thermal debug pill staying out of
 * production, and the public Kelly slider being reachable by keyboard and
 * screen reader.
 *
 * Assertions are RUNTIME on purpose — apps/web/tsconfig.json excludes
 * `**\/*.test.ts`, so a type-level assertion in this file would never be
 * checked by `tsc --noEmit`.
 */

const webRoot = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(webRoot, p), "utf8");

describe("nav survives route transitions", () => {
  const skeleton = read("components/ui/tool-page-skeleton.tsx");
  const nav = read("components/ui/nav.tsx");

  it("app/layout.tsx still renders no chrome — the reason the skeleton must", () => {
    // If chrome ever moves into the root layout, the skeleton's NavSkeleton
    // becomes a duplicate header and this test should be revisited.
    const layout = read("app/layout.tsx");
    expect(layout).not.toMatch(/<Nav\b/);
    expect(layout).not.toMatch(/<Footer\b/);
  });

  it("ToolPageSkeleton paints the nav bar", () => {
    expect(skeleton).toContain("NavSkeleton");
    expect(skeleton).toMatch(/<NavSkeleton\s*\/>/);
  });

  it("ToolPageSkeleton can opt out of chrome for the embed widgets", () => {
    expect(skeleton).toMatch(/chrome\s*=\s*true/);
    expect(read("app/embed/loading.tsx")).not.toMatch(/NavSkeleton|ToolPageSkeleton/);
  });

  it("the loading skeleton never calls auth() — a Suspense fallback must not read cookies", () => {
    // NavSkeleton renders NavAuthFallback directly instead of <NavAuth />.
    expect(nav).toMatch(/export function NavSkeleton/);
    const navSkeletonBody = nav.slice(nav.indexOf("export function NavSkeleton"));
    expect(navSkeletonBody).toContain("NavAuthFallback");
    expect(navSkeletonBody).not.toContain("<NavAuth ");
    expect(navSkeletonBody).not.toContain("<NavAuth/>");
  });

  it("nav.tsx no longer claims the Suspense boundary keeps pages statically prerendered", () => {
    // Verified against next@14.2.35 with no PPR: trackDynamicDataAccessed sets
    // store.revalidate = 0 BEFORE throwing DynamicServerError, so suspending on
    // the auth read cannot restore static generation. The old comment asserted
    // the opposite and would have justified future "this is static" decisions.
    expect(nav).not.toMatch(/be\s*\n?\s*\*?\s*statically\s*\n?\s*\*?\s*prerendered/);
    expect(nav).toMatch(/CORRECTION/);
  });
});

describe("thermal vision is a development affordance, not a shipped feature", () => {
  it("is not mounted in production", () => {
    expect(shouldMountThermalVision("production")).toBe(false);
  });

  it("stays available in development and test", () => {
    expect(shouldMountThermalVision("development")).toBe(true);
    expect(shouldMountThermalVision("test")).toBe(true);
    expect(shouldMountThermalVision(undefined)).toBe(true);
  });

  it("SentientShell mounts it through the gate rather than unconditionally", () => {
    const shell = read("components/motion/sentient-shell.tsx");
    expect(shell).toContain("shouldMountThermalVision");
    expect(shell).toMatch(
      /shouldMountThermalVision\(\)\s*\?\s*\(\s*\n?\s*<ThermalVision/,
    );
  });

  it("is still present in the tree — gated, not deleted", () => {
    const src = read("components/motion/thermal-vision.tsx");
    expect(src).toMatch(/export function ThermalVision/);
    expect(src).toMatch(/export function ThermalBadge/);
  });

  it("the toggle no longer floats over phone-width content", () => {
    const src = read("components/motion/thermal-vision.tsx");
    const toggleClass = /className="([^"]*fixed bottom-6 left-6[^"]*)"/.exec(src);
    expect(toggleClass, "toggle className not found").not.toBeNull();
    const classes = toggleClass![1]!.split(/\s+/);
    expect(classes).toContain("hidden");
    expect(classes).toContain("md:flex");
    expect(classes).not.toContain("flex");
  });
});

describe("public staking calculator is operable", () => {
  const src = read("components/tracker/staking-calculator.tsx");

  it("the Kelly range input has a programmatic label, not just adjacent text", () => {
    expect(src).toMatch(/const KELLY_SLIDER_ID\s*=/);
    expect(src).toMatch(/<label htmlFor=\{KELLY_SLIDER_ID\}>Kelly fraction<\/label>/);
    expect(src).toMatch(/id=\{KELLY_SLIDER_ID\}/);
  });

  it("the slider announces a human value, not a bare 0.1–1 number", () => {
    expect(src).toMatch(/aria-valuetext=/);
  });

  it("every input that clears its outline supplies a replacement focus ring", () => {
    // The text inputs keep `outline-none` on the control and draw the ring on
    // the bordered wrapper via focus-within, so the token border is preserved.
    const outlineNoneCount = (src.match(/outline-none/g) ?? []).length;
    expect(outlineNoneCount).toBeGreaterThan(0);
    expect(src).toMatch(/focus-within:outline\b/);
    expect(src).toMatch(/focus-within:outline-orbital-cyan/);
    expect(src).toMatch(/focus-visible:outline-orbital-cyan/);
  });
});
