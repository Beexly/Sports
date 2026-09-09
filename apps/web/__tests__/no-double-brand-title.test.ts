import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * FE-13: no double brand in <title>.
 *
 * The root layout applies `template: "%s | Galaxy Sports Edge"`
 * (lib/brand.ts BRAND_META.titleTemplate) to every page's `metadata.title`
 * unless that page's title is `{ absolute: "..." }`. ~20 pages authored
 * their title already including the brand name (e.g. "Kill Ledger ·
 * Galaxy Sports Edge") as a plain string, so the template appended it a
 * second time: "Kill Ledger · Galaxy Sports Edge | Galaxy Sports Edge".
 *
 * A page's FIRST `title:` occurrence in its metadata object is the real
 * `<title>` (openGraph.title / twitter.title come after it in every page in
 * this repo and are never template-applied by Next). If that first title
 * already names the brand, it must be `{ absolute: ... }`.
 */

const APP_DIR = join(process.cwd(), "app");
const EXCLUDED_TOP_LEVEL = new Set(["api", "admin", "cockpit", "embed"]);
const BRAND_MARKER = /Galaxy Sports Edge|\$\{BRAND_NAME\}/;
const TITLE_LINE = /title:\s*(.+),?$/;

function findPageFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...findPageFiles(full, base));
    else if (entry === "page.tsx") out.push(relative(base, full));
  }
  return out;
}

describe("no double brand in page titles (FE-13)", () => {
  const pages = findPageFiles(APP_DIR, APP_DIR)
    .filter((p) => !EXCLUDED_TOP_LEVEL.has(p.split("/")[0]))
    .sort();

  it("every page whose first title already names the brand marks it absolute", () => {
    const violations: string[] = [];

    for (const relPath of pages) {
      const src = readFileSync(join(APP_DIR, relPath), "utf8");
      const firstTitleLine = src.split("\n").find((line) => TITLE_LINE.test(line));
      if (!firstTitleLine) continue;
      if (!BRAND_MARKER.test(firstTitleLine)) continue;
      if (!firstTitleLine.includes("absolute:")) violations.push(relPath);
    }

    expect(violations).toEqual([]);
  });

  it("the twenty pages found in this audit are fixed", () => {
    const fixed = [
      "room/[gameId]/page.tsx",
      "observatory/page.tsx",
      "board/gate/page.tsx",
      "kill-ledger/page.tsx",
      "journal/page.tsx",
      "blog/page.tsx",
      "fantasy/contests/page.tsx",
      "integrity/page.tsx",
      "fable/page.tsx",
      "accountability/page.tsx",
      "performance/losses/[id]/page.tsx",
      "performance/losses/page.tsx",
      "bookgrade/page.tsx",
      "ledger/page.tsx",
      "proof/page.tsx",
      "calibration/page.tsx",
      "calibration/market/page.tsx",
      "changelog/page.tsx",
      "faq/page.tsx",
      "pledge/page.tsx",
    ];
    for (const relPath of fixed) {
      const src = readFileSync(join(APP_DIR, relPath), "utf8");
      const firstTitleLine = src.split("\n").find((line) => TITLE_LINE.test(line));
      expect(firstTitleLine).toContain("absolute:");
    }
  });
});
