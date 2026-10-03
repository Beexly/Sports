import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * FE-13: the root layout appends the brand to every page title
 * (BRAND_META.titleTemplate = `%s | ${BRAND_NAME}`). A page whose own
 * `metadata.title` also carries the brand renders
 * "Title, Galaxy Sports Edge, Galaxy Sports Edge" in the tab.
 *
 * This test walks every page.tsx under apps/web/app and asserts that no
 * ROOT-level `title:` in a static `export const metadata` block contains
 * the brand name. Nested titles inside openGraph/twitter objects are
 * exempt: those surfaces do not apply the layout template, so they are
 * the correct place for the brand. generateMetadata functions are out of
 * scope here (dynamic titles are asserted by their page tests).
 */

const repoRoot = resolve(__dirname, "..");
const APP_DIR = join(repoRoot, "app");
const EXCLUDED_SEGMENTS = new Set(["api", "admin", "cockpit", "embed"]);

const BRAND_MARKERS = ["BRAND_NAME", "Galaxy Sports Edge"];

function walkPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_SEGMENTS.has(entry.name)) continue;
      out.push(...walkPages(full));
    } else if (entry.name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

/** Root-level `  title:` lines inside the static metadata object only. */
function rootTitleViolations(source: string): string[] {
  const lines = source.split("\n");
  const start = lines.findIndex((l) =>
    /^export const metadata\s*:\s*Metadata\s*=/.test(l),
  );
  if (start === -1) return [];
  const violations: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\}/.test(line)) break; // end of the metadata object
    const m = line.match(/^  title:\s*(.+)$/);
    if (m && BRAND_MARKERS.some((marker) => m[1].includes(marker))) {
      violations.push(`line ${i + 1}: ${line.trim()}`);
    }
  }
  return violations;
}

describe("FE-13: page titles never double the brand", () => {
  it("no static page title carries the brand the layout template already appends", () => {
    const offenders: string[] = [];
    for (const page of walkPages(APP_DIR)) {
      const source = readFileSync(page, "utf8");
      const bad = rootTitleViolations(source);
      if (bad.length > 0) {
        offenders.push(`${page.replace(repoRoot, "")}\n    ${bad.join("\n    ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
