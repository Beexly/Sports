import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The cockpit history page and the CSV export API both consume the same
 * filter query-string vocabulary. This test asserts they stay in sync —
 * if the page starts reading a new filter, the export must accept it
 * (and vice versa).
 */

const repoRoot = resolve(__dirname, "..");

const PAGE = resolve(repoRoot, "app/cockpit/history/page.tsx");
const EXPORT = resolve(repoRoot, "app/api/cockpit/history/export/route.ts");

function read(p: string): string {
  return readFileSync(p, "utf8");
}

function extractFilters(src: string): Set<string> {
  const filters = new Set<string>();
  // Match searchParams.get("name") OR searchParams.name OR searchParams["name"]
  for (const m of src.matchAll(/searchParams\.get\(["']([a-z]+)["']\)/g)) {
    filters.add(m[1]!);
  }
  for (const m of src.matchAll(/searchParams\.([a-z]+)/g)) {
    if (m[1]) filters.add(m[1]);
  }
  for (const m of src.matchAll(/searchParams\[["']([a-z]+)["']\]/g)) {
    filters.add(m[1]!);
  }
  return filters;
}

const PAGE_FILTERS = extractFilters(read(PAGE));
const EXPORT_FILTERS = extractFilters(read(EXPORT));

describe("/cockpit/history page and export agree on filters", () => {
  it("the page consumes at least the expected filter keys", () => {
    for (const key of ["result", "bootstrap", "published", "sport", "model", "eligible", "learning"]) {
      expect(PAGE_FILTERS.has(key), `page should read filter ${key}`).toBe(true);
    }
  });

  it("the export accepts every filter the page reads (page ⊆ export)", () => {
    const missing = [...PAGE_FILTERS].filter((k) => !EXPORT_FILTERS.has(k));
    expect(
      missing,
      `Export route is missing filters used by the page: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("the export does not introduce filters the page doesn't expose (export ⊆ page)", () => {
    const extra = [...EXPORT_FILTERS].filter((k) => !PAGE_FILTERS.has(k));
    expect(
      extra,
      `Export route accepts filters the page never sets: ${extra.join(", ")}`
    ).toEqual([]);
  });
});
