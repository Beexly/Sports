import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Every `node scripts/*.mjs` reference in the root or apps/web
 * package.json must point at a real file. A typo in package.json
 * silently breaks the operator's recipe — this catches it.
 *
 * Paths from the root package.json resolve against repoRoot.
 * Paths from apps/web/package.json resolve against apps/web/
 * (npm workspaces set cwd to the workspace dir when running scripts).
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function readJson(p: string): Record<string, unknown> {
  return JSON.parse(readFileSync(p, "utf8"));
}

function extractScriptPaths(scriptsObj: Record<string, unknown>, base: string): { path: string; base: string }[] {
  const paths: { path: string; base: string }[] = [];
  for (const value of Object.values(scriptsObj)) {
    if (typeof value !== "string") continue;
    for (const m of value.matchAll(/node\s+(scripts\/[^\s]+)/g)) {
      paths.push({ path: m[1]!, base });
    }
  }
  return paths;
}

const ROOT_PKG = readJson(resolve(repoRoot, "package.json"));
const WEB_PKG = readJson(resolve(repoRoot, "apps/web/package.json"));

const allPaths = [
  ...extractScriptPaths(ROOT_PKG.scripts as Record<string, unknown>, repoRoot),
  ...extractScriptPaths(WEB_PKG.scripts as Record<string, unknown>, resolve(repoRoot, "apps/web")),
];

describe("package.json script paths exist", () => {
  it("at least the launch-night scripts are referenced", () => {
    expect(allPaths.length).toBeGreaterThan(0);
  });

  for (const { path: p, base } of Array.from(new Set(allPaths))) {
    it(`${p} exists on disk`, () => {
      expect(
        existsSync(resolve(base, p)),
        `${p} is referenced in package.json but the file is missing.`
      ).toBe(true);
    });
  }
});
