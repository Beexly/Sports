import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * C-231, found in review. `FantasyShell` defaults `projectionsPool` to
 * "illustrative", and three tool pages — waivers, lineup, trade — never passed
 * it. They DO resolve the live graded pool and render real players from it, and
 * their own `note` says so, so the page shipped a self-contradiction: a note
 * reading "Live graded pool: real players" underneath a badge reading
 * "Projections: illustrative". The badge also suppresses `basisLabel` and the
 * attribution line unless it is live, so the whole point of C-226 — telling a
 * member WHICH SEASON the numbers come from — never reached three of the five
 * surfaces that needed it.
 *
 * The error direction was safe (understating, per the badge's own fail-closed
 * doctrine) but a customer cannot tell which of two contradictory statements on
 * one page to believe, and the basis label is not decoration.
 *
 * This is a source invariant rather than three render tests on purpose: it
 * binds the NEXT page too. A page that resolves the live pool and renders the
 * shell must derive the badge's pool claim from the same `pool` value its note
 * is derived from, so the two can never disagree again.
 */

const APP_DIR = join(__dirname, "..", "app");

function pageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pageFiles(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

describe("a page that renders the live pool cannot claim an illustrative badge", () => {
  const shellPages = pageFiles(APP_DIR)
    .map((file) => ({ file, src: readFileSync(file, "utf8") }))
    .filter(({ src }) => src.includes("resolveToolPoolAsync") && src.includes("<FantasyShell"));

  it("finds the fantasy tool pages to check", () => {
    // A guard on the guard: if the shell or the resolver is renamed this test
    // would silently pass over an empty set.
    expect(shellPages.length).toBeGreaterThanOrEqual(5);
  });

  it.each(shellPages.map(({ file, src }) => [file.slice(APP_DIR.length + 1), src]))(
    "%s derives projectionsPool from the resolved pool",
    (_name, src) => {
      expect(src).toMatch(/projectionsPool=\{pool\b/);
    },
  );
});
