import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";

/**
 * `canonical-sample-posture.ts` is ops-only (INTERNAL data class): today it
 * is imported only by `app/api/ops/daily-truth/route.ts` and
 * `app/api/ops/public-surface-truth/route.ts`. PL4 just added a second
 * exported function to the same file — this locks the ops-only boundary in
 * as a regression-proof contract so a future edit can't accidentally wire
 * it into a real public page or route.
 */

const repoRoot = resolve(__dirname, "..");
const APP_DIR = resolve(repoRoot, "app");
const OPS_DIR_SEGMENT = `${sep}app${sep}api${sep}ops${sep}`;
const IMPORT_PATTERN = /canonical-sample-posture/;

function listRouteAndPageFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listRouteAndPageFiles(p));
    else if (name === "page.tsx" || name === "route.ts") acc.push(p);
  }
  return acc;
}

const ALL_FILES = listRouteAndPageFiles(APP_DIR);
const NON_OPS_FILES = ALL_FILES.filter((f) => !f.includes(OPS_DIR_SEGMENT));
const OPS_FILES = ALL_FILES.filter((f) => f.includes(OPS_DIR_SEGMENT));

describe("canonical-sample-posture import boundary (PL6)", () => {
  it("scanned at least one non-ops page/route and at least one ops route (sanity)", () => {
    expect(NON_OPS_FILES.length).toBeGreaterThan(10);
    expect(OPS_FILES.length).toBeGreaterThan(0);
  });

  it("no page.tsx or route.ts outside app/api/ops/** imports canonical-sample-posture", () => {
    const offenders = NON_OPS_FILES.filter((f) => IMPORT_PATTERN.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => relative(repoRoot, f))).toEqual([]);
  });

  it("the known ops importers still import it (contract stays meaningful, not vacuously true)", () => {
    const importers = OPS_FILES.filter((f) => IMPORT_PATTERN.test(readFileSync(f, "utf8")));
    const rels = importers.map((f) => relative(repoRoot, f));
    expect(rels).toEqual(
      expect.arrayContaining([
        join("app", "api", "ops", "daily-truth", "route.ts"),
        join("app", "api", "ops", "public-surface-truth", "route.ts"),
      ]),
    );
  });
});
