import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * /admin/* route gating — every page redirects non-ADMIN sessions.
 * Cockpit routes inherit the guard from app/cockpit/layout.tsx, but
 * admin pages don't share a layout — each page must check directly.
 */

const repoRoot = resolve(__dirname, "..");
const ADMIN_DIR = resolve(repoRoot, "app/admin");

function listPageFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listPageFiles(p));
    else if (name === "page.tsx") acc.push(p);
  }
  return acc;
}

const PAGES = listPageFiles(ADMIN_DIR);

describe("/admin/* routes — admin gating", () => {
  it("at least one admin page exists", () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of PAGES) {
    const rel = relative(repoRoot, file);
    it(`${rel} imports auth() and checks role !== "ADMIN"`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/from\s+["']@\/lib\/auth["']/);
      expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
      expect(src).toMatch(/redirect\(/);
    });
  }
});
