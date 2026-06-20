import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Nav route integrity + desktop/mobile parity.
 *
 * After the R2 IA condensation (Players → one door, Proof → its own door at
 * /calibration, Intelligence/Fantasy trimmed), this guard proves there are no
 * dead links and that the mobile menu still reaches the same primary doors as
 * desktop. A route is "real" when its app-router page file exists.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

/** Extract internal hrefs from a nav source file. */
function hrefsIn(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(/href="(\/[^"]*)"/g)) {
    out.add(m[1]!);
  }
  return [...out];
}

/** Normalize an href to its route path (strip query + hash). */
function routeOf(href: string): string {
  return href.split("#")[0]!.split("?")[0]!;
}

/** Does an app-router page exist for this route? */
function routeExists(route: string): boolean {
  if (route === "/") return existsSync(resolve(webRoot, "app/page.tsx"));
  const base = resolve(webRoot, "app", route.replace(/^\//, ""));
  return (
    existsSync(resolve(base, "page.tsx")) ||
    existsSync(resolve(base, "route.ts")) ||
    existsSync(`${base}.tsx`)
  );
}

const desktop = read("components/ui/nav.tsx");
const mobile = read("components/ui/mobile-nav.tsx");

describe("Nav route integrity", () => {
  it("every desktop nav href resolves to a real route (no dead links)", () => {
    for (const href of hrefsIn(desktop)) {
      const route = routeOf(href);
      expect(routeExists(route), `dead desktop nav link: ${href} → ${route}`).toBe(true);
    }
  });

  it("every mobile nav href resolves to a real route (no dead links)", () => {
    for (const href of hrefsIn(mobile)) {
      const route = routeOf(href);
      expect(routeExists(route), `dead mobile nav link: ${href} → ${route}`).toBe(true);
    }
  });

  it("the four doors + Proof + The Beat are all present on desktop and mobile", () => {
    for (const route of ["/board", "/players", "/intelligence/engines", "/fantasy", "/calibration", "/the-beat"]) {
      expect(desktop.includes(`"${route}"`), `desktop missing ${route}`).toBe(true);
    }
    // Mobile parity: the same primary doors are reachable.
    for (const route of ["/board", "/players", "/intelligence/engines", "/fantasy", "/calibration", "/the-beat"]) {
      expect(mobile.includes(`"${route}"`), `mobile missing ${route}`).toBe(true);
    }
  });

  it("Players is a single door and Proof left Intelligence", () => {
    // Players is a direct link, no mega-menu lens items leaking into the bar.
    expect(desktop).not.toContain('"/players?view=opportunity"');
    expect(desktop).not.toContain('"/players?view=snaps"');
    // The Proof Room sub-group heading is gone from Intelligence; Proof is its
    // own door (the phrase may still appear as the Proof link's tooltip).
    expect(desktop).not.toContain('heading: "The Proof Room"');
    expect(desktop).not.toContain('"/performance"');
    expect(desktop).not.toContain('"/clv"');
    expect(desktop).toContain('href="/calibration"');
  });
});
