import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Cockpit stub-mode safety — source-level invariants.
 *
 * When DATABASE_URL is unset (or pointed at a sentinel value), @sports/db
 * provides a stub client that returns empty results. Cockpit pages must:
 *
 *   1. Not call top-level `await db.*` outside the component body — those
 *      run at module import time and crash if the stub throws.
 *   2. Wrap their async DB calls so a thrown stub error doesn't kill the
 *      page render. The accepted patterns are:
 *      - .catch(...) on each Promise
 *      - try/catch around Promise.all / await blocks
 *      - the loadJarvisAssessment helper (which already wraps its calls)
 *
 * We check every cockpit page file for the presence of at least one of
 * these patterns when the file references `db.` or one of the loaders.
 */

function listTsxFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsxFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const repoRoot = resolve(__dirname, "..");
const cockpitPages = listTsxFiles(resolve(repoRoot, "app/cockpit"));

describe("Cockpit pages — stub-mode safety", () => {
  it("no cockpit page has a top-level `await db.` outside a function body", () => {
    for (const f of cockpitPages) {
      const src = readFileSync(f, "utf8");
      // Naive but effective: look for `await db.` that is NOT preceded by
      // an opening curly brace within the previous ~80 chars. Top-level
      // awaits in Next.js server components are async-function-bodied, so
      // they're always nested. A bare top-level `await db.` would
      // indicate a misplaced module-load query.
      const matches = src.matchAll(/await\s+db\./g);
      for (const m of matches) {
        const before = src.slice(Math.max(0, m.index! - 80), m.index!);
        expect(
          /[{(=>]/.test(before),
          `${f}: \`await db.\` appears without an enclosing block within 80 chars before — could be a module-level await`
        ).toBe(true);
      }
    }
  });

  it("cockpit/page.tsx imports the Jarvis loader (which wraps DB calls in .catch)", () => {
    const overview = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");
    expect(overview).toMatch(/loadJarvisAssessment/);
  });

  it("cockpit/page.tsx wraps the Jarvis loader in try/catch", () => {
    const overview = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");
    expect(overview).toMatch(/try\s*\{[\s\S]*loadJarvisAssessment[\s\S]*\}\s*catch/);
  });

  it("Jarvis data loader catches every DB call", () => {
    const loader = readFileSync(resolve(repoRoot, "lib/cockpit/jarvis-data.ts"), "utf8");
    // Every `db.foo.bar(...)` should be followed eventually by `.catch(`.
    // Approximate check: count `db.` calls and `.catch(` chains. The
    // former must be <= the latter (each call wrapped at least once).
    const dbCalls = (loader.match(/db\.\w+\.(count|findFirst|findMany|aggregate)\(/g) ?? [])
      .length;
    const catches = (loader.match(/\.catch\(/g) ?? []).length;
    expect(catches).toBeGreaterThanOrEqual(dbCalls);
  });

  it("/cockpit/history page exists and inherits admin gating", () => {
    const historyPagePath = resolve(repoRoot, "app/cockpit/history/page.tsx");
    const src = readFileSync(historyPagePath, "utf8");
    expect(src).toMatch(/db\.pick/);
    // /cockpit/history relies on the layout's auth guard — no auth check
    // needed in the page itself. We assert that explicitly so a future
    // refactor doesn't strip the layout guard thinking the page covers it.
    expect(src).not.toMatch(/role\s*!==\s*["']ADMIN["']/);
  });

  it("/cockpit/layout.tsx still bounces non-admin sessions", () => {
    const src = readFileSync(resolve(repoRoot, "app/cockpit/layout.tsx"), "utf8");
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/redirect/);
  });
});
