import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Banned-pattern scan for the legal pages' revision stamps (GAP_REGISTER
 * R-09).
 *
 * The "Last updated" date on /terms and /privacy used to be built from
 * `new Date()` at request time, which self-refreshed on every render and
 * misrepresented the policy revision history — a real problem if a dispute
 * ever turns on which policy version applied on a given date. The stamp
 * must be a hardcoded string constant that a human bumps only when the
 * policy copy actually changes. This test scans the page sources so the
 * runtime-clock pattern cannot quietly come back.
 */

const repoRoot = resolve(__dirname, "..");

const LEGAL_PAGES = [
  { file: "app/terms/page.tsx", constant: "TERMS_LAST_UPDATED" },
  { file: "app/privacy/page.tsx", constant: "PRIVACY_LAST_UPDATED" },
] as const;

/**
 * Patterns that read the runtime clock. A static legal page has no
 * legitimate use for any of these — the revision date is editorial
 * content, not computed data.
 */
const BANNED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /new\s+Date\s*\(/, label: "new Date(...) runtime constructor" },
  { pattern: /Date\.now\s*\(/, label: "Date.now() runtime clock read" },
  { pattern: /toLocaleDateString\s*\(/, label: "toLocaleDateString(...) formatting of a runtime date" },
];

/** en-US long form, e.g. "June 10, 2026" — the format the stamp renders. */
const REVISION_DATE_FORMAT = /^[A-Z][a-z]+ \d{1,2}, \d{4}$/;

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("Legal pages — revision-date stamps are hardcoded (R-09)", () => {
  for (const { file, constant } of LEGAL_PAGES) {
    describe(file, () => {
      const src = read(file);

      it("contains no runtime-clock usage anywhere in the page source", () => {
        for (const { pattern, label } of BANNED_PATTERNS) {
          const match = src.match(pattern);
          if (match) {
            const line = src.slice(0, match.index).split("\n").length;
            throw new Error(
              `${file} line ${line}: banned pattern — ${label}. ` +
                `The "Last updated" stamp must be a hardcoded string constant ` +
                `bumped only when the policy copy changes (GAP_REGISTER R-09).`,
            );
          }
          expect(src).not.toMatch(pattern);
        }
      });

      it(`declares a hardcoded ${constant} constant in en-US long-date form`, () => {
        const declaration = src.match(
          new RegExp(`const ${constant} = "([^"]+)";`),
        );
        expect(declaration, `${file} must declare const ${constant} = "..."`).not.toBeNull();
        const value = declaration?.[1] ?? "";
        expect(value).toMatch(REVISION_DATE_FORMAT);
        expect(Number.isNaN(Date.parse(value)), `"${value}" must parse as a real date`).toBe(false);
      });

      it(`renders the "Last updated" stamp from ${constant}`, () => {
        expect(src).toMatch(new RegExp(`Last updated: \\{${constant}\\}`));
      });
    });
  }
});
