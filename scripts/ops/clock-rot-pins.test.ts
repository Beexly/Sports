/**
 * Enumerating guard for the clock-rot class that bit C-104.
 *
 * Production espn-odds-client.ts filters -6h .. +21d against Date.now()
 * with no clock injection. A test that pins an absolute KICKOFF/NOW
 * against that client goes red when the calendar moves.
 *
 * This lists pins in the ingestion/odds/stats-api test trees only. It
 * does not scan apps/web (those dates are historical fixtures, a
 * different class). Domain 2 owns the galaxy-two-book fix.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(__dirname, "../..");

const PIN =
  /(?:const\s+)?(?:NOW|KICKOFF|NOW_ISO|KICKOFF_ISO)\s*=\s*(?:new Date\()?"(\d{4}-\d{2}-\d{2}T[^"]+)"/;

const SCAN_ROOTS = [
  "packages/ingestion-pipeline",
  "packages/data-ingestion",
  "packages/stats-api",
];

/** Known remaining absolute pins in the rot class. Shrink; do not grow silently. */
const KNOWN_ABSOLUTE_CLOCK_PINS: readonly string[] = [
  "packages/ingestion-pipeline/src/__tests__/galaxy-two-book-acceptance.test.ts",
  "packages/stats-api/src/__tests__/realtime-truth.test.ts",
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(name) && /__tests__|\.test\.|\.spec\./.test(p)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("clock-rot pins (enumerating)", () => {
  it("lists NOW/KICKOFF absolute ISO pins in the espn/kalshi/stats-api test trees", () => {
    const found: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const file of walk(join(REPO, root))) {
        const src = readFileSync(file, "utf8");
        if (PIN.test(src)) found.push(relative(REPO, file).replaceAll("\\", "/"));
      }
    }
    found.sort();
    const extra = found.filter((f) => !KNOWN_ABSOLUTE_CLOCK_PINS.includes(f));
    expect(extra, `new absolute NOW/KICKOFF pins: ${extra.join(", ")}`).toEqual([]);
    for (const known of KNOWN_ABSOLUTE_CLOCK_PINS) {
      const abs = join(REPO, known);
      if (!existsSync(abs)) continue;
      expect(found, `known pin missing (was it fixed? remove it from KNOWN): ${known}`).toContain(
        known,
      );
    }
  });
});
