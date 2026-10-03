import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Brand-voice vocabulary scan — customer-facing pages should avoid the
 * phrases the brand voice doc flags as too-confident or too-loaded for
 * a sports-picks product, even when they wouldn't trip the strict
 * banned-phrase scanner.
 *
 * "Track record" implies a historical guarantee. The brand voice doc
 * in docs/launch-observatory.md explicitly bans it. The trust-claims
 * registry's BANNED list flags the multi-word "verified track record";
 * this test catches the bare-word variant too.
 */

const repoRoot = resolve(__dirname, "..");
const PUBLIC_PAGES = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/picks/page.tsx",
  "app/performance/page.tsx",
  "app/pricing/page.tsx",
  "app/blog/page.tsx",
  "app/promotions/page.tsx",
  "app/brief/page.tsx",
];

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("Brand-voice vocabulary on public pages", () => {
  for (const file of PUBLIC_PAGES) {
    it(`${file} avoids the literal phrase "track record"`, () => {
      let src: string;
      try {
        src = read(file);
      } catch {
        // Optional surface — skip if not present.
        return;
      }
      expect(
        /\btrack record\b/i.test(src),
        `${file} contains "track record" — brand voice prefers "Performance" or "Verified Record".`
      ).toBe(false);
    });
  }
});
