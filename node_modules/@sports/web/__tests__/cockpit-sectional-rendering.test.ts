import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Cross-check that every sectional status field on JarvisAssessment is
 * actually referenced in apps/web/app/cockpit/page.tsx. Catches the case
 * where the synthesizer grows a new status but the cockpit forgets to
 * render it (silent regression).
 */

const repoRoot = resolve(__dirname, "..");

const COCKPIT_PAGE = resolve(repoRoot, "app/cockpit/page.tsx");
const JARVIS_LIB = resolve(repoRoot, "lib/cockpit/jarvis.ts");

function read(p: string): string {
  return readFileSync(p, "utf8");
}

describe("/cockpit/page.tsx renders every sectional status", () => {
  const jarvisSrc = read(JARVIS_LIB);
  const pageSrc = read(COCKPIT_PAGE);

  // Extract sectional status field names from the JarvisAssessment
  // interface — anything ending in "Status" defined as `readonly XxxStatus: JarvisHealth;`.
  const sectionalFields = Array.from(
    jarvisSrc.matchAll(/readonly\s+(\w+Status):\s*JarvisHealth/g)
  ).map((m) => m[1]!);

  it("at least one sectional status field exists in JarvisAssessment", () => {
    expect(sectionalFields.length).toBeGreaterThan(5);
  });

  for (const field of sectionalFields) {
    it(`cockpit/page.tsx references assessment.${field}`, () => {
      expect(
        pageSrc.includes(`assessment.${field}`) ||
          pageSrc.includes(`.${field}`) /* destructured */,
        `cockpit/page.tsx must reference assessment.${field} to render that signal.`
      ).toBe(true);
    });
  }
});
