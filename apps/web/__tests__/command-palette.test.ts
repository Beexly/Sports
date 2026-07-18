import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Validates structural integrity of the site-wide command palette's COMMANDS
 * array (apps/web/components/ui/command-palette.tsx). Distinct from
 * cockpit-command-palette.test.ts, which covers the admin-only
 * CockpitCommandPalette.
 *
 * We do NOT assert that every href has a page.tsx (many are section anchors or
 * placeholder routes gated behind feature flags). What we DO assert:
 * - The key user-facing routes are present
 * - No duplicate hrefs (dead entries)
 * - No external URLs accidentally in the list
 * - The array is non-trivially populated
 */

const repoRoot = resolve(__dirname, "..");
const paletteSrc = readFileSync(resolve(repoRoot, "components/ui/command-palette.tsx"), "utf8");

// Extract all href values from the COMMANDS array.
// Matches: href: "/some/path"  (with or without trailing comma)
const hrefMatches = [...paletteSrc.matchAll(/href:\s*"([^"]+)"/g)];
const hrefs = hrefMatches.map((m) => m[1]!);

// Extract all label values.
const labelMatches = [...paletteSrc.matchAll(/label:\s*"([^"]+)"/g)];
const labels = labelMatches.map((m) => m[1]!);

// These critical routes MUST be in the palette. Reflects this codebase's
// actual current top-level surfaces (not a generic "picks/trends/today" set
// from an earlier product shape) -- reconciled against live COMMANDS content,
// not assumed.
const REQUIRED_ROUTES = [
  "/board",
  "/pricing",
  "/dashboard",
  "/fantasy",
  "/track",
  "/methodology",
];

describe("CommandPalette COMMANDS array", () => {
  it("contains a meaningful number of commands", () => {
    expect(hrefs.length, "COMMANDS should have at least 20 entries").toBeGreaterThanOrEqual(20);
  });

  it("contains no duplicate hrefs", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const href of hrefs) {
      if (seen.has(href)) duplicates.push(href);
      seen.add(href);
    }
    expect(duplicates, `Duplicate hrefs found: ${duplicates.join(", ")}`).toHaveLength(0);
  });

  it("contains no external URLs (all hrefs start with /)", () => {
    const external = hrefs.filter((h) => !h.startsWith("/"));
    expect(external, `External hrefs found: ${external.join(", ")}`).toHaveLength(0);
  });

  it("contains no blank labels", () => {
    const blank = labels.filter((l) => !l.trim());
    expect(blank, "Blank labels found").toHaveLength(0);
  });

  for (const route of REQUIRED_ROUTES) {
    it(`includes required route: ${route}`, () => {
      expect(
        hrefs.some((h) => h === route || h.startsWith(`${route}?`) || h.startsWith(`${route}/`)),
        `${route} must be in COMMANDS`
      ).toBe(true);
    });
  }

  it("groups are one of the expected values", () => {
    const ALLOWED_GROUPS = new Set(["Intelligence", "Fantasy", "Account"]);
    const groupMatches = [...paletteSrc.matchAll(/group:\s*"([^"]+)"/g)];
    const groups = groupMatches.map((m) => m[1]!);
    const unknown = groups.filter((g) => !ALLOWED_GROUPS.has(g));
    expect(unknown, `Unknown group values: ${unknown.join(", ")}`).toHaveLength(0);
  });
});

describe("CommandPalette file structure", () => {
  it("is a client component", () => {
    expect(paletteSrc).toMatch(/^"use client";/);
  });

  it("exports CommandPalette function", () => {
    expect(paletteSrc).toMatch(/export\s+function\s+CommandPalette/);
  });

  it("handles keyboard shortcut (meta+K or ctrl+K)", () => {
    expect(paletteSrc).toMatch(/metaKey|ctrlKey/);
    expect(paletteSrc).toMatch(/"k"/i);
  });
});
