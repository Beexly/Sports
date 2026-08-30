import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Cockpit page accessibility invariants — source-level.
 *
 * Each cockpit page should declare an <h1> for the visible heading.
 * Section landmarks (<section>) should not nest inside <section> without
 * an inner heading.
 *
 * The check is intentionally pragmatic: it catches a refactor that
 * demotes the page title to a <p>/<div> while leaving the rest of the
 * markup intact.
 */

const repoRoot = resolve(__dirname, "..");
const COCKPIT_DIR = resolve(repoRoot, "app/cockpit");

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

const PAGES = listPageFiles(COCKPIT_DIR);

describe("Cockpit pages — basic a11y invariants", () => {
  for (const file of PAGES) {
    const rel = relative(repoRoot, file);
    it(`${rel} declares an <h1>`, () => {
      const src = readFileSync(file, "utf8");
      expect(
        /<h1\b/.test(src),
        `${rel} must declare an <h1> as the page's primary heading.`
      ).toBe(true);
    });
  }

  it("layout.tsx wraps page content in a <main> landmark", () => {
    const layout = readFileSync(resolve(COCKPIT_DIR, "layout.tsx"), "utf8");
    expect(layout).toMatch(/<main\b/);
  });

  it("layout.tsx exposes the nav with aria-label for the sidebar", () => {
    const layout = readFileSync(resolve(COCKPIT_DIR, "layout.tsx"), "utf8");
    expect(layout).toMatch(/aria-label=["']Cockpit navigation["']/);
  });
});
