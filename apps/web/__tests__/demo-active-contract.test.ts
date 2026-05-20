import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * `demoActive` invariant:
 *
 *   demoActive = isStubMode() && isDemoPicksEnabled()
 *   (in either order — the && is commutative)
 *
 * Pin: every file that declares `demoActive` couples BOTH conditions.
 * Loosening either side would let demo samples render in production or
 * when `DEMO_PICKS_ENABLED` isn't explicitly opted in.
 */

const repoRoot = resolve(__dirname, "..");

function listTsxFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsxFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const FILES = listTsxFiles(resolve(repoRoot, "app"))
  .concat(listTsxFiles(resolve(repoRoot, "lib")))
  .concat(listTsxFiles(resolve(repoRoot, "components")));

describe("demoActive invariant", () => {
  const decls: Array<{ file: string; line: string }> = [];
  for (const f of FILES) {
    const src = readFileSync(f, "utf8");
    const lines = src.split(/\r?\n/);
    for (const line of lines) {
      if (/(^|\s)const\s+demoActive\s*=/.test(line)) {
        decls.push({ file: relative(repoRoot, f), line });
      }
    }
  }

  it("finds at least one demoActive declaration", () => {
    expect(decls.length).toBeGreaterThanOrEqual(1);
  });

  for (const { file, line } of decls) {
    it(`${file} couples isStubMode + isDemoPicksEnabled`, () => {
      expect(
        /isStubMode\(\)\s*&&\s*isDemoPicksEnabled\(\)/.test(line) ||
          /isDemoPicksEnabled\(\)\s*&&\s*(?:stubMode|isStubMode\(\))/.test(line),
        `${file}: demoActive declaration "${line.trim()}" should couple isStubMode + isDemoPicksEnabled.`
      ).toBe(true);
    });
  }
});
