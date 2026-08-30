import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * docs/launch-runbook.md §7c "Operator script index" lists npm scripts
 * the operator runs. Each must actually exist in the root or apps/web
 * package.json.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const runbook = readFileSync(resolve(repoRoot, "docs/launch-runbook.md"), "utf8");
const rootPkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const webPkg = JSON.parse(readFileSync(resolve(repoRoot, "apps/web/package.json"), "utf8"));

const allScripts = new Set([
  ...Object.keys(rootPkg.scripts ?? {}),
  ...Object.keys(webPkg.scripts ?? {}),
]);

describe("docs/launch-runbook.md — operator script index", () => {
  it("references the §7c script index", () => {
    expect(runbook).toMatch(/Operator script index/);
  });

  it("every `npm run X` mentioned in the runbook resolves to a real script", () => {
    const refs = Array.from(runbook.matchAll(/`npm run ([\w:-]+)`/g)).map((m) => m[1]!);
    expect(refs.length).toBeGreaterThan(0);
    const missing = Array.from(new Set(refs)).filter((s) => !allScripts.has(s));
    expect(
      missing,
      `These npm scripts are referenced in the runbook but missing from package.json: ${missing.join(", ")}`
    ).toEqual([]);
  });
});
