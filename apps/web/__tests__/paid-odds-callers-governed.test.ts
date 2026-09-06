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
 *
 * Scope, stated plainly: the per-file checks below prove that a paid caller
 * REFERENCES the governor and the accounting, not that it calls them in the
 * right order or on every branch. Proving ordering needs real control-flow
 * analysis; this catches the failure that actually happened (a caller wired to
 * neither) at a fraction of the cost. The detector above is unit-tested so the
 * scan cannot silently stop matching.
 */

const repoRoot = resolve(__dirname, "../../..");

/** Workspaces that can hold a paid caller. */
const SEARCH_ROOTS = [
  "apps/web/app",
  "apps/web/lib",
  "packages/ingestion-pipeline/src",
  "workers",
];

/**
 * Strip line and block comments so a prose mention of `processSport()` in a
 * docstring is not mistaken for a call. Crude but sufficient here: it can also
 * blank a comment-like run inside a string literal, which would only ever cause
 * a MISSED match in a file that has no real call anyway.
 */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * Any direct invocation of `processSport`, however its promise is consumed.
 *
 * Deliberately NOT anchored on `await`: a caller that does `return
 * processSport(...)`, stores the promise, or hands it to `Promise.all` spends
 * exactly the same credits, and an await-only matcher would let it bypass this
 * guard entirely (CodeRabbit, PR #713). The named import itself never matches,
 * because that is `processSport }` or `processSport,` and never `processSport(`.
 */
export function callsProcessSport(src: string): boolean {
  const code = stripComments(src)
    // The declaration is the definition, not a caller: `processSport` itself
    // has nothing to consult a governor about.
    .replace(/\b(?:export\s+)?(?:async\s+)?function\s+processSport\s*\(/g, " ");
  return /(?<![.\w])processSport\s*\(/.test(code);
}

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
  .filter((file) => callsProcessSport(readFileSync(file, "utf8")))
  .map((file) => relative(repoRoot, file))
  .sort();

describe("C-109: the paid-caller detector itself", () => {
  // A guard is only worth its detector. These pin the shapes that must be
  // caught, so the scan below cannot quietly stop seeing a real caller.
  it("catches a call however its promise is consumed", () => {
    expect(callsProcessSport("const r = await processSport(s, k, g, p);")).toBe(true);
    expect(callsProcessSport("return processSport(s, k, g, p);")).toBe(true);
    expect(callsProcessSport("const p = processSport(s, k, g, p);")).toBe(true);
    expect(callsProcessSport("await Promise.all(list.map((s) => processSport(s, k, g, p)));")).toBe(true);
    expect(callsProcessSport("void processSport(s, k, g, p);")).toBe(true);
  });

  it("ignores a mention in prose and the import itself", () => {
    expect(callsProcessSport("// delegated to processSport() from the pipeline")).toBe(false);
    expect(callsProcessSport("/**\n * Pick generation runs through processSport().\n */")).toBe(false);
    expect(callsProcessSport('import { processSport } from "@sports/ingestion-pipeline";')).toBe(false);
    expect(callsProcessSport("export { processSport } from './process-sport.js';")).toBe(false);
  });

  it("does not match a different function whose name merely ends in processSport", () => {
    expect(callsProcessSport("await fakeprocessSport(s);")).toBe(false);
    expect(callsProcessSport("await client.processSport(s);")).toBe(false);
  });

  it("does not treat the definition site as a caller", () => {
    expect(callsProcessSport("export async function processSport(sport, apiKey) {")).toBe(false);
    expect(callsProcessSport("async function processSport(sport) {")).toBe(false);
    expect(callsProcessSport("function processSport(sport) {")).toBe(false);
    // ...but a file that BOTH defines and calls it is still a caller.
    expect(
      callsProcessSport("export async function processSport(s) {}\nawait processSport(s);"),
    ).toBe(true);
  });
});

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
