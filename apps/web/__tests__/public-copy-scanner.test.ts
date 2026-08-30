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
