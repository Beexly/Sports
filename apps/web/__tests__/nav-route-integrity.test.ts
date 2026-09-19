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

  it("the four doors + The Beat are present on desktop and mobile, and Intelligence is NOT", () => {
    // This list used to include "/intelligence/engines". The 2026-09-12 nav trim
    // cut the bar to four doors and AGENTS.md now states plainly: "Do NOT restore
    // Intelligence as a top-bar item." The assertion had become a guard AGAINST
    // current doctrine - it would have failed the moment the bar was correct.
    // So it is inverted rather than deleted, which makes it a live guard instead
    // of a stale one.
    for (const route of ["/board", "/players", "/fantasy", "/calibration", "/the-beat"]) {
      expect(desktop.includes(`"${route}"`), `desktop missing ${route}`).toBe(true);
    }
    // Mobile parity: the same primary doors are reachable.
    for (const route of ["/board", "/players", "/fantasy", "/calibration", "/the-beat"]) {
      expect(mobile.includes(`"${route}"`), `mobile missing ${route}`).toBe(true);
    }
    // The doctrine half: Intelligence must not come back to the bar.
    expect(desktop).not.toContain('"/intelligence/engines"');
    expect(mobile).not.toContain('"/intelligence/engines"');
  });

  it("GSN is its own door for The Beat; Studio and Academy are unlinked (ASTRA A-5, owner 2026-09-14)", () => {
    // Owner: Studio "was supposed to be more internal... zero value, causing
    // confusion" — moved internal. Academy "completely useless... redesign or
    // remove" — hidden from public nav (route stays, robots noindex).
    // GSN now carries The Beat only.
    expect(desktop).toContain('"/the-beat"');
    expect(mobile).toContain('"/the-beat"');
    expect(desktop).not.toContain('"/fantasy/studio"');
    expect(desktop).not.toContain('"/academy"');
    expect(mobile).not.toContain('"/fantasy/studio"');
    expect(mobile).not.toContain('"/academy"');
    // Metrics moved out of Intelligence (it lives under Proof / on /calibration).
    expect(desktop).not.toContain('"/intelligence/metrics"');
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
    // Was href="/calibration". The nav carries routes in a data structure, not
    // as literal href attributes, so this asserted on markup shape rather than
    // on reachability. Match the form the other assertions in this file use.
    expect(desktop).toContain('"/calibration"');
  });
});
