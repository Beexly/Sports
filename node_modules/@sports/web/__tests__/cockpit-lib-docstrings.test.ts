import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Cockpit library docstring linting.
 *
 * Every exported function in apps/web/lib/cockpit/* must have a comment
 * immediately preceding it. The cockpit is the operator API; lack of a
 * brief docstring on an export silently raises the cognitive cost for
 * the next contributor.
 *
 * Permissive: any of `/* … *​/` block comment, `///` single-line comment,
 * or `//` single-line comment immediately above the export is accepted.
 */

const repoRoot = resolve(__dirname, "..");
const COCKPIT_LIB = resolve(repoRoot, "lib/cockpit");

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

const FILES = listTsFiles(COCKPIT_LIB);

describe("lib/cockpit/* — exported functions have docstrings", () => {
  for (const file of FILES) {
    const name = file.split(/[\\/]/).slice(-2).join("/");
    it(`${name} — each exported function has a comment immediately above it`, () => {
      const src = readFileSync(file, "utf8");
      const lines = src.split(/\r?\n/);
      const undocumented: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const m = line.match(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
        if (!m) continue;
        // Look up to 3 lines back for either a comment or the end of a
        // jsdoc block (`*​/` on its own line preceding the export).
        let documented = false;
        for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
          const prev = (lines[j] ?? "").trim();
          if (prev === "") continue;
          if (/^\*\//.test(prev) || /^\*/.test(prev) || /^\/\//.test(prev) || /^\/\*/.test(prev)) {
            documented = true;
            break;
          }
          // Hit non-comment, non-blank line — give up.
          break;
        }
        if (!documented) undocumented.push(m[1]!);
      }
      expect(
        undocumented,
        `${name} exports without a preceding comment: ${undocumented.join(", ")}`
      ).toEqual([]);
    });
  }
});
