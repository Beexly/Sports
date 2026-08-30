import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Phone-number policy enforcement.
 *
 * The NCPG helpline (1-800-522-4700) is the canonical helpline. The
 * trust-claim registry owns it; no other file should hardcode a phone
 * number.
 *
 * Walks apps/web/app and apps/web/components for any
 * `\d-\d{3}-\d{3}-\d{4}` literal and fails if one appears outside the
 * registry. Tests + docs are excluded.
 */

const repoRoot = resolve(__dirname, "..");

const ALLOWED_FILES = new Set<string>([
  // The registry owns the helpline number.
  resolve(repoRoot, "lib/trust-claims.ts"),
]);

function listSourceFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listSourceFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const TARGETS = [
  ...listSourceFiles(resolve(repoRoot, "app")),
  ...listSourceFiles(resolve(repoRoot, "components")),
  ...listSourceFiles(resolve(repoRoot, "lib")),
];

const PHONE_PATTERN = /\b\d-\d{3}-\d{3}-\d{4}\b/;

describe("Phone-number policy", () => {
  it("scans a non-trivial source tree", () => {
    expect(TARGETS.length).toBeGreaterThan(20);
  });

  for (const file of TARGETS) {
    const rel = relative(repoRoot, file);
    if (ALLOWED_FILES.has(file)) continue;
    it(`${rel} does not hardcode a phone number`, () => {
      const src = readFileSync(file, "utf8");
      const match = src.match(PHONE_PATTERN);
      if (match) {
        throw new Error(
          `${rel} hardcodes phone number "${match[0]}". Reference the risk.gamble-responsibly trust-claim instead.`
        );
      }
      expect(true).toBe(true);
    });
  }
});
