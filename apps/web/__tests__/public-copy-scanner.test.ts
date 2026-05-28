import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BANNED_PUBLIC_CLAIMS = [
  "guaranteed wins",
  "we always win",
  "100% accurate",
];

const PUBLIC_FILES = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/performance/page.tsx",
  "app/fantasy/page.tsx",
  "app/market-gravity/page.tsx",
  "app/brain/page.tsx",
  "app/rumor-radar/page.tsx",
  "app/developer/page.tsx",
  "app/intelligence/page.tsx",
  "app/intelligence/how-it-works/page.tsx",
  "app/intelligence/source-hierarchy/page.tsx",
  "app/intelligence/glossary/page.tsx",
];

describe("public copy scanner", () => {
  for (const file of PUBLIC_FILES) {
    it(`no banned claims in ${file}`, () => {
      const content = readFileSync(join(process.cwd(), file), "utf8").toLowerCase();
      for (const banned of BANNED_PUBLIC_CLAIMS) {
        expect(content).not.toContain(banned);
      }
    });
  }
});
