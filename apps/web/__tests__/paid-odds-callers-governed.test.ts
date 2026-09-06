import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * C-109 structural invariant: every caller that drives `processSport()` with a
 * real The Odds API key spends paid credits, so every one of them must consult
 * the credit governor before the call and record the run in the durable ledger
 * after it.
 *
 * This is a guard against a defect class, not a single bug. The admin route
 * `app/api/admin/trigger-refresh/route.ts` shipped for months calling
 * processSport for every in-season sport with no governor consult and no
 * accounting at all: it spent against the monthly plan without the ledger ever
 * seeing it, which both bypassed the budget and skewed the burn rate the truth
 * surface reports. Nothing caught it because each caller was reviewed alone.
 * A new paid caller added tomorrow is caught here instead.
 */

const repoRoot = resolve(__dirname, "../../..");

/** Workspaces that can hold a paid caller. */
const SEARCH_ROOTS = [
  "apps/web/app",
  "apps/web/lib",
  "packages/ingestion-pipeline/src",
  "workers",
];

/** An actual call, not a mention of the name in a comment. */
const CALLS_PROCESS_SPORT = /await\s+processSport\s*\(/;

function listTsFiles(dir: string): string[] {
  const acc: string[] = [];
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "__tests__") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsFiles(p));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

const paidCallers = SEARCH_ROOTS.flatMap((root) => listTsFiles(resolve(repoRoot, root)))
  .filter((file) => CALLS_PROCESS_SPORT.test(readFileSync(file, "utf8")))
  .map((file) => relative(repoRoot, file))
  .sort();

describe("C-109: every paid processSport caller is governed and accounted", () => {
  it("finds the known paid callers (the scan itself must not silently match nothing)", () => {
    // If this fails because a caller MOVED, update the list. If it fails
    // because one DISAPPEARED, confirm the paid path really is gone.
    expect(paidCallers).toEqual([
      "apps/web/app/api/admin/trigger-refresh/route.ts",
      "packages/ingestion-pipeline/src/refresh-odds.ts",
      "workers/data-refresh/src/refresh-cycle.ts",
    ]);
  });

  for (const rel of paidCallers) {
    it(`${rel} consults the governor before spending`, () => {
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      expect(src).toMatch(/governedDecision\s*\(/);
    });

    it(`${rel} records the run in the credit ledger`, () => {
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      expect(src).toMatch(/recordPaidRunAccounting\s*\(/);
    });

    it(`${rel} passes the reservation flag through to the accounting`, () => {
      // reserved:false is what tells the accounting to mark the FIRST paid
      // request itself, after a governor that failed open reserved nothing.
      // Omitting it defaults to true and silently under-counts that spend.
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      expect(src).toMatch(/reserved:\s*\w/);
    });
  }
});
