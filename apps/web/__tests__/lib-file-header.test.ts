import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Every file under apps/web/lib/cockpit/ and apps/web/lib/performance/
 * should start with a top-of-file JSDoc block. Keeps the operator-API
 * libraries self-documenting.
 *
 * The convention: file begins (optionally after a few imports' worth
 * of blank lines / shebang-style comments) with `/** ... *​/`. We do
 * a forgiving check: the first 5 non-blank lines must contain at
 * least one JSDoc-style block opening.
 */

const repoRoot = resolve(__dirname, "..");
const DIRS = [
  resolve(repoRoot, "lib/cockpit"),
  resolve(repoRoot, "lib/performance"),
];

function listTsFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsFiles(p));
    else if (/\.ts$/.test(name)) acc.push(p);
  }
  return acc;
}

const FILES = DIRS.flatMap((d) => listTsFiles(d));

describe("lib file-header convention", () => {
  for (const file of FILES) {
    const rel = relative(repoRoot, file);
    it(`${rel} starts with a /** ... */ file header`, () => {
      const src = readFileSync(file, "utf8");
      // Look at the first 80 chars after trimming initial whitespace.
      const head = src.replace(/^\s+/, "").slice(0, 80);
      expect(
        head.startsWith("/**"),
        `${rel} should begin with a JSDoc /** ... */ block describing what the file does.`
      ).toBe(true);
    });
  }
});
