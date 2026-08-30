import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * The cockpit sidebar nav must include every implemented cockpit page.
 * Walking the file tree and comparing against the NAV constant catches
 * a missing entry (the page works directly but isn't discoverable).
 *
 * Dynamic routes (`[param]`) are skipped — they're never nav entries.
 */

const repoRoot = resolve(__dirname, "..");
const COCKPIT_DIR = resolve(repoRoot, "app/cockpit");
const LAYOUT = resolve(COCKPIT_DIR, "layout.tsx");

function listPageRoutes(dir: string): string[] {
  const routes: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      // Skip dynamic segments — they aren't nav entries.
      if (name.startsWith("[") && name.endsWith("]")) continue;
      // Recurse to find nested top-level pages.
      const childRoutes = listPageRoutes(full);
      routes.push(...childRoutes);
    } else if (name === "page.tsx") {
      // Translate the file path to a route under /cockpit.
      const rel = relative(COCKPIT_DIR, dir);
      const route = rel === "" ? "/cockpit" : `/cockpit/${rel.replace(/\\/g, "/")}`;
      routes.push(route);
    }
  }
  return routes;
}

const ALL_ROUTES = listPageRoutes(COCKPIT_DIR);

// Only top-level cockpit routes go in the sidebar — nested routes (like
// /cockpit/tasks/[taskId]) navigate from a list page, not from the sidebar.
const TOP_LEVEL_ROUTES = ALL_ROUTES.filter((r) => {
  const parts = r.replace(/^\//, "").split("/");
  // 2 parts max: ["cockpit"] or ["cockpit", "subroute"].
  return parts.length <= 2;
});

const layoutSrc = readFileSync(LAYOUT, "utf8");

describe("/cockpit/layout.tsx — sidebar nav coverage", () => {
  it("layout.tsx defines a NAV constant", () => {
    expect(layoutSrc).toMatch(/const\s+NAV\b/);
  });

  for (const route of TOP_LEVEL_ROUTES) {
    it(`NAV includes ${route}`, () => {
      // The NAV array uses href: "/cockpit/..." or "/cockpit". Allow
      // either string literal style.
      const pattern = new RegExp(`href\\s*:\\s*["']${route}["']`);
      expect(
        pattern.test(layoutSrc),
        `NAV in app/cockpit/layout.tsx is missing href=${route}`
      ).toBe(true);
    });
  }
});
