import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * FE-09: every public page must resolve `#main-content`, the root layout's
 * skip-link target (app/layout.tsx: `<a href="#main-content">Skip to
 * content</a>`), or the skip link points at nothing for a keyboard user.
 *
 * A page satisfies this one of three ways:
 *   1. It renders `id="main-content"` itself.
 *   2. It renders exclusively through a shared shell already carrying the id
 *      (Shell in app/stats/_components.tsx, FantasyShell) — verified below,
 *      once, rather than duplicated onto every page that uses it.
 *   3. It is a pure redirect/notFound stub with no rendered content of its
 *      own (no JSX `return (`) — nothing to land a skip link on.
 *
 * Anything outside those three is a real orphan page, and this test fails
 * naming it — so a new page added later cannot silently reintroduce the gap
 * that FE-02/09 audit found on ~60 pages (most turned out to already be
 * covered by a shared shell or a redirect stub; three — /auth/signin,
 * /auth/error, /deck — were genuine gaps, fixed alongside this test).
 */

const APP_DIR = join(process.cwd(), "app");
const EXCLUDED_TOP_LEVEL = new Set(["api", "admin", "cockpit", "embed"]);

// One-off delegations that resolve through a component the shared-shell
// check below doesn't cover, verified by hand.
const MANUAL_ALLOWLIST = new Set(["fable/page.tsx"]);

function findPageFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...findPageFiles(full, base));
    } else if (entry === "page.tsx") {
      // Normalize separators: relative() returns backslashes on Windows, and
      // every consumer below splits these paths on "/" (isInScope's top-level
      // exclusion list among them). Without this, api/admin/cockpit/embed pages
      // read as in-scope orphans on Windows while the same run is clean on CI.
      out.push(relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

function isInScope(relPath: string): boolean {
  const top = relPath.split("/")[0];
  return !EXCLUDED_TOP_LEVEL.has(top);
}

const SHARED_SHELLS = [
  { name: "Shell (app/stats)", importMarker: "./_components", usageMarker: "<Shell" },
  { name: "FantasyShell", importMarker: "@/components/fantasy/fantasy-shell", usageMarker: "<FantasyShell" },
];

describe("main-content id coverage (FE-09)", () => {
  const pages = findPageFiles(APP_DIR, APP_DIR).filter(isInScope).sort();

  it("found the expected population of public pages", () => {
    // Guards the test itself against a broken traversal silently checking zero files.
    expect(pages.length).toBeGreaterThan(100);
  });

  it("resolves #main-content on every public page", () => {
    const orphans: string[] = [];

    for (const relPath of pages) {
      if (MANUAL_ALLOWLIST.has(relPath)) continue;
      const src = readFileSync(join(APP_DIR, relPath), "utf8");

      if (src.includes('id="main-content"')) continue;

      const usesSharedShell = SHARED_SHELLS.some(
        (shell) => src.includes(shell.importMarker) && src.includes(shell.usageMarker),
      );
      if (usesSharedShell) continue;

      // Pure redirect/notFound stub: no JSX return, nothing to anchor a skip
      // link to.
      const isStub = !src.includes("return (") && (src.includes("redirect(") || src.includes("notFound("));
      if (isStub) continue;

      orphans.push(relPath);
    }

    expect(orphans).toEqual([]);
  });

  it("the shared shells this test relies on still carry the id (negative control)", () => {
    const statsShell = readFileSync(join(APP_DIR, "stats/_components.tsx"), "utf8");
    expect(statsShell).toMatch(/<main id="main-content"/);

    const fantasyShell = readFileSync(
      join(process.cwd(), "components/fantasy/fantasy-shell.tsx"),
      "utf8",
    );
    expect(fantasyShell).toMatch(/<main id="main-content"/);
  });

  it("the three genuine gaps found in this audit are fixed", () => {
    for (const relPath of ["auth/error/page.tsx", "auth/signin/page.tsx"]) {
      const src = readFileSync(join(APP_DIR, relPath), "utf8");
      expect(src).toContain('id="main-content"');
    }
    const deck = readFileSync(join(APP_DIR, "deck/page.tsx"), "utf8");
    expect(deck).toContain('id="main-content"');
  });
});
